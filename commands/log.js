const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');

module.exports = {
  async execute(message, args) {
    if (!args.length) {
      return message.reply('❌ Please provide text to log.');
    }

    const textToLog = args.join(' ');

    const logEmbed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle('Logged Message')
      .setDescription(textToLog)
      .setFooter({ text: `Logged by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    const buttons = new ActionRowBuilder()
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

    const sentMessage = await message.channel.send({ embeds: [logEmbed], components: [buttons] });

    await message.delete().catch(error => {
      console.error('Failed to delete the original message:', error);
    });

    // Create a collector for button clicks
    const collector = sentMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 10 * 60 * 1000 }); // 10 min timeout

    collector.on('collect', async interaction => {
      // Check if the user has the RAV HQ role
      const ravHqRole = interaction.guild.roles.cache.find(role => role.name === 'RAV HQ');
      if (!ravHqRole || !interaction.member.roles.cache.has(ravHqRole.id)) {
        return interaction.reply({ content: '❌ You do not have permission to use this.', ephemeral: true });
      }

      if (interaction.customId === 'delete_log') {
        await sentMessage.delete().catch(console.error);
      } else if (interaction.customId === 'edit_log') {
        // Show a modal to edit
        const modal = new ModalBuilder()
          .setCustomId('editLogModal')
          .setTitle('Edit Logged Message');

        const textInput = new TextInputBuilder()
          .setCustomId('newLogText')
          .setLabel('New Text')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setValue(logEmbed.data.description.slice(0, 1024)); // Prefill current text

        const modalRow = new ActionRowBuilder().addComponents(textInput);

        modal.addComponents(modalRow);

        await interaction.showModal(modal);
      }
    });

    // Listen for modal submit
    message.client.on('interactionCreate', async modalInteraction => {
      if (!modalInteraction.isModalSubmit()) return;
      if (modalInteraction.customId !== 'editLogModal') return;

      const ravHqRole = modalInteraction.guild.roles.cache.find(role => role.name === 'RAV HQ');
      if (!ravHqRole || !modalInteraction.member.roles.cache.has(ravHqRole.id)) {
        return modalInteraction.reply({ content: '❌ You do not have permission to edit.', ephemeral: true });
      }

      const newText = modalInteraction.fields.getTextInputValue('newLogText');

      const updatedEmbed = EmbedBuilder.from(logEmbed).setDescription(newText).setTimestamp(new Date());

      await sentMessage.edit({ embeds: [updatedEmbed] });

      await modalInteraction.reply({ content: '✅ Log updated successfully!', ephemeral: true });
    });
  },
};

