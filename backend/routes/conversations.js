const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
router.post('/', async (req, res) => {
    const convo = new Conversation(req.body);
    await convo.save(); res.json(convo);
});
router.get('/', async (req, res) => {
    const convos = await Conversation.find().sort({ createdAt: -1 });
    res.json(convos);
});

router.put('/:id/replies', async (req, res) => {
    try {
      const repliesCount = Number(req.body.repliesCount);
      if (!Number.isInteger(repliesCount) || repliesCount < 0) {
        return res.status(400).json({ message: 'Replies count must be a non-negative integer' });
      }
      const updated = await Conversation.findByIdAndUpdate(
        req.params.id,
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

  router.put('/:id', async (req, res) => {
      try {
        const updated = await Conversation.findByIdAndUpdate(
          req.params.id,
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

// DELETE by ID
router.delete('/:id', async (req, res) => {
    console.log('DELETE request received for ID:', req.params.id);
    try {
      const deleted = await Conversation.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ message: 'Conversation not found' });
      res.json({ message: 'Conversation deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });
  

 module.exports = router;