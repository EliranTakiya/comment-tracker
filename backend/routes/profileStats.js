const express = require('express');
const ProfileStats = require('../models/ProfileStats');

const router = express.Router();
const FIELDS = ['blogPostsCount', 'blogCommentsReceived', 'blogLikesCount', 'blogDislikesCount'];

router.get('/', async (req, res) => {
  try {
    const stats = await ProfileStats.findOne({ key: 'main' });
    res.json(stats || Object.fromEntries(FIELDS.map(field => [field, 0])));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/', async (req, res) => {
  try {
    const values = Object.fromEntries(FIELDS.map(field => [field, Number(req.body[field]) ]));
    if (FIELDS.some(field => !Number.isInteger(values[field]) || values[field] < 0)) {
      return res.status(400).json({ message: 'Blog activity counts must be non-negative integers' });
    }
    const stats = await ProfileStats.findOneAndUpdate(
      { key: 'main' },
      { $set: values, $setOnInsert: { key: 'main' } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
