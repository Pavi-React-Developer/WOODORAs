export const generateDisplayId = (prefix, id) => {
  if (!id) return '';
  const num = parseInt(id.slice(-6), 16) % 100000;
  return `${prefix}${num.toString().padStart(5, '0')}`;
};

export const formatOrderId = (order) => {
  if (!order) return '';
  let id = order.orderId || order.displayId || generateDisplayId(order.isGiftOrder ? 'MKG' : 'MK', order._id);
  if (id.startsWith('#')) {
    id = id.substring(1);
  }
  if (order.isGiftOrder && id.startsWith('MK') && !id.startsWith('MKG')) {
    id = 'MKG' + id.substring(2);
  }
  return id;
};

/**
 * Sanitizes a paymentMethod value.
 * Cashfree session IDs (session_...) sometimes bleed into this field.
 * Returns only 'COD', 'Cashfree', or a fallback label.
 */
export const formatPaymentMethod = (value) => {
  if (!value) return 'Online';
  const v = String(value).trim();
  if (v === 'COD') return 'COD';
  if (v === 'Cashfree') return 'Cashfree';
  // If the value contains a session token (starts with "session_"), normalise it
  if (v.toLowerCase().startsWith('session_')) return 'Cashfree';
  // Any other unexpected value – fall back to Cashfree (it was an online payment)
  if (v.length > 20) return 'Cashfree';
  return v;
};

