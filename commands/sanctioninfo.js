const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const Sanction = require('../models/Sanction');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sanctioninfo')
        .setDescription('View ban/kick/timeout history with dropdown')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Sanction type')
                .setRequired(true)
                .addChoices(
                    { name: 'Ban', value: 'ban' },
                    { name: 'Kick', value: 'kick' },
                    { name: 'Timeout', value: 'timeout' }
                )
        ),
    async execute(interaction) {
        const type = interaction.options.getString('type');
        const sanctions = await Sanction.find({ guildId: interaction.guild.id, type }).sort({ date: -1 }).limit(25);
        if (!sanctions.length) return interaction.reply({ content: `No ${type}s found.`, ephemeral: true });
        const options = sanctions.map(s => ({
            label: `${s.userTag} (${s.userId})`,
            value: s._id.toString(),
            description: `By: ${s.staffTag} | ${s.reason?.slice(0, 50) || 'No reason'}`
        })).slice(0, 25);
        const select = new StringSelectMenuBuilder()
            .setCustomId('sanctioninfo_select')
            .setPlaceholder('Select a user to view details')
            .addOptions(options);
        const row = new ActionRowBuilder().addComponents(select);
        await interaction.reply({ content: `Select a user to view ${type} details:`, components: [row], ephemeral: true });
    },
    async handleSelect(interaction) {
        if (interaction.customId !== 'sanctioninfo_select' && interaction.customId !== 'timeoutlist_select') return;
        const sanctionId = interaction.values[0];
        const sanction = await require('../models/Sanction').findById(sanctionId);
        if (!sanction) return interaction.reply({ content: 'Sanction not found.', ephemeral: true });
        let desc = `**User:** <@${sanction.userId}> (${sanction.userTag})\n**Type:** ${sanction.type}\n**Reason:** ${sanction.reason}\n**Staff:** <@${sanction.staffId}> (${sanction.staffTag})\n**Date:** <t:${Math.floor(sanction.date.getTime()/1000)}:F>`;
        if (sanction.type === 'timeout' && sanction.duration) {
            desc += `\n**Duration:** ${Math.floor(sanction.duration/1000)} seconds`;
        }
        await interaction.reply({ embeds: [{ title: 'Sanction Info', description: desc, color: 0xffa500 }], ephemeral: true });
    }
};
