const puppeteer = require('puppeteer');
require('dotenv').config();
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

const saesUsername = process.env.SAES_USERNAME;
const saesPassword = process.env.SAES_PASSWORD;

async function getPlayerStats(playerName) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto('https://web.saesrpg.uk', { waitUntil: 'networkidle2' });

  try {
    await page.waitForSelector('input[placeholder="Username"]');
    await page.waitForSelector('input[placeholder="Password"]');

    await page.type('input[placeholder="Username"]', saesUsername);
    await page.type('input[placeholder="Password"]', saesPassword);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    console.log(`✅ Logged in as ${saesUsername}`);

    await page.waitForSelector('input[name="username"]', { timeout: 20000 });

    await page.click('input[name="username"]', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('input[name="username"]', playerName, { delay: 100 });
    await page.keyboard.press('Enter');

    console.log(`🔎 Searching stats for: ${playerName}`);
    const previousTableHTML = await page.$eval('tbody', el => el.innerHTML);

    await page.waitForFunction(
      oldHTML => {
        const table = document.querySelector('tbody');
        return table && table.innerHTML !== oldHTML;
      },
      { timeout: 10000 },
      previousTableHTML
    );

    const stats = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr.stat-row'));
      const statsData = {};
      rows.forEach(row => {
        const statName = row.querySelector('td:first-child')?.innerText?.trim();
        const statValue = row.querySelector('td.numeric')?.innerText?.trim();
        if (statName && statValue) {
          statsData[statName] = statValue;
        }
      });
      return statsData;
    });

    console.log('📊 Fetched stats:', stats);
    await browser.close();

    const allStats = [
      'Casino Profit', 'Casino Gambled', 'Casino Loss', 'Arms Dealer Profit',
      'Bribing Profit', 'Kills', 'Turfs Taken', 'Drug Dealer Profit', 'Medic Profit',
      'Turfs Defended', 'Total Healing Given', 'Arrests', 'Headshot Kills',
      'Store Robberies', 'Races', 'Broken out of Prison', 'Vehicles Repaired',
      'Stopped Store Robberies', 'Arrest Assists', 'Safes Cracked', 'Gang Bank Robberies Stopped',
      'Players Revived', 'Public Bank Robberies', 'VIP\'s Escorted', 'VIP\'s Captured',
      'Speedcam Hits', 'Casino Robberies Stopped', 'Public Bank Robberies Stopped',
      'Vehicles Impounded', 'Captain Shipments', 'Advertisements Placed',
      'Defended Organisation Robberies', 'Successful Organisation Robberies',
      'Casino Safe\'s Cracked', 'Delivery Man Deliveries', 'Money transports protected',
      'Pilot Deliveries', 'Vehicles Extinguished'
    ];

    const resultStats = {};
    allStats.forEach(stat => {
      resultStats[stat] = stats[stat] || 'N/A';
    });

    return resultStats;
  } catch (err) {
    await browser.close();
    throw new Error(`Login or data retrieval failed: ${err.message}`);
  }
}

module.exports = {
  execute: async (message, args) => {
    const player = args.join(' ').trim();
  
    if (!player) return message.reply('❌ Please specify a player name!');
    if (player.toLowerCase() === saesUsername?.toLowerCase())
      return message.reply(`❌ You cannot fetch stats for yourself!`);
  
    try {
      await message.channel.sendTyping();
      const fetchingMessage = await message.reply(`🔄 Fetching stats for **${player}**...`);
  
      const stats = await getPlayerStats(player);
  
      const statsEntries = Object.entries(stats);
      const pageLimit = 15;
      const pages = Math.ceil(statsEntries.length / pageLimit);
      let page = 0;
  
      const createEmbed = (pageIndex) => {
        const embed = new EmbedBuilder()
          .setTitle(`📈 ${player}'s Stats (Page ${pageIndex + 1}/${pages})`)
          .setThumbnail('https://cdn.discordapp.com/attachments/1360930454428979263/1360941416414576740/RAV1.png')
          .setColor('#A2C6CA')
          .setFooter({ text: 'Made by Lking Strong 👑' })
          .setTimestamp();
  
        const pageStats = statsEntries.slice(pageIndex * pageLimit, (pageIndex + 1) * pageLimit);
        pageStats.forEach(([name, value]) => {
          let display = name;
          if (name === 'Kills') display = `🔴 ${name}`;
          if (name === 'Arrests') display = `🟢 ${name}`;
          embed.addFields({ name: display, value, inline: true });
        });
  
        return embed;
      };
  
      const embed = createEmbed(page);
      const row = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === pages - 1)
        );
  
      await fetchingMessage.edit({ content: '', embeds: [embed], components: [row()] });
  
      const collector = fetchingMessage.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 60000,
      });
  
      collector.on('collect', async (interaction) => {
        if (interaction.customId === 'next' && page < pages - 1) page++;
        else if (interaction.customId === 'prev' && page > 0) page--;
  
        await interaction.update({
          embeds: [createEmbed(page)],
          components: [row()],
        });
      });
  
      collector.on('end', async () => {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
  
        await fetchingMessage.edit({ components: [disabledRow] });
      });
    } catch (error) {
      console.error('❌ Error:', error);
      message.reply('❌ Failed to fetch stats. Make sure the player exists and try again later.');
    }
  }  
};
