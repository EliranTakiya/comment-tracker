const crypto = require('crypto');
const { promisify } = require('util');
const express = require('express');
const User = require('../models/User');
const Session = require('../models/Session');
const AccountSetup = require('../models/AccountSetup');
const Conversation = require('../models/Conversation');
const BlogPost = require('../models/BlogPost');
const ProfileStats = require('../models/ProfileStats');
const Idea = require('../models/Idea');
const TaskReward = require('../models/TaskReward');
const { requireAuth, hashToken, setSessionCookie, clearSessionCookie, readCookie, SESSION_COOKIE } = require('../middleware/auth');

const router = express.Router();
const scrypt = promisify(crypto.scrypt);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SCRYPT_OPTIONS = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const authAttempts = new Map();

function limitAuthAttempts(limit, windowMs) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = authAttempts.get(key);
    if (!current || current.resetAt <= now) {
      authAttempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (current.count >= limit) return res.status(429).json({ message: 'Too many attempts. Please try again later.' });
    current.count += 1;
    next();
  };
}

function sameSecret(first, second) {
  const left = Buffer.from(String(first || ''));
  const right = Buffer.from(String(second || ''));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

async function makePasswordHash(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, PASSWORD_KEY_LENGTH, PASSWORD_SCRYPT_OPTIONS);
  return `scrypt$32768$8$3$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  try {
    const [algorithm, n, r, p, saltHex, expectedHex] = storedHash.split('$');
    if (algorithm !== 'scrypt' || n !== '32768' || r !== '8' || p !== '3') return false;
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length, PASSWORD_SCRYPT_OPTIONS);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

const IDENTITY_DIRECTIONS = ['crest-of-the-voice', 'the-axis', 'the-bloom', 'the-mark', 'the-crown', 'the-orbit', 'the-prism', 'the-seal', 'the-thread', 'the-sigil'];
const CHALLENGE_TOPICS = [
  { id: 'news-general', label: 'חדשות כללי' },
  { id: 'sports', label: 'ספורט' },
  { id: 'economy', label: 'כלכלה' },
  { id: 'politics', label: 'פוליטיקה' },
  { id: 'fashion', label: 'אופנה' },
  { id: 'celebrities', label: 'סלבס' },
];

function publicUser(user) {
  const unlockedIdentityDirections = [...new Set(['crest-of-the-voice', ...(user.unlockedIdentityDirections || []).filter(id => IDENTITY_DIRECTIONS.includes(id))])];
  const selectedIdentityDirection = unlockedIdentityDirections.includes(user.selectedIdentityDirection) ? user.selectedIdentityDirection : 'crest-of-the-voice';
  const earnedChallengeBadges = (user.earnedChallengeBadges || []).map(badge => ({ badgeId: badge.badgeId, earnedAt: badge.earnedAt }));
  const earnedChallengeBadgeIds = new Set(earnedChallengeBadges.map(badge => badge.badgeId));
  const selectedChallengeBadgeId = earnedChallengeBadgeIds.has(user.selectedChallengeBadgeId) ? user.selectedChallengeBadgeId : null;
  return { id: user._id.toString(), email: user.email, displayName: user.displayName, avatarId: user.avatarId || 'comment-bubble', theme: user.theme, selectedIdentityDirection, unlockedIdentityDirections, earnedChallengeBadges, selectedChallengeBadgeId };
}

async function syncIdentityProgress(user) {
  const [conversations, ideas, posts, rewards] = await Promise.all([
    Conversation.find({ userId: user._id }).select('hint likesCount dislikesCount repliesCount createdAt').lean(),
    Idea.find({ userId: user._id }).select('entries').lean(),
    BlogPost.find({ ownerId: user._id }).select('likesCount dislikesCount comments sourceConversationIds').lean(),
    TaskReward.find({ userId: user._id }).select('points').lean(),
  ]);
  const ideaEntries = ideas.reduce((total, idea) => total + (idea.entries?.length || 0), 0);
  const commentLikes = conversations.reduce((total, item) => total + (item.likesCount || 0), 0);
  const commentDislikes = conversations.reduce((total, item) => total + (item.dislikesCount || 0), 0);
  const blogComments = posts.reduce((total, post) => total + (post.comments?.length || 0), 0);
  const blogLikes = posts.reduce((total, post) => total + (post.likesCount || 0), 0);
  const blogDislikes = posts.reduce((total, post) => total + (post.dislikesCount || 0), 0);
  const taskPoints = rewards.reduce((total, reward) => total + (reward.points || 0), 0);
  const rawPoints = conversations.length + commentLikes * 2 - commentDislikes * 2
    + posts.length * 5 + blogComments * 2 + blogLikes * 2 - blogDislikes * 2;
  const identityPoints = Math.max(0, rawPoints) + taskPoints + ideas.length * 5 + ideaEntries * 2;
  const activeTopics = new Set(conversations.map(item => item.hint || 'חדשות כללי')).size;
  const conversationTopics = new Map(conversations.map(item => [String(item._id), item.hint || 'חדשות כללי']));
  const postById = new Map(posts.map(post => [String(post._id), post]));
  const topicIdeaCounts = Object.fromEntries(CHALLENGE_TOPICS.map(topic => [topic.label, 0]));
  ideas.forEach(idea => (idea.entries || []).forEach(entry => {
    const linkedConversationIds = entry.kind === 'conversation'
      ? [String(entry.targetId)]
      : (postById.get(String(entry.targetId))?.sourceConversationIds || []).map(String);
    const linkedTopics = new Set(linkedConversationIds.map(id => conversationTopics.get(id)).filter(topic => topic in topicIdeaCounts));
    linkedTopics.forEach(topic => { topicIdeaCounts[topic] += 1; });
  }));
  const engagements = commentLikes + conversations.reduce((total, item) => total + (item.repliesCount || 0), 0)
    + blogLikes + blogComments;
  const activityDays = new Set(conversations.map(item => new Date(item.createdAt).toISOString().slice(0, 10)));
  const today = new Date();
  let activityAnchor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (!activityDays.has(activityAnchor.toISOString().slice(0, 10))) activityAnchor.setUTCDate(activityAnchor.getUTCDate() - 1);
  let activityStreak = 0;
  for (let day = new Date(activityAnchor); activityDays.has(day.toISOString().slice(0, 10)); day.setUTCDate(day.getUTCDate() - 1)) activityStreak += 1;

  const crestEarned = identityPoints >= 20;
  const earnedDirections = crestEarned ? [
    conversations.length >= 20 && 'the-axis',
    ideas.length >= 3 && ideaEntries >= 5 && 'the-bloom',
    posts.length >= 5 && 'the-mark',
    engagements >= 30 && 'the-crown',
    activeTopics >= 3 && 'the-orbit',
    activeTopics >= 6 && 'the-prism',
    rewards.length >= 10 && 'the-seal',
    ideaEntries >= 10 && 'the-thread',
    activityStreak >= 7 && 'the-sigil',
  ].filter(Boolean) : [];
  const storedDirections = (user.unlockedIdentityDirections || []).filter(id => IDENTITY_DIRECTIONS.includes(id));
  const unlockedDirections = [...new Set(['crest-of-the-voice', ...storedDirections, ...earnedDirections])];
  const earnedChallengeBadges = [...(user.earnedChallengeBadges || [])];
  const knownChallengeBadges = new Set(earnedChallengeBadges.map(badge => badge.badgeId));
  CHALLENGE_TOPICS.forEach(topic => {
    if (topicIdeaCounts[topic.label] >= 5 && !knownChallengeBadges.has(topic.id)) {
      earnedChallengeBadges.push({ badgeId: topic.id, earnedAt: new Date() });
    }
  });
  const selectedDirection = unlockedDirections.includes(user.selectedIdentityDirection)
    ? user.selectedIdentityDirection
    : 'crest-of-the-voice';
  if (JSON.stringify(storedDirections) !== JSON.stringify(unlockedDirections)
    || earnedChallengeBadges.length !== (user.earnedChallengeBadges || []).length
    || user.selectedIdentityDirection !== selectedDirection) {
    user.unlockedIdentityDirections = unlockedDirections;
    user.selectedIdentityDirection = selectedDirection;
    user.earnedChallengeBadges = earnedChallengeBadges;
    await user.save();
  }
  return user;
}

async function createSession(user, res) {
  const token = crypto.randomBytes(32).toString('base64url');
  await Session.create({ tokenHash: hashToken(token), userId: user._id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  setSessionCookie(res, token);
}

async function migrateLegacyData(user) {
  const setup = await AccountSetup.findById('legacy-owner');
  if (!setup || setup.ownerId.toString() !== user._id.toString()) return;

  // Retry claiming legacy posts for the original owner even after the broader
  // one-time data migration was marked complete. This repairs posts left
  // unowned if the display name was corrected later, including anonymous
  // legacy posts created before author names were collected.
  await BlogPost.updateMany(
    {
      $and: [
        { $or: [{ ownerId: { $exists: false } }, { ownerId: null }] },
        { $or: [{ author: user.displayName }, { author: null }, { author: '' }] },
      ],
    },
    { $set: { ownerId: user._id, author: user.displayName } }
  );

  if (setup.migrationComplete) return;

  await Conversation.updateMany({ userId: { $exists: false } }, { $set: { userId: user._id } });
  await ProfileStats.updateOne(
    { key: 'main', userId: { $exists: false } },
    { $set: { userId: user._id, key: user._id.toString() } }
  );
  setup.migrationComplete = true;
  await setup.save();
}

router.get('/status', async (req, res) => {
  try {
    const setup = await AccountSetup.findById('legacy-owner').select('_id').lean();
    res.json({ needsInitialOwner: !setup, setupCodeConfigured: Boolean(process.env.INITIAL_OWNER_SETUP_KEY) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load account setup status' });
  }
});

router.post('/register', limitAuthAttempts(8, 15 * 60 * 1000), async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const displayName = String(req.body.displayName || '').trim();
    if (!EMAIL_PATTERN.test(email) || email.length > 254) return res.status(400).json({ message: 'Enter a valid email address' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Password must be 8 to 128 characters' });
    if (!displayName || displayName.length > 80) return res.status(400).json({ message: 'Choose a display name up to 80 characters' });

    const setup = await AccountSetup.findById('legacy-owner');
    if (!setup && !sameSecret(req.body.setupCode, process.env.INITIAL_OWNER_SETUP_KEY)) {
      return res.status(403).json({ message: process.env.INITIAL_OWNER_SETUP_KEY ? 'Initial setup code is incorrect' : 'Initial account setup is not configured' });
    }

    const user = await User.create({ email, passwordHash: await makePasswordHash(password), displayName });
    if (!setup) {
      try {
        await AccountSetup.create({ _id: 'legacy-owner', ownerId: user._id, migrationComplete: false });
      } catch (err) {
        await User.deleteOne({ _id: user._id });
        if (err.code === 11000) return res.status(409).json({ message: 'Initial account setup has already been claimed' });
        throw err;
      }
      await migrateLegacyData(user);
    }
    await syncIdentityProgress(user);
    await createSession(user, res);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'An account with this email already exists' });
    console.error(err);
    res.status(500).json({ message: 'Could not create account' });
  }
});

router.post('/login', limitAuthAttempts(10, 15 * 60 * 1000), async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !await verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: 'Email or password is incorrect' });
    }
    await migrateLegacyData(user);
    await syncIdentityProgress(user);
    await createSession(user, res);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not sign in' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    await migrateLegacyData(req.user);
    const user = await syncIdentityProgress(req.user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load account' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
    clearSessionCookie(res);
    res.json({ message: 'Signed out' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not sign out' });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    if (req.body.unlockedIdentityDirections !== undefined) {
      return res.status(400).json({ message: 'Identity paths are unlocked by account activity' });
    }
    const identityUser = await syncIdentityProgress(req.user);
    const update = {};
    if (req.body.displayName !== undefined) {
      const displayName = String(req.body.displayName).trim();
      if (!displayName || displayName.length > 80) return res.status(400).json({ message: 'Display name must be 1 to 80 characters' });
      update.displayName = displayName;
    }
    if (req.body.theme !== undefined) {
      if (!['day', 'midday', 'night', 'glow'].includes(req.body.theme)) return res.status(400).json({ message: 'Invalid theme' });
      update.theme = req.body.theme;
    }
    if (req.body.avatarId !== undefined) {
      const validAvatarIds = ['comment-bubble', 'woman-writer', 'man-writer', 'robot', 'owl', 'fox', 'cat', 'notebook'];
      if (!validAvatarIds.includes(req.body.avatarId)) return res.status(400).json({ message: 'Invalid avatar' });
      update.avatarId = req.body.avatarId;
    }
    if (req.body.selectedChallengeBadgeId !== undefined) {
      const selectedChallengeBadgeId = req.body.selectedChallengeBadgeId;
      const earnedBadgeIds = new Set((identityUser.earnedChallengeBadges || []).map(badge => badge.badgeId));
      if (selectedChallengeBadgeId !== null && !earnedBadgeIds.has(selectedChallengeBadgeId)) {
        return res.status(400).json({ message: 'Choose a challenge badge you have earned' });
      }
      update.selectedChallengeBadgeId = selectedChallengeBadgeId;
    }
    if (req.body.selectedIdentityDirection !== undefined) {
      const selected = req.body.selectedIdentityDirection;
      const unlocked = identityUser.unlockedIdentityDirections || ['crest-of-the-voice'];
      if (!IDENTITY_DIRECTIONS.includes(selected) || !unlocked.includes(selected)) {
        return res.status(400).json({ message: 'Choose an unlocked identity direction' });
      }
      update.selectedIdentityDirection = selected;
    }
    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true, runValidators: true });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update profile' });
  }
});

module.exports = router;
