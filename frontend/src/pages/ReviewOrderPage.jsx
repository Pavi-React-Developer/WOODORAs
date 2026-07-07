import React from 'react';
import useCartStore from '../store/useCartStore';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ReviewOrderPage({ onNavigate }) {
  const { cartItems, getSubtotal } = useCartStore();

  const subtotal = getSubtotal();
  // Shipping charge will be calculated on the next page based on state and payment method
  const shippingCharge = 0; // Set to 0 here, calculated at checkout
  const total = subtotal;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F4EC] flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-[#E6DFD4] max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Cart is empty</h2>
          <p className="text-gray-500 mb-6">You have no items to review.</p>
          <button onClick={() => onNavigate('home')} className="bg-[#8B5E3C] text-white px-6 py-3 rounded-xl font-semibold">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4EC] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Progress Bar (Optional UI enhancement) */}
        <div className="flex items-center justify-center mb-10 max-w-2xl mx-auto">
          <div className="flex items-center text-[#8B5E3C] font-bold">
            <div className="w-8 h-8 rounded-full bg-[#8B5E3C] text-white flex items-center justify-center text-sm shadow-md">1</div>
            <span className="ml-2">Cart</span>
          </div>
          <div className="w-16 sm:w-32 h-1 bg-[#8B5E3C] mx-2 sm:mx-4 rounded"></div>
          <div className="flex items-center text-[#8B5E3C] font-bold">
            <div className="w-8 h-8 rounded-full border-2 border-[#8B5E3C] bg-white flex items-center justify-center text-sm">2</div>
            <span className="ml-2">Review</span>
          </div>
          <div className="w-16 sm:w-32 h-1 bg-gray-300 mx-2 sm:mx-4 rounded"></div>
          <div className="flex items-center text-gray-400 font-bold">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">3</div>
            <span className="ml-2">Payment</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => onNavigate('cart')} className="p-2 bg-white rounded-full text-gray-500 hover:text-[#8B5E3C] shadow-sm transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Review Your Order</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column: Order Items */}
          <div className="lg:w-2/3 space-y-4">
            {cartItems.map((item, index) => (
              <div key={index} className="bg-white p-5 rounded-3xl shadow-sm border border-[#E6DFD4] flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                <div className="w-32 h-32 bg-[#F8F4EC] rounded-2xl overflow-hidden shrink-0">
                  {item.image ? (
                    <img src={item.image.startsWith('http') || item.image.startsWith('data:') ? item.image : (item.image.startsWith('/uploads') || item.image.startsWith('uploads/')) ? `http://localhost:5000${item.image.startsWith('/') ? '' : '/'}${item.image}` : item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
                  )}
                </div>
                <div className="flex-1 w-full flex flex-col justify-between h-full">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg leading-tight mb-2">{item.name}</h3>
                    {item.variantOptions && (
                      <p className="text-xs text-gray-500 mb-1">{item.variantOptions}</p>
                    )}
                    {item.weight && !isNaN(Number(item.weight)) && Number(item.weight) > 0 && (
                      <p className="text-sm text-gray-500 font-medium">Weight: {(Number(item.weight) * item.qty)} kg</p>
                    )}
                    <p className="text-sm text-gray-500 font-medium">Quantity: {item.qty}</p>
                  </div>
                  <div className="mt-4 flex items-end justify-between border-t border-[#E6DFD4]/50 pt-4">
                    <div className="text-sm text-gray-500">
                      ₹{item.price.toLocaleString()} x {item.qty}
                    </div>
                    <div className="font-black text-xl text-gray-900">
                      ₹{(item.price * item.qty).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E6DFD4] sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
              
              <div className="space-y-4 text-sm mb-6 border-b border-[#E6DFD4] pb-6">
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Subtotal ({cartItems.length} items)</span>
                  <span className="text-gray-900 font-bold">₹{subtotal.toLocaleString()}</span>
                </div>

              </div>

              <div className="flex justify-between items-end mb-8">
                <span className="text-lg font-bold text-gray-900">Total Price</span>
                <span className="text-3xl font-black text-[#8B5E3C]">₹{total.toLocaleString()}</span>
              </div>

              <button
                onClick={() => onNavigate('complete-order')}
                className="w-full flex items-center justify-center gap-2 bg-[#8B5E3C] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#7a5234] transition-colors shadow-md shadow-[#8B5E3C]/20"
              >
                Confirm Buy
                <CheckCircle2 className="w-5 h-5" />
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Secure 128-bit SSL Checkout
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
