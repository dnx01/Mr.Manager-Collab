// models/GuildConfig.js
const mongoose = require('mongoose');
// MongoDB schema 
const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    guildName: { type: String },
    welcomeChannel: { type: String },
    logChannel: { type: String },
    verificationRole: { type: String },
    verificationChannel: { type: String }, 
    verificationMemberRole: { type: String },
    verificationRoRole: { type: String },
    verificationEngRole: { type: String },
    verificationNotVerifiedRole: { type: String },
    verificationVerifiedRole: { type: String },
    ticketStaffRoles: [{ type: String }],
    webhookUrl: { type: String },
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
