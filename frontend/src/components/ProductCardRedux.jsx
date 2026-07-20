import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { addToCartSmartThunk } from '../redux/cartSlice';
import { toast } from 'react-hot-toast';

export default function ProductCardRedux({ product, onNavigate, onAddToWishlist, user }) {
  const dispatch = useDispatch();
  const [isAdding, setIsAdding] = useState(false);

  const getPricingInfo = (p) => {
    let listPrice = 0, salePrice = 0;
    if (p.hasVariants && p.variants && p.variants.length > 0) {
      listPrice = Math.min(...p.variants.map((v) => v.price || 0));
      salePrice = Math.min(...p.variants.map((v) => v.salePrice || v.price || 0));
    } else {
      listPrice = p.price || 0;
      salePrice = p.salePrice || listPrice;
    }
    const hasDiscount = salePrice < listPrice;
    const discountPercent = hasDiscount ? Math.round(((listPrice - salePrice) / listPrice) * 100) : 0;
    return { listPrice, salePrice, hasDiscount, discountPercent };
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (isAdding) return; // Prevent rapid duplicate requests

    setIsAdding(true);
    try {
      await dispatch(addToCartSmartThunk({ product, qty: 1 })).unwrap();
    } catch (error) {
      // Toast error is handled inside the Thunk or can be caught here
      if (error === 'OUT_OF_STOCK') {
          // Additional local logic if needed
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
    onAddToWishlist?.(product);
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
      className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-[#E6DFD4] shadow-sm hover:shadow-md transition-shadow h-full flex flex-col"
    >
      <div className="aspect-square bg-[#F7F3EE] p-4 relative overflow-hidden shrink-0">
        {imgSrc ? (
          <motion.img
            src={imgSrc}
            alt={product.name}
            className="w-full h-full object-contain mix-blend-multiply"
            variants={{ rest: { scale: 1 }, hover: { scale: 1.08 } }}
            transition={{ duration: 0.35 }}
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#C8B9A0]">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-end justify-center pb-3 gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className={`bg-brand-dark text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 transition-colors ${isAdding ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black'}`}
          >
            {isAdding ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-sm font-medium text-brand-dark truncate mb-2">{product.name || 'Untitled Product'}</h3>
        <div className="flex flex-col gap-2 mt-auto">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-brand-dark">₹{pricing.salePrice.toFixed(2)}</p>
            {pricing.hasDiscount && (
              <p className="text-xs text-brand-medium line-through">₹{pricing.listPrice.toFixed(2)}</p>
            )}
          </div>
          {pricing.hasDiscount && (
            <span className="inline-flex items-center self-start rounded-full bg-[#B1621F]/15 px-2 py-0.5 text-[10px] font-semibold text-[#B1621F]">
              -{pricing.discountPercent}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
