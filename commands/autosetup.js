const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autosetup')
        .setDescription('Automatically configure all roles and channels needed for Mr.Manager!')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.reply({ content: 'Automatically configuring the server... (this may take a few seconds)', ephemeral: true });
        const guild = interaction.guild;

        // 1. Required roles
        const rolesToCreate = [
            { name: 'Member', color: 0x00b0f4 },
            { name: 'RO', color: 0x349e3c },
            { name: 'ENG', color: 0x3c6e9e },
            { name: 'usernotverify', color: 0x808080 },
            { name: 'verify', color: 0x00ff99 },
            { name: 'Staff', color: 0xf4d942, permissions: ['Administrator'] }
        ];
        const createdRoles = {};
        for (const roleData of rolesToCreate) {
            let role = guild.roles.cache.find(r => r.name === roleData.name);
            if (!role) {
                role = await guild.roles.create({ name: roleData.name, color: roleData.color, permissions: roleData.permissions || [] });
            }
            createdRoles[roleData.name] = role;
        }
        // Create lockdowned role if missing
        let lockdownRole = guild.roles.cache.find(r => r.name === 'lockdowned');
        if (!lockdownRole) {
            lockdownRole = await guild.roles.create({ name: 'lockdowned', color: 0x8b0000, reason: 'Anti-nuke lockdown' });
        }
        // Set restrictive permissions for lockdowned role on all channels
        for (const channel of guild.channels.cache.values()) {
            if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
                try {
                    await channel.permissionOverwrites.edit(lockdownRole, {
                        ViewChannel: false,
                        SendMessages: false,
                        AddReactions: false,
                        Speak: false
                    });
                } catch (e) {}
            }
        }

        // 2. Category and channels
        let infoCategory = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('info'));
        if (!infoCategory) {
            infoCategory = await guild.channels.create({ name: 'ℹ️ info', type: ChannelType.GuildCategory });
        }
        const channelsToCreate = [
            { name: '📥 welcome', type: ChannelType.GuildText },
            { name: '📜 rules', type: ChannelType.GuildText },
            { name: '🎫 ticket', type: ChannelType.GuildText },
            { name: 'log-webhook', type: ChannelType.GuildText }
        ];
        const createdChannels = {};
        for (const ch of channelsToCreate) {
            let channel = guild.channels.cache.find(c => c.name === ch.name && c.type === ch.type && c.parentId === infoCategory.id);
            if (!channel) {
                channel = await guild.channels.create({ name: ch.name, type: ch.type, parent: infoCategory.id });
            } else if (channel.parentId !== infoCategory.id) {
                await channel.setParent(infoCategory.id);
            }
            createdChannels[ch.name.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase()] = channel;
        }

        // 3. Permissions for #rules
        await createdChannels['rules'].permissionOverwrites.set([
            { id: guild.roles.everyone.id, allow: ['ViewChannel'] },
            { id: createdRoles['usernotverify'].id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
            { id: createdRoles['Member'].id, deny: ['ViewChannel'] },
            { id: createdRoles['RO'].id, deny: ['ViewChannel'] },
            { id: createdRoles['ENG'].id, deny: ['ViewChannel'] },
            { id: createdRoles['verify'].id, deny: ['ViewChannel'] },
            { id: createdRoles['Staff'].id, deny: ['ViewChannel'] }
        ]);

        // 4. Permissions for other created channels
        for (const chName of ['welcome', 'ticket']) {
            await createdChannels[chName].permissionOverwrites.set([
                { id: guild.roles.everyone.id, deny: ['ViewChannel'] },
                { id: createdRoles['Member'].id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                { id: createdRoles['RO'].id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                { id: createdRoles['ENG'].id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                { id: createdRoles['verify'].id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                { id: createdRoles['Staff'].id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
            ]);
        }

        // 5. Hide all other text/voice channels for usernotverify (except #rules)
        for (const channel of guild.channels.cache.values()) {
            if ((channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) && channel.id !== createdChannels['rules'].id) {
                try {
                    await channel.permissionOverwrites.edit(createdRoles['usernotverify'].id, { ViewChannel: false });
                } catch (e) {}
            }
        }

        // 6. Save config in DB (before webhook!)
        let config = await GuildConfig.findOne({ guildId: guild.id });
        if (!config) config = new GuildConfig({ guildId: guild.id, guildName: guild.name });
        config.welcomeChannel = createdChannels['welcome'].id;
        config.verificationMemberRole = createdRoles['Member'].id;
        config.verificationRoRole = createdRoles['RO'].id;
        config.verificationEngRole = createdRoles['ENG'].id;
        config.verificationNotVerifiedRole = createdRoles['usernotverify'].id;
        config.verificationVerifiedRole = createdRoles['verify'].id;
        config.ticketStaffRoles = [createdRoles['Staff'].id];
        await config.save();

        // Create a webhook in log-webhook channel and save url in DB
        let webhook = await createdChannels['log-webhook'].createWebhook({
            name: 'Mr.Manager Log',
            avatar: interaction.client.user.displayAvatarURL()
        });
        config.webhookUrl = webhook.url;
        await config.save();

        // 7. Send rules embed and buttons in #rules
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('read_rules_ro')
                .setLabel('Am citit regulile (RO)')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('read_rules_eng')
                .setLabel('I have read the rules (ENG)')
                .setStyle(ButtonStyle.Primary)
        );
        await createdChannels['rules'].send({
            embeds: [{
                title: 'Server Rules',
                description: `**RO:**\n1. Be respectful to all members.\n2. No spam or flooding.\n3. Do not post NSFW or illegal content.\n4. Respect staff decisions.\n5. Use channels for their intended topics.\n\n**ENG:**\n1. Be respectful to all members.\n2. No spam or flooding.\n3. Do not post NSFW or illegal content.\n4. Respect staff decisions.\n5. Use channels for their intended topics.`,
                color: 0x00b0f4,
                footer: { text: 'Mr.Manager' },
                timestamp: new Date().toISOString(),
            }],
            components: [row]
        });

        // 8. Summary for admin
        await interaction.followUp({ content: `AutoSetup complete! All steps have been completed.\nAutomatic logs will be sent in the #log-webhook channel via webhook. You can use the webhook URL from the database for external integration.`, ephemeral: true });
    }
};
