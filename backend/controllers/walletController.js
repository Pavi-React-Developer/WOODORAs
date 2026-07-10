const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { calculateWalletBalance, buildWalletTransactionPayload } = require('../utils/walletUtils');

const getWalletSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const transactions = await WalletTransaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.json({
      success: true,
      data: {
        balance: user.wallet?.balance || 0,
        currency: user.wallet?.currency || 'INR',
        status: user.wallet?.status || 'active',
        transactions,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load wallet' });
  }
};

const addWalletCredit = async ({ userId, amount, description, referenceId, metadata = {} }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const currentBalance = Number(user.wallet?.balance || 0);
  const balanceAfter = calculateWalletBalance(currentBalance, amount, 'credit');
  const payload = buildWalletTransactionPayload({
    userId,
    type: 'credit',
    amount,
    balanceBefore: currentBalance,
    balanceAfter,
    description,
    referenceId,
    metadata,
  });

  user.wallet = user.wallet || {};
  user.wallet.balance = balanceAfter;
  user.wallet.currency = user.wallet.currency || 'INR';
  user.wallet.status = user.wallet.status || 'active';
  await user.save();

  const transaction = await WalletTransaction.create(payload);
  return { user, transaction, balanceAfter };
};

const addWalletDebit = async ({ userId, amount, description, referenceId, metadata = {} }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const currentBalance = Number(user.wallet?.balance || 0);
  const balanceAfter = calculateWalletBalance(currentBalance, amount, 'debit');
  const payload = buildWalletTransactionPayload({
    userId,
    type: 'debit',
    amount,
    balanceBefore: currentBalance,
    balanceAfter,
    description,
    referenceId,
    metadata,
  });

  user.wallet = user.wallet || {};
  user.wallet.balance = balanceAfter;
  user.wallet.currency = user.wallet.currency || 'INR';
  user.wallet.status = user.wallet.status || 'active';
  await user.save();

  const transaction = await WalletTransaction.create(payload);
  return { user, transaction, balanceAfter };
};

module.exports = {
  getWalletSummary,
  addWalletCredit,
  addWalletDebit,
};
