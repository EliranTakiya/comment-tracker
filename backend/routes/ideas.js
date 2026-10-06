const express = require('express');
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const BlogPost = require('../models/BlogPost');
const Idea = require('../models/Idea');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const ideas = await Idea.find({ userId: req.user._id }).sort({ updatedAt: -1 }).lean();
    res.json(ideas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load ideas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title || title.length > 100) return res.status(400).json({ message: 'Idea title must be 1 to 100 characters' });
    const idea = await Idea.create({ userId: req.user._id, title });
    res.status(201).json(idea);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not create idea' });
  }
});

router.post('/:ideaId/entries', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.ideaId)) return res.status(404).json({ message: 'Idea not found' });
    const { kind } = req.body;
    const targetId = String(req.body.targetId || '');
    const note = String(req.body.note || '').trim();
    if (!['conversation', 'blogPost'].includes(kind) || !mongoose.isValidObjectId(targetId) || note.length > 500) {
      return res.status(400).json({ message: 'Invalid idea entry' });
    }
    const idea = await Idea.findOne({ _id: req.params.ideaId, userId: req.user._id });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    const targetExists = kind === 'conversation'
      ? await Conversation.exists({ _id: targetId, userId: req.user._id })
      : await BlogPost.exists({ _id: targetId, ownerId: req.user._id });
    if (!targetExists) return res.status(404).json({ message: 'Saved item not found' });
    if (idea.entries.some(entry => entry.kind === kind && entry.targetId.toString() === targetId)) {
      return res.status(409).json({ message: 'This item is already linked to the idea' });
    }
    idea.entries.push({ kind, targetId, note });
    await idea.save();
    res.status(201).json(idea);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not link item to idea' });
  }
});

router.put('/:ideaId/entries/:entryId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.ideaId) || !mongoose.isValidObjectId(req.params.entryId)) {
      return res.status(404).json({ message: 'Idea entry not found' });
    }
    const note = String(req.body.note || '').trim();
    if (note.length > 500) return res.status(400).json({ message: 'Personal note must be 500 characters or fewer' });
    const idea = await Idea.findOne({ _id: req.params.ideaId, userId: req.user._id });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    const entry = idea.entries.id(req.params.entryId);
    if (!entry) return res.status(404).json({ message: 'Idea entry not found' });
    entry.note = note;
    await idea.save();
    res.json(idea);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update personal note' });
  }
});

router.delete('/:ideaId/entries/:entryId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.ideaId) || !mongoose.isValidObjectId(req.params.entryId)) {
      return res.status(404).json({ message: 'Idea entry not found' });
    }
    const idea = await Idea.findOne({ _id: req.params.ideaId, userId: req.user._id });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    const entry = idea.entries.id(req.params.entryId);
    if (!entry) return res.status(404).json({ message: 'Idea entry not found' });
    entry.deleteOne();
    await idea.save();
    res.json(idea);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not remove item from idea' });
  }
});

router.delete('/:ideaId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.ideaId)) return res.status(404).json({ message: 'Idea not found' });
    const idea = await Idea.findOneAndDelete({ _id: req.params.ideaId, userId: req.user._id });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    res.json({ message: 'Idea deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not delete idea' });
  }
});

module.exports = router;