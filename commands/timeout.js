const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const Sanction = require('../models/Sanction');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user and log the sanction')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to timeout')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Timeout duration (e.g. 10m, 1h, 1d)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for timeout')
                .setRequired(false)
        ),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided.';
        const duration = ms(durationStr);
        if (!duration || duration < 10000 || duration > 28 * 24 * 60 * 60 * 1000) {
            return interaction.reply({ content: 'Invalid duration. Use formats like 10m, 1h, 1d (min 10s, max 28d).', ephemeral: true });
        }
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: 'User not found or not in server.', ephemeral: true });
        if (!member.moderatable) return interaction.reply({ content: 'I cannot timeout this user.', ephemeral: true });
        await member.timeout(duration, reason);
        // Save to DB
        await Sanction.create({
            guildId: interaction.guild.id,
            userId: user.id,
            userTag: user.tag,
            staffId: interaction.user.id,
            staffTag: interaction.user.tag,
            type: 'timeout',
            reason,
            duration
        });
        // DM user
        try {
            await user.send({
                embeds: [{
                    title: `You have been timed out in ${interaction.guild.name}`,
                    description: `**Duration:** ${durationStr}\n**Reason:** ${reason}\n**Staff:** ${interaction.user.tag}\n**Date:** ${new Date().toLocaleString()}\n\nWhile timed out, you cannot send messages or interact in the server. If you believe this was a mistake, please contact the server staff (if appeals are allowed).`,
                    color: 0xffcc00,
                    footer: { text: 'Mr.Manager' },
                    timestamp: new Date().toISOString(),
                }]
            });
        } catch (e) {}
        await interaction.reply({ content: `User <@${user.id}> has been timed out for ${durationStr}.`, ephemeral: true });
    }
};
