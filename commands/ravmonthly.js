require('dotenv').config();
const cheerio = require('cheerio');

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
  description: 'Show monthly post counts by type for a specified month or total counts with "total".',

  async execute(message, args) {
    if (!args.length) {
      return message.reply('Please specify a month (e.g. `!ravmonthly March`) or `total` for all-time stats.');
    }

    const input = args[0].toLowerCase();

    const monthIndex = MONTHS[input];
    const showTotal = input === 'total';

    if (!showTotal && monthIndex === undefined) {
      return message.reply('Invalid input. Use full month names like `March`, or `total` for all-time stats.');
    }

    const startUrl = 'https://saesrpg.uk/forums/topic/42510-rapid-assault-vanguard-media-archive/';
    const seenPosts = new Set();
    const posts = [];

    const puppeteer = require('puppeteer');

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: null,
      });

      const page = await browser.newPage();

      // Block images, styles, fonts to speed up loading
      await page.setRequestInterception(true);
      page.on('request', req => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115 Safari/537.36');

      // Login
      await page.goto('https://saesrpg.uk/login/', { waitUntil: 'domcontentloaded' });
      await page.type('input[name="auth"]', process.env.FORUM_USERNAME);
      await page.type('input[name="password"]', process.env.FORUM_PASSWORD);
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      ]);

      // Login check
      if (await page.$('form#login_form')) {
        await browser.close();
        return message.reply('Login failed: Please check your username and password.');
      }
      if (!await page.$('a.ipsUserPhoto')) {
        await browser.close();
        return message.reply('Login failed: Could not detect login success on page.');
      }

      let currentUrl = startUrl;
      let pageCount = 0;
      const maxRetries = 3;

      while (currentUrl) {
        pageCount++;
        console.log(`Scraping page ${pageCount}: ${currentUrl}`);

        let success = false;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 0 });
            success = true;
            break;
          } catch (err) {
            console.warn(`Navigation to ${currentUrl} failed on attempt ${attempt}: ${err.message}`);
            if (attempt === maxRetries) throw err;
            await new Promise(res => setTimeout(res, 50));
          }
        }

        if (!success) break;

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
          if (!postDate) return; // skip posts without valid date

          if (!showTotal && postDate.getMonth() !== monthIndex) return; // filter by month only if NOT total

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

        // Find next page URL
        const next = $('li.ipsPagination_next a').attr('href');
        if (next && next !== currentUrl) {
          currentUrl = next;
          await new Promise(res => setTimeout(res, 50));  // shorter delay between pages
        } else {
          currentUrl = null;
        }
      }

      await browser.close();

      if (!posts.length) {
        return message.reply(showTotal ? 'No posts found.' : `No posts found for ${args[0]}.`);
      }

      // Count posts by type
      const counts = { Activity: 0, Event: 0, Roleplay: 0 };
      posts.forEach(p => counts[p.type]++);

      if (showTotal) {
        return message.channel.send(
          `📊 RAV Media Archive Stats for **All Time**\n\n` +
          `🟦 Total Activities: ${counts.Activity}\n` +
          `🟧 Total Events: ${counts.Event}\n` +
          `🟥 Total Roleplays: ${counts.Roleplay}`
        );
      } else {
        return message.channel.send(
          `📊 RAV Media Archive Stats for **${args[0]}**\n\n` +
          `🟦 Activities: ${counts.Activity}\n` +
          `🟧 Events: ${counts.Event}\n` +
          `🟥 Roleplays: ${counts.Roleplay}`
        );
      }
    } catch (error) {
      console.error('Error in ravmonthly command:', error);
      return message.reply('An error occurred while generating the stats.');
    }
  },
};
