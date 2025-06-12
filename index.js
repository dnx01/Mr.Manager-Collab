// index.js - Entry point for the Discord bot
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { ChannelType, PermissionsBitField } = require("discord.js");
const fs = require("fs");
require("dotenv").config();
const mongoose = require("mongoose");
const GuildConfig = require("./models/GuildConfig");
const path = require("path");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB!");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});
client.commands = new Collection();

// Load commands from ./commands
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data && command.data.name) {
    client.commands.set(command.data.name, command);
  }
}

client.once("ready", () => {
  let author;
  try {
    author = require('./utils/getAuthorInfo')();
  } catch (e) {
    // Fallback dacă getAuthorInfo.js lipsește
    author = {
      author: 'dnz_zz',
      discord: '923205829166006272',
      discord_url: 'https://discord.com/users/923205829166006272',
      website: 'https://github.com/dnx01/Mr.Manager'
    };
  }
  console.log(`Bot Author: ${author.author} | Discord: ${author.discord} (${author.discord_url || 'https://discord.com/users/' + author.discord}) | Website: ${author.website}`);
  console.log(`Logged in as ${client.user ? client.user.tag : 'Unknown'}!`);
});

client.on("interactionCreate", async (interaction) => {
  // Permission check for all commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    // Check for required permissions
    if (command.data && command.data.default_member_permissions) {
      const requiredPerms = BigInt(command.data.default_member_permissions);
      if (!interaction.member.permissions.has(requiredPerms)) {
        await interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
        return;
      }
    }
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error executing this command!",
        ephemeral: true,
      });
    }
  } else if (interaction.isButton()) {
    // Handle ticket system buttons
    if (
      interaction.customId === "open_ticket" ||
      interaction.customId === "close_ticket"
    ) {
      const ticketCmd = require("./commands/ticket.js");
      if (ticketCmd.handleButton) {
        await ticketCmd.handleButton(interaction);
      }
    }
    // Handle rules confirmation buttons
    if (
      interaction.customId === "read_rules_ro" ||
      interaction.customId === "read_rules_eng"
    ) {
      const sendRolesCmd = require(path.join(
        __dirname,
        "commands",
        "sendroles.js"
      ));
      if (sendRolesCmd.handleButton) {
        await sendRolesCmd.handleButton(interaction);
      }
    } else if (
      interaction.customId === "verify_ro" ||
      interaction.customId === "verify_eng"
    ) {
      // Use the sendverification command's handleButton
      const sendVerificationCmd = require(path.join(
        __dirname,
        "commands",
        "sendverification.js"
      ));
      if (sendVerificationCmd.handleButton) {
        await sendVerificationCmd.handleButton(interaction);
      }
    }
  } else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'sanctioninfo_select') {
      const sanctionInfoCmd = require('./commands/sanctioninfo.js');
      if (sanctionInfoCmd.handleSelect) {
        await sanctionInfoCmd.handleSelect(interaction);
      }
    } else if (interaction.customId === 'banlist_select') {
      const banlistCmd = require('./commands/banlist.js');
      if (banlistCmd.handleSelect) {
        await banlistCmd.handleSelect(interaction);
      }
    } else if (interaction.customId === 'timeoutlist_select') {
      const sanctionInfoCmd = require('./commands/sanctioninfo.js');
      if (sanctionInfoCmd.handleSelect) {
        await sanctionInfoCmd.handleSelect(interaction);
      }
    }
  }
});

