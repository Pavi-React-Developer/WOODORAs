import React, { useEffect, useState } from 'react';
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { orderService } from '../api/orderService';
import OrderPricingSummary from '../components/OrderPricingSummary';

export default function OrderSuccessPage({ orderId, onNavigate }) {
  const [order, setOrder] = useState(null);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (orderId) {
      orderService.getOrderById(orderId).then(setOrder).catch(console.error);
    }
  }, [orderId]);

  // Auto-redirect to order history after 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onNavigate('/order-history');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onNavigate]);

  return (
    <div className="min-h-screen bg-[#F8F4EC] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-[#E6DFD4] text-center max-w-lg w-full relative overflow-hidden">
        
        {/* Decorative background circle */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-50 rounded-full blur-3xl opacity-60"></div>

        <div className="relative">
          <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle className="w-12 h-12" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Successful!</h1>
          <p className="text-gray-500 mb-6">Thank you for your purchase. We've received your order and are getting it ready for shipment.</p>
          
          {orderId && (
            <div className="bg-[#F8F4EC] rounded-2xl p-4 mb-6 inline-block">
              <p className="text-sm text-gray-500 font-semibold mb-1">Order Tracking ID</p>
              <p className="text-base font-mono font-bold text-gray-900">{orderId}</p>
            </div>
          )}

          {order && <div className="text-left bg-[#F8F4EC] rounded-2xl p-5 mb-6">
            <h2 className="font-bold text-gray-900 mb-3">Payment Summary</h2>
            <OrderPricingSummary order={order} />
          </div>}

          {/* Countdown */}
          <p className="text-sm text-gray-400 mb-6">
            Redirecting to your orders in <span className="font-bold text-[#8B5E3C]">{countdown}s</span>...
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onNavigate('/order-history')}
              className="flex-1 px-6 py-3.5 bg-[#8B5E3C] text-white rounded-xl font-bold hover:bg-[#7a5234] transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#8B5E3C]/20"
            >
              <ShoppingBag className="w-5 h-5" /> View Orders
            </button>
            <button
              onClick={() => onNavigate('/')}
              className="flex-1 px-6 py-3.5 bg-white border border-[#E6DFD4] text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              Continue Shopping <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
