const mongoose = require('mongoose');

const AccountSetupSchema = new mongoose.Schema({
  _id: { type: String, default: 'legacy-owner' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  migrationComplete: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('AccountSetup', AccountSetupSchema);
