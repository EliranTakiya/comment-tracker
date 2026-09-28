const express = require('express');
const BlogPost = require('../models/BlogPost');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    res.json(await BlogPost.find().sort({ createdAt: -1 }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load blog posts' });
  }
});

router.post('/', async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    if (!title || !content) return res.status(400).json({ message: 'Title and content are required' });
    if (title.length > 160 || content.length > 10000) return res.status(400).json({ message: 'Post is too long' });
    res.status(201).json(await BlogPost.create({ title, content }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not create blog post' });
  }
});

router.post('/:id/comments', async (req, res) => {
  try {
    const author = String(req.body.author || '').trim();
    const content = String(req.body.content || '').trim();
    if (!author || !content) return res.status(400).json({ message: 'Name and comment are required' });
    if (author.length > 80 || content.length > 2000) return res.status(400).json({ message: 'Comment is too long' });
    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { author, content } } },
      { new: true, runValidators: true }
    );
    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not add comment' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    res.json({ message: 'Blog post deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not delete blog post' });
  }
});

module.exports = router;
