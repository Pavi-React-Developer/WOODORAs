import React, { useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2, Gift, X } from 'lucide-react';
import { RiHeartAdd2Line } from "react-icons/ri";
import useWishlistStore from '../store/useWishlistStore';

export default function WishlistOffcanvas({ isOpen, onClose, wishlistItems, onRemove, onMoveToCart }) {
  if (!isOpen) return null;

  const { updateQuantity } = useWishlistStore();

  // Helper function to get the effective price (variant price or product price)
  const getEffectivePrice = (item) => {
    const variant = item.variant || item.selectedVariant;
    const prod = item.product || item;
    if (variant && (variant.basePrice != null || variant.price != null)) {
      return variant.basePrice ?? variant.price;
    }
    return prod.salePrice || prod.price || 0;
  };

  // Helper function to get the effective images (variant images or product images)
  const getEffectiveImage = (item) => {
    const variant = item.variant || item.selectedVariant;
    const prod = item.product || item;

    let imgSrc = variant?.images?.find(img => img.isThumbnail)?.url || variant?.images?.[0]?.url || (typeof variant?.images?.[0] === 'string' ? variant.images[0] : null);

    if (!imgSrc) {
      imgSrc = prod?.images?.find(img => img.isThumbnail)?.url || prod?.images?.[0]?.url || (typeof prod?.images?.[0] === 'string' ? prod.images[0] : null) || (typeof prod?.image === 'object' ? prod.image?.url : prod?.image) || null;
    }

    return imgSrc || '';
  };

  // Helper function to get variant details text
  const getVariantText = (item) => {
    let variant = item.variant || item.selectedVariant;
    const prod = item.product || item;

    if (variant && typeof variant === 'string' && prod.variants && Array.isArray(prod.variants)) {
      variant = prod.variants.find(v => String(v._id || v.id) === String(variant)) || variant;
    }

    const cap = (s) => (typeof s === 'string' ? s.charAt(0).toUpperCase() + s.slice(1) : s);
    const optParts = [];

    if (variant && typeof variant === 'object' && ((Array.isArray(variant.options) && variant.options.length > 0) || variant.variantCombination || variant.color || variant.size || variant.weight)) {
      if (Array.isArray(variant.options) && variant.options.length > 0) {
        variant.options.forEach((opt) =>
          optParts.push(`${cap(opt.attribute?.name || opt.attributeName || 'Option')}: ${cap(opt.value)}`)
        );
      } else if (variant.variantCombination) {
        optParts.push(variant.variantCombination.split('-').map(cap).join(', '));
      } else {
        if (variant.color) optParts.push(`Colour: ${cap(variant.color)}`);
        if (variant.weight) optParts.push(`Weight: ${cap(String(variant.weight))} kg`);
        if (variant.size) optParts.push(`Size: ${cap(variant.size)}`);
      }
    } else if (prod.selectedAttributeValues && Object.keys(prod.selectedAttributeValues).length > 0) {
      Object.entries(prod.selectedAttributeValues).forEach(([k, v]) => {
        optParts.push(`${cap(k)}: ${cap(v)}`);
      });
    }
    return optParts.length > 0 ? optParts.join(' | ') : '';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Offcanvas Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[420px] bg-[#FAF6F0] shadow-2xl z-[60] flex flex-col transform transition-transform duration-300">

        {/* Header */}
        <div className="relative px-8 pt-10 pb-6 flex flex-col">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-[#7C6A5A] hover:text-[#3F2B1F] bg-white/50 hover:bg-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="font-serif text-3xl font-extrabold text-[#3F2B1F] flex items-center gap-2">
            Wishlist<span className="text-2xl">🤎</span>
          </h2>
          <p className="text-xs font-semibold text-[#7C6A5A] mt-2">
            Save your favorite toys and buy them later.
          </p>
        </div>

        {/* Wishlist Items */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {wishlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-brand-dark/50 space-y-4">
              <span className="text-6xl opacity-80">🤎</span>
              <p className="text-lg font-medium text-[#7C6A5A]">Your wishlist is empty.</p>
            </div>
          ) : (
            wishlistItems
              .filter(item => {
                const prod = item.product || item;
                return prod && prod._id && prod.name;
              })
              .map((item, index) => {
                const prod = item.product || item;
                const qty = item.qty || 1;
                const effectivePrice = getEffectivePrice(item);
                const firstImage = getEffectiveImage(item);
                const variantText = getVariantText(item);

                const productVariants = prod?.variants || [];
                let selectedVariantData = null;
                if (item.variant && typeof item.variant === 'string' && Array.isArray(productVariants)) {
                  selectedVariantData = productVariants.find(v => String(v._id || v.id) === String(item.variant));
                } else if (item.variant && typeof item.variant === 'object') {
                  selectedVariantData = item.variant;
                }

                let maxAllowedQty = selectedVariantData
                  ? Math.max(0, (selectedVariantData.inventory || 0) - (selectedVariantData.reserveStock || 0))
                  : productVariants.length > 0
                    ? 0
                    : (prod?.inventory?.stockQuantity || prod?.stock || 0);

                if (maxAllowedQty === 0 && !prod?.inventory && !prod?.stock) {
                  maxAllowedQty = 999;
                }

                const dynamicMaxOrderQty = prod?.maxOrderQty || 6;
                maxAllowedQty = Math.min(maxAllowedQty, dynamicMaxOrderQty);

                return (
                  <div key={index} className="relative flex gap-4 p-4 bg-white rounded-[24px] shadow-sm border border-[#E9E2D8]">
                    {/* Heart Icon (Remove) top right */}
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={() => onRemove(index)}
                        className="w-8 h-8 rounded-full border border-red-100 flex items-center justify-center bg-white shadow-sm hover:bg-red-50 transition-colors"
                      >
                        <RiHeartAdd2Line className="w-4 h-4 text-[#E24A4A]" />
                      </button>
                    </div>

                    {/* Image */}
                    <div className="w-24 h-24 bg-[#F5EFE6] rounded-[16px] overflow-hidden shrink-0 flex items-center justify-center border border-[#E9E2D8]/50">
                      <img
                        src={firstImage || ''}
                        alt={prod.name}
                        className="w-full h-full object-cover mix-blend-multiply"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div className="pr-10">
                        <h4 className="font-extrabold text-[#3F2B1F] text-[14px] leading-tight line-clamp-2">{prod.name}</h4>
                        <p className="text-[11px] font-semibold text-[#7C6A5A] mt-1 line-clamp-1">{variantText}</p>
                        <span className="font-extrabold text-[#3B7340] text-[15px] mt-1.5 block">
                          ₹{(effectivePrice * qty).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-start justify-between mt-3">
                        {/* Qty Selector */}
                        <div className="flex items-center bg-white rounded-lg border border-[#E9E2D8] h-9 shadow-sm px-1">
                          <button
                            onClick={() => qty > 1 && updateQuantity(index, qty - 1)}
                            className="w-10 h-full flex items-center justify-center text-[#7C6A5A] hover:text-[#3F2B1F] transition-colors disabled:opacity-30"
                            disabled={qty <= 1}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-[#3F2B1F]">{qty}</span>
                          <button
                            onClick={() => {
                              if (qty >= maxAllowedQty) {
                                toast.error(`Maximum allowed quantity is ${maxAllowedQty}`);
                              } else {
                                updateQuantity(index, qty + 1);
                              }
                            }}
                            disabled={qty >= maxAllowedQty || maxAllowedQty === 0}
                            className="w-10 h-full flex items-center justify-center text-[#7C6A5A] hover:text-[#3F2B1F] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() => onMoveToCart(item, index)}
                            className="flex items-center gap-1.5 bg-[#b1621d] hover:bg-[#8f4e17] text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            <span className="text-xs font-bold tracking-wide">Move to Cart</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
          )}

          {wishlistItems.length > 0 && (
            <div className="mt-8 bg-[#F3EADD] rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden">
              <div className="w-10 h-10 bg-[#E2D2B8] rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                <Gift className="w-5 h-5 text-[#886749]" />
              </div>
              <div className="z-10 relative">
                <h4 className="font-extrabold text-sm text-[#4A2D1C]">Good choice!</h4>
                <p className="text-[11px] font-semibold text-[#7C6A5A] mt-0.5">Add more toys to make playtime more joyful.</p>
              </div>
              {/* Decorative background element */}
              <div className="absolute right-[-15px] bottom-[-20px] opacity-[0.08] transform rotate-12">
                <RiHeartAdd2Line className="w-24 h-24 text-[#886749]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

