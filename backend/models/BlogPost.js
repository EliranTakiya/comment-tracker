const mongoose = require('mongoose');

const BlogCommentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  author: { type: String, required: true, trim: true, maxlength: 80 },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now },
});

const BlogPostSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  author: { type: String, required: true, trim: true, maxlength: 80 },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  content: { type: String, required: true, trim: true, maxlength: 10000 },
  sourceTitle: { type: String, trim: true, maxlength: 300 },
  sourceUrl: {
    type: String,
    trim: true,
    maxlength: 2048,
    validate: { validator: value => !value || /^https?:\/\/\S+$/i.test(value), message: 'Source URL must use http or https' },
  },
  likesCount: { type: Number, default: 0, min: 0 },
  dislikesCount: { type: Number, default: 0, min: 0 },
  comments: { type: [BlogCommentSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BlogPost', BlogPostSchema);
