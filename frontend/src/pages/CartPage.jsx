import React from 'react';
import useCartStore from '../store/useCartStore';
import useCartCalculation from '../hooks/useCartCalculation';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Gift } from 'lucide-react';
import { BsBagHeartFill } from "react-icons/bs";
import { getImageSrc } from '../utils/imageUtils';
import { authService } from '../api/authService';
import { useNavigate, useLocation } from 'react-router-dom';

export default function CartPage({ onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, removeFromCart, updateQuantity, getSubtotal } = useCartStore();
  
  // Use local calculation for immediate UI updates and guest user support
  const subtotal = getSubtotal();

  const handleIncrease = (item) => {
    const maxStock = item.maxStock ?? 999;
    if (item.qty >= maxStock) return;
    updateQuantity(item.product, item.qty + 1, item.variant);
  };

  const handleDecrease = (item) => {
    if (item.qty <= 1) {
      removeFromCart(item.product, item.variant);
    } else {
      updateQuantity(item.product, item.qty - 1, item.variant);
    }
  };

  const handleCheckout = () => {
    useCartStore.getState().setCheckoutOrigin(location.pathname);
    const user = authService.getCurrentUser();
    if (!user) {
      localStorage.setItem('checkout_redirect', '/review-order');
      if (onNavigate) {
        onNavigate('/login');
      } else {
        navigate('/login');
      }
    } else {
      if (onNavigate) {
        onNavigate('/review-order');
      } else {
        navigate('/review-order');
      }
    }
  };

  const handleGoShopping = () => {
    if (onNavigate) {
      onNavigate('/');
    } else {
      navigate('/');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F4EC] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-[#E6DFD4] text-center max-w-md w-full">
          <div className="w-24 h-24 bg-[#F8F4EC] rounded-full flex items-center justify-center mx-auto mb-6">
            <BsBagHeartFill className="w-12 h-12 text-[#9F5D54]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Your Cart is Empty</h2>
          <p className="text-gray-500 mb-8">Looks like you haven't added any wooden toys to your cart yet.</p>
          <button
            onClick={handleGoShopping}
            className="w-full bg-[#8B5E3C] text-white py-3.5 rounded-xl font-semibold hover:bg-[#7a5234] transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4EC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col mb-8 relative">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-extrabold text-[#3F2B1F] font-serif flex items-center gap-3">
                My Cart <BsBagHeartFill className="text-[#9F5D54] w-9 h-9" />
              </h1>
              <p className="text-[#7C6A5A] mt-2 font-medium text-sm">Review your items and proceed to checkout.</p>
            </div>
            {/* The decorative leaves would go here */}
          </div>
        </div>

        {/* Cart Items List */}
        <div className="mb-10 border-t border-b border-[#E6DFD4]">
          <div className="divide-y divide-[#E6DFD4]">
            {cartItems.map((item) => (
              <div
                key={`${item.product}-${item.variant || 'default'}-${item._id || ''}`}
                className="py-8 flex gap-6 relative"
              >
                {/* Product Image */}
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[#FAF7F2] rounded-xl overflow-hidden shrink-0">
                  {item.image ? (
                    <img
                      src={getImageSrc(item.image)}
                      alt={item.name}
                      className="w-full h-full object-cover mix-blend-multiply"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  {/* Top row: Title and Trash */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base">{item.name}</h3>
                      {item.variantOptions && (
                        <p className="text-xs text-gray-500 mt-1">{item.variantOptions}</p>
                      )}
                      {item.isGift && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FFF0E6] text-[#D95F24] text-[10px] font-bold tracking-wider">
                            <Gift className="w-3 h-3" />
                            GIFT &amp; CARD
                          </span>
                        </div>
                      )}
                      <div className="mt-2 font-bold text-gray-900 text-sm sm:text-base">
                        ₹{(item.price).toFixed(2)}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => removeFromCart(item.product, item.variant)}
                      className="text-gray-400 hover:text-red-500 p-1 -mt-1 -mr-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  {/* Bottom row: Quantity and Total Price */}
                  <div className="flex justify-between items-end mt-4">
                    <div className="flex items-center bg-white rounded border border-[#E6DFD4] px-1 py-0.5">
                      <button onClick={() => handleDecrease(item)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-black transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                      <button onClick={() => handleIncrease(item)} disabled={item.maxStock !== undefined && item.qty >= item.maxStock} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-black transition-colors disabled:opacity-40">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="font-bold text-gray-900 text-sm sm:text-base">
                      ₹{(item.price * item.qty).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col md:flex-row justify-between gap-8 mt-12 items-start">
          
          <div className="w-full md:w-1/2">
            <div className="flex items-center bg-white rounded-md border border-[#E6DFD4] p-3 gap-3 w-full max-w-xs mb-6 md:mb-0">
              <input type="checkbox" className="w-4 h-4 text-[#D95F24] rounded border-[#E6DFD4]" />
              <span className="text-sm text-gray-600 flex-1">Have a coupon?</span>
              <button className="text-sm font-bold text-[#D95F24]">Apply Now</button>
            </div>
          </div>

          <div className="w-full md:w-1/2 max-w-sm ml-auto space-y-4">
            <div className="flex justify-between items-center text-lg font-bold text-gray-900 border-b border-[#E6DFD4]/50 pb-4">
              <span>Total</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGoShopping}
                className="flex-1 py-3.5 rounded-xl font-bold text-gray-700 bg-transparent border border-[#E6DFD4] hover:bg-white transition-colors text-xs flex justify-center items-center"
              >
                ← Continue
              </button>

              <button
                onClick={handleCheckout}
                className="flex-1 py-3.5 rounded-xl font-bold text-white bg-[#8B5E3C] hover:bg-[#7a5234] shadow-md shadow-[#8B5E3C]/20 transition-colors flex justify-center items-center text-xs"
              >
                Checkout →
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-4 gap-2 pt-6 border-t border-[#E6DFD4]/50 text-center">
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 text-[#7C6A5A]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12 6v6l4 2"/></svg></div>
                <span className="text-[8px] font-bold text-[#7C6A5A] leading-tight">Eco Friendly</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 text-[#7C6A5A]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                <span className="text-[8px] font-bold text-[#7C6A5A] leading-tight">Non Toxic</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 text-[#7C6A5A]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
                <span className="text-[8px] font-bold text-[#7C6A5A] leading-tight">Handcrafted</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 text-[#7C6A5A]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></div>
                <span className="text-[8px] font-bold text-[#7C6A5A] leading-tight">Sustainable</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
