import React from 'react';
import { Gift } from 'lucide-react';

/**
 * CartOffcanvas
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - cartItems: Array<{product, variant, name, image, price, qty, maxStock, variantOptions}>
 *  - onUpdateQuantity: (index: number, delta: +1 | -1) => void
 *  - onRemove: (index: number) => void
 *  - onCheckout: () => void
 */
export default function CartOffcanvas({ isOpen, onClose, cartItems, onUpdateQuantity, onRemove, onCheckout }) {
  if (!isOpen) return null;

  const total = cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);

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
          <h2 className="font-serif text-2xl font-bold text-brand-dark">Your Cart</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-brand-dark/60 hover:text-brand-dark hover:bg-brand-light/40 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-brand-dark/50 space-y-3">
              <span className="text-4xl">🛒</span>
              <p>Your cart is empty.</p>
            </div>
          ) : (
            cartItems.map((item, index) => {
              // Image resolution
              let imgSrc = '/wood-placeholder.png';
              if (typeof item.image === 'string' && item.image.trim() !== '') {
                imgSrc = item.image;
              } else if (item.image?.url && item.image.url.trim() !== '') {
                imgSrc = item.image.url;
              }

              const maxStock = item.maxStock ?? 999;
              const isAtMax = item.qty >= maxStock;
              const isAtMin = item.qty <= 1;

              return (
                <div
                  key={`${item.product}-${item.variant || 'base'}-${index}`}
                  className="flex gap-4 p-3 bg-brand-beige/30 rounded-2xl border border-brand-medium/10"
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
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-brand-dark line-clamp-2">{item.name}</h4>
                      {item.variantOptions && (
                        <p className="text-xs text-brand-dark/60 mt-1 line-clamp-2">{item.variantOptions}</p>
                      )}
                      {item.isGift && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FFF0E6] text-[#D95F24] text-[10px] font-bold tracking-wider">
                            <Gift className="w-3 h-3" />
                            GIFT & CARD
                          </span>
                        </div>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        {/* Minus button */}
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(index, -1)}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-brand-medium/30 rounded text-brand-dark font-bold hover:bg-brand-light/50 transition-colors text-sm leading-none"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>

                        {/* Quantity display */}
                        <span className="text-sm font-bold text-brand-dark w-6 text-center tabular-nums">
                          {item.qty}
                        </span>

                        {/* Plus button */}
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(index, 1)}
                          disabled={isAtMax}
                          className={`w-7 h-7 flex items-center justify-center bg-white border border-brand-medium/30 rounded text-brand-dark font-bold transition-colors text-sm leading-none
                            ${isAtMax ? 'opacity-40 cursor-not-allowed' : 'hover:bg-brand-light/50'}`}
                          aria-label="Increase quantity"
                          title={isAtMax ? `Maximum stock (${maxStock}) reached` : 'Increase quantity'}
                        >
                          +
                        </button>
                      </div>

                      {/* Max stock label */}
                      {isAtMax && (
                        <p className="text-[10px] text-amber-600 mt-1 font-medium">Max stock reached</p>
                      )}
                    </div>

                    {/* Price + Remove */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-serif font-bold text-brand-dark">
                        ₹{(Number(item.price || 0) * Number(item.qty || 1)).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wide transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-brand-medium/20 p-6 bg-brand-beige/10">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-brand-dark/70">Subtotal</span>
            <span className="font-serif text-2xl font-bold text-brand-dark">₹{total.toFixed(2)}</span>
          </div>
          <button
            type="button"
            disabled={cartItems.length === 0}
            onClick={onCheckout}
            className="w-full py-3.5 bg-brand-dark hover:bg-brand-medium text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            Checkout Securely
          </button>
        </div>
      </div>
    </>
  );
}
