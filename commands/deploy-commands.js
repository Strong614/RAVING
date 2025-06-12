const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config(); // loads BOT_TOKEN and CLIENT_ID from .env

const commands = [
  new SlashCommandBuilder()
    .setName('winou')
    .setDescription('Ask where someone is')
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), // replace with your client ID
      { body: commands },
    );
    console.log('✅ Slash commands registered!');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
})();
