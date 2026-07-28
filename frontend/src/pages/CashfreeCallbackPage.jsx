/**
 * CashfreeCallbackPage
 * ---------------------
 * Cashfree redirects the user here after payment attempt.
 * This page reads the URL params, verifies payment with our backend,
 * then navigates to order-success or shows an error.
 */

import React, { useEffect, useState, useRef } from 'react';
import useCartStore from '../store/useCartStore';
import { verifyCashfreePayment } from '../api/cashfreeService';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function CashfreeCallbackPage({ onNavigate }) {
  const { clearCart } = useCartStore();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const hasFetched = useRef(false);

  useEffect(() => {
    const verify = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;
      try {
        const params = new URLSearchParams(window.location.search);
        const returnedCfOrderId = params.get('order_id');
        const returnedAppOrderId = params.get('app_order_id');
        const storedOrderId = localStorage.getItem('cf_pending_order_id');
        const storedCfOrderId = localStorage.getItem('cf_pending_cf_order_id');
        const orderId = returnedAppOrderId || storedOrderId || (returnedCfOrderId?.startsWith('cf_') ? returnedCfOrderId.slice(3) : '');
        const cfOrderId = returnedCfOrderId || storedCfOrderId || (orderId ? `cf_${orderId}` : '');

        if (!orderId || !cfOrderId) {
          setStatus('failed');
          setMessage('Payment session not found. Please contact support.');
          return;
        }

        const result = await verifyCashfreePayment(orderId, cfOrderId);

        if (result.success || result.isPaid) {
          localStorage.removeItem('cf_pending_order_id');
          localStorage.removeItem('cf_pending_cf_order_id');
          window.history.replaceState({}, document.title, window.location.pathname);

          clearCart();
          setStatus('success');
          setMessage('Payment successful! Redirecting to your order...');

          setTimeout(() => {
            onNavigate(`/order-success/${orderId}`);
          }, 2000);
        } else {
          setStatus('failed');
          setMessage(result.message || `Payment status: ${result.cashfreeStatus}`);
        }
      } catch (err) {
        setStatus('failed');
        setMessage(err.message || 'Payment verification failed. Please contact support.');
      }
    };

    verify();
  }, [clearCart, onNavigate]);

  return (
    <div className="min-h-screen bg-[#F8F4EC] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD4] p-10 max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-14 h-14 text-[#8B5E3C] mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
            <p className="text-gray-500 text-sm">Please wait while we confirm your payment with Cashfree...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-500 text-sm">{message}</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <button
              onClick={() => onNavigate('/complete-order')}
              className="w-full py-3 bg-[#8B5E3C] text-white rounded-xl font-bold hover:bg-[#7a5234] transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
