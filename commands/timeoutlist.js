const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const Sanction = require('../models/Sanction');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeoutlist')
        .setDescription('Show a dropdown with all users who have active timeouts')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        // Find all users with active timeouts in this guild
        const now = Date.now();
        const sanctions = await Sanction.find({
            guildId: interaction.guild.id,
            type: 'timeout',
            $expr: { $gt: [ { $add: ["$date", "$duration"] }, now ] }
        }).sort({ date: -1 }).limit(25);
        if (!sanctions.length) return interaction.reply({ content: 'No users are currently timed out.', ephemeral: true });
        const options = sanctions.map(s => ({
            label: `${s.userTag} (${s.userId})`,
            value: s._id.toString(),
            description: `By: ${s.staffTag} | ${s.reason?.slice(0, 50) || 'No reason'}`
        })).slice(0, 25);
        const select = new StringSelectMenuBuilder()
            .setCustomId('timeoutlist_select')
            .setPlaceholder('Select a timed out user')
            .addOptions(options);
        const row = new ActionRowBuilder().addComponents(select);
        await interaction.reply({ content: 'Select a user to view timeout details:', components: [row], ephemeral: true });
    }
};
