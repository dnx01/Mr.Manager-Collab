const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription('Set the welcome channel for this server.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where welcome messages will be sent')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;
        try {
            let config = await GuildConfig.findOne({ guildId });
            if (!config) {
                config = new GuildConfig({ guildId, guildName: interaction.guild.name });
            }
            config.welcomeChannel = channel.id;
            await config.save();
            await interaction.reply({
                embeds: [{
                    title: 'Welcome Channel Set',
                    description: `Welcome messages will be sent in <#${channel.id}>!`,
                    color: 0x00b0f4,
                    footer: { text: 'Mr.Manager' },
                    timestamp: new Date().toISOString(),
                }],
                flags: 1 << 6 // Equivalent to MessageFlags.Ephemeral
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: 'There was an error saving the welcome channel.', flags: 1 << 6 });
        }
    },
};