// Dynamically load event handlers from commands folder
const eventFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));
for (const file of eventFiles) {
  const event = require(`./commands/${file}`);
  if (event.name && typeof event.execute === "function") {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Event listener for guild creation and updates

client.on("guildCreate", async (guild) => {
  try {
    // Check if the server already exists in the DB
    let config = await GuildConfig.findOne({ guildId: guild.id });
    if (!config) {
      config = new GuildConfig({
        guildId: guild.id,
        guildName: guild.name,
      });
      await config.save();
      console.log(`New server added: ${guild.name} (${guild.id})`);
    } else if (config.guildName !== guild.name) {
      config.guildName = guild.name;
      await config.save();
      console.log(`Server name updated: ${guild.name} (${guild.id})`);
    }

    // Ensure channels are available in cache
    await guild.channels.fetch();

    // Check if the 'configurare-bot' channel exists
    let configChannel = guild.channels.cache.find(
      (c) => c.name === "configurare-bot" && c.type === ChannelType.GuildText
    );

    // Create the channel if it doesn't exist
    if (!configChannel) {
      try {
        configChannel = await guild.channels.create({
          name: "configurare-bot",
          type: ChannelType.GuildText,
        });
      } catch (err) {
        console.error("Error creating channel:", err);
        return;
      }
    }

    // Fetch owner before permissions
    const owner = await guild.fetchOwner();

    // Correct permissions with valid objects
    await configChannel.permissionOverwrites.set([
      {
        id: guild.id, // correct for @everyone
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      },
      {
        id: owner.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      },
    ]);
    // Send welcome message
    await configChannel.send({
      embeds: [
        {
          title: `Hello, ${guild.name} community!`,
          description: `👋 I'm Mr.Manager, your all-in-one onboarding and management bot!

**Bot Author:** [dnz_zz](https://discord.com/users/923205829166006272) | [Source Code](https://github.com/dnx01/Mr.Manager)

**What I can do:**
- Automatic member verification
- Support ticket system
- Welcome messages
- Fast setup with /autosetup
- Advanced moderation: ban, kick, timeout, unban, untimeout, banlist, timeoutlist, sanction info dropdowns
- Anti-raid & anti-nuke protection
- Logging and DM notifications for all sanctions (even manual/external)
- **Granular lockdown:** Only the malicious user is restricted, not the whole server
- **Dropdowns for banlist, timeoutlist, sanction info**
- **DMs for all sanctions, including manual/unban/untimeout**
- **Strict permission checks for all commands**
- **Automatic detection and logging of external bans/timeouts**
- **Error logging for all moderation actions**
- **Modern, modular codebase (easy to extend)**

**Quick commands:**
- /autosetup – fully automatic setup
- /setwelcome – set the welcome channel
- /setverification – configure verification
- /sendroles – send the rules and verification button
- /sendverification – send the verification message
- /ticket open – open a support ticket
- /ticket close – close your ticket
- /ticket setticketpanel – send the ticket panel
- /ticket setticketstaff – set staff roles for tickets
- /admin lockdown – lockdown a user (removes all roles except @everyone, assigns lockdowned)
- /admin unlockdown – remove lockdown
- /admin purge – delete messages
- /admin announce – send announcement
- /admin unban – unban a user
- /admin unkick – notify a kicked user
- /admin untimeout – remove timeout
- /ban – ban a user (with logging & DM)
- /kick – kick a user (with logging & DM)
- /timeout – timeout a user (with logging & DM)
- /banlist – show banned users (dropdown)
- /timeoutlist – show timed out users (dropdown)
- /sanctioninfo – view sanction history (dropdown)
- /welcome – (event-based) welcome new users
- /verify – (disabled, use buttons)

**Security & Logging:**
- All moderation actions are logged and DM'd, even if done manually
- Anti-nuke/raid: detects mass join, channel/role/ban/kick spam, logs and restricts only the malicious user
- Lockdown logic: removes all roles except @everyone, assigns only lockdowned role, restricts all channels
- Error logging for failed lockdowns or permission issues
- All user-facing messages in English
- **Staff auto-alert:** All staff (with MANAGE_GUILD or ADMINISTRATOR) are DM'd instantly if a nuke/raid is detected, with details about the event, user, time, and example lockdown command

You can use /autosetup for instant configuration or the commands above for manual setup. For any questions, use this channel!`,
          color: 0x00b0f4,
          footer: { text: "Mr.Manager" },
          timestamp: new Date().toISOString(),
        },
      ],
    });
  } catch (err) {
    console.error("General error setting up new server:", err);
  }
});

client.on("guildUpdate", async (oldGuild, newGuild) => {
  try {
    let config = await GuildConfig.findOne({ guildId: newGuild.id });
    if (config && config.guildName !== newGuild.name) {
      config.guildName = newGuild.name;
      await config.save();
      console.log(`Server name updated: ${newGuild.name} (${newGuild.id})`);
    }
  } catch (err) {
    console.error("Error updating server name:", err);
  }
});

// --- ANTI-RAID/NUKE PROTECTION ---
const joinTimestamps = {};
const raidThreshold = 5; // users
const raidInterval = 10 * 1000; // 10 seconds

client.on("guildMemberAdd", async (member) => {
  const now = Date.now();
  const guildId = member.guild.id;
  if (!joinTimestamps[guildId]) joinTimestamps[guildId] = [];
  joinTimestamps[guildId].push(now);
  // Keep only joins from the last 10 seconds
  joinTimestamps[guildId] = joinTimestamps[guildId].filter(
    (ts) => now - ts < raidInterval
  );
  if (joinTimestamps[guildId].length >= raidThreshold) {
    // Send alert in the first text channel with send permission
    const alertChannel = member.guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildText && c.permissionsFor(member.guild.members.me).has("SendMessages")
    );
    if (alertChannel) {
      alertChannel.send({
        embeds: [
          {
            title: "ANTI-RAID ALERT",
            description: `${joinTimestamps[guildId].length} new users joined in <10s! Possible raid!`,
            color: 0xff0000,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }
    // You can add extra actions here: lockdown, restrictions, etc.
  }
});

// Protection for channel/role spam
const actionTimestamps = {};
const nukeThreshold = 5;
const nukeInterval = 10 * 1000;
["channelCreate", "channelDelete", "roleCreate", "roleDelete"].forEach(
  (eventName) => {
    client.on(eventName, async (obj) => {
      const guild = obj.guild || (obj.channel && obj.channel.guild);
      if (!guild) return;
      const now = Date.now();
      const key = guild.id + "-" + eventName;
      if (!actionTimestamps[key]) actionTimestamps[key] = [];
      actionTimestamps[key].push(now);
      actionTimestamps[key] = actionTimestamps[key].filter(
        (ts) => now - ts < nukeInterval
      );
      if (actionTimestamps[key].length >= nukeThreshold) {
        // --- ADVANCED ANTI-NUKE ---
        const GuildConfig = require('./models/GuildConfig');
        const config = await GuildConfig.findOne({ guildId: guild.id });
        let nukeUser = obj.executor || (obj.member ? obj.member.user : null);
        // 1. Lockdown only the malicious user (not the whole server)
        if (nukeUser && nukeUser.id) {
          try {
            const member = await guild.members.fetch(nukeUser.id).catch(() => null);
            if (member && member.manageable) {
              let lockdownRole = guild.roles.cache.find(r => r.name === 'lockdowned');
              if (!lockdownRole) {
                lockdownRole = await guild.roles.create({ name: 'lockdowned', color: 0x8b0000, reason: 'Anti-nuke lockdown' });
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
              }
              // Remove all roles except @everyone, then add lockdowned
              const rolesToKeep = [guild.id]; // doar @everyone
              await member.roles.set([...rolesToKeep, lockdownRole.id]);
              try {
                await member.send({
                  embeds: [{
                    title: `You have been lockdowned in ${guild.name}`,
                    description: `You have been restricted due to suspicious or malicious activity. If you believe this is a mistake, please contact an admin.`,
                    color: 0x8b0000,
                    footer: { text: 'Mr.Manager' },
                    timestamp: new Date().toISOString(),
                  }]
                });
              } catch (e) {}
            }
          } catch (e) { console.error('Lockdown error:', e); }
        }
        // 2. Detailed log in webhook & staff channel
        // Try to get executor from audit logs if not present
        let finalNukeUser = nukeUser;
        if ((!nukeUser || !nukeUser.id) && guild.fetchAuditLogs) {
          try {
            const auditType = eventName.startsWith('channel') ? 12 : 30; // 12: CHANNEL_DELETE, 30: ROLE_DELETE
            const logs = await guild.fetchAuditLogs({ type: auditType, limit: 1 });
            const entry = logs.entries.first();
            if (entry && entry.executor) {
              finalNukeUser = entry.executor;
            }
          } catch (e) { /* ignore audit log errors */ }
        }
        let maliciousUserInfo = finalNukeUser && finalNukeUser.id ? `<@${finalNukeUser.id}> ([Profile](https://discord.com/users/${finalNukeUser.id}))` : 'Unknown (executor not detected)';
        let lockdownExample = finalNukeUser && finalNukeUser.id
          ? `**Example lockdown command:**\n\`/admin lockdown user:${finalNukeUser.id} reason:Anti-nuke\``
          : '**Example lockdown command:**\n`/admin lockdown user:[userId] reason:Anti-nuke`';
        // Avoid showing the bot as the malicious user in alerts
        if (finalNukeUser && finalNukeUser.id === client.user.id) {
          maliciousUserInfo = 'Unknown (executor not detected)';
          lockdownExample = '**Example lockdown command:**\n`/admin lockdown user:[userId] reason:Anti-nuke`';
        }
        if (config && config.webhookUrl) {
          const { WebhookClient } = require('discord.js');
          try {
            const webhookClient = new WebhookClient({ url: config.webhookUrl });
            await webhookClient.send({
              embeds: [
                {
                  title: 'ANTI-NUKE ALERT (LOCKDOWN ACTIVATED)',
                  description: `${actionTimestamps[key].length} actions detected (${eventName}) in <10s! Only the malicious user was lockdowned!\nMalicious user: ${maliciousUserInfo}\n\n${lockdownExample}`,
                  color: 0xff0000,
                  timestamp: new Date().toISOString(),
                }
              ]
            });
          } catch (e) { /* ignore if webhook fails */ }
        }
        const alertChannel = guild.channels.cache.find(
          (c) => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has('SendMessages')
        );
        if (alertChannel) {
          alertChannel.send({
            embeds: [
              {
                title: 'ANTI-NUKE ALERT (LOCKDOWN ACTIVATED)',
                description: `${actionTimestamps[key].length} actions detected (${eventName}) in <10s! Only the malicious user was lockdowned!\nMalicious user: ${maliciousUserInfo}\n\n${lockdownExample}`,
                color: 0xff0000,
                timestamp: new Date().toISOString(),
              }
            ]
          });
        }
        // Notify all staff members (with MANAGE_GUILD or ADMINISTRATOR) about the nuke event
        const staffRolePerms = [PermissionsBitField.Flags.Administrator, PermissionsBitField.Flags.ManageGuild];
        await guild.members.fetch(); // Ensure cache is populated
        const staffMembers = guild.members.cache.filter(m =>
          !m.user.bot && (
            m.roles.cache.some(role => staffRolePerms.some(perm => role.permissions.has(perm))) ||
            staffRolePerms.some(perm => m.permissions.has(perm))
          )
        );
        const nukeTime = new Date().toLocaleString('en-GB', { timeZone: 'Europe/Bucharest' });
        for (const [id, staff] of staffMembers) {
          staff.send({
            embeds: [{
              title: '🚨 ANTI-NUKE ALERT (LOCKDOWN ACTIVATED)',
              description: `A nuke/raid event was detected in **${guild.name}** at **${nukeTime}**.\n\nMalicious user: ${maliciousUserInfo}\n\n${lockdownExample}\n\nPlease check the staff/alerts channel for more details.`,
              color: 0xff0000,
              timestamp: new Date().toISOString(),
              footer: { text: 'Mr.Manager' }
            }]
          }).catch(() => {});
        }
      }
    });
  }
);

// Detect mass ban/kick (anti-nuke)
['guildBanAdd', 'guildMemberRemove'].forEach(eventName => {
  client.on(eventName, async (memberOrGuild, user) => {
    // For guildBanAdd: memberOrGuild = guild, user = user
    // For guildMemberRemove: memberOrGuild = member
    let guild, userId;
    if (eventName === 'guildBanAdd') {
      guild = memberOrGuild;
      userId = user.id;
    } else {
      guild = memberOrGuild.guild;
      userId = memberOrGuild.id;
    }
    if (!guild) return;
    const now = Date.now();
    const key = guild.id + '-' + eventName;
    if (!actionTimestamps[key]) actionTimestamps[key] = [];
    actionTimestamps[key].push(now);
    actionTimestamps[key] = actionTimestamps[key].filter(ts => now - ts < nukeInterval);
    if (actionTimestamps[key].length >= nukeThreshold) {
      // Lockdown and log just like nuke
      const GuildConfig = require('./models/GuildConfig');
      const config = await GuildConfig.findOne({ guildId: guild.id });
      // Lockdown
      for (const channel of guild.channels.cache.values()) {
        if ((channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) && channel.permissionsFor(guild.roles.everyone)) {
          try {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
          } catch (e) {}
        }
      }
      // Detailed log
      if (config && config.webhookUrl) {
        const { WebhookClient } = require('discord.js');
        try {
          const webhookClient = new WebhookClient({ url: config.webhookUrl });
          await webhookClient.send({
            embeds: [{
              title: `ANTI-NUKE ALERT (${eventName.toUpperCase()})`,
              description: `${actionTimestamps[key].length} actions detected (${eventName}) in <10s! The server was automatically locked down!\nLast affected user: <@${userId}> ([Profile](https://discord.com/users/${userId}))\n\n**Example lockdown command:**\n\`/admin lockdown user:${userId} reason:Anti-nuke\``,
              color: 0xff0000,
              timestamp: new Date().toISOString(),
            }],
          });
        } catch (e) {}
      }
      // Staff alert
      const alertChannel = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has('SendMessages')
      );
      if (alertChannel) {
        alertChannel.send({
          embeds: [{
            title: `ANTI-NUKE ALERT (${eventName.toUpperCase()})`,
            description: `${actionTimestamps[key].length} actions detected (${eventName}) in <10s! The server was automatically locked down!\nLast affected user: <@${userId}> ([Profile](https://discord.com/users/${userId}))\n\n**Example lockdown command:**\n\`/admin lockdown user:${userId} reason:Anti-nuke\``,
            color: 0xff0000,
            timestamp: new Date().toISOString(),
          }],
        });
      }
    }
  });
});

// Detect unban and DM user if ban is lifted (even if not via bot)
client.on('guildBanRemove', async (ban) => {
  const { user, guild } = ban;
  try {
    await user.send({
      embeds: [{
        title: `You have been unbanned from ${guild.name}`,
        description: `Your ban has been lifted. You may now rejoin the server.`,
        color: 0x00b06b,
        footer: { text: 'Mr.Manager' },
        timestamp: new Date().toISOString(),
      }]
    });
  } catch (e) {}
  // Optionally, log unban in DB if there was a previous ban
  const Sanction = require('./models/Sanction');
  const lastBan = await Sanction.findOne({ guildId: guild.id, userId: user.id, type: 'ban' }).sort({ date: -1 });
  if (lastBan) {
    await Sanction.create({
      guildId: guild.id,
      userId: user.id,
      userTag: user.tag,
      staffId: 'unknown',
      staffTag: 'unknown',
      type: 'unban',
      reason: 'Ban lifted',
      date: new Date()
    });
  }
});

// Detect timeout removal and DM user (even if not via bot)
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (oldMember.communicationDisabledUntilTimestamp && !newMember.communicationDisabledUntilTimestamp) {
    try {
      await newMember.user.send({
        embeds: [{
          title: `Your timeout has been lifted in ${newMember.guild.name}`,
          description: `You can now send messages and interact in the server again.`,
          color: 0x00b06b,
          footer: { text: 'Mr.Manager' },
          timestamp: new Date().toISOString(),
        }]
      });
    } catch (e) {}
    // Optionally, log untimeout in DB if there was a previous timeout
    const Sanction = require('./models/Sanction');
    const lastTimeout = await Sanction.findOne({ guildId: newMember.guild.id, userId: newMember.id, type: 'timeout' }).sort({ date: -1 });
    if (lastTimeout) {
      await Sanction.create({
        guildId: newMember.guild.id,
        userId: newMember.id,
        userTag: newMember.user.tag,
        staffId: 'unknown',
        staffTag: 'unknown',
        type: 'untimeout',
        reason: 'Timeout lifted',
        date: new Date()
      });
    }
  }
});

// Detect ban and timeout from outside the bot and DM/log as if from bot
client.on('guildBanAdd', async (guild, user) => {
  try {
    // DM user
    await user.send({
      embeds: [{
        title: `You have been banned from ${guild.name}`,
        description: `You were banned from the server. If you believe this was a mistake, please contact the staff.`,
        color: 0xff0000,
        footer: { text: 'Mr.Manager' },
        timestamp: new Date().toISOString(),
      }]
    });
  } catch (e) {}
  // Log to DB if not already present
  const Sanction = require('./models/Sanction');
  const exists = await Sanction.findOne({ guildId: guild.id, userId: user.id, type: 'ban' });
  if (!exists) {
    await Sanction.create({
      guildId: guild.id,
      userId: user.id,
      userTag: user.tag,
      staffId: 'unknown',
      staffTag: 'unknown',
      type: 'ban',
      reason: 'Banned (manual or external)',
      date: new Date()
    });
  }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  // Timeout applied externally
  if (!oldMember.communicationDisabledUntilTimestamp && newMember.communicationDisabledUntilTimestamp) {
    try {
      await newMember.user.send({
        embeds: [{
          title: `You have been timed out in ${newMember.guild.name}`,
          description: `A timeout was applied to your account. If you believe this was a mistake, please contact the staff.`,
          color: 0xffcc00,
          footer: { text: 'Mr.Manager' },
          timestamp: new Date().toISOString(),
        }]
      });
    } catch (e) {}
    // Log to DB if not already present for this timeout
    const Sanction = require('./models/Sanction');
    const exists = await Sanction.findOne({ guildId: newMember.guild.id, userId: newMember.id, type: 'timeout', date: { $gte: new Date(Date.now() - 60000) } });
    if (!exists) {
      await Sanction.create({
        guildId: newMember.guild.id,
        userId: newMember.id,
        userTag: newMember.user.tag,
        staffId: 'unknown',
        staffTag: 'unknown',
        type: 'timeout',
        reason: 'Timeout applied (manual or external)',
        date: new Date(),
        duration: newMember.communicationDisabledUntilTimestamp - Date.now()
      });
    }
  }
});

client.login(process.env.TOKEN);
