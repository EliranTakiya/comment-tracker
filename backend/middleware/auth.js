const crypto = require('crypto');
const Session = require('../models/Session');

const SESSION_COOKIE = 'comment_tracker_session';

function readCookie(req, name) {
  const cookies = (req.headers.cookie || '').split(';');
  const entry = cookies.map(cookie => cookie.trim()).find(cookie => cookie.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : '';
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function cookieOptions() {
  const production = process.env.NODE_ENV === 'production' || (process.env.FRONTEND_URL || '').startsWith('https://');
  return `Path=/; HttpOnly; SameSite=${production ? 'None; Secure' : 'Lax'}`;
}

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions()}; Max-Age=604800`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${cookieOptions()}; Max-Age=0`);
}

async function requireAuth(req, res, next) {
  try {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return res.status(401).json({ message: 'Sign in required' });
    const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).populate('userId');
    if (!session || !session.userId) return res.status(401).json({ message: 'Session expired' });
    req.user = session.userId;
    req.sessionId = session._id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, hashToken, setSessionCookie, clearSessionCookie, readCookie, SESSION_COOKIE };
