const calculateWalletBalance = (currentBalance = 0, amount = 0, type = 'credit') => {
  const balance = Number(currentBalance) || 0;
  const value = Number(amount) || 0;
  if (type === 'debit') {
    return Math.max(0, balance - value);
  }
  return balance + value;
};

const buildWalletTransactionPayload = ({
  userId,
  type,
  amount,
  balanceBefore,
  balanceAfter,
  description,
  referenceId,
  metadata = {},
}) => ({
  userId,
  type,
  amount: Number(amount) || 0,
  balanceBefore: Number(balanceBefore) || 0,
  balanceAfter: Number(balanceAfter) || 0,
  description: description || (type === 'credit' ? 'Wallet credited' : 'Wallet debited'),
  referenceId: referenceId || null,
  metadata,
  createdAt: new Date(),
});

module.exports = {
  calculateWalletBalance,
  buildWalletTransactionPayload,
};
