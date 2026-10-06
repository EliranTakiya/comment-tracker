const mongoose = require('mongoose');

const TaskRewardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  taskId: { type: String, required: true, enum: ['daily', 'monthly', 'streak', 'milestone'] },
  periodKey: { type: String, required: true },
  points: { type: Number, required: true, min: 1 },
}, { timestamps: true });

TaskRewardSchema.index({ userId: 1, taskId: 1, periodKey: 1 }, { unique: true });

module.exports = mongoose.model('TaskReward', TaskRewardSchema);