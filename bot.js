const axios = require('axios');
const cheerio = require('cheerio');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, ComponentType } = require('discord.js');
require('dotenv').config(); // Load .env

// Create a Discord bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Utility: Convert country code to emoji
function getFlagEmoji(countryCode) {
  const codePoints = countryCode.toUpperCase().split('').map(char => 0x1F1E6 - 65 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

client.once('ready', () => {
  console.log('Bot is online!');
});

// MAIN COMMAND HANDLER
client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // Ignore bot's own messages
  if (!message.content.startsWith('!')) return; // Only react to commands starting with "!"

  const allowedChannels = ['1360930454428979263', '1361778139004408091', '1365684605528838254'];
  const allowedRoles = ['1361015649228292237', '1361015191420276816', '1361014773457748189', '1361013909603094669', '1361013084952461492', '1361012218254069810', '1361012027832795206', '1361011710277845012', '1361016918001058005'];

  const args = message.content.slice(1).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if (!allowedChannels.includes(message.channel.id)) return;

  // !op command
  if (command === 'op') {
    try {
      const response = await axios.get('https://saesrpg.uk/server/live/');
      const html = response.data;
      const $ = cheerio.load(html);
      let playersInfo = [];

      const nicknames = [];
      const usernames = [];
      const flags = [];
      const organizations = [];

      $('.ipsType_break').each((index, el) => {
        const nickname = $(el).text().trim();
        const flagImg = $(el).find('img').attr('src');

        if (nickname) {
          nicknames.push(nickname);
          flags.push(flagImg ? getFlagEmoji(flagImg.split('/').pop().split('.')[0]) : '');
        }
      });

      $('.ipsDataList').each((index, el) => {
        const username = $(el).find('span.ipsDataItem').first().text().trim();
        let organization = 'No organization';

        $(el).find('li.ipsDataItem').each((i, li) => {
          const label = $(li).find('.ipsDataItem_main').text().trim().toLowerCase();
          if (label.includes('organisation')) {
            organization = $(li).find('.ipsDataItem_stats .ipsDataItem').text().trim() || 'No organization';
          }
        });

        if (username && username !== 'Player name') {
          usernames.push(username);
          organizations.push(organization || 'No organization');
        }
      });

      for (let i = 0; i < nicknames.length; i++) {
        if (nicknames[i] && usernames[i + 1]) {
          playersInfo.push({
            nickname: nicknames[i],
            username: usernames[i + 1],
            flag: flags[i] || '',
            organization: organizations[i + 1] || 'No organization',
          });
        }
      }

      if (playersInfo.length > 0) {
        const chunkSize = 20;
        const totalPages = Math.ceil(playersInfo.length / chunkSize);
        let currentPage = 0;

        const generateEmbed = (page) => {
          const start = page * chunkSize;
          const end = start + chunkSize;
          const currentPlayers = playersInfo.slice(start, end);

          const description = currentPlayers.map(p =>
            `- **${p.nickname}** (${p.username})   ${p.flag}   __**G/S:**__ ${p.organization}`
          ).join('\n');

          return new EmbedBuilder()
            .setThumbnail('https://i.imgur.com/WLAHrWE.png')
            .setColor('#A2C6CA')
            .setTitle('Online Players')
            .setDescription(description)
            .setFooter({ text: `Page ${page + 1} of ${totalPages} • Total Players: ${playersInfo.length}` })
            .setTimestamp();
        };

        const row = (disabled = false) => new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0 || disabled),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === totalPages - 1 || disabled)
        );

        const sentMessage = await message.channel.send({
          embeds: [generateEmbed(currentPage)],
          components: [row()]
        });

        const collector = sentMessage.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 60000
        });

        collector.on('collect', interaction => {
          if (interaction.customId === 'prev' && currentPage > 0) {
            currentPage--;
          } else if (interaction.customId === 'next' && currentPage < totalPages - 1) {
            currentPage++;
          }

          interaction.update({
            embeds: [generateEmbed(currentPage)],
            components: [row()]
          });
        });

        collector.on('end', () => {
          sentMessage.edit({
            components: [row(true)]
          });
        });

      } else {
        message.channel.send('No players are currently online.');
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      message.channel.send('Failed to fetch player data.');
    }
  }

  // !om command
  if (command === 'om' && args.length > 0) {
    const orgName = args.join(' ').toLowerCase();
    try {
      const response = await axios.get('https://saesrpg.uk/server/live/');
      const html = response.data;
      const $ = cheerio.load(html);
      let playersInfo = [];

      const nicknames = [];
      const usernames = [];
      const flags = [];
      const organizations = [];

      $('.ipsType_break').each((index, el) => {
        const nickname = $(el).text().trim();
        const flagImg = $(el).find('img').attr('src');

        if (nickname) {
          nicknames.push(nickname);
          flags.push(flagImg ? getFlagEmoji(flagImg.split('/').pop().split('.')[0]) : '');
        }
      });

      $('.ipsDataList').each((index, el) => {
        const username = $(el).find('span.ipsDataItem').first().text().trim();
        let organization = 'No organization';

        $(el).find('li.ipsDataItem').each((i, li) => {
          const label = $(li).find('.ipsDataItem_main').text().trim().toLowerCase();
          if (label.includes('organisation')) {
            organization = $(li).find('.ipsDataItem_stats .ipsDataItem').text().trim() || 'No organization';
          }
        });

        if (username && username !== 'Player name') {
          usernames.push(username);
          organizations.push(organization || 'No organization');
        }
      });

      for (let i = 0; i < nicknames.length; i++) {
        if (nicknames[i] && usernames[i + 1]) {
          if (organizations[i + 1].toLowerCase().includes(orgName)) {
            playersInfo.push({
              nickname: nicknames[i],
              username: usernames[i + 1],
              flag: flags[i] || '',
              organization: organizations[i + 1] || 'No organization',
            });
          }
        }
      }

      if (playersInfo.length === 0) {
        return message.channel.send(`No members found in organization matching **${orgName}**.`);
      }

      const playersList = playersInfo.map(p =>
        `- **${p.nickname}** (${p.username})   ${p.flag}   __**G/S:**__ ${p.organization}`
      ).join('\n');

      const embed = new EmbedBuilder()
        .setThumbnail('https://i.imgur.com/WLAHrWE.png')
        .setColor('#A2C6CA')
        .setTitle(`Online Members in ${orgName}`)
        .setDescription(playersList)
        .setFooter({ text: `Total Members Online: ${playersInfo.length}` })
        .setTimestamp();

      message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching data:', error);
      message.channel.send('Failed to fetch player data.');
    }
  }

  // !help command
  if (command === 'help') {
    console.log('Help command triggered'); // Add this log
    const helpEmbed = new EmbedBuilder()
        .setThumbnail('https://i.imgur.com/WLAHrWE.png')
        .setColor('#A2C6CA')
        .setTitle('Bot Commands Help')
        .addFields(
            {name: '', value: '`!op` to display all current online players' },
            {name: '',value: '`!om <organization name>` to check online players by organization name' },
            {name: '', value: '`!rav` to view RAV media archive' },
            {name: '', value: '`!postmedia` to do a media archive post from discord (requires DAGGER+ role)' },
            {name: '', value: '`!startkd` to check your K/D' },
            {name: '', value: '`!stats <username>` to check stats' },
            {name: '', value: '`!chat` to talk to an AI chatbot' }
        )
        .setFooter({ text: 'Made by Lking Strong 👑' })
        .setTimestamp();

    message.channel.send({ embeds: [helpEmbed] });
}


  // !rav command
  if (command === 'rav') {
    try {
      const ravCommand = require('./commands/rav');
      await ravCommand.execute(message, args);
    } catch (error) {
      console.error('Error executing !rav:', error);
      message.reply('❌ There was an error trying to run the !rav command.');
    }
  }

  // !ravmonthly command 
  if (command === 'ravmonthly') {
    try {
      const ravMonthlyCommand = require('./commands/ravmonthly');
      await ravMonthlyCommand.execute(message, args);
    } catch (error) {
      console.error('Error executing !ravmonthly:', error);
      message.reply('❌ There was an error trying to run the !ravmonthly command.');
    }
  }
  
 // !log command
  if (command === 'log') {
    try {
      const logCommand = require('./commands/log');
      await logCommand.execute(message, args); // ONLY ONCE
    } catch (error) {
      console.error('Error executing !log:', error);
      message.reply('❌ There was an error trying to run the !log command.');
    }
  }

  const statsCommand = require('./commands/stats'); // Importing stats.js

  // Inside message handling
  if (command === 'stats') {
    try {
      await statsCommand.execute(message, args); // Call the execute function
    } catch (error) {
      console.error('Error executing !stats:', error);
      message.reply('❌ There was an error trying to execute the !stats command.');
    }
  }
  
  //chat command 
  if (command === 'chat') {
    try {
      const { handleChat } = require('./commands/chat'); // Import the handleChat function from chat.js
      await handleChat(message); // Call handleChat function for the !chat command
    } catch (error) {
      console.error('Error executing !chat:', error);
      message.reply('❌ There was an error trying to run the !chat command.');
    }
  }


  // !uploadkd command
  if (command === 'startkd') {
    try {
      const uploadKDCommand = require('./commands/uploadkd')
      await uploadKDCommand.execute(message, args, client);
    } catch (error) {
      console.error('Error executing !startkd:', error);
      message.reply('❌ There was an error trying to process your KD.');
    }
  }

  // !postmedia command
  if (command === 'postmedia') {
    const forumCommand = require('./commands/forum');
    const memberRoles = message.member.roles.cache;
    const hasAllowedRole = allowedRoles.some(roleId => memberRoles.has(roleId));

    if (!hasAllowedRole) {
      return message.reply('❌ You don\'t have permission to use this command.');
    }
    try {
      await forumCommand.execute(message, args);
    } catch (error) {
      console.error('Error executing !postmedia:', error);
      message.reply('❌ There was an error trying to post to the forum.');
    }
  }
});

// -------- DO NOT TOUCH BELOW --------
client.login(process.env.BOT_TOKEN);

const express = require('express');
const app = express();
app.get('/', (req, res) => {
  res.send('Bot is alive!');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Keep-alive server running on port ${PORT}`);
});
