import assert from 'node:assert/strict';
import test from 'node:test';
import { allocateRefundableAmounts, calculateIncrementalRefundCents } from '../utils/refundCalculator.js';

test('full return refunds the discounted amount and excludes tax', () => {
  const sale = {
    subtotal: 40,
    discountAmount: 2,
    taxAmount: 0,
    totalAmount: 38,
    items: [{ itemTotal: 40, unitPrice: 10, quantity: 4 }]
  };
  const [refundableAmountCents] = allocateRefundableAmounts(sale);

  assert.equal(refundableAmountCents, 3800);
  assert.equal(
    calculateIncrementalRefundCents({
      refundableAmountCents,
      originalQuantity: 4,
      returnedBefore: 0,
      returnQuantity: 4,
      previouslyRefundedCents: 0
    }),
    3800
  );
});

test('partial returns reconcile to the discounted pre-tax amount', () => {
  const [refundableAmountCents] = allocateRefundableAmounts({
    subtotal: 100,
    discountAmount: 10,
    taxableAmount: 90,
    totalAmount: 90,
    items: [{ itemTotal: 100, unitPrice: 25, quantity: 4 }]
  });

  const firstReturn = calculateIncrementalRefundCents({
    refundableAmountCents,
    originalQuantity: 4,
    returnedBefore: 0,
    returnQuantity: 1,
    previouslyRefundedCents: 0
  });
  const secondReturn = calculateIncrementalRefundCents({
    refundableAmountCents,
    originalQuantity: 4,
    returnedBefore: 1,
    returnQuantity: 3,
    previouslyRefundedCents: firstReturn
  });

  assert.equal(firstReturn, 2250);
  assert.equal(secondReturn, 6750);
  assert.equal(firstReturn + secondReturn, refundableAmountCents);
});

test('allocates after-discount amounts across items and excludes tax', () => {
  const amounts = allocateRefundableAmounts({
    subtotal: 100,
    discountAmount: 5,
    taxableAmount: 95,
    taxAmount: 5,
    totalAmount: 100,
    items: [
      { itemTotal: 60, quantity: 1, unitPrice: 60 },
      { itemTotal: 40, quantity: 2, unitPrice: 20 }
    ]
  });

  assert.deepEqual(amounts, [5700, 3800]);
  assert.equal(amounts.reduce((sum, amount) => sum + amount, 0), 9500);
});

test('refunds the product rate after its proportional invoice discount, excluding tax', () => {
  const sale = {
    subtotal: 210,
    discountPercent: 5,
    discountAmount: 10.5,
    taxableAmount: 199.5,
    taxAmount: 10.5,
    totalAmount: 210,
    items: [{ itemTotal: 210, unitPrice: 10, quantity: 21 }]
  };
  const [refundableAmountCents] = allocateRefundableAmounts(sale);

  assert.equal(refundableAmountCents, 19950);
  assert.equal(
    calculateIncrementalRefundCents({
      refundableAmountCents,
      originalQuantity: 21,
      returnedBefore: 0,
      returnQuantity: 2,
      previouslyRefundedCents: 0
    }),
    1900
  );
});

test('does not exceed the discounted amount after earlier refunds', () => {
  assert.equal(
    calculateIncrementalRefundCents({
      refundableAmountCents: 3800,
      originalQuantity: 4,
      returnedBefore: 2,
      returnQuantity: 1,
      previouslyRefundedCents: 3000
    }),
    0
  );
});
