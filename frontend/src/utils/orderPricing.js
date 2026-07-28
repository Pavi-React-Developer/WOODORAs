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

const matchingFees = (order, ...tokens) => (order.fees || [])
  .filter((fee) => {
    const feeName = String(fee.name || '').toLowerCase();
    return tokens.some(token => feeName.includes(token));
  })
  .reduce((sum, fee) => sum + number(fee.amount), 0);

// New orders carry these fields from checkout. The fallbacks make old orders
// safe to render without inventing a second calculation path.
export const getOrderPricing = (order = {}) => {
  const subtotal = number(order.subtotal) || number(order.itemsPrice);
  const couponDiscount = number(order.coupon_discount) || number(order.discountAmount);
  const productFee = number(order.product_fee) || matchingFees(order, 'product');
  const giftFee = number(order.gift_fee) || number(order.giftWrapFee) || matchingFees(order, 'gift');
  const weightFee = number(order.weight_fee) || number(order.shippingPrice) || matchingFees(order, 'weight');
  const shippingFee = number(order.shipping_fee);
  const platformFee = number(order.platform_fee) || matchingFees(order, 'platform', 'plaftform');
  const total = number(order.total_amount) || number(order.totalPrice)
    || Math.max(0, subtotal - couponDiscount + productFee + giftFee + shippingFee + weightFee + platformFee);
  const advancePayment = number(order.advance_payment) || number(order.codAdvance);
  const paidAmount = number(order.paid_amount) || (order.paymentMethod === 'COD'
    ? advancePayment
    : (order.isPaid ? total : 0));
  const balanceAmount = number(order.balance_amount) || number(order.balanceAmount)
    || Math.max(0, total - paidAmount);
  return { subtotal, couponDiscount, productFee, giftFee, shippingFee, weightFee, platformFee, total, advancePayment, paidAmount, balanceAmount };
};
