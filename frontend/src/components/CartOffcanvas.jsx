import React, { useState, useEffect } from 'react';
import { Gift, Minus, Plus, Trash2, X } from 'lucide-react';
import { FiShoppingCart } from "react-icons/fi";
import { BsBagHeartFill } from "react-icons/bs";
import useCartStore from '../store/useCartStore';
import useCartCalculation from '../hooks/useCartCalculation';
import { useNavigate } from 'react-router-dom';
import { authService } from '../api/authService';
import { productV2API } from '../api/catalogV2Service';

function CartVariantSuggestion({ productId, currentVariantId, cartItems }) {
  const [suggestion, setSuggestion] = useState(null);
  const [productData, setProductData] = useState(null);
  const { addToCart } = useCartStore();
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchSuggestion = async () => {
      try {
        const res = await productV2API.getById(productId);
        if (!active) return;
        const prod = res.product || res;
        setProductData(prod);
        if (prod && prod.variants && Array.isArray(prod.variants)) {
          const cartVariantIds = new Set(cartItems.filter(i => String(i.product) === String(productId)).map(i => i.variant));
          const available = prod.variants.find(v => 
            v.isActive !== false && 
            String(v._id) !== String(currentVariantId) && 
            !cartVariantIds.has(v._id) &&
            ((v.inventory ?? v.currentStock ?? v.stock ?? 0) - (v.reserveStock || 0)) > 0
          );
          if (available) {
            setSuggestion(available);
          }
        }
      } catch (err) {
        console.error('Failed to fetch variants for suggestion:', err);
      }
    };
    fetchSuggestion();
    return () => { active = false; };
  }, [productId, currentVariantId, cartItems]);

  if (!suggestion || !productData) return null;

  const handleAdd = () => {
    setIsAdding(true);
    setTimeout(() => {
      addToCart(productData, 1, suggestion);
      setIsAdding(false);
    }, 300);
  };

  const optionText = suggestion.options?.map(o => o.value).join(' / ') || 'another';

  let suggestionImgSrc = '/wood-placeholder.png';
  if (suggestion?.images && Array.isArray(suggestion.images) && suggestion.images.length > 0) {
    const img = suggestion.images[0];
    suggestionImgSrc = typeof img === 'string' ? img : (img?.url || suggestionImgSrc);
  } else if (productData?.image) {
    const img = productData.image;
    suggestionImgSrc = typeof img === 'string' ? img : (img?.url || suggestionImgSrc);
  } else if (productData?.images && Array.isArray(productData.images) && productData.images.length > 0) {
    const img = productData.images[0];
    suggestionImgSrc = typeof img === 'string' ? img : (img?.url || suggestionImgSrc);
  }

  return (
    <div className="mt-3 bg-amber-50 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-1">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-8 h-8 rounded border border-amber-200 overflow-hidden shrink-0 bg-white flex items-center justify-center">
          <img 
            src={suggestionImgSrc} 
            alt={optionText} 
            className="w-full h-full object-cover" 
            onError={(e) => { e.target.src = '/wood-placeholder.png'; }} 
          />
        </div>
        <span className="text-[11px] text-amber-800 font-medium truncate">
          Try our <span className="font-bold">{optionText}</span> version instead!
        </span>
      </div>
      <button 
        type="button"
        onClick={handleAdd}
        disabled={isAdding}
        className="text-[10px] font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 uppercase tracking-wide shrink-0"
      >
        {isAdding ? 'Adding...' : 'Add'}
      </button>
    </div>
  );
}

/**
 * CartOffcanvas — Side drawer cart panel.
 *
 * Uses useCartStore directly (single source of truth).
 * All quantity / remove actions go through the store which handles
 * optimistic UI + backend sync via item-level APIs.
 */
