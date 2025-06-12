const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Sanction = require('../models/Sanction');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user and log the sanction')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to kick')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for kick')
                .setRequired(false)
        ),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided.';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: 'User not found or not in server.', ephemeral: true });
        if (!member.kickable) return interaction.reply({ content: 'I cannot kick this user.', ephemeral: true });
        await member.kick(reason);
        // Save to DB
        await Sanction.create({
            guildId: interaction.guild.id,
            userId: user.id,
            userTag: user.tag,
            staffId: interaction.user.id,
            staffTag: interaction.user.tag,
            type: 'kick',
            reason
        });
        // DM user
        try {
            await user.send({
                embeds: [{
                    title: `You have been kicked from ${interaction.guild.name}`,
                    description: `**Reason:** ${reason}\n**Staff:** ${interaction.user.tag}\n**Date:** ${new Date().toLocaleString()}\n\nIf you believe this was a mistake, please contact the server staff (if appeals are allowed).`,
                    color: 0xffa500,
                    footer: { text: 'Mr.Manager' },
                    timestamp: new Date().toISOString(),
                }]
            });
        } catch (e) {}
        await interaction.reply({ content: `User <@${user.id}> has been kicked.`, ephemeral: true });
    }
};
