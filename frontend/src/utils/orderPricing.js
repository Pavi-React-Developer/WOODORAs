const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// The only checkout total formula. Values are normalised before every amount
// is combined so API strings, blanks and undefined fees cannot change totals.
export const calculateOrderPricing = ({
  subtotal = 0,
  coupon_discount = 0,
  product_fee = 0,
  gift_fee = 0,
  shipping_fee = 0,
  weight_fee = 0,
  platform_fee = 0,
  advance_payment = 0,
  paymentMethod = '',
} = {}) => {
  const pricing = {
    subtotal: number(subtotal),
    coupon_discount: number(coupon_discount),
    product_fee: number(product_fee),
    gift_fee: number(gift_fee),
    shipping_fee: number(shipping_fee),
    weight_fee: number(weight_fee),
    platform_fee: number(platform_fee),
    advance_payment: number(advance_payment),
  };
  pricing.calculated_grand_total = Math.max(0,
    pricing.subtotal - pricing.coupon_discount + pricing.product_fee
    + pricing.gift_fee + pricing.shipping_fee + pricing.weight_fee + pricing.platform_fee
  );
  pricing.grand_total = pricing.calculated_grand_total;
  pricing.total_amount = pricing.calculated_grand_total;
  pricing.paid_amount = paymentMethod === 'COD'
    ? Math.min(pricing.advance_payment, pricing.total_amount)
    : 0;
  pricing.balance_amount = Math.max(0, pricing.total_amount - pricing.paid_amount);
  return pricing;
};

// Keywords that identify advance-payment entries — these are payments, not fees.
// They must NEVER appear as line items or be included in the grand total.
const ADVANCE_KEYWORDS = ['advance', 'advance payment', 'cod advance'];
const isAdvanceFee = (name) =>
  ADVANCE_KEYWORDS.some((kw) => String(name || '').toLowerCase().includes(kw));

// New orders carry these fields from checkout. The fallbacks make old orders
// safe to render without inventing a second calculation path.
export const getOrderPricing = (order = {}) => {
  const subtotal = number(order.subtotal) || number(order.itemsPrice);
  const couponDiscount = number(order.coupon_discount) || number(order.discountAmount);

  // Build displayable fee list — EXCLUDE advance-payment entries.
  // Advance payment is a payment collected upfront, not an additional charge.
  let fees = [];
  let dynamicFeesTotal = 0;

  if (Array.isArray(order.fees) && order.fees.length > 0) {
    const feeMap = new Map();
    order.fees
      .filter((fee) => !isAdvanceFee(fee.name))
      .forEach((fee) => {
        const name = fee.name;
        const amount = number(fee.amount);
        if (feeMap.has(name)) {
          feeMap.set(name, feeMap.get(name) + amount);
        } else {
          feeMap.set(name, amount);
        }
      });
      
    fees = Array.from(feeMap.entries()).map(([name, amount]) => ({
      name,
      amount,
    }));
    dynamicFeesTotal = fees.reduce((sum, fee) => sum + fee.amount, 0);
  } else {
    // Fallback for older orders without a fees array
    const productFee  = number(order.product_fee);
    const giftFee     = number(order.gift_fee) || number(order.giftWrapFee);
    const weightFee   = number(order.weight_fee) || number(order.shippingPrice);
    const shippingFee = number(order.shipping_fee);
    const platformFee = number(order.platform_fee);

    if (productFee  > 0) fees.push({ name: 'Product Fee',  amount: productFee  });
    if (giftFee     > 0) fees.push({ name: 'Gift Fee',     amount: giftFee     });
    if (shippingFee > 0) fees.push({ name: 'Shipping Fee', amount: shippingFee });
    if (weightFee   > 0) fees.push({ name: 'Weight Fee',   amount: weightFee   });
    if (platformFee > 0) fees.push({ name: 'Platform Fee', amount: platformFee });

    dynamicFeesTotal = productFee + giftFee + shippingFee + weightFee + platformFee;
  }

  const calculatedItemsGst = Array.isArray(order.orderItems) 
    ? order.orderItems.reduce((sum, item) => sum + (number(item.gstAmount) || 0), 0) 
    : 0;
  const gstAmount = number(order.gstAmount) || number(order.totalGst) || calculatedItemsGst || 0;

  // Grand total = subtotal − discount + billable fees (advance excluded) + GST.
  // Prefer the server-persisted total_amount; fall back to a recalculation so
  // that old orders (which may have a stale or missing total_amount) still render
  // correctly without ever adding the advance back in.
  let total = number(order.total_amount) || number(order.totalPrice)
    || Math.max(0, subtotal - couponDiscount + dynamicFeesTotal + gstAmount);
  
  // If this is an old order where totalGst was 0, but we calculated a non-zero gstAmount 
  // from the items, it means the server-persisted total_amount doesn't include GST.
  if (calculatedItemsGst > 0 && !(number(order.totalGst) > 0 || number(order.gstAmount) > 0)) {
    // total_amount currently lacks GST, so we must add it back in for display
    total += calculatedItemsGst;
  }

  // Advance payment — shown as a deduction below the grand total.
  const advancePayment = number(order.advance_payment) || number(order.codAdvance);

  // Amount already paid:
  //  • COD: the advance collected upfront
  //  • Online (Cashfree): full total once isPaid is true
  //  • Fallback: 0
  const paidAmount = number(order.paid_amount)
    || (order.paymentMethod === 'COD'
      ? advancePayment
      : (order.isPaid ? total : 0));

  // Remaining amount owed after deducting what has been paid.
  // We MUST calculate this from the final adjusted 'total' so it remains mathematically
  // consistent, especially if we added missing GST to the total above.
  const balanceAmount = Math.max(0, total - paidAmount);

  return {
    subtotal,
    couponDiscount,
    fees,           // billable fees only — advance already stripped
    total,
    advancePayment,
    paidAmount,
    balanceAmount,
    gstAmount,
  };
};
