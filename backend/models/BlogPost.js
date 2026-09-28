const mongoose = require('mongoose');

const BlogCommentSchema = new mongoose.Schema({
  author: { type: String, required: true, trim: true, maxlength: 80 },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now },
});

const BlogPostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  content: { type: String, required: true, trim: true, maxlength: 10000 },
  comments: { type: [BlogCommentSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BlogPost', BlogPostSchema);
