const { AttachmentBuilder } = require('discord.js');
const cheerio = require('cheerio');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const chartjsPluginDatalabels = require('chartjs-plugin-datalabels');
const puppeteer = require('puppeteer');

const width = 800;
const height = 600;
const chartCanvas = new ChartJSNodeCanvas({ width, height, plugins: [chartjsPluginDatalabels] });

const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
};

function parseDateFromText(dateStr) {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [_, month, day, year] = match;
  return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
}


module.exports = {
  name: 'ravmonthly',
  description: 'Show a monthly chart of Activity, Event, and Roleplay posts (e.g., !ravmonthly March)',
  async execute(message, args) {
    if (!args.length) return message.reply('Please specify a month, e.g. `!ravmonthly March`.');

    const inputMonth = args[0].toLowerCase();
    const monthIndex = MONTHS[inputMonth];
    if (monthIndex === undefined) return message.reply('Invalid month. Please use a full name like `February`, not `Feb`.');

    const startUrl = 'https://saesrpg.uk/forums/topic/42510-rapid-assault-vanguard-media-archive/';

    const seenPosts = new Set();
    const posts = [];
    let currentUrl = startUrl;

    try {
      // Launch Puppeteer browser
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1280, height: 800 });

      while (currentUrl) {
        await page.goto(currentUrl, { waitUntil: 'networkidle2' });
        const html = await page.content();

        const $ = cheerio.load(html);

        $('article.ipsComment').each((_, post) => {
          const $post = $(post);
          const postId = $post.attr('id');
          const postText = $post.find('.ipsType_richText').text().trim();
          const quotedata = $post.find('div.ipsComment_content').attr('data-quotedata');
          const bannerImg = $post.find('img').attr('data-src') || $post.find('img').attr('src') || '';
          const postUrl = postId ? `${startUrl}#findComment-${postId}` : 'No Link';

          let poster = 'Unknown';
          try {
            if (quotedata) poster = JSON.parse(quotedata).username;
          } catch (e) {
            // ignore JSON parse errors
          }

          let dateStr = postText.match(/Date\s*:\s*(.+)/i)?.[1]?.trim() || null;
          const postDate = dateStr ? parseDateFromText(dateStr) : null;
          if (!postDate || isNaN(postDate.getTime()) || postDate.getMonth() !== monthIndex) return;

          let type = null;
          const img = bannerImg.toLowerCase();
          if (img.includes('smkyyxm')) type = 'Activity';
          else if (img.includes('bkmozrh')) type = 'Event';
          else if (img.includes('flhet6c')) type = 'Roleplay';
          else {
            if (postText.toLowerCase().includes('event')) type = 'Event';
            else if (postText.toLowerCase().includes('roleplay')) type = 'Roleplay';
            else type = 'Activity';
          }

          const key = postId || postUrl;
          if (!seenPosts.has(key)) {
            seenPosts.add(key);
            posts.push({ type, date: postDate, poster, url: postUrl });
          }
        });

        const next = $('li.ipsPagination_next a').attr('href');
        if (next && next !== currentUrl) {
          currentUrl = next;
          // Delay to prevent hammering server
          await new Promise(res => setTimeout(res, 1000));
        } else {
          currentUrl = null;
        }
      }

      await browser.close();

      if (!posts.length) return message.reply(`No posts found for ${args[0]}.`);

      const counts = { Activity: 0, Event: 0, Roleplay: 0 };
      for (const p of posts) counts[p.type]++;

      const config = {
        type: 'bar',
        data: {
          labels: Object.keys(counts),
          datasets: [{
            label: `RAV Posts in ${args[0]}`,
            data: Object.values(counts),
            backgroundColor: ['#4e79a7', '#f28e2b', '#e15759']
          }]
        },
        options: {
          plugins: {
            title: { display: true, text: `Post Types in ${args[0]}` },
            datalabels: {
              color: 'white',
              anchor: 'end',
              align: 'start',
              font: { weight: 'bold' }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      };

      const buffer = await chartCanvas.renderToBuffer(config);
      const filePath = './chart.png';
      fs.writeFileSync(filePath, buffer);

      const attachment = new AttachmentBuilder(filePath);
      await message.channel.send({
        content: `📊 RAV Media Archive Stats for **${args[0]}**\n\n` +
                 `Activities: ${counts.Activity}\n` +
                 `Events: ${counts.Event}\n` +
                 `Roleplays: ${counts.Roleplay}`,
        files: [attachment]
      });

      // Clean up image file after sending (optional)
      fs.unlinkSync(filePath);

    } catch (error) {
      console.error(error);
      message.reply('An error occurred while generating the chart.');
    }
  }
};
