import React from 'react';
import useCartStore from '../store/useCartStore';
import useCartCalculation from '../hooks/useCartCalculation';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Gift } from 'lucide-react';
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
            <ShoppingBag className="w-12 h-12 text-[#8B5E3C]" />
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
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={handleGoShopping}
            className="p-2 bg-white rounded-full text-gray-500 hover:text-[#8B5E3C] shadow-sm transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <span className="bg-[#8B5E3C]/10 text-[#8B5E3C] py-1 px-3 rounded-full text-sm font-semibold ml-auto">
            {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}
          </span>
        </div>

        {/* Cart Items Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD4] overflow-hidden mb-8">
          <div className="hidden md:grid grid-cols-12 gap-4 p-6 border-b border-[#E6DFD4] bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-6">Product</div>
            <div className="col-span-3 text-center">Quantity</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-1" />
          </div>

          <div className="divide-y divide-[#E6DFD4]">
            {cartItems.map((item) => (
              <div
                key={`${item.product}-${item.variant || 'default'}-${item._id || ''}`}
                className="p-6 flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-6 items-center relative"
              >
                {/* Product Info */}
                <div className="col-span-6 flex items-center gap-4 w-full">
                  <div className="w-24 h-24 bg-[#F8F4EC] rounded-2xl overflow-hidden shrink-0">
                    {item.image ? (
                      <img
                        src={getImageSrc(item.image)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = '/wood-placeholder.png'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-base line-clamp-2 leading-snug mb-1">{item.name}</h3>
                    {item.variantOptions && (
                      <p className="text-xs text-gray-500 mb-1">{item.variantOptions}</p>
                    )}
                    {item.isGift && (
                      <div className="mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FFF0E6] text-[#D95F24] text-[10px] font-bold tracking-wider">
                          <Gift className="w-3 h-3" />
                          GIFT &amp; CARD
                        </span>
                      </div>
                    )}
                    {item.weight && !isNaN(Number(item.weight)) && Number(item.weight) > 0 && (
                      <p className="text-xs text-gray-500 font-medium">
                        Weight: {(Number(item.weight) * item.qty).toFixed(4)} kg
                      </p>
                    )}
                    {/* Mobile price */}
                    <div className="md:hidden mt-1 font-bold text-[#8B5E3C]">
                      ₹{(item.price * item.qty).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="col-span-3 flex justify-center w-full md:w-auto">
                  <div className="flex items-center bg-[#F8F4EC] rounded-xl p-1 border border-[#E6DFD4]/50 gap-1">
                    <button
                      onClick={() => handleDecrease(item)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg shadow-sm transition-colors font-bold
                        ${item.qty <= 1
                          ? 'bg-red-50 text-red-400 hover:bg-red-100'
                          : 'bg-white text-gray-600 hover:text-[#8B5E3C]'
                        }`}
                      title={item.qty <= 1 ? 'Remove item' : 'Decrease quantity'}
                      aria-label={item.qty <= 1 ? 'Remove item' : 'Decrease quantity'}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-gray-800 tabular-nums select-none">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => handleIncrease(item)}
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-gray-600 hover:text-[#8B5E3C] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      disabled={item.maxStock !== undefined && item.qty >= item.maxStock}
                      title={item.maxStock !== undefined && item.qty >= item.maxStock ? `Max stock (${item.maxStock}) reached` : 'Increase quantity'}
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Desktop Price */}
                <div className="col-span-2 text-right hidden md:block">
                  <span className="font-bold text-lg text-gray-800">
                    ₹{(item.price * item.qty).toLocaleString('en-IN')}
                  </span>
                  {item.maxStock !== undefined && item.qty >= item.maxStock && (
                    <p className="text-[10px] text-amber-600 mt-0.5">Max stock</p>
                  )}
                </div>

                {/* Remove Button */}
                <div className="col-span-1 flex justify-end w-full md:w-auto">
                  <button
                    onClick={() => removeFromCart(item.product, item.variant)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Remove item"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleGoShopping}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-gray-600 bg-white border border-[#E6DFD4] hover:bg-gray-50 transition-colors text-center"
          >
            ← Continue Shopping
          </button>
          <div className="w-full sm:w-auto flex items-center gap-4 bg-white px-6 py-3.5 rounded-xl border border-[#E6DFD4]">
            <span className="text-gray-500 font-medium uppercase text-sm tracking-wider">Subtotal</span>
            <span className="font-bold text-2xl text-gray-900">₹{subtotal.toLocaleString('en-IN')}</span>
          </div>
          <button
            onClick={handleCheckout}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-[#8B5E3C] hover:bg-[#7a5234] shadow-sm transition-colors text-center"
          >
            Proceed to Checkout →
          </button>
        </div>
      </div>
    </div>
  );
}
