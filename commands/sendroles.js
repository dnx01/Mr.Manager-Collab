const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sendroles')
        .setDescription('Send the rules message with "I have read the rules" buttons (admin only).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('read_rules_ro')
                    .setLabel('Am citit regulile (RO)')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('read_rules_eng')
                    .setLabel('I have read the rules (ENG)')
                    .setStyle(ButtonStyle.Primary)
            );
        await interaction.channel.send({
            embeds: [{
                title: 'Server Rules',
                description: `**RO:**\n1. Be respectful to all members.\n2. No spam or flooding.\n3. Do not post NSFW or illegal content.\n4. Respect staff decisions.\n5. Use channels for their intended topics.\n\n**ENG:**\n1. Be respectful to all members.\n2. No spam or flooding.\n3. Do not post NSFW or illegal content.\n4. Respect staff decisions.\n5. Use channels for their intended topics.`,
                color: 0x00b0f4,
                footer: { text: 'Mr.Manager' },
                timestamp: new Date().toISOString(),
            }],
            components: [row]
        });
        await interaction.reply({ content: 'Rules message sent!', flags: 1 << 6 });
    },
    async handleButton(interaction) {
        // When user clicks "I have read the rules", create a private Verify channel for the user
        const GuildConfig = require('../models/GuildConfig');
        const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config) {
            await interaction.reply({ content: 'Verification system is not configured. Please contact an admin.', flags: 1 << 6 });
            return;
        }
        // Check if user is already verified
        const verifiedRoleId = config.verificationVerifiedRole;
        if (verifiedRoleId && interaction.member.roles.cache.has(verifiedRoleId)) {
            await interaction.reply({ content: 'You are already verified and cannot request verification again.', flags: 1 << 6 });
            return;
        }
        // Create a private channel for the user
        const channelName = `verify-${interaction.user.username}`;
        const everyoneRole = interaction.guild.roles.everyone;
        const member = interaction.member;
        const verifyCategory = interaction.guild.channels.cache.find(c => c.name.toLowerCase().includes('verify') && c.type === 4); // 4 = Category
        const channelOptions = {
            type: 0, // 0 = GUILD_TEXT
            permissionOverwrites: [
                { id: everyoneRole.id, deny: ['ViewChannel'] },
                { id: member.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
            ]
        };
        if (verifyCategory) channelOptions.parent = verifyCategory.id;
        const newChannel = await interaction.guild.channels.create({
            name: channelName,
            ...channelOptions
        });
        // Send verification message in the new channel
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_ro')
                    .setLabel('Română')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('verify_eng')
                    .setLabel('English')
                    .setStyle(ButtonStyle.Secondary)
            );
        await newChannel.send({
            content: `${member}`,
            embeds: [{
                title: 'Verification',
                description: 'Please select your language to get access to the server.',
                color: 0x00b0f4,
                footer: { text: 'Mr.Manager' },
                timestamp: new Date().toISOString(),
            }],
            components: [row]
        });
        await interaction.reply({ content: `A private verification channel has been created for you: ${newChannel}`, flags: 1 << 6 });
        // Listen for verification and delete the channel after
        const filter = i => (i.customId === 'verify_ro' || i.customId === 'verify_eng') && i.user.id === member.id;
        const collector = newChannel.createMessageComponentCollector({ filter, time: 5 * 60 * 1000, max: 1 });
        collector.on('collect', async i => {
            // Use the verification logic from sendverification.js
            const sendVerificationCmd = require('./sendverification.js');
            if (sendVerificationCmd && sendVerificationCmd.handleButton) {
                try {
                    if (!i.replied && !i.deferred) {
                        await sendVerificationCmd.handleButton(i);
                    }
                } catch (err) {
                    // If already replied, ignore
                }
            }
            setTimeout(async () => {
                await newChannel.delete().catch(() => { });
            }, 3000);
        });
        collector.on('end', async collected => {
            if (collected.size === 0) {
                await newChannel.delete().catch(() => { });
            }
        });
    }
};
