const mongoose = require('mongoose');

const ProfileStatsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  blogPostsCount: { type: Number, default: 0, min: 0 },
  blogCommentsReceived: { type: Number, default: 0, min: 0 },
  blogLikesCount: { type: Number, default: 0, min: 0 },
  blogDislikesCount: { type: Number, default: 0, min: 0 },
});

module.exports = mongoose.model('ProfileStats', ProfileStatsSchema);
