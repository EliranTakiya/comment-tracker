const mongoose = require('mongoose');
const ReplySchema = new mongoose.Schema({ author: String, content: String, date: Date, });
const ConversationSchema = new mongoose.Schema({
    siteName: String,
    siteUrl: String,
    pageTitle: String,          // NEW: title of the page  
    commentId: String,
    yourComment: { type: String, required: true },
    hint: String,               // NEW: optional hint
    repliesCount: { type: Number, default: 0, min: 0 },
    replies: [ReplySchema], createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Conversation', ConversationSchema);