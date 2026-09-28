const mongoose = require('mongoose');

const BlogReactionSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'dislike'], required: true },
}, { timestamps: true });

BlogReactionSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('BlogReaction', BlogReactionSchema);
