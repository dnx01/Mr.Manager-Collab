// models/Sanction.js
const mongoose = require('mongoose');

const sanctionSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    userTag: { type: String },
    staffId: { type: String, required: true },
    staffTag: { type: String },
    type: { type: String, enum: ['ban', 'kick', 'timeout', 'unban', 'untimeout'], required: true },
    reason: { type: String },
    date: { type: Date, default: Date.now },
    duration: { type: Number }, // ms, only for timeout
});

module.exports = mongoose.model('Sanction', sanctionSchema);
