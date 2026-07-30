const SystemSetting = require('../models/SystemSetting');

const checkWalletEnabled = async (req, res, next) => {
  try {
    const setting = await SystemSetting.findOne({ settingKey: 'wallet_enabled' });
    const isEnabled = setting ? setting.settingValue : true; // Default to true if not configured

    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Wallet feature is currently disabled.'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error validating wallet feature status.' });
  }
};

module.exports = { checkWalletEnabled };
