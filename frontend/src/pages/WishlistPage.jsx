import React, { useEffect, useState } from 'react';
import { Heart, ShoppingBag, ArrowLeft } from 'lucide-react';
import { getImageSrc, normalizeImageValue } from '../utils/imageUtils';

export default function WishlistPage({ wishlistItems, onRemove, onMoveToCart, onNavigate }) {
  
  const getEffectivePrice = (item) => {
    if (item.selectedVariant && (item.selectedVariant.basePrice != null || item.selectedVariant.price != null)) {
      return item.selectedVariant.basePrice ?? item.selectedVariant.price;
    }
    return item.price ?? 0;
  };

  const getEffectiveImage = (item) => {
    let imgSrc = item.selectedVariant?.images?.find(img => img.isThumbnail)?.url || item.selectedVariant?.images?.[0]?.url || (typeof item.selectedVariant?.images?.[0] === 'string' ? item.selectedVariant.images[0] : null);
    
    if (!imgSrc) {
       imgSrc = item.images?.find(img => img.isThumbnail)?.url || item.images?.[0]?.url || (typeof item.images?.[0] === 'string' ? item.images[0] : null) || (typeof item.image === 'object' ? item.image?.url : item.image) || null;
    }
    
    return imgSrc || '/wood-placeholder.png';
  };

  const getVariantText = (item) => {
    if (!item.selectedVariant?.options || !Array.isArray(item.selectedVariant.options)) {
      return '';
    }
    return item.selectedVariant.options
      .map(opt => `${opt.attribute?.name || opt.attributeName || 'Attr'}: ${opt.value}`)
      .join(', ');
  };

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F4EC] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E6DFD4] text-center max-w-md w-full">
          <div className="w-20 h-20 bg-[#F8F4EC] rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-rose-500 fill-rose-100" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Your Wishlist is Empty</h2>
          <p className="text-gray-500 mb-8">Save items you love here to easily find and purchase them later.</p>
          <button
            onClick={() => onNavigate('/')}
            className="w-full bg-[#8B5E3C] text-white py-3.5 rounded-xl font-semibold hover:bg-[#7a5234] transition-colors"
          >
            Explore Toys
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4EC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => onNavigate('/')} className="p-2 bg-white rounded-full text-gray-500 hover:text-[#8B5E3C] shadow-sm transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Your Wishlist</h1>
          <span className="bg-rose-100 text-rose-600 py-1 px-3 rounded-full text-sm font-semibold ml-auto">
            {wishlistItems.length} {wishlistItems.length === 1 ? 'Item' : 'Items'}
          </span>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD4] overflow-hidden mb-8">
          <div className="divide-y divide-[#E6DFD4]">
            {wishlistItems.map((item, index) => {
              const product = item.product || item;
              if (!product || !product.name) return null; // Skip dummy or invalid products

              const effectivePrice = getEffectivePrice(product);
              const firstImage = getEffectiveImage(product);
              const variantText = getVariantText(item);
              
              return (
                <div key={index} className="p-6 flex flex-col md:grid md:grid-cols-12 gap-6 items-center hover:bg-gray-50 transition-colors">
                  
                  <div className="col-span-8 flex items-center gap-6 w-full">
                    <div className="w-28 h-28 bg-[#F8F4EC] rounded-2xl overflow-hidden shrink-0 border border-gray-100">
                      <img 
                        src={firstImage || '/wood-placeholder.png'} 
                        alt={product.name} 
                        className="w-full h-full object-cover mix-blend-multiply"
                        onError={(e) => { e.target.src = '/wood-placeholder.png'; }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-xl line-clamp-2 leading-snug mb-1 cursor-pointer hover:text-[#8B5E3C]" onClick={() => onNavigate(`/product/${product._id || product.id}`)}>
                        {product.name}
                      </h3>
                      {variantText && (
                        <p className="text-sm text-gray-500 mb-2">{variantText}</p>
                      )}
                      <div className="font-bold text-[#8B5E3C] text-lg">
                        ₹{effectivePrice.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-4 flex justify-end gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <button 
                      onClick={() => onRemove(index)}
                      className="px-4 py-2.5 text-sm font-semibold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors"
                    >
                      Remove
                    </button>
                    <button 
                      onClick={() => onMoveToCart(item, index)}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#8B5E3C] rounded-xl hover:bg-[#7a5234] transition-colors shadow-sm"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Move to Cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
