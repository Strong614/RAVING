const axios = require('axios');
const cheerio = require('cheerio');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, ComponentType } = require('discord.js');

require('dotenv').config();  // Load .env file

// Create a Discord bot client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Function to convert country code to a flag emoji
function getFlagEmoji(countryCode) {
  const codePoints = countryCode.toUpperCase().split('').map(char => 0x1F1E6 - 65 + char.charCodeAt(0));  // Convert to unicode flag
  return String.fromCodePoint(...codePoints);
}

client.once('ready', () => {
  console.log('Bot is online!');
});

// Command to fetch and send player information
client.on('messageCreate', async (message) => {
  const allowedChannels = ['1360930454428979263', '1361778139004408091'];
  const args = message.content.split(' ');
  const command = args[0].toLowerCase();

  if (!allowedChannels.includes(message.channel.id)) return;

  // Only respond if the message starts with "!" to prevent non-command messages
  if (command === '!op') {
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
          if (flagImg) {
            const countryCode = flagImg.split('/').pop().split('.')[0];
            const flagEmoji = getFlagEmoji(countryCode);
            flags.push(flagEmoji);
          } else {
            flags.push('');
          }
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
            .setThumbnail('https://cdn.discordapp.com/attachments/1360930454428979263/1360941416414576740/RAV1.png')
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
  
        const messageReply = await message.channel.send({
          embeds: [generateEmbed(currentPage)],
          components: [row()]
        });
  
        const collector = messageReply.createMessageComponentCollector({
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
          messageReply.edit({
            components: [row(true)]  // disable buttons
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
  

  // Command to lookup specific organization members
  if (command === '!om' && args[1]) {
    const orgName = args.slice(1).join(' ').toLowerCase();  // Get the organization name argument

    try {
      // Fetch the HTML content again for the lookup
      const response = await axios.get('https://saesrpg.uk/server/live/');
      const html = response.data;

      // Load the HTML into cheerio for parsing
      const $ = cheerio.load(html);
      let playersInfo = [];

      // Scrape Nicknames, Usernames, Flags, and Organizations
      const nicknames = [];
      const usernames = [];
      const flags = [];
      const organizations = [];

      // Scrape Nicknames and Flags
      $('.ipsType_break').each((index, el) => {
        const nickname = $(el).text().trim();
        const flagImg = $(el).find('img').attr('src');  // Get the flag image src

        if (nickname) {
          nicknames.push(nickname);
          if (flagImg) {
            const countryCode = flagImg.split('/').pop().split('.')[0];  // Extract country code from the URL (e.g., 'lv' from 'lv.png')
            const flagEmoji = getFlagEmoji(countryCode);  // Get the flag emoji
            flags.push(flagEmoji);  // Push the emoji to the flags array
          } else {
            flags.push('');  // No flag if not available
          }
        }
      });

      // Scrape Usernames and Organizations
      $('.ipsDataList').each((index, el) => {
        const username = $(el).find('span.ipsDataItem').first().text().trim();
        let organization = 'No organization';

        $(el).find('li.ipsDataItem').each((i, li) => {
          const label = $(li).find('.ipsDataItem_main').text().trim().toLowerCase();
          if (label.includes('organisation')) {
            organization = $(li).find('.ipsDataItem_stats .ipsDataItem').text().trim() || 'No organization';
          }
        });

        if (username && username !== 'Player name') {  // Ignore empty or header text
          usernames.push(username);
          organizations.push(organization || 'No organization');  // Default to 'No organization' if not available
        }
      });

      // Filter players by organization name
      playersInfo = [];

      for (let i = 0; i < nicknames.length; i++) {
        if (nicknames[i] && usernames[i + 1]) {  // Shift usernames by +1 index
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

      // If no members are found for that organization
      if (playersInfo.length === 0) {
        return message.channel.send(`No members found in organization matching **${orgName}**.`);
      }

      const playersList = playersInfo.map(p => `- **${p.nickname}** (${p.username})   ${p.flag}   __**G/S:**__ ${p.organization}`).join('\n');

      const embed = new EmbedBuilder()
        .setThumbnail('https://cdn.discordapp.com/attachments/1360930454428979263/1360941416414576740/RAV1.png?ex=6802e1b6&is=68019036&hm=2dd7261afb46a55e6bd5e9ffe5a4de67c7f060083b1fd3522fb01157b25f0d9d&')
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
  if (command === '!help') {
    console.log(`Responding to !help from bot instance at ${new Date().toLocaleTimeString()}`);
    const helpEmbed = new EmbedBuilder()
      .setColor('#A2C6CA')
      .setTitle('Bot Commands Help')
      .addFields(
        {
          value: '`!op` Displays all currently online players',
        },
        {
          value: '`!om <organization name>` Displays online players who are members of a specific organization. for Example: `!om Rapid.Assault.Vang...` (Be careful with misspellings)',
        },
        {

          value: '`!rav` Displays RAV media archive',
        },
        {

          value: '`!rav events` Displays all events in RAV media archive',
        },
        {

          value: '`!rav activity` Displays all activities in RAV media archive',
        },
        {

          value: '`!rav roleplay` Displays all events in RAV media archive',
        }
      )
      .setFooter({ text: 'Made by Lking Strong ✨' })
      .setTimestamp();
  
    return message.channel.send({ embeds: [helpEmbed] });
  }
  
});

// Media Archieve scraping ------------------------------------------------------------------------------------

const prefix = "!";

// Message-based commands
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  if (commandName === "rav") {
    try {
      const ravCommand = require("./commands/rav");
      await ravCommand.execute(message, args);
    } catch (error) {
      console.error("Error executing !rav:", error);
      message.reply("❌ There was an error trying to run the !rav command.");
    }
  }
});

//  -----------------------------------------------------------------------------------------------------------
// Login to Discord with your bot token from .env file
client.login(process.env.BOT_TOKEN);

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Keep-alive server running on port ${PORT}`);
});


