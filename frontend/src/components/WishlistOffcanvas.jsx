import React from 'react';
import { getImageSrc, normalizeImageValue } from '../utils/imageUtils';

export default function WishlistOffcanvas({ isOpen, onClose, wishlistItems, onRemove, onMoveToCart }) {
  if (!isOpen) return null;

  // Helper function to get the effective price (variant price or product price)
  const getEffectivePrice = (item) => {
    if (item.selectedVariant && (item.selectedVariant.basePrice != null || item.selectedVariant.price != null)) {
      return item.selectedVariant.basePrice ?? item.selectedVariant.price;
    }
    return item.salePrice || item.price || 0;
  };

  // Helper function to get the effective images (variant images or product images)
  const getEffectiveImage = (item) => {
    let imgSrc = item.selectedVariant?.images?.find(img => img.isThumbnail)?.url || item.selectedVariant?.images?.[0]?.url || (typeof item.selectedVariant?.images?.[0] === 'string' ? item.selectedVariant.images[0] : null);
    
    if (!imgSrc) {
       imgSrc = item.images?.find(img => img.isThumbnail)?.url || item.images?.[0]?.url || (typeof item.images?.[0] === 'string' ? item.images[0] : null) || (typeof item.image === 'object' ? item.image?.url : item.image) || null;
    }
    
    return imgSrc || '/wood-placeholder.png';
  };

  // Helper function to get variant details text
  const getVariantText = (item) => {
    if (!item.selectedVariant?.options || !Array.isArray(item.selectedVariant.options)) {
      return '';
    }
    return item.selectedVariant.options
      .map(opt => `${opt.attribute?.name || opt.attributeName || 'Attr'}: ${opt.value}`)
      .join(', ');
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
            wishlistItems.map((item, index) => {
              const effectivePrice = getEffectivePrice(item);
              const firstImage = getEffectiveImage(item);
              const variantText = getVariantText(item);
              
              return (
                <div key={index} className="flex gap-4 p-3 bg-brand-beige/30 rounded-2xl border border-brand-medium/10">
                  <div className="w-20 h-20 bg-white rounded-xl overflow-hidden shrink-0 border border-brand-medium/10 flex items-center justify-center">
                    <img 
                      src={firstImage || '/wood-placeholder.png'} 
                      alt={item.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/wood-placeholder.png'; }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-brand-dark line-clamp-2">{item.name}</h4>
                      {variantText && (
                        <p className="text-xs text-brand-dark/60 mt-1 line-clamp-1">{variantText}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 mt-2">
                      <span className="font-serif font-bold text-brand-dark">
                        ₹{effectivePrice.toFixed(2)}
                      </span>
                      <div className="flex justify-between items-center">
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
