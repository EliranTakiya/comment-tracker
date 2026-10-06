const express = require('express');
const mongoose = require('mongoose');
const BlogPost = require('../models/BlogPost');
const BlogReaction = require('../models/BlogReaction');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const TaskReward = require('../models/TaskReward');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

async function attachReactionData(posts, userId) {
  if (!posts.length) return [];
  const ids = posts.map(post => post._id);
  const postRows = posts.map(post => post.toObject ? post.toObject() : post);
  const ownerIds = [...new Set(postRows.map(post => post.ownerId?.toString()).filter(Boolean))];
  const knownConversationIds = [...new Set(postRows.flatMap(post => post.sourceConversationIds || []).map(String))];
  const postsForInference = postRows.filter(post => !post.sourceConversationIds?.length && post.ownerId && post.sourceTitle && post.sourceUrl);
  const inferenceFilters = postsForInference.map(post => ({ userId: post.ownerId, pageTitle: post.sourceTitle, siteUrl: post.sourceUrl }));
  const [counts, mine, owners, linkedConversations, inferredConversations] = await Promise.all([
    BlogReaction.aggregate([
      { $match: { postId: { $in: ids } } },
      { $group: { _id: { postId: '$postId', type: '$type' }, count: { $sum: 1 } } },
    ]),
    BlogReaction.find({ postId: { $in: ids }, userId }).select('postId type').lean(),
    User.find({ _id: { $in: ownerIds } }).select('_id avatarId').lean(),
    knownConversationIds.length
      ? Conversation.find({ _id: { $in: knownConversationIds } }).select('_id userId likesCount dislikesCount').lean()
      : Promise.resolve([]),
    inferenceFilters.length
      ? Conversation.find({ $or: inferenceFilters }).select('_id userId pageTitle siteUrl likesCount dislikesCount').lean()
      : Promise.resolve([]),
  ]);
  const avatarByOwner = new Map(owners.map(owner => [owner._id.toString(), owner.avatarId || 'comment-bubble']));
  const conversationById = new Map([...linkedConversations, ...inferredConversations].map(conversation => [conversation._id.toString(), conversation]));
  const inferredBySource = new Map();
  inferredConversations.forEach(conversation => {
    const key = JSON.stringify([conversation.userId.toString(), conversation.pageTitle, conversation.siteUrl]);
    const matches = inferredBySource.get(key) || [];
    matches.push(conversation);
    inferredBySource.set(key, matches);
  });
  const inferredIdsByPost = new Map();
  postsForInference.forEach(post => {
    const key = JSON.stringify([post.ownerId.toString(), post.sourceTitle, post.sourceUrl]);
    const matches = inferredBySource.get(key) || [];
    if (matches.length === 1) inferredIdsByPost.set(post._id.toString(), [matches[0]._id.toString()]);
  });
  const countByPost = new Map();
  counts.forEach(({ _id, count }) => {
    const postId = _id.postId.toString();
    const values = countByPost.get(postId) || { likesCount: 0, dislikesCount: 0 };
    values[_id.type === 'like' ? 'likesCount' : 'dislikesCount'] = count;
    countByPost.set(postId, values);
  });
  const myReactionByPost = new Map(mine.map(reaction => [reaction.postId.toString(), reaction.type]));
  return postRows.map(item => {
    const countsForPost = countByPost.get(item._id.toString()) || { likesCount: 0, dislikesCount: 0 };
    const sourceConversationIds = (item.sourceConversationIds?.length
      ? item.sourceConversationIds.map(String)
      : inferredIdsByPost.get(item._id.toString()) || []);
    const sourceConversations = sourceConversationIds.map(id => conversationById.get(id))
      .filter(conversation => conversation && conversation.userId.toString() === item.ownerId?.toString());
    const sourceLikesCount = sourceConversationIds.length
      ? sourceConversations.reduce((total, conversation) => total + (conversation.likesCount || 0), 0)
      : item.sourceLikesCount || 0;
    const sourceDislikesCount = sourceConversationIds.length
      ? sourceConversations.reduce((total, conversation) => total + (conversation.dislikesCount || 0), 0)
      : item.sourceDislikesCount || 0;
    return {
      ...item,
      sourceConversationIds,
      sourceLikesCount,
      sourceDislikesCount,
      likesCount: (item.likesCount || 0) + countsForPost.likesCount,
      dislikesCount: (item.dislikesCount || 0) + countsForPost.dislikesCount,
      myReaction: myReactionByPost.get(item._id.toString()) || null,
      avatarId: avatarByOwner.get(item.ownerId?.toString()) || 'comment-bubble',
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

router.get('/leaderboard', async (req, res) => {
  try {
    const [users, conversationTotals, blogTotals, reactionTotals, taskRewardTotals] = await Promise.all([
      User.find().select('_id displayName avatarId').lean(),
      Conversation.aggregate([
        { $group: { _id: '$userId', count: { $sum: 1 }, likesCount: { $sum: '$likesCount' }, dislikesCount: { $sum: '$dislikesCount' } } },
      ]),
      BlogPost.aggregate([
        { $match: { ownerId: { $ne: null } } },
        { $group: {
          _id: '$ownerId',
          postsCount: { $sum: 1 },
          commentsCount: { $sum: { $size: { $ifNull: ['$comments', []] } } },
          likesCount: { $sum: '$likesCount' },
          dislikesCount: { $sum: '$dislikesCount' },
        } },
      ]),
      BlogReaction.aggregate([
        { $lookup: { from: BlogPost.collection.name, localField: 'postId', foreignField: '_id', as: 'post' } },
        { $unwind: '$post' },
        { $match: { 'post.ownerId': { $ne: null } } },
        { $group: {
          _id: '$post.ownerId',
          likesCount: { $sum: { $cond: [{ $eq: ['$type', 'like'] }, 1, 0] } },
          dislikesCount: { $sum: { $cond: [{ $eq: ['$type', 'dislike'] }, 1, 0] } },
        } },
      ]),
      TaskReward.aggregate([
        { $group: { _id: '$userId', totalPoints: { $sum: '$points' } } },
      ]),
    ]);
    const conversationsByUser = new Map(conversationTotals.map(item => [item._id.toString(), item]));
    const blogsByUser = new Map(blogTotals.map(item => [item._id.toString(), item]));
    const reactionsByUser = new Map(reactionTotals.map(item => [item._id.toString(), item]));
    const taskRewardsByUser = new Map(taskRewardTotals.map(item => [item._id.toString(), item]));
    const badgeThresholds = [0, 20, 60, 150, 300];
    const badges = [
      { name: 'מתחיל', icon: '◯', className: 'beginner' },
      { name: 'מגיב פעיל', icon: '✦', className: 'active' },
      { name: 'טוקבקיסט', icon: '◆', className: 'commenter' },
      { name: 'טוקבקיסט ותיק', icon: '★', className: 'veteran' },
      { name: 'טוקבקיסט על', icon: '✹', className: 'super' },
    ];
    const leaderboard = users.map(user => {
      const id = user._id.toString();
      const conversations = conversationsByUser.get(id) || {};
      const blogs = blogsByUser.get(id) || {};
      const reactions = reactionsByUser.get(id) || {};
      const taskRewards = taskRewardsByUser.get(id) || {};
      const points = Math.max(0,
        (conversations.count || 0)
        + (conversations.likesCount || 0) * 2
        - (conversations.dislikesCount || 0) * 2
        + (blogs.postsCount || 0) * 5
        + (blogs.commentsCount || 0) * 2
        + ((blogs.likesCount || 0) + (reactions.likesCount || 0)) * 2
        - ((blogs.dislikesCount || 0) + (reactions.dislikesCount || 0)) * 2
        + (taskRewards.totalPoints || 0)
      );
      const badgeIndex = badgeThresholds.reduce((result, threshold, index) => points >= threshold ? index : result, 0);
      return {
        id,
        displayName: user.displayName,
        avatarId: user.avatarId || 'comment-bubble',
        points,
        rank: badges[badgeIndex],
      };
    }).sort((first, second) => second.points - first.points || first.displayName.localeCompare(second.displayName, 'he'));
    res.json(leaderboard.map((user, index) => ({ ...user, position: index + 1 })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load global leaderboard' });
  }
});

router.get('/authors/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Author not found' });
    const user = await User.findById(req.params.id).select('displayName avatarId createdAt').lean();
    if (!user) return res.status(404).json({ message: 'Author not found' });
    const [posts, conversationTotals, taskRewardTotals] = await Promise.all([
      BlogPost.find({ ownerId: user._id })
      .select('ownerId author title content sourceTitle sourceUrl sourceConversationIds sourceLikesCount sourceDislikesCount likesCount dislikesCount comments createdAt')
      .sort({ createdAt: -1 }),
      Conversation.aggregate([
        { $match: { userId: user._id } },
        { $group: {
          _id: null,
          count: { $sum: 1 },
          likesCount: { $sum: '$likesCount' },
          dislikesCount: { $sum: '$dislikesCount' },
        } },
      ]),
      TaskReward.aggregate([
        { $match: { userId: user._id } },
        { $group: { _id: null, totalPoints: { $sum: '$points' } } },
      ]),
    ]);
    const postsWithReactions = await attachReactionData(posts, req.user._id);
    const conversations = conversationTotals[0] || { count: 0, likesCount: 0, dislikesCount: 0 };
    const blogPoints = postsWithReactions.reduce((total, post) => total
      + (post.comments?.length || 0) * 2
      + (post.likesCount || 0) * 2
      - (post.dislikesCount || 0) * 2, postsWithReactions.length * 5);
    const totalPoints = Math.max(0,
      conversations.count
      + (conversations.likesCount || 0) * 2
      - (conversations.dislikesCount || 0) * 2
      + blogPoints
      + (taskRewardTotals[0]?.totalPoints || 0)
    );
    const badgeThresholds = [0, 20, 60, 150, 300];
    const badges = [
      { name: 'מתחיל', icon: '○', className: 'beginner' },
      { name: 'מגיב פעיל', icon: '✦', className: 'active' },
      { name: 'טוקבקיסט', icon: '◆', className: 'commenter' },
      { name: 'טוקבקיסט ותיק', icon: '★', className: 'veteran' },
      { name: 'טוקבקיסט על', icon: '✹', className: 'super' },
    ];
    const badgeIndex = badgeThresholds.reduce((result, threshold, index) => totalPoints >= threshold ? index : result, 0);
    res.json({
      id: user._id.toString(),
      displayName: user.displayName,
      avatarId: user.avatarId || 'comment-bubble',
      joinedAt: user.createdAt,
      rank: badges[badgeIndex],
      posts: postsWithReactions,
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
      ownerId: req.user._id, author, title, content, sourceTitle, sourceUrl, sourceConversationIds, sourceLikesCount, sourceDislikesCount,
    });
    res.status(201).json({ ...post.toObject(), avatarId: req.user.avatarId || 'comment-bubble', likesCount: 0, dislikesCount: 0, myReaction: null });
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
    const update = { author: req.user.displayName, title, content, sourceTitle, sourceUrl };
    if (Array.isArray(req.body.sourceConversationIds)) {
      const sourceConversationIds = [...new Set(req.body.sourceConversationIds.map(String))];
      if (sourceConversationIds.length > 50 || sourceConversationIds.some(id => !mongoose.isValidObjectId(id))) {
        return res.status(400).json({ message: 'Invalid source comments' });
      }
      const sourceConversations = sourceConversationIds.length
        ? await Conversation.find({ _id: { $in: sourceConversationIds }, userId: req.user._id }).select('likesCount dislikesCount').lean()
        : [];
      if (sourceConversations.length !== sourceConversationIds.length) {
        return res.status(400).json({ message: 'Source comments must belong to your account' });
      }
      update.sourceConversationIds = sourceConversationIds;
      update.sourceLikesCount = sourceConversations.reduce((total, conversation) => total + (conversation.likesCount || 0), 0);
      update.sourceDislikesCount = sourceConversations.reduce((total, conversation) => total + (conversation.dislikesCount || 0), 0);
    }
    const post = await BlogPost.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { $set: update },
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
