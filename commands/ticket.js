const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Support ticket system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('open')
                .setDescription('Open a new ticket (private channel)')
        )
        .addSubcommand(sub =>
            sub.setName('close')
                .setDescription('Close the current ticket channel (only in ticket channel)')
        )
        .addSubcommand(sub =>
            sub.setName('setticketpanel')
                .setDescription('Send the ticket panel embed in the current channel (admin only)')
        )
        .addSubcommand(sub =>
            sub.setName('setticketstaff')
                .setDescription('Set staff roles that have access to tickets (admin only)')
                .addRoleOption(option =>
                    option.setName('staffrole1')
                        .setDescription('First staff role with access to tickets')
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option.setName('staffrole2')
                        .setDescription('Second staff role with access to tickets (optional)')
                        .setRequired(false)
                )
                .addRoleOption(option =>
                    option.setName('staffrole3')
                        .setDescription('Third staff role with access to tickets (optional)')
                        .setRequired(false)
                )
        ),
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'open') {
            // Check if user already has an open ticket channel
            const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.id}`);
            if (existing) {
                await interaction.reply({ content: `You already have an open ticket: ${existing}`, flags: 1 << 6 });
                return;
            }
            // Create private channel
            const everyoneRole = interaction.guild.roles.everyone;
            // Use only staff roles set by owner
            const GuildConfig = require('../models/GuildConfig');
            const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
            let staffRoleIds = config && config.ticketStaffRoles ? config.ticketStaffRoles : [];
            // Permissions: only @everyone (deny), user, bot, and staff roles set by owner (allow)
            const overwrites = [
                { id: everyoneRole.id, deny: ['ViewChannel'] },
                { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
            ];
            staffRoleIds.forEach(roleId => {
                overwrites.push({ id: roleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] });
            });
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.id}`,
                type: 0, // GUILD_TEXT
                permissionOverwrites: overwrites,
            });
            // Embed with close button
            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close ticket')
                    .setStyle(ButtonStyle.Danger)
            );
            await channel.send({
                content: `${interaction.user}`,
                embeds: [{
                    title: 'Ticket opened',
                    description: 'A staff member will assist you soon. Press the button to close the ticket when you are done.',
                    color: 0x00b0f4,
                    footer: { text: 'Mr.Manager' },
                    timestamp: new Date().toISOString(),
                }],
                components: [closeRow]
            });
            await interaction.reply({ content: `Your ticket has been created: ${channel}`, flags: 1 << 6 });
        } else if (sub === 'close') {
            // Can only be used in a ticket channel
            if (!interaction.channel.name.startsWith('ticket-')) {
                await interaction.reply({ content: 'This command can only be used in a ticket channel.', flags: 1 << 6 });
                return;
            }
            await interaction.reply({ content: 'The ticket will be closed in 3 seconds...', flags: 1 << 6 });
            setTimeout(async () => {
                await interaction.channel.delete().catch(() => {});
            }, 3000);
        } else if (sub === 'setticketpanel') {
            // Send embed with button in current channel
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ticket')
                    .setLabel('Open ticket')
                    .setStyle(ButtonStyle.Primary)
            );
            await interaction.channel.send({
                embeds: [{
                    title: 'Support - Open a ticket',
                    description: 'Press the button below to open a private ticket with the staff.',
                    color: 0x00b0f4,
                    footer: { text: 'Mr.Manager' },
                    timestamp: new Date().toISOString(),
                }],
                components: [row]
            });
            await interaction.reply({ content: 'The ticket panel has been sent!', flags: 1 << 6 });
        } else if (sub === 'setticketstaff') {
            // Save staff roles in GuildConfig
            const GuildConfig = require('../models/GuildConfig');
            const guildId = interaction.guild.id;
            const staffRoles = [
                interaction.options.getRole('staffrole1')?.id,
                interaction.options.getRole('staffrole2')?.id,
                interaction.options.getRole('staffrole3')?.id
            ].filter(Boolean);
            let config = await GuildConfig.findOne({ guildId });
            if (!config) {
                config = new GuildConfig({ guildId, guildName: interaction.guild.name });
            }
            config.ticketStaffRoles = staffRoles;
            await config.save();
            await interaction.reply({ content: `Staff roles for tickets have been set: ${staffRoles.map(r => `<@&${r}>`).join(', ')}`, flags: 1 << 6 });
        }
    },
    async handleButton(interaction) {
        if (interaction.customId === 'open_ticket') {
            // Check if user already has a ticket
            const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.id}`);
            if (existing) {
                await interaction.reply({ content: `You already have an open ticket: ${existing}`, flags: 1 << 6 });
                return;
            }
            // Create private channel
            const everyoneRole = interaction.guild.roles.everyone;
            // Use only staff roles set by owner
            const GuildConfig = require('../models/GuildConfig');
            const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
            let staffRoleIds = config && config.ticketStaffRoles ? config.ticketStaffRoles : [];
            // Permissions: only @everyone (deny), user, bot, and staff roles set by owner (allow)
            const overwrites = [
                { id: everyoneRole.id, deny: ['ViewChannel'] },
                { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
            ];
            staffRoleIds.forEach(roleId => {
                overwrites.push({ id: roleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] });
            });
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.id}`,
                type: 0, // GUILD_TEXT
                permissionOverwrites: overwrites,
            });
            // Embed with close button
            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close ticket')
                    .setStyle(ButtonStyle.Danger)
            );
            await channel.send({
                content: `${interaction.user}`,
                embeds: [{
                    title: 'Ticket opened',
                    description: 'A staff member will assist you soon. Press the button to close the ticket when you are done.',
                    color: 0x00b0f4,
                    footer: { text: 'Mr.Manager' },
                    timestamp: new Date().toISOString(),
                }],
                components: [closeRow]
            });
            await interaction.reply({ content: `Your ticket has been created: ${channel}`, flags: 1 << 6 });
        } else if (interaction.customId === 'close_ticket') {
            // Can only be used in a ticket channel
            if (!interaction.channel.name.startsWith('ticket-')) {
                await interaction.reply({ content: 'This command can only be used in a ticket channel.', flags: 1 << 6 });
                return;
            }
            await interaction.reply({ content: 'The ticket will be closed in 3 seconds...', flags: 1 << 6 });
            setTimeout(async () => {
                await interaction.channel.delete().catch(() => {});
            }, 3000);
        }
    }
};
