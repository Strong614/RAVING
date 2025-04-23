// commands/rav.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { scrapeRAVMediaArchive } = require("../utils/ravScraper");

function applyFilters(posts, filters) {
  return posts.filter(post => {
    return Object.entries(filters).every(([key, value]) => {
      const field = post[key]?.toLowerCase() || "";
      return field.includes(value.toLowerCase());
    });
  });
}

module.exports = {
  name: "rav",
  description: "Shows summary of Rapid Assault Vanguard Media Archive posts",
  async execute(interaction) {
    await interaction.deferReply();
    const args = interaction.options?.getString("filters")?.split(" ") || [];
    
    const filters = {};
    for (const arg of args) {
      const [key, value] = arg.split(":");
      if (key && value) filters[key] = value;
    }

    console.log("Filters applied:", filters); // Log the filters to verify they're being set correctly

    const allPosts = await scrapeRAVMediaArchive(filters);
    console.log("Fetched posts:", allPosts); // Log the fetched posts to see what you get

    if (allPosts.length === 0) {
      await interaction.editReply("No posts found based on the filters.");
      return;
    }

    const filtered = applyFilters(allPosts, filters);
    const itemsPerPage = 5;
    let page = 0;

    const getPageEmbed = () => {
      const start = page * itemsPerPage;
      const pageItems = filtered.slice(start, start + itemsPerPage);

      const embed = new EmbedBuilder()
        .setTitle("RAV Activity Summary")
        .setDescription(`Showing posts ${start + 1}-${start + pageItems.length} of ${filtered.length}`)
        .setColor("Blue");

      pageItems.forEach((p, i) => {
        embed.addFields({
          name: `#${start + i + 1} | ${p.activityType}`,
          value: `**Poster:** ${p.poster}\n**Number:** ${p.activityNumber}\n**Participants:** ${p.participants}\n**Date:** ${p.date}`,
        });
      });

      return embed;
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Primary)
    );

    const message = await interaction.editReply({
      embeds: [getPageEmbed()],
      components: [row],
    });

    const collector = message.createMessageComponentCollector({
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "prev" && page > 0) page--;
      else if (i.customId === "next" && (page + 1) * itemsPerPage < filtered.length) page++;

      await i.update({
        embeds: [getPageEmbed()],
        components: [row],
      });
    });
  },
};
