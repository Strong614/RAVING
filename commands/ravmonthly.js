require('dotenv').config();
const { AttachmentBuilder } = require('discord.js');
const cheerio = require('cheerio');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const path = require('path');
const chartjsPluginDatalabels = require('chartjs-plugin-datalabels');
const puppeteer = require('puppeteer');

const width = 800;
const height = 600;
const chartCanvas = new ChartJSNodeCanvas({
  width,
  height,
  plugins: [chartjsPluginDatalabels],
});

const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function parseDateFromText(dateStr) {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  const [_, day, month, yearPart] = match;
  const year = yearPart.length === 2 ? '20' + yearPart : yearPart;
  const isoDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const date = new Date(isoDateStr);
  return isNaN(date.getTime()) ? null : date;
}

module.exports = {
  name: 'ravmonthly',
  description: 'Show a monthly chart of Activity, Event, and Roleplay posts (e.g., !ravmonthly March)',

async execute(message, args) {
  if (!args.length) {
    return message.reply('Please specify a month, e.g. `!ravmonthly March`.');
  }

  const inputMonth = args[0].toLowerCase();
  const monthIndex = MONTHS[inputMonth];
  if (monthIndex === undefined) {
    return message.reply('Invalid month. Use full names like `March`, not `Mar`.');
  }

  const startUrl = 'https://saesrpg.uk/forums/topic/42510-rapid-assault-vanguard-media-archive/';
  const seenPosts = new Set();
  const posts = [];

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set User-Agent (optional but recommended)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115 Safari/537.36');

    // Go to login page
    await page.goto('https://saesrpg.uk/login/', { waitUntil: 'networkidle2' });

    // Fill login form
    await page.type('input[name="auth"]', process.env.FORUM_USERNAME);
    await page.type('input[name="password"]', process.env.FORUM_PASSWORD);

    // Submit and wait for navigation
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    // LOGIN CHECKS:
    // Check if login form is still present (means login failed)
    const loginFormStillVisible = await page.$('form#login_form');
    if (loginFormStillVisible) {
      await browser.close();
      return message.reply('Login failed: Please check your username and password.');
    }

    // Optional: Check for some user-specific element that appears on successful login
    const userAvatar = await page.$('a.ipsUserPhoto');
    if (!userAvatar) {
      await browser.close();
      return message.reply('Login failed: Could not detect login success on page.');
    }

    // Now logged in, start scraping pages
    let currentUrl = startUrl;
    while (currentUrl) {
      await page.goto(currentUrl, { waitUntil: 'networkidle2' });
      const html = await page.content();
      const $ = cheerio.load(html);

      $('article.ipsComment').each((_, post) => {
        const $post = $(post);
        const postId = $post.attr('id');
        const postText = $post.find('.ipsType_richText').text().trim();
        if (!postText) return;

        const dateLineMatch = postText.match(/Date\s*:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
        if (!dateLineMatch) return;

        const postDate = parseDateFromText(dateLineMatch[1]);
        if (!postDate || postDate.getMonth() !== monthIndex) return;

        let poster = 'Unknown';
        const quotedata = $post.find('div.ipsComment_content').attr('data-quotedata');
        if (quotedata) {
          try {
            poster = JSON.parse(quotedata).username || 'Unknown';
          } catch {}
        }

        const imgSrc = $post.find('img').attr('data-src') || $post.find('img').attr('src') || '';
        const img = imgSrc.toLowerCase();

        let type = 'Activity';
        if (img.includes('smkyyxm')) type = 'Activity';
        else if (img.includes('bkmozrh')) type = 'Event';
        else if (img.includes('flhet6c')) type = 'Roleplay';
        else {
          const text = postText.toLowerCase();
          if (text.includes('event')) type = 'Event';
          else if (text.includes('roleplay')) type = 'Roleplay';
        }

        const postUrl = postId ? `${startUrl}#findComment-${postId}` : 'No Link';
        const key = postId || postUrl || postText.slice(0, 30);

        if (!seenPosts.has(key)) {
          seenPosts.add(key);
          posts.push({ type, date: postDate, poster, url: postUrl });
        }
      });

      const next = $('li.ipsPagination_next a').attr('href');
      if (next && next !== currentUrl) {
        currentUrl = next;
        await new Promise(res => setTimeout(res, 1500)); // polite delay
      } else {
        currentUrl = null;
      }
    }

    await browser.close();

    if (!posts.length) {
      return message.reply(`No posts found for ${args[0]}.`);
    }

    // Count posts by type
    const counts = { Activity: 0, Event: 0, Roleplay: 0 };
    posts.forEach(p => counts[p.type]++);

    // Generate chart config
    const chartConfig = {
      type: 'bar',
      data: {
        labels: ['Activity', 'Event', 'Roleplay'],
        datasets: [{
          label: `RAV Posts in ${args[0]}`,
          data: [counts.Activity, counts.Event, counts.Roleplay],
          backgroundColor: ['#4e79a7', '#f28e2b', '#e15759'],
        }],
      },
      options: {
        plugins: {
          title: { display: true, text: `Post Types in ${args[0]}` },
          datalabels: {
            color: '#fff',
            anchor: 'end',
            align: 'start',
            font: { weight: 'bold' },
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    };

    // Render chart to buffer & save
    const buffer = await chartCanvas.renderToBuffer(chartConfig);
    const fileName = `chart_${Date.now()}.png`;
    const filePath = path.join(__dirname, fileName);
    fs.writeFileSync(filePath, buffer);

    // Send chart image as Discord attachment
    const attachment = new AttachmentBuilder(filePath);
    await message.channel.send({
      content: `📊 RAV Media Archive Stats for **${args[0]}**\n\n` +
               `🟦 Activities: ${counts.Activity}\n` +
               `🟧 Events: ${counts.Event}\n` +
               `🟥 Roleplays: ${counts.Roleplay}`,
      files: [attachment],
    });

    fs.unlinkSync(filePath);
  } catch (error) {
    console.error('Error in ravmonthly command:', error);
    return message.reply('An error occurred while generating the chart.');
  }
},

};
