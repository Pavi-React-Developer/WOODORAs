import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function ProductCard({ product, viewMode = 'grid', onNavigate, onAddToCart, onAddToWishlist, user }) {
  const [isAdding, setIsAdding] = useState(false);

  const getPricingInfo = (p) => {
    let listPrice = 0, salePrice = 0;
    if (p.hasVariants && p.variants && p.variants.length > 0) {
      listPrice = Math.min(...p.variants.map((v) => v.basePrice || v.price || 0));
      salePrice = Math.min(...p.variants.map((v) => v.discountPrice || v.salePrice || v.basePrice || v.price || 0));
    } else {
      listPrice = p.basePrice || p.price || 0;
      salePrice = p.discountPrice || p.salePrice || listPrice;
    }
    const hasDiscount = salePrice < listPrice;
    const discountPercent = hasDiscount ? Math.round(((listPrice - salePrice) / listPrice) * 100) : 0;
    return { listPrice, salePrice, hasDiscount, discountPercent };
  };

  const handleAction = async (type, p, e) => {
    e.stopPropagation();
    if (type === 'Cart') {
      if (isAdding) return;
      setIsAdding(true);
      try {
        await onAddToCart?.(p);
      } finally {
        setIsAdding(false);
      }
    } else {
      onAddToWishlist?.(p);
    }
  };

  let imgSrc = product.images?.find(img => img.isThumbnail)?.url || product.images?.[0]?.url || (typeof product.images?.[0] === 'string' ? product.images[0] : null) || (typeof product.image === 'object' ? product.image?.url : product.image) || null;
  if (imgSrc && typeof imgSrc === 'string' && imgSrc.startsWith('/uploads')) imgSrc = `http://localhost:5000${imgSrc}`;
  
  const pricing = getPricingInfo(product);

  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      animate="rest"
      onClick={() => onNavigate(`/product/${product._id}`)}
      className={`group cursor-pointer bg-white rounded-2xl overflow-hidden border border-[#E6DFD4] shadow-sm hover:shadow-md transition-shadow flex ${viewMode === 'list' ? 'flex-col sm:flex-row h-auto' : 'flex-col h-full'}`}
    >
      <div className={`relative overflow-hidden shrink-0 ${viewMode === 'list' ? 'w-full sm:w-[240px] aspect-[4/3] sm:aspect-square' : 'aspect-square'}`}>
        {imgSrc ? (
          <motion.img
            src={imgSrc}
            alt={product.name}
            className="w-full h-full object-cover"
            variants={{ rest: { scale: 1 }, hover: { scale: 1.05 } }}
            transition={{ duration: 0.3 }}
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#C8B9A0] bg-[#F7F3EE]">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handleAction('Wishlist', product, e); }}
          className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#999999] hover:text-[#B1621F] hover:shadow-md transition-all shadow-sm z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
      <div className={`flex flex-col flex-1 bg-white ${viewMode === 'list' ? 'p-4 sm:p-6 justify-center' : 'p-4'}`}>
        <h3 className="text-sm font-semibold text-[#B0611C] mb-2 line-clamp-1">{product.name || 'Untitled Product'}</h3>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-sm font-bold text-[#333333]">₹{pricing.salePrice.toLocaleString()}</span>
          {pricing.hasDiscount && (
            <>
              <span className="text-[11px] text-[#999999] line-through">₹{pricing.listPrice.toLocaleString()}</span>
              <span className="inline-flex items-center self-start rounded-full bg-[#B1621F]/15 px-2 py-0.5 text-[10px] font-semibold text-[#B1621F]">
                -{pricing.discountPercent}%
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 mt-auto">
          <svg className="w-3.5 h-3.5 text-[#F5C518]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          <span className="text-[11px] font-medium text-[#666666]">{product.averageRating !== undefined ? product.averageRating : 0} <span className="text-[#999999] font-normal">({product.reviewCount !== undefined ? product.reviewCount : 0})</span></span>
        </div>
      </div>
    </motion.div>
  );
}
