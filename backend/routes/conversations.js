const express = require('express');
const Conversation = require('../models/Conversation');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  try {
    const convo = new Conversation({
      userId: req.user._id,
      siteName: req.body.siteName,
      siteUrl: req.body.siteUrl,
      pageTitle: req.body.pageTitle,
      commentId: req.body.commentId,
      yourComment: req.body.yourComment,
      hint: req.body.hint,
    });
    await convo.save();
    res.status(201).json(convo);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Could not save conversation' });
  }
});

router.get('/', async (req, res) => {
  try {
    const convos = await Conversation.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(convos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/replies', async (req, res) => {
  try {
    const repliesCount = Number(req.body.repliesCount);
    if (!Number.isInteger(repliesCount) || repliesCount < 0) {
      return res.status(400).json({ message: 'Replies count must be a non-negative integer' });
    }
    const updated = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { repliesCount },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Conversation not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/reactions', async (req, res) => {
  try {
    const likesCount = Number(req.body.likesCount);
    const dislikesCount = Number(req.body.dislikesCount);
    if (!Number.isInteger(likesCount) || likesCount < 0 || !Number.isInteger(dislikesCount) || dislikesCount < 0) {
      return res.status(400).json({ message: 'Reaction counts must be non-negative integers' });
    }
    const updated = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { likesCount, dislikesCount },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Conversation not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        siteName: req.body.siteName,
        siteUrl: req.body.siteUrl,
        pageTitle: req.body.pageTitle,
        commentId: req.body.commentId,
        yourComment: req.body.yourComment,
        hint: req.body.hint,
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Conversation not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!deleted) return res.status(404).json({ message: 'Conversation not found' });
    res.json({ message: 'Conversation deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
