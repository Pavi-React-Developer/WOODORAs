import React from 'react';
import useCartStore from '../store/useCartStore';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag } from 'lucide-react';
import { getImageSrc } from '../utils/imageUtils';

export default function CartPage({ onNavigate }) {
  const { cartItems, removeFromCart, updateQuantity, getSubtotal } = useCartStore();

  const handleQtyChange = (productId, newQty, variant = null, maxStock = 999) => {
    if (newQty >= 1 && newQty <= maxStock) {
      updateQuantity(productId, newQty, variant);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F4EC] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E6DFD4] text-center max-w-md w-full">
          <div className="w-20 h-20 bg-[#F8F4EC] rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-[#8B5E3C]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Your Cart is Empty</h2>
          <p className="text-gray-500 mb-8">Looks like you haven't added any wooden toys to your cart yet.</p>
          <button
            onClick={() => onNavigate('/')}
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
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => onNavigate('/')} className="p-2 bg-white rounded-full text-gray-500 hover:text-[#8B5E3C] shadow-sm transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <span className="bg-[#8B5E3C]/10 text-[#8B5E3C] py-1 px-3 rounded-full text-sm font-semibold ml-auto">
            {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}
          </span>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD4] overflow-hidden mb-8">
          <div className="hidden md:grid grid-cols-12 gap-4 p-6 border-b border-[#E6DFD4] bg-gray-50/50 text-sm font-semibold text-gray-500">
            <div className="col-span-6">PRODUCT</div>
            <div className="col-span-3 text-center">QUANTITY</div>
            <div className="col-span-2 text-right">PRICE</div>
            <div className="col-span-1 text-right"></div>
          </div>

          <div className="divide-y divide-[#E6DFD4]">
            {cartItems.map((item) => (
              <div key={`${item.product}-${item.variant || 'default'}`} className="p-6 flex flex-col md:grid md:grid-cols-12 gap-6 items-center">
                
                <div className="col-span-6 flex items-center gap-4 w-full">
                  <div className="w-24 h-24 bg-[#F8F4EC] rounded-2xl overflow-hidden shrink-0">
                    {item.image ? (
                      <img src={getImageSrc(item.image)} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No Img</div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg line-clamp-2 leading-snug mb-1">{item.name}</h3>
                    {item.variantOptions && (
                      <p className="text-xs text-gray-500 mb-1">{item.variantOptions}</p>
                    )}
                    {item.weight && !isNaN(Number(item.weight)) && Number(item.weight) > 0 && (
                      <p className="text-sm text-gray-500 font-medium">Weight: {(Number(item.weight) * item.qty)} kg</p>
                    )}
                    <div className="md:hidden mt-2 font-bold text-[#8B5E3C]">₹{(item.price * item.qty).toLocaleString()}</div>
                  </div>
                </div>

                <div className="col-span-3 flex justify-center w-full md:w-auto mt-4 md:mt-0">
                  <div className="flex items-center bg-[#F8F4EC] rounded-xl p-1 border border-[#E6DFD4]/50">
                    <button
                      onClick={() => handleQtyChange(item.product, item.qty - 1, item.variant)}
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-gray-600 hover:text-[#8B5E3C] shadow-sm disabled:opacity-50 transition-colors"
                      disabled={item.qty <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-gray-800">{item.qty}</span>
                      <button
                        onClick={() => handleQtyChange(item.product, item.qty + 1, item.variant, item.maxStock)}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-gray-600 hover:text-[#8B5E3C] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={item.maxStock !== undefined && item.qty >= item.maxStock}
                      >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="col-span-2 text-right hidden md:block">
                  <span className="font-bold text-lg text-gray-800">₹{(item.price * item.qty).toLocaleString()}</span>
                </div>

                <div className="col-span-1 text-right flex justify-end w-full md:w-auto absolute md:relative top-6 md:top-auto right-6 md:right-auto">
                  <button
                    onClick={() => removeFromCart(item.product, item.variant)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('/')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-gray-600 bg-white border border-[#E6DFD4] hover:bg-gray-50 transition-colors text-center"
          >
            Continue Shopping
          </button>
          <div className="w-full sm:w-auto flex items-center gap-4 bg-white px-6 py-3.5 rounded-xl border border-[#E6DFD4]">
            <span className="text-gray-500 font-medium uppercase text-sm tracking-wider">Subtotal</span>
            <span className="font-bold text-2xl text-gray-900">₹{getSubtotal().toLocaleString()}</span>
          </div>
          <button 
            onClick={() => onNavigate('/review-order')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-[#8B5E3C] hover:bg-[#7a5234] shadow-sm transition-colors text-center"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
