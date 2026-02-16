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