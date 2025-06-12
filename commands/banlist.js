const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banlist')
        .setDescription('Show a dropdown with all banned users')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        const bans = await interaction.guild.bans.fetch();
        if (!bans.size) return interaction.reply({ content: 'No users are currently banned.', ephemeral: true });
        // Limit to 25 for Discord select menu
        const options = bans.map(ban => ({
            label: ban.user.tag,
            value: ban.user.id,
            description: ban.reason ? ban.reason.substring(0, 50) : 'No reason provided.'
        })).slice(0, 25);
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('banlist_select')
                .setPlaceholder('Select a banned user')
                .addOptions(options)
        );
        await interaction.reply({ content: 'Select a banned user to view details:', components: [row], ephemeral: true });
    },
    async handleSelect(interaction) {
        const userId = interaction.values[0];
        const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
        if (!ban) return interaction.update({ content: 'User is no longer banned.', components: [], embeds: [] });
        const embed = new EmbedBuilder()
            .setTitle(`Ban Info: ${ban.user.tag}`)
            .setDescription(`**User:** <@${ban.user.id}> (${ban.user.id})\n**Reason:** ${ban.reason || 'No reason provided.'}`)
            .setColor(0xff0000)
            .setThumbnail(ban.user.displayAvatarURL())
            .setTimestamp(new Date());
        await interaction.update({ embeds: [embed], components: [] });
    }
};
