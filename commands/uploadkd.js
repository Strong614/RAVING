const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

let uploadKDActive = false; // Track the state of the uploadKD command

module.exports = {
  data: {
    name: 'startkd',
    description: 'Upload console.log file to calculate KD ratio for a player.',
  },
  async execute(message, args, client) {
    if (uploadKDActive) {
      return message.reply("startkd command is already active. Please input player names or use `!stopkd` to deactivate.");
    }

    uploadKDActive = true; // Activate the command

    message.reply('Upload console.log file to get your K/D');

    console.log('Waiting for file upload...');

    // Wait for the file to be uploaded
    const filter = (m) => m.author.id === message.author.id && m.attachments.size > 0;
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });

    if (collected.size > 0) {
      const file = collected.first().attachments.first();
      const fileUrl = file.url;

      console.log(`File uploaded: ${fileUrl}`);

      // Fetch the content of the uploaded file from the URL
      const logContent = await fetchLogContent(fileUrl);

      if (logContent) {
        message.reply('File uploaded successfully. Parsing log...');
        console.log('Log file fetched successfully. Parsing log...');

        // Parse the log file and calculate kills/deaths
        const stats = parseLog(logContent);

        // Start listening for player name inputs
        message.reply('Log parsing completed. Enter a player name to track their K/D. Type `!stopkd` to stop.');

        // Create a filter to listen for player names or the stop command
        const playerFilter = (m) => m.author.id === message.author.id;
        const stopFilter = (m) => m.content.toLowerCase() === '!stopkd' && m.author.id === message.author.id;

        // Continue processing player names until the stop command is triggered
        while (uploadKDActive) {
          try {
            const playerMessage = await message.channel.awaitMessages({ filter: playerFilter, max: 1, time: 60000, errors: ['time'] });
            const playerName = playerMessage.first().content;

            if (playerName.toLowerCase() === '!stopkd') {
              uploadKDActive = false;
              message.reply('The `!startkd` command has been deactivated.');
              break;
            }

            console.log(`Player name entered: ${playerName}`);

            // Check if the player name exists in stats and get the stats
            if (stats[playerName]) {
              const playerStats = stats[playerName];
              console.log(`Player found: ${playerName}`);
              console.log(`Kills: ${playerStats.kills}, Deaths: ${playerStats.deaths}`);

              const kdRatio = (playerStats.deaths === 0) ? '∞' : (playerStats.kills / playerStats.deaths).toFixed(2);

              // Create an embed with the player stats
              const embed = new EmbedBuilder()
                .setThumbnail('https://cdn.discordapp.com/attachments/1360930454428979263/1360941416414576740/RAV1.png')
                .setColor('#A2C6CA')
                .setTitle(`Tracking Stats for ${playerName}`)
                .addFields(
                  { name: 'Kills', value: `${playerStats.kills}`, inline: true },
                  { name: 'Deaths', value: `${playerStats.deaths}`, inline: true },
                  { name: 'KD Ratio', value: `${kdRatio}`, inline: true }
                );

              // Add weapon kills to the embed
              for (const [weapon, count] of Object.entries(playerStats.weapons)) {
                embed.addFields({ name: `${weapon} Kills`, value: `${count}`, inline: true });
              }

              embed.setFooter({ text: 'Made by elking strong' });

              // Send the embed as a reply
              message.reply({ embeds: [embed] });
            } else {
              console.log(`No stats found for player: ${playerName}`);
              message.reply(`No stats found for player: ${playerName}`);
            }
          } catch (error) {
            // If time out happens, continue checking if user wants to stop or provide input
            console.log('No player name provided within the time limit.');
          }
        }
      }
    } else {
      console.log('No file uploaded or timed out.');
      message.reply('No file uploaded or timed out.');
      uploadKDActive = false; // Deactivate if the file upload fails
    }
  },
};

// Helper function to fetch the log content from the URL
async function fetchLogContent(url) {
  try {
    console.log(`Fetching file content from: ${url}`);
    // Use node-fetch to get the file content from the Discord file URL
    const response = await fetch(url);
    const fileBuffer = await response.buffer();
    console.log('File content fetched successfully');
    return fileBuffer.toString(); // Convert the buffer into a string (text file)
  } catch (error) {
    console.error('Error fetching file content:', error);
    return null;
  }
}


// Main log parsing function
function parseLog(logContent) {
  const stats = {};
  const lines = logContent.split('\n');

  console.log('Parsing log content...');
  console.log(`Total lines to process: ${lines.length}`);

  // Regex pattern to extract player names and weapon type from kill lines
  const killRegex = /\*?\s([^\s]+)\s+killed\s+([^\s]+)\.\s\(([^)]+)\)/g;

  lines.forEach((line, index) => {
    console.log(`Processing line ${index + 1}: ${line}`); // Debugging line
    let match;
    while ((match = killRegex.exec(line)) !== null) { // Use `exec` for multiple matches
      const player1Name = match[1].trim(); // Player who killed, trim spaces
      const player2Name = match[2].trim(); // Player who was killed, trim spaces
      const weapon = match[3].trim(); // Weapon used in the kill

      console.log(`Match found - Player 1: ${player1Name}, Player 2: ${player2Name}, Weapon: ${weapon}`);

      // Initialize stats if player not present
      if (!stats[player1Name]) stats[player1Name] = { kills: 0, deaths: 0, weapons: {} };
      if (!stats[player2Name]) stats[player2Name] = { kills: 0, deaths: 0, weapons: {} };

      // Increment kills for the player who killed, and deaths for the player who was killed
      stats[player1Name].kills += 1;
      stats[player2Name].deaths += 1;

      // Track weapon kills for player 1
      if (!stats[player1Name].weapons[weapon]) {
        stats[player1Name].weapons[weapon] = 0;
      }
      stats[player1Name].weapons[weapon] += 1;

      console.log(`Updated stats for ${player1Name}: Kills = ${stats[player1Name].kills}`);
      console.log(`Updated stats for ${player2Name}: Deaths = ${stats[player2Name].deaths}`);
    }
  });

  // After processing, debug print the stats object to verify
  console.log("Final stats:", stats);
  return stats;
}

// Function to check if a player exists in the stats
function checkPlayerStats(playerName, logContent) {
  const stats = parseLog(logContent); // Assuming logContent is your log input
  if (stats[playerName]) {
    console.log(`Stats for ${playerName}:`, stats[playerName]);
  } else {
    console.log(`No stats found for player: ${playerName}`);
  }



  console.log('Log parsing completed.');
  return stats;
}
