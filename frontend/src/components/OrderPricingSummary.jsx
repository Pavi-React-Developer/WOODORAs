import React from 'react';
import { getOrderPricing } from '../utils/orderPricing';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

/**
 * Renders a clean, fully-dynamic payment breakdown:
 *
 *   Subtotal            ₹X
 *   Coupon Discount    -₹Y   (only if applied)
 *   [dynamic fees]    +₹Z   (shipping, platform, etc. — advance excluded)
 *   ──────────────────────
 *   Grand Total        ₹T
 *   Advance Paid      -₹A   (only if COD advance collected)
 *   ──────────────────────
 *   Balance to Pay     ₹B   (only if outstanding amount > 0)
 *
 * No static / hardcoded fee names — everything comes from the order document.
 */
export default function OrderPricingSummary({ order, className = '' }) {
  const pricing = getOrderPricing(order);

  return (
    <div className={`space-y-2 text-sm ${className}`}>

      {/* Subtotal */}
      <div className="flex justify-between">
        <span className="text-gray-600">Subtotal</span>
        <span className="font-semibold text-gray-900">{money(pricing.subtotal)}</span>
      </div>

      {/* Coupon discount */}
      {pricing.couponDiscount > 0 && (
        <div className="flex justify-between">
          <span className="text-emerald-700">Coupon Discount</span>
          <span className="font-semibold text-emerald-700">-{money(pricing.couponDiscount)}</span>
        </div>
      )}

      {/* GST Amount */}
      {pricing.gstAmount !== undefined && pricing.gstAmount !== null && (
        <div className="flex justify-between">
          <span className="text-gray-600">GST Amount</span>
          <span className="font-semibold text-gray-900">{pricing.gstAmount > 0 ? `+${money(pricing.gstAmount)}` : money(0)}</span>
        </div>
      )}

      {/* Dynamic billable fees — advance is already excluded from this list */}
      {pricing.fees.map((fee, idx) => (
        <div key={idx} className="flex justify-between">
          <span className="text-gray-600">{fee.name}</span>
          <span className={fee.amount === 0 || fee.isFree ? "font-semibold text-emerald-700" : "font-semibold text-gray-900"}>
            {fee.amount === 0 || fee.isFree ? 'FREE' : `+${money(fee.amount)}`}
          </span>
        </div>
      ))}

      {/* Grand Total */}
      <div className="flex justify-between border-t pt-3 mt-3 font-bold text-gray-900">
        <span>Grand Total</span>
        <span>{money(pricing.total)}</span>
      </div>

      {/* Advance Payment — shown as a deduction below the grand total */}
      {pricing.advancePayment > 0 && (
        <div className="flex justify-between text-emerald-700 font-semibold">
          <span>Advance Paid (COD)</span>
          <span>-{money(pricing.advancePayment)}</span>
        </div>
      )}

      {/* For fully-paid online orders with no advance, show a paid row */}
      {pricing.paidAmount > 0 && pricing.advancePayment === 0 && (
        <div className="flex justify-between text-emerald-700 font-semibold">
          <span>
            Paid
            {order?.paymentMethod ? ` (${order.paymentMethod})` : ''}
          </span>
          <span>-{money(pricing.paidAmount)}</span>
        </div>
      )}

      {/* Balance remaining — shown only when there is an outstanding amount */}
      {pricing.balanceAmount > 0 && (
        <div className="flex justify-between border-t pt-3 mt-1 font-bold text-red-600">
          <span>Balance to Pay</span>
          <span>{money(pricing.balanceAmount)}</span>
        </div>
      )}

      {/* Fully paid indicator */}
      {pricing.balanceAmount === 0 && pricing.paidAmount > 0 && (
        <div className="flex justify-between border-t pt-3 mt-1 font-bold text-emerald-700">
          <span>Status</span>
          <span>Fully Paid ✓</span>
        </div>
      )}
    </div>
  );
}
