const express = require('express');
const mongoose = require('mongoose');
const BlogPost = require('../models/BlogPost');
const BlogReaction = require('../models/BlogReaction');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

async function attachReactionData(posts, userId) {
  if (!posts.length) return [];
  const ids = posts.map(post => post._id);
  const [counts, mine] = await Promise.all([
    BlogReaction.aggregate([
      { $match: { postId: { $in: ids } } },
      { $group: { _id: { postId: '$postId', type: '$type' }, count: { $sum: 1 } } },
    ]),
    BlogReaction.find({ postId: { $in: ids }, userId }).select('postId type').lean(),
  ]);
  const countByPost = new Map();
  counts.forEach(({ _id, count }) => {
    const postId = _id.postId.toString();
    const values = countByPost.get(postId) || { likesCount: 0, dislikesCount: 0 };
    values[_id.type === 'like' ? 'likesCount' : 'dislikesCount'] = count;
    countByPost.set(postId, values);
  });
  const myReactionByPost = new Map(mine.map(reaction => [reaction.postId.toString(), reaction.type]));
  return posts.map(post => {
    const item = post.toObject ? post.toObject() : post;
    const countsForPost = countByPost.get(item._id.toString()) || { likesCount: 0, dislikesCount: 0 };
    return {
      ...item,
      likesCount: (item.likesCount || 0) + countsForPost.likesCount,
      dislikesCount: (item.dislikesCount || 0) + countsForPost.dislikesCount,
      myReaction: myReactionByPost.get(item._id.toString()) || null,
    };
  });
}

router.get('/', async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 });
    res.json(await attachReactionData(posts, req.user._id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load blog posts' });
  }
});

router.get('/authors/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Author not found' });
    const user = await User.findById(req.params.id).select('displayName').lean();
    if (!user) return res.status(404).json({ message: 'Author not found' });
    const posts = await BlogPost.find({ ownerId: user._id })
      .select('ownerId author title content sourceTitle sourceUrl sourceLikesCount sourceDislikesCount likesCount dislikesCount comments createdAt')
      .sort({ createdAt: -1 });
    res.json({
      id: user._id.toString(),
      displayName: user.displayName,
      posts: await attachReactionData(posts, req.user._id),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load author profile' });
  }
});

router.post('/', async (req, res) => {
  try {
    const author = req.user.displayName;
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    const sourceTitle = String(req.body.sourceTitle || '').trim();
    const sourceUrl = String(req.body.sourceUrl || '').trim();
    const sourceConversationIds = [...new Set(
      (Array.isArray(req.body.sourceConversationIds) ? req.body.sourceConversationIds : []).map(String)
    )];
    if (!author || !title || !content) return res.status(400).json({ message: 'Author, title and content are required' });
    if (author.length > 80 || title.length > 160 || content.length > 10000) return res.status(400).json({ message: 'Post is too long' });
    if (sourceTitle.length > 300 || sourceUrl.length > 2048 || (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl))) {
      return res.status(400).json({ message: 'Source must be a valid http or https URL' });
    }
    if (sourceConversationIds.length > 50 || sourceConversationIds.some(id => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: 'Invalid source comments' });
    }
    const sourceConversations = sourceConversationIds.length
      ? await Conversation.find({ _id: { $in: sourceConversationIds }, userId: req.user._id }).select('likesCount dislikesCount').lean()
      : [];
    if (sourceConversations.length !== sourceConversationIds.length) {
      return res.status(400).json({ message: 'Source comments must belong to your account' });
    }
    const sourceLikesCount = sourceConversations.reduce((total, conversation) => total + (conversation.likesCount || 0), 0);
    const sourceDislikesCount = sourceConversations.reduce((total, conversation) => total + (conversation.dislikesCount || 0), 0);
    const post = await BlogPost.create({
      ownerId: req.user._id, author, title, content, sourceTitle, sourceUrl, sourceLikesCount, sourceDislikesCount,
    });
    res.status(201).json({ ...post.toObject(), likesCount: 0, dislikesCount: 0, myReaction: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not create blog post' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Blog post not found' });
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    const sourceTitle = String(req.body.sourceTitle || '').trim();
    const sourceUrl = String(req.body.sourceUrl || '').trim();
    if (!req.user.displayName || !title || !content) return res.status(400).json({ message: 'Author, title and content are required' });
    if (title.length > 160 || content.length > 10000) return res.status(400).json({ message: 'Post is too long' });
    if (sourceTitle.length > 300 || sourceUrl.length > 2048 || (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl))) {
      return res.status(400).json({ message: 'Source must be a valid http or https URL' });
    }
    const post = await BlogPost.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { $set: { author: req.user.displayName, title, content, sourceTitle, sourceUrl } },
      { new: true, runValidators: true }
    );
    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    res.json((await attachReactionData([post], req.user._id))[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update blog post' });
  }
});

router.post('/:id/comments', async (req, res) => {
  try {
    const author = req.user.displayName;
    const content = String(req.body.content || '').trim();
    if (!author || !content) return res.status(400).json({ message: 'Name and comment are required' });
    if (content.length > 2000) return res.status(400).json({ message: 'Comment is too long' });
    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { userId: req.user._id, author, content } } },
      { new: true, runValidators: true }
    );
    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    res.status(201).json((await attachReactionData([post], req.user._id))[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not add comment' });
  }
});

router.put('/:id/reactions', async (req, res) => {
  try {
    const reaction = req.body.reaction;
    if (reaction !== null && reaction !== 'like' && reaction !== 'dislike') {
      return res.status(400).json({ message: 'Reaction must be like, dislike or null' });
    }
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    const filter = { postId: post._id, userId: req.user._id };
    if (reaction === null) {
      await BlogReaction.deleteOne(filter);
    } else {
      try {
        await BlogReaction.findOneAndUpdate(filter, { $set: { type: reaction } }, { upsert: true, new: true, runValidators: true });
      } catch (err) {
        if (err.code !== 11000) throw err;
        await BlogReaction.updateOne(filter, { $set: { type: reaction } });
      }
    }
    res.json((await attachReactionData([post], req.user._id))[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update reaction' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const post = await BlogPost.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    await BlogReaction.deleteMany({ postId: post._id });
    res.json({ message: 'Blog post deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not delete blog post' });
  }
});

module.exports = router;
