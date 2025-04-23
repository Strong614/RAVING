// utils/ravScraper.js
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://saesrpg.uk/forums/topic/42510-rapid-assault-vanguard-media-archive/';

async function scrapeRAVMediaArchive(filters = {}) {
  let page = 1;
  let posts = [];
  let hasNext = true;

  while (hasNext) {
    const url = `${BASE_URL}?page=${page}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    $('.topic .ipsComment').each((_, elem) => {
      const postElem = $(elem);

      const poster = postElem.find('.cAuthorPane_author a').first().text().trim();
      const content = postElem.find('.ipsComment_content').text().trim();

      const typeMatch = content.match(/Activity Type:\s*(.*)/i);
      const numberMatch = content.match(/Activity Number:\s*(.*)/i);
      const participantsMatch = content.match(/Participants:\s*(.*)/i);
      const dateMatch = content.match(/Date:\s*(.*)/i);

      const post = {
        poster,
        activityType: typeMatch?.[1]?.trim() || 'Unknown',
        activityNumber: numberMatch?.[1]?.trim() || 'Unknown',
        participants: participantsMatch?.[1]?.trim() || 'Unknown',
        date: dateMatch?.[1]?.trim() || 'Unknown',
      };

      // Apply filters
      if (
        (filters.poster && !post.poster.toLowerCase().includes(filters.poster.toLowerCase())) ||
        (filters.type && !post.activityType.toLowerCase().includes(filters.type.toLowerCase()))
      ) return;

      posts.push(post);
    });

    console.log(`Scraped ${posts.length} posts from page ${page}`); // Log posts after each page scrape

    hasNext = $('.ipsPagination').length > 0 && $('.ipsPagination .ipsPagination_next').length > 0;
    page++;
  }

  console.log(`Total posts scraped: ${posts.length}`); // Final log for total posts scraped
  return posts;
}

module.exports = scrapeRAVMediaArchive;
