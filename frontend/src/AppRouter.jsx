import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, Outlet } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { productV2API } from './api/catalogV2Service';
import Header from './components/Header';
import Footer from './components/Footer';
import { authService } from './api/authService';
import CartOffcanvas from './components/CartOffcanvas';
import WishlistOffcanvas from './components/WishlistOffcanvas';
import useCartStore from './store/useCartStore';
import useAddressStore from './store/useAddressStore';
import useWishlistStore from './store/useWishlistStore';

// Lazy loaded pages (Code Splitting)
const Home = lazy(() => import('./pages/Home'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CartPage = lazy(() => import('./pages/CartPage'));
const ReviewOrderPage = lazy(() => import('./pages/ReviewOrderPage'));
const CompleteOrderPage = lazy(() => import('./pages/CompleteOrderPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage'));
const CashfreeCallbackPage = lazy(() => import('./pages/CashfreeCallbackPage'));
const CustomerProfilePage = lazy(() => import('./pages/CustomerProfilePage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const GiftAndCardPage = lazy(() => import('./pages/GiftAndCardPage'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));

// Protected Route Wrapper
const ProtectedRoute = ({ children, user, requiredRole }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRole && user.role?.toLowerCase() !== requiredRole.toLowerCase() && !user.isStaff) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-600 mt-4">You don't have permission to access this page.</p>
      </div>
    );
  }
  return children;
};

// DRY Layout Wrapper using React Router Outlet
const PageLayout = ({ headerProps, hideHeaderFooter }) => (
  <div className="flex flex-col min-h-screen bg-brand-beige/10">
    {!hideHeaderFooter && <Header {...headerProps} />}
    <main className="flex-grow">
      <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-brown"></div></div>}>
        <Outlet />
      </Suspense>
    </main>
    {!hideHeaderFooter && <Footer />}
  </div>
);

// Wrapper for Admin Layout (different from customer layout)
const AdminLayout = ({ children }) => (
  <div className="flex flex-col min-h-screen bg-brand-beige/10">
    <main className="flex-grow">
      {children}
    </main>
  </div>
);

export default function AppRouter() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [profileData, setProfileData] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Cart state from store
  const { cartItems, addToCart, updateQuantity, removeFromCart, hydrateCartFromBackend, clearCartState, clearCart, getUniqueProductCount } = useCartStore();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Wishlist state from store
  const { wishlistItems, toggleWishlist, removeFromWishlistByIndex } = useWishlistStore();
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  // Validate wishlist items against backend to remove deleted/dummy data
  useEffect(() => {
    useWishlistStore.getState().validateWishlist();
  }, []);

  // Navigation handler for backward compatibility
  const handleNavigate = (path, payload = null, options = {}) => {
    if (path === 'home') {
      const redirect = localStorage.getItem('checkout_redirect') || '/';
      localStorage.removeItem('checkout_redirect');
      navigate(redirect, { replace: true, ...options });
    } else if (path === 'admin') {
      navigate('/admin/dashboard', { replace: true, ...options });
    } else if (payload && typeof payload === 'object') {
      navigate(path, { state: { data: payload }, ...options });
    } else if (payload) {
      navigate(`${path}/${payload}`, options);
    } else {
      navigate(path, options);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // On successful login: set user state and immediately fetch their cart from backend
  const handleAuthSuccess = async (data) => {
    setUser({
      id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
      isStaff: data.isStaff
    });
    await hydrateCartFromBackend(); // Strictly fetch only this user's cart
    navigate('/');
  };

  // On logout: wipe cart + wishlist from memory
  const handleLogout = () => {
    authService.logout();
    clearCartState();      
    setUser(null);
    setProfileData(null);
    useWishlistStore.setState({ wishlistItems: [] });  
    try {
      useAddressStore.getState().clearAddresses();
    } catch(e) {}
    navigate('/');
  };

  const resolveProductForCart = async (product) => {
    const giftPrefs = {
      isGift: product.isGift,
      isGiftWrapper: product.isGiftWrapper,
      giftMessage: product.giftMessage,
      giftMessageStyle: product.giftMessageStyle,
      deliveryDate: product.deliveryDate,
      scheduledDeliveryDate: product.scheduledDeliveryDate,
    };

    let productToAdd = { ...product };

    try {
      const res = await productV2API.getById(productToAdd._id || productToAdd.id);
      const fullProduct = res.product || res;
      productToAdd = { ...productToAdd, ...fullProduct, ...giftPrefs };
    } catch (err) {
      console.error('[Cart] Failed to fetch full product details:', err);
    }

    // Default to the first variant if no variant is currently selected
    if (!productToAdd.selectedVariant && productToAdd.variants && productToAdd.variants.length > 0) {
      productToAdd.selectedVariant = productToAdd.variants[0];
    }

    if (productToAdd.selectedVariant) {
      const sv = productToAdd.selectedVariant;
      const availableStock = Math.max(
        0,
        (sv.inventory ?? sv.currentStock ?? sv.stock ?? 0) - (sv.reserveStock || 0)
      );
      if (availableStock <= 0) {
        toast.error('This variant is out of stock!');
        return null;
      }
    }

    return productToAdd;
  };

  const handleAddToCart = async (product, qty = 1, explicitlySelectedVariant = null) => {
    const resolved = await resolveProductForCart(product);
    if (!resolved) return;
    addToCart(resolved, qty, explicitlySelectedVariant);
    setIsCartOpen(true);
  };

  const handleBuyNow = async (product, qty = 1, explicitlySelectedVariant = null) => {
    const resolved = await resolveProductForCart(product);
    if (!resolved) return;
    clearCart();
    addToCart(resolved, qty, explicitlySelectedVariant);
    navigate('/review-order');
  };

  const handleUpdateQuantity = (index, delta) => {
    const item = cartItems[index];
    if (!item) return;

    const newQty = item.qty + delta;

    if (newQty < 1) {
      removeFromCart(String(item.product), item.variant ? String(item.variant) : undefined);
    } else if (item.maxStock != null && newQty > item.maxStock) {
      updateQuantity(String(item.product), item.maxStock, item.variant ? String(item.variant) : undefined);
    } else {
      updateQuantity(String(item.product), newQty, item.variant ? String(item.variant) : undefined);
    }
  };

  const handleRemoveFromCart = (index) => {
    const item = cartItems[index];
    if (item) {
      removeFromCart(String(item.product), item.variant ? String(item.variant) : undefined);
    }
  };

  const handleAddToWishlist = async (product, explicitlySelectedVariant = null, explicitQty = 1) => {
    let productToAdd = { ...product };

    // Always fetch full product details to ensure we have all variant attributes (color, weight, images)
    try {
      const res = await productV2API.getById(productToAdd._id || productToAdd.id);
      const fullProduct = res.product || res;
      productToAdd = { ...productToAdd, ...fullProduct };
    } catch (err) {
      console.error('[Wishlist] Failed to fetch full product details:', err);
    }

    let finalVariant = explicitlySelectedVariant;

    // Map partial explicitlySelectedVariant to the full variant object from the fetched product
    if (finalVariant && productToAdd.variants && productToAdd.variants.length > 0) {
      const fullVariantMatch = productToAdd.variants.find(v => String(v._id || v.id) === String(finalVariant._id || finalVariant.id));
      if (fullVariantMatch) {
        finalVariant = fullVariantMatch;
      }
    }

    // Default to the first variant if no variant is currently selected
    if (!finalVariant && productToAdd.variants && productToAdd.variants.length > 0) {
      finalVariant = productToAdd.variants[0];
    }

    // Rely on store to handle toggle properly (add or remove if exists)
    await toggleWishlist(productToAdd, finalVariant, explicitQty);
    setIsWishlistOpen(true);
  };

  const handleRemoveFromWishlist = (index) => {
    removeFromWishlistByIndex(index);
  };

  const handleMoveToCart = (item, index) => {
    handleAddToCart(item);
    handleRemoveFromWishlist(index);
  };

  const handleCheckoutClick = () => {
    setIsCartOpen(false);
    navigate('/review-order');
  };

  useEffect(() => {
    hydrateCartFromBackend();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfileData(null);
      return;
    }
    const fetchFullProfile = async () => {
      try {
        setProfileLoading(true);
        const data = await authService.getProfile();
        setProfileData(data);
      } catch (err) {
        setProfileError(err.message || 'Failed to load profile');
      } finally {
        setProfileLoading(false);
      }
    };
    fetchFullProfile();
  }, [user?.id]);

  const handleProfileUpdated = (updatedUser) => {
    setUser((current) => ({
      ...current,
      id: updatedUser._id || updatedUser.id || current?.id,
      name: updatedUser.name || current?.name,
      email: updatedUser.email || current?.email,
      role: updatedUser.role || current?.role,
      isStaff: updatedUser.isStaff ?? current?.isStaff,
    }));
    setProfileData((current) => ({
      ...(current || {}),
      user: updatedUser,
    }));
  };

  const handleAddressUpdated = async () => {
    if (!user) return;
    try {
      const data = await authService.getProfile();
      setProfileData(data);
    } catch (err) {
      console.error('Failed to refresh profile after address update:', err);
    }
  };

  const headerProps = {
    user,
    onLogout: handleLogout,
    onNavigate: handleNavigate,
    cartCount: getUniqueProductCount(),
    onOpenCart: () => setIsCartOpen(true),
    wishlistCount: wishlistItems.length,
    onOpenWishlist: () => setIsWishlistOpen(true)
  };

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

      <CartOffcanvas
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemoveFromCart}
        onCheckout={handleCheckoutClick}
      />

      <WishlistOffcanvas
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistItems={wishlistItems}
        onRemove={handleRemoveFromWishlist}
        onMoveToCart={handleMoveToCart}
      />

      <Routes>
        {/* Main Application Layout with DRY Header/Footer */}
        <Route element={<PageLayout headerProps={headerProps} />}>
          <Route path="/" element={<Home user={user} onNavigate={handleNavigate} onAddToCart={handleAddToCart} onAddToWishlist={handleAddToWishlist} />} />
          <Route path="/product/:id" element={<ProductDetails user={user} onNavigate={handleNavigate} onAddToCart={handleAddToCart} onBuyNow={handleBuyNow} onAddToWishlist={handleAddToWishlist} onRemoveFromWishlist={handleRemoveFromWishlist} wishlistItems={wishlistItems} />} />
          <Route path="/cart" element={<CartPage onNavigate={handleNavigate} />} />
          <Route path="/review-order" element={<ReviewOrderPage onNavigate={handleNavigate} />} />
          <Route path="/complete-order" element={<CompleteOrderPage onNavigate={handleNavigate} user={user} onAuthSuccess={handleAuthSuccess} onAddressUpdated={handleAddressUpdated} />} />
          <Route path="/wishlist" element={<WishlistPage wishlistItems={wishlistItems} onRemove={handleRemoveFromWishlist} onMoveToCart={handleMoveToCart} onNavigate={handleNavigate} />} />
          <Route path="/gift-and-card" element={<GiftAndCardPage onNavigate={handleNavigate} onAddToCart={handleAddToCart} />} />
          
          <Route path="/order-success/:orderId" element={<ProtectedRoute user={user}><OrderSuccessPage onNavigate={handleNavigate} /></ProtectedRoute>} />
          <Route path="/order-history" element={<ProtectedRoute user={user}><OrderHistoryPage onNavigate={handleNavigate} user={user} /></ProtectedRoute>} />
          <Route path="/profile/*" element={<ProtectedRoute user={user}><CustomerProfilePage user={user} profileData={profileData} profileLoading={profileLoading} profileError={profileError} onNavigate={handleNavigate} onLogout={handleLogout} onProfileUpdated={handleProfileUpdated} wishlistItems={wishlistItems} onRemoveFromWishlist={handleRemoveFromWishlist} onMoveToCart={handleMoveToCart} /></ProtectedRoute>} />
          <Route path="/cashfree-callback" element={<ProtectedRoute user={user}><CashfreeCallbackPage onNavigate={handleNavigate} /></ProtectedRoute>} />
        </Route>

        {/* Auth Layout without Header/Footer */}
        <Route element={<PageLayout headerProps={headerProps} hideHeaderFooter={true} />}>
          <Route path="/login" element={<Login onAuthSuccess={handleAuthSuccess} onNavigate={handleNavigate} />} />
          <Route path="/oauth-success" element={<OAuthCallback onAuthSuccess={handleAuthSuccess} />} />
        </Route>

        {/* Admin Dashboard */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute user={user} requiredRole="admin">
              <AdminLayout>
                <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-brown"></div></div>}>
                  <AdminDashboard user={user} onNavigate={handleNavigate} onLogout={handleLogout} />
                </Suspense>
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
