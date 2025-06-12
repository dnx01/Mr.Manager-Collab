const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Administrative commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('lockdown')
                .setDescription('Lockdown a user (remove all roles, give lockdowned role)')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to lockdown')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('unlockdown')
                .setDescription('Remove lockdowned role from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to unlock')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('purge')
                .setDescription('Delete the last N messages in this channel')
                .addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('Number of messages to delete (max 100)')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('announce')
                .setDescription('Send an announcement to a channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to send the announcement to')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Announcement message')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('unban')
                .setDescription('Unban a user and notify them')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to unban')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('unkick')
                .setDescription('Send a DM to a user who rejoins after a kick (manual notification)')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to notify')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('untimeout')
                .setDescription('Remove timeout from a user and notify them')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove timeout from')
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'lockdown') {
            const user = interaction.options.getUser('user');
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
            let lockdownRole = interaction.guild.roles.cache.find(r => r.name === 'lockdowned');
            if (!lockdownRole) {
                lockdownRole = await interaction.guild.roles.create({ name: 'lockdowned', color: 0x8b0000, reason: 'Manual lockdown' });
                // Set restrictive permissions for lockdowned role on all channels
                const { ChannelType } = require('discord.js');
                for (const channel of interaction.guild.channels.cache.values()) {
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
            }
            // Remove all roles except managed and @everyone, then add lockdowned
            const rolesToKeep = member.roles.cache.filter(r => r.managed || r.id === interaction.guild.id).map(r => r.id);
            await member.roles.set([...rolesToKeep, lockdownRole.id]);
            await interaction.reply({ content: `User <@${user.id}> has been lockdowned.`, ephemeral: true });
        } else if (sub === 'unlockdown') {
            const user = interaction.options.getUser('user');
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
            let lockdownRole = interaction.guild.roles.cache.find(r => r.name === 'lockdowned');
            if (lockdownRole && member.roles.cache.has(lockdownRole.id)) {
                await member.roles.remove(lockdownRole);
                await interaction.reply({ content: `Lockdown removed from <@${user.id}>.`, ephemeral: true });
            } else {
                await interaction.reply({ content: 'User is not lockdowned.', ephemeral: true });
            }
        } else if (sub === 'purge') {
            const count = interaction.options.getInteger('count');
            if (count < 1 || count > 100) return interaction.reply({ content: 'Count must be between 1 and 100.', ephemeral: true });
            const messages = await interaction.channel.bulkDelete(count, true).catch(() => null);
            if (!messages) return interaction.reply({ content: 'Failed to delete messages. Make sure messages are not older than 14 days.', ephemeral: true });
            await interaction.reply({ content: `Deleted ${messages.size} messages.`, ephemeral: true });
        } else if (sub === 'announce') {
            const channel = interaction.options.getChannel('channel');
            const message = interaction.options.getString('message');
            if (!channel.isTextBased()) return interaction.reply({ content: 'Selected channel is not a text channel.', ephemeral: true });
            await channel.send({ content: message });
            await interaction.reply({ content: 'Announcement sent!', ephemeral: true });
        } else if (sub === 'unban') {
            const user = interaction.options.getUser('user');
            const bans = await interaction.guild.bans.fetch();
            const banned = bans.get(user.id);
            if (!banned) return interaction.reply({ content: 'User is not banned.', ephemeral: true });
            await interaction.guild.members.unban(user.id, `Unbanned by ${interaction.user.tag}`);
            // DM user
            try {
                await user.send({
                    embeds: [{
                        title: `You have been unbanned from ${interaction.guild.name}`,
                        description: `Your ban has been lifted by **${interaction.user.tag}** on ${new Date().toLocaleString()}.\nYou may now rejoin the server.`,
                        color: 0x00b06b,
                        footer: { text: 'Mr.Manager' },
                        timestamp: new Date().toISOString(),
                    }]
                });
            } catch (e) {}
            await interaction.reply({ content: `User <@${user.id}> has been unbanned.`, ephemeral: true });
        } else if (sub === 'unkick') {
            const user = interaction.options.getUser('user');
            try {
                await user.send({
                    embeds: [{
                        title: `You have been allowed to rejoin ${interaction.guild.name}`,
                        description: `You may now rejoin the server. If you have any questions, contact the staff.`,
                        color: 0x00b06b,
                        footer: { text: 'Mr.Manager' },
                        timestamp: new Date().toISOString(),
                    }]
                });
            } catch (e) {}
            await interaction.reply({ content: `User <@${user.id}> has been notified they can rejoin.`, ephemeral: true });
        } else if (sub === 'untimeout') {
            const user = interaction.options.getUser('user');
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) return interaction.reply({ content: 'User not found or not in server.', ephemeral: true });
            if (!member.communicationDisabledUntilTimestamp) return interaction.reply({ content: 'User is not timed out.', ephemeral: true });
            await member.timeout(null, `Timeout removed by ${interaction.user.tag}`);
            try {
                await user.send({
                    embeds: [{
                        title: `Your timeout has been lifted in ${interaction.guild.name}`,
                        description: `You can now send messages and interact in the server again.`,
                        color: 0x00b06b,
                        footer: { text: 'Mr.Manager' },
                        timestamp: new Date().toISOString(),
                    }]
                });
            } catch (e) {}
            await interaction.reply({ content: `Timeout removed from <@${user.id}>.`, ephemeral: true });
        }
    }
};
