const mongoose = require('mongoose');

const CHALLENGE_BADGE_IDS = ['news-general', 'sports', 'economy', 'politics', 'fashion', 'celebrities'];
const EarnedChallengeBadgeSchema = new mongoose.Schema({
  badgeId: { type: String, enum: CHALLENGE_BADGE_IDS, required: true },
  earnedAt: { type: Date, default: Date.now },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  displayName: { type: String, required: true, trim: true, maxlength: 80 },
  avatarId: { type: String, enum: ['comment-bubble', 'woman-writer', 'man-writer', 'robot', 'owl', 'fox', 'cat', 'notebook'], default: 'comment-bubble' },
  theme: { type: String, enum: ['day', 'midday', 'night', 'glow'], default: 'day' },
  selectedChallengeBadgeId: { type: String, enum: [...CHALLENGE_BADGE_IDS, null], default: null },
  identityMode: { type: String, enum: ['auto', 'custom'], default: 'auto' },
  selectedIdentityDirection: { type: String, enum: ['crest-of-the-voice', 'the-axis', 'the-bloom', 'the-mark', 'the-crown', 'the-orbit', 'the-prism', 'the-seal', 'the-thread', 'the-sigil'], default: 'crest-of-the-voice' },
  unlockedIdentityDirections: { type: [{ type: String, enum: ['crest-of-the-voice', 'the-axis', 'the-bloom', 'the-mark', 'the-crown', 'the-orbit', 'the-prism', 'the-seal', 'the-thread', 'the-sigil'] }], default: ['crest-of-the-voice'] },
  earnedChallengeBadges: { type: [EarnedChallengeBadgeSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
