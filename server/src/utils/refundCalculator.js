function toCents(amount) {
  return Math.round((Number(amount) || 0) * 100);
}

export function allocateRefundableAmounts(sale) {
  const items = sale.items || [];
  const totalRefundableAmount = Number.isFinite(Number(sale.subtotal))
    ? Number(sale.subtotal) - (Number(sale.discountAmount) || 0)
    : Number(sale.totalAmount) - (Number(sale.taxAmount) || 0);
  const totalRefundableCents = Math.max(0, toCents(totalRefundableAmount));
  const weights = items.map((item) =>
    Math.max(0, toCents(item.itemTotal ?? Number(item.unitPrice) * Number(item.quantity)))
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (!items.length || totalWeight <= 0) return items.map(() => 0);

  let remainingCents = totalRefundableCents;
  return weights.map((weight, index) => {
    const paidCents =
      index === weights.length - 1
        ? remainingCents
        : Math.round((totalRefundableCents * weight) / totalWeight);
    remainingCents -= paidCents;
    return paidCents;
  });
}

export function calculateIncrementalRefundCents({
  refundableAmountCents,
  originalQuantity,
  returnedBefore,
  returnQuantity,
  previouslyRefundedCents
}) {
  const returnedAfter = returnedBefore + returnQuantity;
  const refundableTargetAfter = Math.round(
    (refundableAmountCents * returnedAfter) / originalQuantity
  );
  return Math.max(0, refundableTargetAfter - previouslyRefundedCents);
}
