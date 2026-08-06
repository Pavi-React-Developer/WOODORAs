import React from 'react';
import { getImageSrc, normalizeImageValue } from '../utils/imageUtils';
import { Minus, Plus } from 'lucide-react';
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
    
    // If variant is just an ID string/ObjectId, try to resolve it from product.variants
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
    return optParts.join(' | ') || null;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />
      
      {/* Offcanvas Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-[60] flex flex-col transform transition-transform duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-medium/20">
          <h2 className="font-serif text-2xl font-bold text-brand-dark">Wishlist</h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-brand-dark/60 hover:text-brand-dark hover:bg-brand-light/40 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Wishlist Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {wishlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-brand-dark/50 space-y-3">
              <span className="text-4xl">❤️</span>
              <p>Your wishlist is empty.</p>
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
              
              return (
                <div key={index} className="flex gap-4 p-3 bg-brand-beige/30 rounded-2xl border border-brand-medium/10">
                  <div className="w-20 h-20 bg-white rounded-xl overflow-hidden shrink-0 border border-brand-medium/10 flex items-center justify-center">
                    <img 
                      src={firstImage || ''} 
                      alt={prod.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-brand-dark line-clamp-2">{prod.name}</h4>
                      {variantText && (
                        <p className="text-xs text-brand-dark/60 mt-1 line-clamp-1">{variantText}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 mt-2">
                      <span className="font-serif font-bold text-brand-dark">
                        ₹{(effectivePrice * qty).toFixed(2)}
                      </span>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white rounded-lg border border-brand-medium/20 h-8">
                          <button 
                            onClick={() => qty > 1 && updateQuantity(index, qty - 1)}
                            className="w-8 h-full flex items-center justify-center text-brand-dark/60 hover:text-brand-dark transition-colors disabled:opacity-30"
                            disabled={qty <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-brand-dark">{qty}</span>
                          <button 
                            onClick={() => updateQuantity(index, qty + 1)}
                            className="w-8 h-full flex items-center justify-center text-brand-dark/60 hover:text-brand-dark transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-1">
                        <button 
                          onClick={() => onMoveToCart(item, index)}
                          className="text-[10px] bg-brand-dark text-white px-2 py-1 rounded hover:bg-brand-medium transition-colors uppercase tracking-wide font-bold"
                        >
                          Move to Cart
                        </button>
                        <button 
                          onClick={() => onRemove(index)}
                          className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wide"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
