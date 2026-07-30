const SystemSetting = require('../models/SystemSetting');

// @desc    Get Wallet Configuration
// @route   GET /api/settings/wallet
// @access  Public
exports.getWalletConfig = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ settingKey: 'wallet_enabled' });
    if (!setting) {
      // Return true by default if not set
      return res.status(200).json({ walletEnabled: true });
    }
    res.status(200).json({ walletEnabled: setting.settingValue });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update Wallet Configuration
// @route   PUT /api/settings/wallet
// @access  Private/Admin
exports.updateWalletConfig = async (req, res) => {
  try {
    const { walletEnabled } = req.body;
    
    if (typeof walletEnabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'walletEnabled must be a boolean' });
    }

    let setting = await SystemSetting.findOne({ settingKey: 'wallet_enabled' });
    let previousStatus = setting ? setting.settingValue : true;

    if (!setting) {
      setting = new SystemSetting({
        settingKey: 'wallet_enabled',
        settingValue: walletEnabled,
        updatedBy: req.user._id,
      });
      await setting.save();
    } else {
      setting.settingValue = walletEnabled;
      setting.updatedBy = req.user._id;
      await setting.save();
    }

    // Logging per requirements
    console.log('\n--- WALLET TOGGLE LOG ---');
    console.log(`Action: Wallet ${walletEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`Admin User ID: ${req.user._id}`);
    console.log(`Date/Time: ${new Date().toISOString()}`);
    console.log(`Previous Status: ${previousStatus ? 'Enabled' : 'Disabled'}`);
    console.log(`New Status: ${walletEnabled ? 'Enabled' : 'Disabled'}`);
    console.log('-------------------------\n');

    res.status(200).json({ walletEnabled: setting.settingValue });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
