const mongoose = require('mongoose');

const IdeaEntrySchema = new mongoose.Schema({
  kind: { type: String, enum: ['conversation', 'blogPost'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  note: { type: String, trim: true, maxlength: 500, default: '' },
  addedAt: { type: Date, default: Date.now },
});

const IdeaSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  entries: { type: [IdeaEntrySchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Idea', IdeaSchema);