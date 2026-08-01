import { create } from 'zustand';
import { authService } from '../api/authService';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`;
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`
  };
};

export const wishlistService = {
  getWishlist: async () => {
    const res = await fetch(`${API_BASE_URL}/user/wishlist`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch wishlist');
    return res.json();
  },
  toggleWishlist: async (productId, variant = null, qty = 1) => {
    const res = await fetch(`${API_BASE_URL}/user/wishlist`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, variant, qty })
    });
    if (!res.ok) throw new Error('Failed to toggle wishlist');
    return res.json();
  },
  mergeWishlist: async (productIds) => {
    const res = await fetch(`${API_BASE_URL}/user/wishlist/merge`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds })
    });
    if (!res.ok) throw new Error('Failed to merge wishlist');
    return res.json();
  }
};

const getLocalWishlist = () => {
  try {
    const saved = localStorage.getItem('wooden_toys_wishlist');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

const setLocalWishlist = (items) => {
  localStorage.setItem('wooden_toys_wishlist', JSON.stringify(items));
};

const useWishlistStore = create((set, get) => ({
  wishlistItems: getLocalWishlist(),
  loading: false,
  error: null,

  fetchWishlist: async () => {
    const user = authService.getCurrentUser();
    if (!user) {
      set({ wishlistItems: getLocalWishlist() });
      return;
    }

    set({ loading: true });
    try {
      const data = await wishlistService.getWishlist();
      set({ wishlistItems: data.wishlist || [], error: null });
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  toggleWishlist: async (product, variant = null, qty = 1) => {
    const { wishlistItems } = get();
    const user = authService.getCurrentUser();
    
    // Normalize IDs for comparison
    const pId = product._id || product.id || product;
    const vIdStr = variant && variant._id ? variant._id.toString() : (variant ? variant.toString() : null);

    const existsIndex = wishlistItems.findIndex((item) => {
      const itemPId = item.product?._id || item.product || item._id || item.id;
      if (itemPId.toString() !== pId.toString()) return false;
      
      const itemVIdStr = item.variant && item.variant._id ? item.variant._id.toString() : (item.variant ? item.variant.toString() : null);
      return itemVIdStr === vIdStr;
    });

    let newWishlist;
    
    if (existsIndex > -1) {
      newWishlist = [...wishlistItems];
      newWishlist.splice(existsIndex, 1);
    } else {
      newWishlist = [...wishlistItems, { product, variant, qty }];
    }
    
    set({ wishlistItems: newWishlist });
    
    if (!user) {
      setLocalWishlist(newWishlist);
    } else {
      try {
        const data = await wishlistService.toggleWishlist(pId, variant, qty);
        set({ wishlistItems: data.wishlist || [] });
      } catch (error) {
        console.error('Failed to toggle wishlist on backend', error);
        set({ wishlistItems, error: error.message });
      }
    }
  },

  updateQuantity: async (index, newQty) => {
    const { wishlistItems } = get();
    const user = authService.getCurrentUser();
    if (newQty < 1 || index < 0 || index >= wishlistItems.length) return;

    const newWishlist = [...wishlistItems];
    newWishlist[index].qty = newQty;
    
    set({ wishlistItems: newWishlist });
    
    if (!user) {
      setLocalWishlist(newWishlist);
    } else {
      // Because backend toggle doesn't strictly have an update function,
      // we remove the old one and add the new one, OR we could build an update endpoint.
      // But actually, we don't need to persist qty to backend immediately for wishlist,
      // or we can just send a full replace if needed.
      // For now, let's just trigger a re-add by calling merge (which handles multiple).
      try {
        const data = await wishlistService.mergeWishlist(newWishlist.map(item => ({
            product: item.product?._id || item.product,
            variant: item.variant,
            qty: item.qty
        })));
        set({ wishlistItems: data.wishlist || [] });
      } catch (error) {
         console.error('Failed to update qty on backend', error);
      }
    }
  },

  removeFromWishlistByIndex: async (index) => {
    const { wishlistItems } = get();
    const item = wishlistItems[index];
    if (item) {
      const product = item.product || item;
      await get().toggleWishlist(product, item.variant, item.qty);
    }
  },

  mergeGuestWishlist: async () => {
    const localItems = getLocalWishlist();
    if (!localItems || localItems.length === 0) return;
    
    const user = authService.getCurrentUser();
    if (!user) return;

    // Send the detailed items for merging
    const itemsToMerge = localItems.map(item => ({
        product: item.product?._id || item.product || item._id || item.id,
        variant: item.variant || null,
        qty: item.qty || 1
    })).filter(i => i.product);

    if (itemsToMerge.length > 0) {
      try {
        const data = await wishlistService.mergeWishlist(itemsToMerge);
        set({ wishlistItems: data.wishlist || [] });
        localStorage.removeItem('wooden_toys_wishlist');
      } catch (error) {
        console.error('Error merging guest wishlist:', error);
      }
    }
  },

  validateWishlist: async () => {
    const { wishlistItems } = get();
    if (!wishlistItems || wishlistItems.length === 0) return;

    // We can't import productV2API directly at the top due to potential circular deps or path issues,
    // but we can use fetch directly to check valid products.
    try {
      const validItems = [];
      let hasChanges = false;
      for (const item of wishlistItems) {
        const pId = item.product?._id || item.product || item._id || item.id;
        if (!pId) {
          hasChanges = true;
          continue;
        }
        const res = await fetch(`${API_BASE_URL}/products/${pId}`);
        if (res.ok) {
           const data = await res.json();
           if (data && (data.product || data._id || data.id)) {
              validItems.push(item);
           } else {
              hasChanges = true;
           }
        } else {
           hasChanges = true;
        }
      }

      if (hasChanges) {
        set({ wishlistItems: validItems });
        // Always update local storage so subsequent operations read the cleaned list
        setLocalWishlist(validItems);
        
        if (authService.getCurrentUser()) {
           // Sync valid wishlist to backend
           const itemsToMerge = validItems.map(item => ({
               product: item.product?._id || item.product || item._id || item.id,
               variant: item.variant || null,
               qty: item.qty || 1
           }));
           await wishlistService.mergeWishlist(itemsToMerge);
        }
      }
    } catch (err) {
      console.error('Failed to validate wishlist:', err);
    }
  }
}));

export default useWishlistStore;
