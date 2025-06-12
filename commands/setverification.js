const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setverification')
        .setDescription('Configure the verification system (admin only).')
        .addRoleOption(option =>
            option.setName('memberrole')
                .setDescription('Role to assign after verification (e.g. Member)')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('rorole')
                .setDescription('Role for Romanian language (e.g. RO)')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('engrole')
                .setDescription('Role for English language (e.g. ENG)')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('notverifiedrole')
                .setDescription('Role to assign automatically on join (e.g. usernotverify)')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('verifiedrole')
                .setDescription('Role to assign after verification (e.g. verify)')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const memberRole = interaction.options.getRole('memberrole');
        const roRole = interaction.options.getRole('rorole');
        const engRole = interaction.options.getRole('engrole');
        const notVerifiedRole = interaction.options.getRole('notverifiedrole');
        const verifiedRole = interaction.options.getRole('verifiedrole');
        const guildId = interaction.guild.id;
        try {
            let config = await GuildConfig.findOne({ guildId });
            if (!config) {
                config = new GuildConfig({ guildId, guildName: interaction.guild.name });
            }
            config.verificationMemberRole = memberRole.id;
            config.verificationRoRole = roRole.id;
            config.verificationEngRole = engRole.id;
            config.verificationNotVerifiedRole = notVerifiedRole.id;
            config.verificationVerifiedRole = verifiedRole.id;
            await config.save();
            await interaction.reply({
                embeds: [{
                    title: 'Verification System Configured',
                    description: `Member role: <@&${memberRole.id}>\nRO role: <@&${roRole.id}>\nENG role: <@&${engRole.id}>\nNot Verified role: <@&${notVerifiedRole.id}>\nVerified role: <@&${verifiedRole.id}>`,
                    color: 0x00b0f4,
                    footer: { text: 'Mr.Manager' },
                    timestamp: new Date().toISOString(),
                }],
                flags: 1 << 6
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: 'There was an error saving the verification config.', flags: 1 << 6 });
        }
    },
};
