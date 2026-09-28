const mongoose = require('mongoose');

const ProfileStatsSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  blogPostsCount: { type: Number, default: 0, min: 0 },
  blogCommentsReceived: { type: Number, default: 0, min: 0 },
  blogLikesCount: { type: Number, default: 0, min: 0 },
  blogDislikesCount: { type: Number, default: 0, min: 0 },
});

module.exports = mongoose.model('ProfileStats', ProfileStatsSchema);
