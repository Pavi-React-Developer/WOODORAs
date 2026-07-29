import { useMemo } from 'react';
import useCartStore from '../store/useCartStore';

export default function useCartCalculation() {
  const { cartItems, globalFee } = useCartStore();

  const calculation = useMemo(() => {
    let subtotal = 0;
    cartItems.forEach(item => {
      subtotal += (Number(item.price) || 0) * (Number(item.qty) || 0);
    });

    let productFee = 0;
    let giftFee = 0;

    if (globalFee && globalFee.isActive) {
      if (cartItems.length > 0) {
        productFee = globalFee.productFee || 0;
      }
      
      const hasGiftWrapper = cartItems.some(item => item.isGift && item.isGiftWrapper);
      if (hasGiftWrapper) {
        giftFee = globalFee.giftFee || 0;
      }
    }

    return {
      subtotal,
      productFee,
      giftFee,
    };
  }, [cartItems, globalFee]);

  return calculation;
}
