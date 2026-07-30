import { useMemo, useEffect } from 'react';
import useCartStore from '../store/useCartStore';

export default function useCartCalculation({ state = '', couponCode = '', paymentMethod = '' } = {}) {
  const { cartItems, cartSummary, fetchCartSummary } = useCartStore();

  const isGiftEnabled = useMemo(() => {
    return cartItems.some(item => item.isGift && item.isGiftWrapper);
  }, [cartItems]);

  useEffect(() => {
    // We must wait longer than syncItemUpdateDebounced (400ms) in useCartStore
    // so that the backend has updated the cart before we fetch the summary
    const timer = setTimeout(() => {
      fetchCartSummary({ isGiftEnabled, state, couponCode, paymentMethod });
    }, 500);
    return () => clearTimeout(timer);
  }, [cartItems, isGiftEnabled, state, couponCode, paymentMethod, fetchCartSummary]);

  return cartSummary;
}
