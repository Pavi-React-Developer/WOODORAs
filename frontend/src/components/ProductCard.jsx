import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BsBagHeartFill } from "react-icons/bs";
import { RiHeartAdd2Line, RiHeartFill } from "react-icons/ri";
import { API_ORIGIN } from '../api/apiClient';
import useWishlistStore from '../store/useWishlistStore';

export default function ProductCard({ product, viewMode = 'grid', onNavigate, onAddToCart, onAddToWishlist, onRemoveFromWishlist, user, hideCartIcon = false, hideRating = false, actionButton = null }) {
  const [isAdding, setIsAdding] = useState(false);
  
  // Use global wishlist state to stay in sync with sidebar removals
  const wishlistItems = useWishlistStore(state => state.wishlistItems);
  const isInWishlist = wishlistItems.some(w => {
      const pId = w.product?._id || w.product || w._id || w;
      return String(pId) === String(product._id);
  }) || user?.wishlist?.some?.((w) => {
      const pId = w.product?._id || w.product || w._id || w;
      return String(pId) === String(product._id);
  }) || product.isWishlisted;
  // Fallback to local state just for immediate UI feedback before store updates
  const [localWishlist, setLocalWishlist] = useState(isInWishlist);

  // Sync local UI state with actual store state
  React.useEffect(() => {
    setLocalWishlist(isInWishlist);
  }, [isInWishlist]);

  const getPricingInfo = (p) => {
    let listPrice = 0, salePrice = 0;
    if (p.variants && p.variants.length > 0) {
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
        let defaultVariant = null;
        if (p.variants && p.variants.length > 0) {
            defaultVariant = p.variants[0];
        }
        await onAddToCart?.(p, 1, defaultVariant);
      } finally {
        setIsAdding(false);
      }
    } else {
      const isCurrentlyWishlisted = localWishlist;
      setLocalWishlist(!isCurrentlyWishlisted);
      
      let defaultVariant = null;
      if (p.variants && p.variants.length > 0) {
          defaultVariant = p.variants[0];
      }
      
      if (isCurrentlyWishlisted) {
         // If already wishlisted, use provided callback or default to store toggle
         if (onRemoveFromWishlist) {
             onRemoveFromWishlist(p);
         } else {
             useWishlistStore.getState().toggleWishlist(p, defaultVariant, 1);
         }
      } else {
         // If adding, use the passed function so it can open the offcanvas
         onAddToWishlist?.(p, defaultVariant, 1);
      }
    }
  };

  let imgSrc = product.images?.find(img => img.isThumbnail)?.url || product.images?.[0]?.url || (typeof product.images?.[0] === 'string' ? product.images[0] : null) || (typeof product.image === 'object' ? product.image?.url : product.image) || null;
  if (imgSrc && typeof imgSrc === 'string' && imgSrc.startsWith('/uploads')) imgSrc = `${API_ORIGIN}${imgSrc}`;
  
  const pricing = getPricingInfo(product);

  const getDynamicReview = (p) => {
    return { 
      rating: p.averageRating ? Number(p.averageRating).toFixed(1) : "0.0", 
      count: p.reviewCount || 0 
    };
  };

  const reviewInfo = getDynamicReview(product);

  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      animate="rest"
      onClick={() => onNavigate(`/product/${product._id}`)}
      className={`group cursor-pointer bg-white rounded-2xl overflow-hidden border border-[#E6DFD4] shadow-sm hover:shadow-md transition-shadow flex ${viewMode === 'list' ? 'flex-row h-auto' : 'flex-col h-auto w-full max-w-[420px] mx-auto'}`}
    >
      <div className={`relative overflow-hidden shrink-0 ${viewMode === 'list' ? 'w-[140px] sm:w-[320px] aspect-square sm:aspect-[4/3]' : 'aspect-[4/5] md:aspect-[4/3]'}`}>
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
        <div className={`absolute flex flex-col gap-2 z-10 ${viewMode === 'list' ? 'top-2 right-2 sm:top-3 sm:right-3' : 'top-2 right-2 sm:top-[1vw] sm:right-[1vw]'}`}>
          <motion.button
            whileTap={{ scale: 0.7 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            onClick={(e) => { e.stopPropagation(); handleAction('Wishlist', product, e); }}
            className={`bg-white rounded-full flex items-center justify-center hover:shadow-md transition-all shadow-sm ${viewMode === 'list' ? 'w-6 h-6 sm:w-10 sm:h-10' : 'w-[clamp(28px,2.5vw,36px)] h-[clamp(28px,2.5vw,36px)]'}`}
          >
            {localWishlist ? (
              <RiHeartFill className={`transition-colors duration-300 text-red-500 scale-110 ${viewMode === 'list' ? 'w-3 h-3 sm:w-5 sm:h-5' : 'w-[clamp(14px,1.2vw,18px)] h-[clamp(14px,1.2vw,18px)]'}`} />
            ) : (
              <RiHeartAdd2Line className={`transition-colors duration-300 text-[#999999] hover:text-red-500 ${viewMode === 'list' ? 'w-3 h-3 sm:w-5 sm:h-5' : 'w-[clamp(14px,1.2vw,18px)] h-[clamp(14px,1.2vw,18px)]'}`} />
            )}
          </motion.button>
          
          {hideCartIcon ? null : (
            <motion.button
              whileTap={{ scale: 0.7 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              onClick={(e) => { e.stopPropagation(); handleAction('Cart', product, e); }}
              className={`bg-white rounded-full flex items-center justify-center hover:shadow-md transition-all shadow-sm text-[#999999] hover:text-[#B1621F] ${viewMode === 'list' ? 'w-6 h-6 sm:w-10 sm:h-10' : 'w-[clamp(28px,2.5vw,36px)] h-[clamp(28px,2.5vw,36px)]'}`}
            >
              {isAdding ? (
                 <div className={`border-2 border-[#B1621F] border-t-transparent rounded-full animate-spin ${viewMode === 'list' ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-[clamp(12px,1vw,16px)] h-[clamp(12px,1vw,16px)]'}`} />
              ) : (
                 <BsBagHeartFill className={`${viewMode === 'list' ? 'w-3 h-3 sm:w-5 sm:h-5' : 'w-[clamp(14px,1.2vw,18px)] h-[clamp(14px,1.2vw,18px)]'}`} />
              )}
            </motion.button>
          )}
        </div>
      </div>
      <div className={`flex flex-col flex-1 bg-white ${viewMode === 'list' ? 'p-3 sm:p-8 justify-center gap-1 sm:gap-2' : 'p-2.5 sm:p-4'}`}>
        <h3 className={`font-semibold text-[#B0611C] ${viewMode === 'list' ? 'text-sm sm:text-2xl mb-1 line-clamp-2' : 'text-xs sm:text-sm mb-1 sm:mb-2 line-clamp-1'}`}>{product.name || 'Untitled Product'}</h3>
        <div className={`flex items-center flex-wrap ${viewMode === 'list' ? 'gap-2 sm:gap-3 mb-2 sm:mb-4' : 'gap-1.5 sm:gap-2 mb-1.5 sm:mb-3'}`}>
          <span className={`font-bold text-[#333333] ${viewMode === 'list' ? 'text-lg sm:text-3xl' : 'text-sm'}`}>₹{pricing.salePrice.toLocaleString()}</span>
          {pricing.hasDiscount && (
            <>
              <span className={`text-[#999999] line-through ${viewMode === 'list' ? 'text-xs sm:text-lg' : 'text-[11px]'}`}>₹{pricing.listPrice.toLocaleString()}</span>
              <span className={`inline-flex items-center self-start rounded-full bg-[#B1621F]/15 font-semibold text-[#B1621F] ${viewMode === 'list' ? 'px-2 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm' : 'px-2 py-0.5 text-[10px]'}`}>
                -{pricing.discountPercent}%
              </span>
            </>
          )}
        </div>
        {hideRating ? null : (
          <div className="flex items-center gap-1 mt-auto">
            <svg className={`text-[#F5C518] ${viewMode === 'list' ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-3.5 h-3.5'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            <span className={`font-medium text-[#666666] ${viewMode === 'list' ? 'text-xs sm:text-base' : 'text-[11px]'}`}>{reviewInfo.rating} <span className="text-[#999999] font-normal">({reviewInfo.count})</span></span>
          </div>
        )}
        {actionButton && (
          <div className="mt-4">
            {actionButton}
          </div>
        )}
      </div>
    </motion.div>
  );
}
