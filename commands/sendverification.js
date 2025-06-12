const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sendverification')
        .setDescription('Send the verification message in the configured channel (admin only).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', flags: 1 << 6 });
            return;
        }

        const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config || !config.verificationChannel) {
            await interaction.reply({ content: 'Verification system is not configured. Use /setverification first.', flags: 1 << 6 });
            return;
        }

        const channel = interaction.guild.channels.cache.get(config.verificationChannel);
        if (!channel) {
            await interaction.reply({ content: 'Verification channel not found.', flags: 1 << 6 });
            return;
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_ro')
                    .setLabel('Romanian')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('verify_eng')
                    .setLabel('English')
                    .setStyle(ButtonStyle.Secondary)
            );

        await channel.send({
            embeds: [{
                title: 'Verification',
                description: 'Please select your language to get access to the server.',
                color: 0x00b0f4,
                footer: { text: 'Mr.Manager' },
                timestamp: new Date().toISOString(),
            }],
            components: [row],
        });

        await interaction.reply({ content: 'Verification message sent!', flags: 1 << 6 });
    },

    async handleButton(interaction) {
        // Avoid Unknown interaction: if already replied/deferred, do nothing
        if (interaction.replied || interaction.deferred) return;
        try {
            await interaction.deferReply({ ephemeral: true });
        } catch (e) {
            // If already handled, exit
            return;
        }

        const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config) {
            await interaction.editReply({ content: 'Verification system is not configured. Please contact an admin.' });
            return;
        }

        let memberRole, langRole;
        if (interaction.customId === 'verify_ro') {
            memberRole = config.verificationMemberRole ? interaction.guild.roles.cache.get(config.verificationMemberRole) : null;
            langRole = config.verificationRoRole ? interaction.guild.roles.cache.get(config.verificationRoRole) : null;
        } else if (interaction.customId === 'verify_eng') {
            memberRole = config.verificationMemberRole ? interaction.guild.roles.cache.get(config.verificationMemberRole) : null;
            langRole = config.verificationEngRole ? interaction.guild.roles.cache.get(config.verificationEngRole) : null;
        }

        // Remove not verified and add verified role (customizable)
        const notVerifiedRoleId = config.verificationNotVerifiedRole;
        const verifiedRoleId = config.verificationVerifiedRole;

        if (notVerifiedRoleId && interaction.member.roles.cache.has(notVerifiedRoleId)) {
            const notVerifiedRole = interaction.guild.roles.cache.get(notVerifiedRoleId);
            if (notVerifiedRole) await interaction.member.roles.remove(notVerifiedRole);
        }

        if (verifiedRoleId && !interaction.member.roles.cache.has(verifiedRoleId)) {
            const verifiedRole = interaction.guild.roles.cache.get(verifiedRoleId);
            if (verifiedRole) await interaction.member.roles.add(verifiedRole);
        }

        let addedRoles = [];

        if (memberRole && !interaction.member.roles.cache.has(memberRole.id)) {
            await interaction.member.roles.add(memberRole);
            addedRoles.push(memberRole.name);
        }

        if (langRole && !interaction.member.roles.cache.has(langRole.id)) {
            await interaction.member.roles.add(langRole);
            addedRoles.push(langRole.name);
        }

        if (addedRoles.length > 0 || verifiedRoleId) {
            await interaction.editReply({
                embeds: [{
                    title: 'Verification Complete',
                    description: `You have been verified and received the following roles: ${[...(verifiedRoleId ? [verifiedRoleId] : []), ...addedRoles].map(r => `**${r}**`).join(', ')}`,
                    color: 0x00b0f4,
                    footer: { text: 'Mr.Manager' },
                    timestamp: new Date().toISOString(),
                }]
            });
        } else {
            await interaction.editReply({ content: 'You already have the required roles or roles are not configured.' });
        }
    }
};
