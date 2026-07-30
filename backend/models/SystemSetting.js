const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  settingKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  settingValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
