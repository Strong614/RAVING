const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  name: 'rav',
  description: 'Scrape RAV media archive and show activity stats',
  async execute(message, args) {
    const startUrl = 'https://saesrpg.uk/forums/topic/42510-rapid-assault-vanguard-media-archive/';
    const headers = { 'User-Agent': 'Mozilla/5.0' };

    const allPosts = [];
    const seenPosts = new Set();
    let currentUrl = startUrl;

    // Get and normalize the filter (events → event)
    const rawFilter = args[0] ? args[0].toLowerCase() : null;
    const normalizedFilters = {
      events: 'event',
      activity: 'activity',
      roleplay: 'roleplay'
    };

    if (rawFilter && !normalizedFilters.hasOwnProperty(rawFilter)) {
      return message.reply('Invalid filter type. Please use `events`, `activity`, or `roleplay`.');
    }

    const activityFilter = rawFilter ? normalizedFilters[rawFilter] : null;

    try {
      while (currentUrl) {
        const response = await axios.get(currentUrl, { headers });
        const $ = cheerio.load(response.data);

        $('article.ipsComment').each((_, post) => {
          const $post = $(post);
          const postId = $post.attr('id');
          const postUrl = postId ? `${startUrl}#findComment-${postId}` : 'No Link';
          const postText = $post.find('.ipsType_richText').text().trim();
          const quotedata = $post.find('div.ipsComment_content').attr('data-quotedata');
          const poster = quotedata ? JSON.parse(quotedata).username : 'Unknown';

          const imgElement = $post.find('img');
          let bannerImg = imgElement.attr('data-src') || imgElement.attr('src') || '';
          bannerImg = bannerImg.toLowerCase();

          let activityType = null;

          if (bannerImg.includes('smkyyxm')) activityType = 'Activity';
          else if (bannerImg.includes('bkmozrh')) activityType = 'Event';
          else if (bannerImg.includes('flhet6c')) activityType = 'Roleplay';

          if (!activityType) {
            if (postText.toLowerCase().includes('event')) {
              activityType = 'Event';
            } else if (postText.toLowerCase().includes('roleplay')) {
              activityType = 'Roleplay';
            } else {
              activityType = 'Activity';
            }
          }

          if (!activityType) return;

          // Filter by type
          if (activityFilter && activityType.toLowerCase() !== activityFilter) return;

          let participants = postText.match(/Participants\s*:\s*(.+)/i)?.[1]?.split(/,| and | & /).map(p => p.trim()) || [];
          let date = postText.match(/Date\s*:\s*(.+)/i)?.[1]?.trim() || null;

          participants = participants.filter(p => !['Screenshots:', 'Date:', 'Activity Participants:', 'Activity Number:'].includes(p));
          if (date?.toLowerCase() === 'screenshots:') date = null;

          const uniqueKey = postId || postUrl;
          if (!seenPosts.has(uniqueKey)) {
            seenPosts.add(uniqueKey);
            allPosts.push({ poster, activityType, participants, date, postUrl });
          }
        });

        const nextLink = $('li.ipsPagination_next a').attr('href');
        if (nextLink && nextLink !== currentUrl) {
          currentUrl = nextLink;
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          break;
        }
      }

      if (allPosts.length === 0) {
        return message.channel.send(
          activityFilter
            ? `No ${activityFilter} posts found.`
            : 'No valid posts found.'
        );
      }

      let currentPage = 0;
      const maxPostsPerPage = 10;

      const createEmbed = (pageIndex) => {
        const posts = allPosts.slice(pageIndex * maxPostsPerPage, (pageIndex + 1) * maxPostsPerPage);
        const embed = new EmbedBuilder()
          .setThumbnail('https://cdn.discordapp.com/attachments/1360930454428979263/1360941416414576740/RAV1.png')
          .setTitle(`📘 RAV ${activityFilter ? activityFilter.charAt(0).toUpperCase() + activityFilter.slice(1) : 'Media'} Archive Summary`)
          .setColor('#A2C6CA')
          .setDescription(`Total Posts: ${allPosts.length} | Page ${pageIndex + 1}`)
          .addFields(posts.map((post, i) => ({
            name: `#${pageIndex * maxPostsPerPage + i + 1} - ${post.activityType}`,
            value: `👤 Poster: ${post.poster}\n📅 Date: ${post.date || 'N/A'}\n🧑‍🤝‍🧑 Participants: ${post.participants.length ? post.participants.join(', ') : 'N/A'}\n🔗 [View Post](${post.postUrl})`,
            inline: false
          })))
          .setFooter({ text: 'Made by Lking Strong ✨' })
          .setTimestamp();

        return embed;
      };

      const createButtons = (pageIndex) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('previous').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(pageIndex === 0),
          new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled((pageIndex + 1) * maxPostsPerPage >= allPosts.length)
        );
      };

      const sent = await message.reply({ embeds: [createEmbed(currentPage)], components: [createButtons(currentPage)] });

      const collector = sent.createMessageComponentCollector({
        filter: interaction => interaction.user.id === message.author.id,
        time: 60000
      });

      collector.on('collect', async interaction => {
        if (interaction.customId === 'next') currentPage++;
        if (interaction.customId === 'previous') currentPage--;

        await interaction.update({ embeds: [createEmbed(currentPage)], components: [createButtons(currentPage)] });
      });

      collector.on('end', () => {
        const disabledButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('previous').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(true)
        );
        sent.edit({ components: [disabledButtons] });
      });

    } catch (err) {
      console.error('❌ Error:', err);
      await message.reply('Failed to fetch data from the RAV archive.');
    }
  }
};
