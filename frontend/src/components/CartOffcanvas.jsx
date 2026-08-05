import React, { useState, useEffect } from 'react';
import { Gift, Minus, Plus, Trash2 } from 'lucide-react';
import { FiShoppingCart } from "react-icons/fi";
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
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-[70] flex flex-col transform transition-transform duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-medium/20">
          <div className="flex items-center gap-2">
            <FiShoppingCart className="w-5 h-5 text-brand-dark" style={{ color: 'inherit' }} />
            <h2 className="font-serif text-xl font-bold text-brand-dark">Your Cart</h2>
            {cartItems.length > 0 && (
              <span className="bg-brand-dark text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {cartItems.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-brand-dark/60 hover:text-brand-dark hover:bg-brand-light/40 rounded-full transition-colors"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-brand-dark/50 space-y-4 py-16">
              <div className="w-20 h-20 bg-brand-beige/60 rounded-full flex items-center justify-center">
                <FiShoppingCart className="w-10 h-10 text-brand-dark/30" style={{ color: 'inherit' }} />
              </div>
              <p className="font-medium text-brand-dark/60">Your cart is empty.</p>
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
                  className="flex gap-3 p-3 bg-brand-beige/30 rounded-2xl border border-brand-medium/10 transition-all"
                >
                  {/* Image */}
                  <div className="w-20 h-20 bg-white rounded-xl overflow-hidden shrink-0 border border-brand-medium/10 flex items-center justify-center">
                    <img
                      src={imgSrc}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/wood-placeholder.png'; }}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h4 className="font-bold text-sm text-brand-dark line-clamp-2 leading-snug">{item.name}</h4>
                      {item.variantOptions && (
                        <p className="text-xs text-brand-dark/60 mt-0.5 line-clamp-1">{item.variantOptions}</p>
                      )}
                      
                      {Boolean(item.weight) && Number(item.weight) > 0 && (
                        <p className="text-[10px] text-brand-dark/50 mt-0.5">
                          Weight: {item.weight} kg
                        </p>
                      )}

                      {item.isGift && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FFF0E6] text-[#D95F24] text-[9px] font-bold tracking-wider">
                            <Gift className="w-2.5 h-2.5" />
                            GIFT
                          </span>
                        </div>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleDecrease(item)}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-brand-medium/30 rounded-lg text-brand-dark font-bold hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                          aria-label="Decrease quantity"
                          title={item.qty <= 1 ? 'Remove item' : 'Decrease quantity'}
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <span className="text-sm font-bold text-brand-dark w-6 text-center tabular-nums select-none">
                          {item.qty}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleIncrease(item)}
                          disabled={isAtMax}
                          className={`w-7 h-7 flex items-center justify-center bg-white border border-brand-medium/30 rounded-lg text-brand-dark font-bold transition-colors
                            ${isAtMax ? 'opacity-40 cursor-not-allowed' : 'hover:bg-brand-light/50'}`}
                          aria-label="Increase quantity"
                          title={isAtMax ? `Maximum stock (${maxStock}) reached` : 'Increase quantity'}
                        >
                          <Plus className="w-3 h-3" />
                        </button>

                        {isAtMax && (
                          <span className="text-[9px] text-amber-600 font-medium">Max</span>
                        )}
                      </div>
                    </div>

                    {/* Price + Remove */}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-bold text-sm text-brand-dark">
                        ₹{(Number(item.price || 0) * Number(item.qty || 1)).toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product, item.variant)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove item"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {isAtMax && <CartVariantSuggestion productId={item.product} currentVariantId={item.variant} cartItems={cartItems} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-brand-medium/20 p-5 bg-brand-beige/10 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-brand-dark/70 uppercase tracking-wider">Subtotal</span>
            <span className="font-serif text-2xl font-bold text-brand-dark">₹{total.toLocaleString('en-IN')}</span>
          </div>
          <p className="text-xs text-brand-dark/50 text-center">Shipping &amp; fees calculated at checkout</p>
          <button
            type="button"
            disabled={cartItems.length === 0}
            onClick={handleCheckout}
            className="w-full py-3.5 bg-brand-dark hover:bg-brand-medium text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm tracking-wide"
          >
            Checkout Securely →
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-transparent border border-brand-medium/30 text-brand-dark/70 font-medium rounded-xl transition-colors hover:bg-brand-beige/50 text-sm"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </>
  );
}
