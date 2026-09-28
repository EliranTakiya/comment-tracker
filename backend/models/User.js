const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  displayName: { type: String, required: true, trim: true, maxlength: 80 },
  theme: { type: String, enum: ['day', 'midday', 'night', 'glow'], default: 'day' },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
