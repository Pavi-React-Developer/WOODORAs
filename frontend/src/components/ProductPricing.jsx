import React from 'react';

export default function ProductPricing({ pricing, quantity }) {
  if (!pricing) return null;
  
  return (
    <div className="flex flex-col gap-2 mb-8">
      <div className="flex flex-wrap items-baseline gap-3 sm:gap-4 mt-1">
        {pricing.hasDiscount && (
          <span className="text-[2.5rem] sm:text-[3rem] text-[#5C2E0E] line-through shrink-0 font-medium tracking-tight opacity-70 leading-none">
            ₹{(pricing.listPrice * quantity).toFixed(0)}
          </span>
        )}
        <p className="text-[2.5rem] sm:text-[3rem] font-medium tracking-tight text-[#141225] leading-none">
          ₹{(pricing.salePrice * quantity).toFixed(0)}
        </p>
      </div>
      <p className="text-sm text-[#141225] mt-1 font-medium">Inclusive of all taxes</p>
    </div>
  );
}
