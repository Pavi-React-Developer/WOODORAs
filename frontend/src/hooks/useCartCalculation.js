import { useMemo, useEffect } from 'react';
import useCartStore from '../store/useCartStore';

export default function useCartCalculation({ state = '', couponCode = '', paymentMethod = '' } = {}) {
  const { cartItems, cartSummary, fetchCartSummary, setCartCalculationPayload } = useCartStore();

  const isGiftEnabled = useMemo(() => {
    return cartItems.some(item => item.isGift && item.isGiftWrapper);
  }, [cartItems]);

  useEffect(() => {
    if (setCartCalculationPayload) {
      setCartCalculationPayload({ isGiftEnabled, state, couponCode, paymentMethod });
    }
  }, [isGiftEnabled, state, couponCode, paymentMethod, setCartCalculationPayload]);

  useEffect(() => {
    fetchCartSummary({ isGiftEnabled, state, couponCode, paymentMethod });
  }, [isGiftEnabled, state, couponCode, paymentMethod, fetchCartSummary]);

  return cartSummary;
}