export default function CartOffcanvas({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, getSubtotal } = useCartStore();
  
  // Use local calculation for immediate UI updates and guest user support
  const total = getSubtotal();

  if (!isOpen) return null;

  const handleDecrease = (item) => {
    if (item.qty <= 1) {
      // Remove item when qty reaches 0
      removeFromCart(item.product, item.variant);
    } else {
      updateQuantity(item.product, item.qty - 1, item.variant);
    }
  };

  const handleIncrease = (item) => {
    const maxStock = item.maxStock ?? 999;
    if (item.qty >= maxStock) return;
    updateQuantity(item.product, item.qty + 1, item.variant);
  };

  const handleCheckout = () => {
    onClose();
    const user = authService.getCurrentUser();
    if (!user) {
      localStorage.setItem('checkout_redirect', '/review-order');
      navigate('/login');
    } else {
      navigate('/review-order');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Offcanvas Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[420px] bg-[#FAF6F0] shadow-2xl z-[70] flex flex-col transform transition-transform duration-300">

        {/* Header */}
        <div className="relative px-8 pt-10 pb-6 flex flex-col">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-[#7C6A5A] hover:text-[#3F2B1F] bg-white/50 hover:bg-white rounded-full transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="font-serif text-3xl font-extrabold text-[#3F2B1F] flex items-center gap-2 flex-wrap">
            Your Cart
            <BsBagHeartFill className="w-6 h-6 text-[#9F5D54]" />
            {cartItems.length > 0 && (
              <span className="text-[#9C755A] font-medium text-xl">({cartItems.length})</span>
            )}
          </h2>
          <p className="text-xs font-semibold text-[#7C6A5A] mt-2">
            Review your items and proceed to checkout.
          </p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-brand-dark/50 space-y-4">
              <BsBagHeartFill className="w-20 h-20 text-[#E2C7C0] opacity-80" />
              <p className="text-lg font-medium text-[#7C6A5A]">Your cart is empty.</p>
            </div>
          ) : (
            cartItems.map((item) => {
              // Image resolution
              let imgSrc = '/wood-placeholder.png';
              if (typeof item.image === 'string' && item.image.trim() !== '') {
                imgSrc = item.image;
              } else if (item.image?.url && item.image.url.trim() !== '') {
                imgSrc = item.image.url;
              }

              const maxStock = item.maxStock ?? 999;
              const isAtMax = item.qty >= maxStock;

              return (
                <div
                  key={`${item.product}-${item.variant || 'base'}-${item._id || ''}`}
                  className="flex flex-col gap-3 p-4 bg-white rounded-[24px] shadow-sm border border-[#E9E2D8] relative transition-all"
                >
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="w-24 h-24 bg-[#F5EFE6] rounded-[16px] overflow-hidden shrink-0 flex items-center justify-center border border-[#E9E2D8]/50">
                      <img
                        src={imgSrc}
                        alt={item.name}
                        className="w-full h-full object-cover mix-blend-multiply"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between min-w-0 pr-6">
                      <div>
                        <h4 className="font-extrabold text-[#3F2B1F] text-[15px] line-clamp-2 leading-snug">{item.name}</h4>
                        {item.variantOptions && (
                          <p className="text-[12px] font-medium text-[#7C6A5A] mt-0.5 line-clamp-1">{item.variantOptions}</p>
                        )}
                        
                        {Boolean(item.weight) && Number(item.weight) > 0 && (
                          <p className="text-sm font-semibold text-[#7C6A5A] mt-0.5">
                            Weight: {item.weight} kg
                          </p>
                        )}

                        {item.isGift && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FFF0E6] text-[#D95F24] text-[10px] font-bold tracking-wider">
                              <Gift className="w-3 h-3" />
                              GIFT &amp; CARD
                            </span>
                          </div>
                        )}

                        <div className="font-extrabold text-[15px] text-[#3B7340] mt-1.5">
                          ₹{(item.price).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center bg-white rounded-lg border border-[#E9E2D8] h-9 shadow-sm px-1">
                          <button
                            type="button"
                            onClick={() => handleDecrease(item)}
                            className="w-10 h-full flex items-center justify-center text-[#7C6A5A] hover:text-[#3F2B1F] transition-colors disabled:opacity-30"
                            aria-label="Decrease quantity"
                            title={item.qty <= 1 ? 'Remove item' : 'Decrease quantity'}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <span className="w-8 text-center text-xs font-bold text-[#3F2B1F]">
                            {item.qty}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleIncrease(item)}
                            disabled={isAtMax}
                            className="w-10 h-full flex items-center justify-center text-[#7C6A5A] hover:text-[#3F2B1F] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-extrabold text-[15px] text-[#3B7340]">
                            ₹{(item.price * item.qty).toLocaleString('en-IN')}
                          </div>
                          {isAtMax && (
                            <div className="text-[10px] text-amber-600 font-medium leading-tight mt-0.5">
                              Max stock reached
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delete (Top Right Absolute) */}
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => removeFromCart(item.product, item.variant)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      aria-label="Remove item"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {isAtMax && <CartVariantSuggestion productId={item.product} currentVariantId={item.variant} cartItems={cartItems} />}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E6DFD4] p-6 bg-[#FCF8F2] space-y-4">
          <div className="flex justify-between items-center text-lg font-bold text-gray-900 pb-2">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-transparent border border-[#E6DFD4] text-gray-700 font-bold rounded-xl transition-colors hover:bg-white text-xs flex justify-center items-center"
            >
              ← Continue
            </button>

            <button
              type="button"
              disabled={cartItems.length === 0}
              onClick={handleCheckout}
              className="flex-1 py-3.5 bg-[#8B5E3C] hover:bg-[#7a5234] text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#8B5E3C]/20 text-xs flex justify-center items-center gap-1"
            >
              Checkout →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
