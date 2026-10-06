const express = require('express');
const Conversation = require('../models/Conversation');
const TaskReward = require('../models/TaskReward');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const TASKS = {
  daily: { points: 5, period: 'day', goal: 3 },
  monthly: { points: 20, period: 'month', goal: 20 },
  streak: { points: 25, period: 'month', goal: 7 },
  milestone: { points: 50, period: 'once', goal: 50 },
};
const DATE_FORMATS = new Map();

router.use(requireAuth);

function getTimeZone(value) {
  const timeZone = typeof value === 'string' && value.length <= 100 ? value : 'UTC';
  try {
    if (!DATE_FORMATS.has(timeZone)) DATE_FORMATS.set(timeZone, new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }));
    return { timeZone, formatter: DATE_FORMATS.get(timeZone) };
  } catch {
    return { timeZone: 'UTC', formatter: DATE_FORMATS.get('UTC') || new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
    }) };
  }
}

function getDateKey(date, formatter) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function getTaskProgress(userId, timeZone) {
  const now = new Date();
  const { formatter } = getTimeZone(timeZone);
  const todayKey = getDateKey(now, formatter);
  const monthKey = todayKey.slice(0, 7);
  const conversations = await Conversation.find({ userId }).select('createdAt').lean();
  const activityDates = new Set(conversations
    .filter(conversation => conversation.createdAt && !Number.isNaN(new Date(conversation.createdAt).getTime()))
    .map(conversation => getDateKey(new Date(conversation.createdAt), formatter)));
  const todayCount = conversations.filter(conversation => getDateKey(new Date(conversation.createdAt), formatter) === todayKey).length;
  const monthCount = conversations.filter(conversation => getDateKey(new Date(conversation.createdAt), formatter).slice(0, 7) === monthKey).length;
  let streakAnchor = todayKey;
  if (!activityDates.has(todayKey)) streakAnchor = shiftDateKey(todayKey, -1);
  let streak = 0;
  while (activityDates.has(streakAnchor)) {
    streak += 1;
    streakAnchor = shiftDateKey(streakAnchor, -1);
  }
  return {
    periods: { daily: todayKey, monthly: monthKey, streak: monthKey, milestone: 'once' },
    progress: {
      daily: todayCount,
      monthly: monthCount,
      streak,
      milestone: conversations.length,
    },
  };
}

async function getRewardTotal(userId) {
  const [result] = await TaskReward.aggregate([
    { $match: { userId } },
    { $group: { _id: null, totalPoints: { $sum: '$points' } } },
  ]);
  return result?.totalPoints || 0;
}

router.get('/', async (req, res) => {
  try {
    const { periods } = await getTaskProgress(req.user._id, req.query.timeZone);
    const currentPeriods = Object.entries(periods).map(([taskId, periodKey]) => ({ taskId, periodKey }));
    const [claims, totalPoints] = await Promise.all([
      TaskReward.find({ userId: req.user._id, $or: currentPeriods }).select('taskId periodKey points createdAt').lean(),
      getRewardTotal(req.user._id),
    ]);
    res.json({ totalPoints, claims });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load task rewards' });
  }
});

router.post('/claim', async (req, res) => {
  try {
    const { taskId } = req.body;
    const task = TASKS[taskId];
    if (!task) return res.status(400).json({ message: 'Unknown task' });

    const { periods, progress } = await getTaskProgress(req.user._id, req.body.timeZone);
    const periodKey = periods[taskId];
    if (progress[taskId] < task.goal) return res.status(409).json({ message: 'Task is not complete yet' });

    let claim;
    let newlyAwarded = false;
    try {
      claim = await TaskReward.create({ userId: req.user._id, taskId, periodKey, points: task.points });
      newlyAwarded = true;
    } catch (err) {
      if (err.code !== 11000) throw err;
      claim = await TaskReward.findOne({ userId: req.user._id, taskId, periodKey }).lean();
    }

    res.json({ totalPoints: await getRewardTotal(req.user._id), claim, newlyAwarded });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not claim task reward' });
  }
});

module.exports = router;