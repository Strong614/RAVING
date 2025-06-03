const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

let uploadKDActive = false;

module.exports = {
  data: {
    name: 'startkd',
    description: 'Upload console.log file to calculate KD ratio for a player.',
  },
  async execute(message, args, client) {
    if (uploadKDActive) {
      return message.reply("startkd command is already active. Please input player names or use `!stopkd` to deactivate.");
    }

    uploadKDActive = true;

    await message.reply('Please upload the `console.log` file within 30 seconds to get your K/D ratio.');

    try {
      const filter = (m) => m.author.id === message.author.id && m.attachments.size > 0;
      const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });

      const file = collected.first().attachments.first();
      const fileUrl = file.url;

      console.log(`File uploaded: ${fileUrl}`);

      const logContent = await fetchLogContent(fileUrl);

      if (!logContent) {
        uploadKDActive = false;
        return message.reply('Failed to fetch or read the log file.');
      }

      await message.reply('File uploaded successfully. Parsing log...');

      const stats = parseLog(logContent);

      await message.reply('Log parsing completed. Enter a player name to track their K/D. Type `!stopkd` to stop.');

      const playerFilter = (m) => m.author.id === message.author.id;

      while (uploadKDActive) {
        try {
          const playerMessages = await message.channel.awaitMessages({
            filter: playerFilter,
            max: 1,
            time: 60000,
            errors: ['time'],
          });

          const playerName = playerMessages.first().content.trim();

          if (playerName.toLowerCase() === '!stopkd') {
            uploadKDActive = false;
            return message.reply('The `!startkd` command has been deactivated.');
          }

          if (stats[playerName]) {
            const playerStats = stats[playerName];
            const kdRatio = playerStats.deaths === 0 ? '∞' : (playerStats.kills / playerStats.deaths).toFixed(2);

            const embed = new EmbedBuilder()
              .setThumbnail('https://i.imgur.com/WLAHrWE.png')
              .setColor('#A2C6CA')
              .setTitle(`Tracking Stats for ${playerName}`)
              .addFields(
                { name: 'Kills', value: `${playerStats.kills}`, inline: true },
                { name: 'Deaths', value: `${playerStats.deaths}`, inline: true },
                { name: 'KD Ratio', value: `${kdRatio}`, inline: true }
              );

            for (const [weapon, count] of Object.entries(playerStats.weapons)) {
              embed.addFields({ name: `${weapon} Kills`, value: `${count}`, inline: true });
            }

            embed.setFooter({ text: 'Made by elking strong' });

            await message.channel.send({ embeds: [embed] });
          } else {
            await message.channel.send(`No stats found for player: ${playerName}`);
          }
        } catch (err) {
          // Timeout waiting for player name, continue waiting or allow stop command
          await message.channel.send('No player name input received in 60 seconds. Type a player name or `!stopkd` to exit.');
        }
      }
    } catch (err) {
      console.log('No file uploaded or timed out.', err);
      await message.reply('No file uploaded or timed out.');
      uploadKDActive = false;
    }
  },
};

async function fetchLogContent(url) {
  try {
    console.log(`Fetching file content from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch file:', response.status);
      return null;
    }
    const buffer = await response.buffer();
    console.log('File content fetched successfully');
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('Error fetching file content:', error);
    return null;
  }
}

function parseLog(logContent) {
  const stats = {};
  const lines = logContent.split('\n');
  console.log(`Parsing log content with ${lines.length} lines.`);

  // Pattern for lines like: "Player1 killed Player2. (WeaponName)"
  const killRegex = /\*?\s?([^\s]+)\s+killed\s+([^\s]+)\.\s+\(([^)]+)\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = killRegex.exec(line);
    if (match) {
      const killer = match[1].trim();
      const victim = match[2].trim();
      const weapon = match[3].trim();

      if (!stats[killer]) stats[killer] = { kills: 0, deaths: 0, weapons: {} };
      if (!stats[victim]) stats[victim] = { kills: 0, deaths: 0, weapons: {} };

      stats[killer].kills += 1;
      stats[victim].deaths += 1;

      if (!stats[killer].weapons[weapon]) stats[killer].weapons[weapon] = 0;
      stats[killer].weapons[weapon] += 1;
    }
  }

  console.log('Log parsing complete.');
  return stats;
}
