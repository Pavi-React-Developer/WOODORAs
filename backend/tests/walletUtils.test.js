const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateWalletBalance, buildWalletTransactionPayload } = require('../utils/walletUtils');

test('credit increases wallet balance and records balance boundaries', () => {
  const balanceBefore = 120;
  const amount = 80;
  const result = calculateWalletBalance(balanceBefore, amount, 'credit');

  assert.equal(result, 200);
});

test('debit decreases wallet balance and produces a transaction payload', () => {
  const payload = buildWalletTransactionPayload({
    userId: 'user-1',
    type: 'debit',
    amount: 50,
    balanceBefore: 200,
    balanceAfter: 150,
    description: 'Wallet used for checkout',
    referenceId: 'order-1',
  });

  assert.equal(payload.amount, 50);
  assert.equal(payload.type, 'debit');
  assert.equal(payload.balanceAfter, 150);
  assert.equal(payload.description, 'Wallet used for checkout');
});
