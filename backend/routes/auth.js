const crypto = require('crypto');
const { promisify } = require('util');
const express = require('express');
const User = require('../models/User');
const Session = require('../models/Session');
const AccountSetup = require('../models/AccountSetup');
const Conversation = require('../models/Conversation');
const BlogPost = require('../models/BlogPost');
const ProfileStats = require('../models/ProfileStats');
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

function publicUser(user) {
  return { id: user._id.toString(), email: user.email, displayName: user.displayName, avatarId: user.avatarId || 'comment-bubble', theme: user.theme };
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
    res.json({ user: publicUser(req.user) });
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
    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true, runValidators: true });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update profile' });
  }
});

module.exports = router;
