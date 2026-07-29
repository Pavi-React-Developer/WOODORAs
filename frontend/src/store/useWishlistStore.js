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
  toggleWishlist: async (productId) => {
    const res = await fetch(`${API_BASE_URL}/user/wishlist`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
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

  toggleWishlist: async (product) => {
    const { wishlistItems } = get();
    const user = authService.getCurrentUser();
    
    const existsIndex = wishlistItems.findIndex((item) => (item._id || item.id) === (product._id || product.id));
    let newWishlist;
    
    if (existsIndex > -1) {
      newWishlist = [...wishlistItems];
      newWishlist.splice(existsIndex, 1);
    } else {
      newWishlist = [...wishlistItems, product];
    }
    
    set({ wishlistItems: newWishlist });
    
    if (!user) {
      setLocalWishlist(newWishlist);
    } else {
      try {
        const data = await wishlistService.toggleWishlist(product._id || product.id);
        set({ wishlistItems: data.wishlist || [] });
      } catch (error) {
        console.error('Failed to toggle wishlist on backend', error);
        set({ wishlistItems, error: error.message });
      }
    }
  },

  removeFromWishlistByIndex: async (index) => {
    const { wishlistItems } = get();
    const product = wishlistItems[index];
    if (product) {
      await get().toggleWishlist(product);
    }
  },

  mergeGuestWishlist: async () => {
    const localItems = getLocalWishlist();
    if (!localItems || localItems.length === 0) return;
    
    const user = authService.getCurrentUser();
    if (!user) return;

    const productIds = localItems.map(item => item._id || item.id).filter(Boolean);
    if (productIds.length > 0) {
      try {
        const data = await wishlistService.mergeWishlist(productIds);
        set({ wishlistItems: data.wishlist || [] });
        localStorage.removeItem('wooden_toys_wishlist');
      } catch (error) {
        console.error('Error merging guest wishlist:', error);
      }
    }
  }
}));

export default useWishlistStore;
