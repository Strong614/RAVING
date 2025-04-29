const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  async execute(message, args) {
    console.log('Log command is being executed');
    if (!args.length) {
      return message.reply('❌ Please provide text to log.');
    }

    const textToLog = args.join(' ');

    const logEmbed = new EmbedBuilder()
        .setThumbnail('https://cdn.discordapp.com/attachments/1360930454428979263/1360941416414576740/RAV1.png')
        .setColor('#A2C6CA')
      .setTitle('Logged Message')
      .setDescription(textToLog)
      .setFooter({ text: `Logged by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setFooter({ text: 'Made by Lking Strong 👑' })
      .setTimestamp();

    // Build buttons for RAV HQ role
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('edit_log')
          .setLabel('Edit')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('delete_log')
          .setLabel('Delete')
          .setStyle(ButtonStyle.Danger),
      );

    // Send the embed WITH buttons
    const sentMessage = await message.channel.send({ embeds: [logEmbed], components: [row] });

    // Then delete the original message
    if (message.deletable) {
      await message.delete().catch(() => {});
    }

    // Handle interaction for edit/delete
    const collector = sentMessage.createMessageComponentCollector({ time: 600_000 }); // 10 minutes

    collector.on('collect', async interaction => {
      if (!interaction.member.roles.cache.some(role => role.name === 'RAV HQ')) {
        return interaction.reply({ content: '❌ You do not have permission to use this.', ephemeral: true });
      }

      if (interaction.customId === 'edit_log') {
        await interaction.showModal({
          custom_id: 'edit_modal',
          title: 'Edit Log',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'edit_input',
                  style: 2, // Paragraph
                  label: 'New Log Message',
                  required: true,
                },
              ],
            },
          ],
        });
      } else if (interaction.customId === 'delete_log') {
        await sentMessage.delete();
      }
    });
  },
};

// Separate file or bot initialization code
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Register the modal interaction handler globally
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== 'edit_modal') return;

  const newContent = interaction.fields.getTextInputValue('edit_input');
  const message = await interaction.channel.messages.fetch(interaction.message.id); // Fetch the original message

  const editedEmbed = EmbedBuilder.from(message.embeds[0]) // Edit the existing embed
    .setDescription(newContent);

  await message.edit({ embeds: [editedEmbed] });
  await interaction.reply({ content: '✅ Log edited successfully.', ephemeral: true });
});

