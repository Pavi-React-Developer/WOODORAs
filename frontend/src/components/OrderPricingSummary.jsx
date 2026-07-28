import React from 'react';
import { getOrderPricing } from '../utils/orderPricing';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function OrderPricingSummary({ order, className = '' }) {
  const pricing = getOrderPricing(order);
  // Subtotal is always meaningful. Every optional row is shown only when it
  // was actually applied to this order, never as a misleading ₹0 charge.
  const rows = [
    ['Subtotal', pricing.subtotal, false, true],
    ['Coupon Discount', pricing.couponDiscount, true],
    ['Product Fee', pricing.productFee],
    ['Gift Fee', pricing.giftFee],
    ['Shipping Fee', pricing.shippingFee],
    ['Weight Fee', pricing.weightFee],
    ['Platform Fee', pricing.platformFee],
  ].filter(([, value,, alwaysShow]) => alwaysShow || Number(value) > 0);
  return <div className={`space-y-2 text-sm ${className}`}>
    {rows.map(([label, value, discount]) => <div key={label} className="flex justify-between">
      <span className={discount ? 'text-emerald-700' : 'text-gray-600'}>{label}</span>
      <span className="font-semibold text-gray-900">{discount ? '-' : '+'}{money(value)}</span>
    </div>)}
    <div className="flex justify-between border-t pt-3 mt-3 font-bold text-gray-900"><span>Grand Total</span><span>{money(pricing.total)}</span></div>
    <div className="flex justify-between text-emerald-700 font-bold"><span>Paid{pricing.advancePayment ? ' (Advance Payment)' : ''}</span><span>{money(pricing.paidAmount)}</span></div>
    <div className="flex justify-between text-red-600 font-bold"><span>Balance to Pay</span><span>{money(pricing.balanceAmount)}</span></div>
  </div>;
}
