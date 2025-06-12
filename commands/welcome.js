const GuildConfig = require('../models/GuildConfig');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            // Assign 'usernotverify' (customizable) role on join
            const config = await GuildConfig.findOne({ guildId: member.guild.id });
            const notVerifiedRoleId = config && config.verificationNotVerifiedRole;
            if (notVerifiedRoleId && !member.roles.cache.has(notVerifiedRoleId)) {
                const notVerifiedRole = member.guild.roles.cache.get(notVerifiedRoleId);
                if (notVerifiedRole) {
                    await member.roles.add(notVerifiedRole);
                }
            }
            if (config && config.welcomeChannel) {
                const channel = member.guild.channels.cache.get(config.welcomeChannel);
                if (channel) {
                    await channel.send({
                        embeds: [{
                            title: `Welcome to ${member.guild.name}!`,
                            description: `Hello ${member}, we are glad to have you here! 🎉\nPlease read the rules and enjoy your stay.`,
                            color: 0x00b0f4,
                            thumbnail: { url: member.user.displayAvatarURL({ dynamic: true }) },
                            footer: { text: 'Mr.Manager' },
                            timestamp: new Date().toISOString(),
                        }]
                    });
                }
            }
        } catch (err) {
            console.error('Error sending welcome message or assigning not verified role:', err);
        }
    }
};
