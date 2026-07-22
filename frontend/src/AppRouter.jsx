import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { productV2API } from './api/catalogV2Service';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import CartPage from './pages/CartPage';
import ReviewOrderPage from './pages/ReviewOrderPage';
import CompleteOrderPage from './pages/CompleteOrderPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import CashfreeCallbackPage from './pages/CashfreeCallbackPage';
import CustomerProfilePage from './pages/CustomerProfilePage';
import WishlistPage from './pages/WishlistPage';
import { authService } from './api/authService';
import CartOffcanvas from './components/CartOffcanvas';
import WishlistOffcanvas from './components/WishlistOffcanvas';
import useCartStore from './store/useCartStore';
import GiftAndCardPage from './pages/GiftAndCardPage';

import OAuthCallback from './pages/OAuthCallback';

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

// Layout Wrapper for hiding header/footer on certain pages
const PageLayout = ({ children, hideHeaderFooter }) => (
  <div className="flex flex-col min-h-screen bg-brand-beige/10">
    <main className="flex-grow">
      {children}
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
  const { cartItems, addToCart, updateQuantity, removeFromCart, hydrateCartFromBackend } = useCartStore();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Wishlist state
  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const saved = localStorage.getItem('wooden_toys_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Sync wishlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('wooden_toys_wishlist', JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  // Navigation handler for backward compatibility
  const handleNavigate = (path, payload = null) => {
    if (payload && typeof payload === 'object') {
      navigate(path, { state: { data: payload } });
    } else if (payload) {
      navigate(`${path}/${payload}`);
    } else {
      navigate(path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = (data) => {
    setUser({
      id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
      isStaff: data.isStaff
    });
    navigate('/');
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setProfileData(null);
    navigate('/');
  };

  const resolveProductForCart = async (product) => {
    let productToAdd = { ...product };

    // Always fetch full details to ensure we have variants with stock info
    if (!productToAdd.variants || productToAdd.variants.length === 0) {
      try {
        const res = await productV2API.getById(productToAdd._id || productToAdd.id);
        const fullProduct = res.product || res;
        productToAdd = { ...productToAdd, ...fullProduct };
      } catch (err) {
        console.error('[Cart] Failed to fetch full product details:', err);
      }
    }

    // ── Product already has a pre-selected variant (from ProductDetails page) ──
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

  const handleAddToCart = async (product) => {
    const resolved = await resolveProductForCart(product);
    if (!resolved) return;
    addToCart(resolved, 1);
    setIsCartOpen(true);
  };

  const handleBuyNow = async (product) => {
    const resolved = await resolveProductForCart(product);
    if (!resolved) return;
    addToCart(resolved, 1);
    navigate('/review-order');
  };

  const handleUpdateQuantity = (index, delta) => {
    const item = cartItems[index];
    if (!item) return;

    const newQty = item.qty + delta;

    if (newQty < 1) {
      // Quantity going below 1 = remove item
      removeFromCart(String(item.product), item.variant ? String(item.variant) : undefined);
    } else if (item.maxStock != null && newQty > item.maxStock) {
      // Cap at maxStock, don't remove
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

  const handleAddToWishlist = (product) => {
    const exists = wishlistItems.some(item => {
      const isSameProduct = (item._id && product._id && item._id === product._id) ||
        (item.id && product.id && item.id === product.id);
      if (!isSameProduct) return false;
      const itemVariantId = item.selectedVariant?._id || item.selectedVariant?.id;
      const productVariantId = product.selectedVariant?._id || product.selectedVariant?.id;
      return itemVariantId === productVariantId;
    });
    if (!exists) {
      setWishlistItems([...wishlistItems, product]);
    }
    setIsWishlistOpen(true);
  };

  const handleRemoveFromWishlist = (index) => {
    const newWishlist = [...wishlistItems];
    newWishlist.splice(index, 1);
    setWishlistItems(newWishlist);
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
    if (user) {
      hydrateCartFromBackend();
    }
  }, [user, hydrateCartFromBackend]);

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

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

      {/* Cart Offcanvas */}
      <CartOffcanvas
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemoveFromCart}
        onCheckout={handleCheckoutClick}
      />

      {/* Wishlist Offcanvas */}
      <WishlistOffcanvas
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistItems={wishlistItems}
        onRemove={handleRemoveFromWishlist}
        onMoveToCart={handleMoveToCart}
      />

      {/* Routes */}
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <PageLayout>
              <Header
                user={user}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                cartCount={cartItems.reduce((acc, item) => acc + item.qty, 0)}
                onOpenCart={() => setIsCartOpen(true)}
                wishlistCount={wishlistItems.length}
                onOpenWishlist={() => setIsWishlistOpen(true)}
              />
              <Home
                user={user}
                onNavigate={handleNavigate}
                onAddToCart={handleAddToCart}
                onAddToWishlist={handleAddToWishlist}
              />
            </PageLayout>
          }
        />

        <Route
          path="/product/:id"
          element={
            <PageLayout>
              <Header
                user={user}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                cartCount={cartItems.reduce((acc, item) => acc + item.qty, 0)}
                onOpenCart={() => setIsCartOpen(true)}
                wishlistCount={wishlistItems.length}
                onOpenWishlist={() => setIsWishlistOpen(true)}
              />
              <ProductDetails
                user={user}
                onNavigate={handleNavigate}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                onAddToWishlist={handleAddToWishlist}
              />
            </PageLayout>
          }
        />

        <Route
          path="/login"
          element={
            <PageLayout hideHeaderFooter={true}>
              <Login onAuthSuccess={handleAuthSuccess} onNavigate={handleNavigate} />
            </PageLayout>
          }
        />

        <Route
          path="/oauth-success"
          element={
            <PageLayout hideHeaderFooter={true}>
              <OAuthCallback onAuthSuccess={handleAuthSuccess} />
            </PageLayout>
          }
        />

        <Route
          path="/cart"
          element={
            <PageLayout>
              <Header
                user={user}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                cartCount={cartItems.reduce((acc, item) => acc + item.qty, 0)}
                onOpenCart={() => setIsCartOpen(true)}
                wishlistCount={wishlistItems.length}
                onOpenWishlist={() => setIsWishlistOpen(true)}
              />
              <CartPage onNavigate={handleNavigate} />
            </PageLayout>
          }
        />

        <Route
          path="/review-order"
          element={
            <PageLayout>
              <Header
                user={user}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                cartCount={cartItems.reduce((acc, item) => acc + item.qty, 0)}
                onOpenCart={() => setIsCartOpen(true)}
                wishlistCount={wishlistItems.length}
                onOpenWishlist={() => setIsWishlistOpen(true)}
              />
              <ReviewOrderPage onNavigate={handleNavigate} />
            </PageLayout>
          }
        />

        <Route
          path="/complete-order"
          element={
            <PageLayout>
              <Header
                user={user}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                cartCount={cartItems.reduce((acc, item) => acc + item.qty, 0)}
                onOpenCart={() => setIsCartOpen(true)}
                wishlistCount={wishlistItems.length}
                onOpenWishlist={() => setIsWishlistOpen(true)}
              />
              <CompleteOrderPage onNavigate={handleNavigate} user={user} onAuthSuccess={handleAuthSuccess} />
            </PageLayout>
          }
        />

        <Route
          path="/order-success/:orderId"
          element={
            <ProtectedRoute user={user}>
              <PageLayout>
                <Header
                  user={user}
                  onLogout={handleLogout}
                  onNavigate={handleNavigate}
                  cartCount={cartItems.reduce((acc, item) => acc + item.qty, 0)}
                  onOpenCart={() => setIsCartOpen(true)}
                  wishlistCount={wishlistItems.length}
                  onOpenWishlist={() => setIsWishlistOpen(true)}
                />
                <OrderSuccessPage onNavigate={handleNavigate} />
              </PageLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/order-history"
          element={
            <ProtectedRoute user={user}>
              <PageLayout>
                <Header
                  user={user}
                  onLogout={handleLogout}
                  onNavigate={handleNavigate}
                  cartCount={cartItems.reduce((acc, item) => acc + item.qty, 0)}
                  onOpenCart={() => setIsCartOpen(true)}
                  wishlistCount={wishlistItems.length}
                  onOpenWishlist={() => setIsWishlistOpen(true)}
                />
                <OrderHistoryPage onNavigate={handleNavigate} />
              </PageLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/*"
          element={
            <ProtectedRoute user={user}>
              <PageLayout>
                <Header
                  user={user}
                  onLogout={handleLogout}
                  onNavigate={handleNavigate}
                  cartCount={cartItems.reduce((acc, item) => acc + item.qty, 0)}
                  onOpenCart={() => setIsCartOpen(true)}
                  wishlistCount={wishlistItems.length}
                  onOpenWishlist={() => setIsWishlistOpen(true)}
                />
                <CustomerProfilePage
                  user={user}
                  profileData={profileData}
                  profileLoading={profileLoading}
                  profileError={profileError}
                  onNavigate={handleNavigate}
                  onLogout={handleLogout}
                  onProfileUpdated={handleProfileUpdated}
                  wishlistItems={wishlistItems}
                  onRemoveFromWishlist={handleRemoveFromWishlist}
                  onMoveToCart={handleMoveToCart}
                />
              </PageLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/wishlist"
          element={
            <PageLayout>
              <Header
                user={user}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                cartCount={cartItems.reduce((acc, item) => acc + item.qty, 0)}
                onOpenCart={() => setIsCartOpen(true)}
                wishlistCount={wishlistItems.length}
                onOpenWishlist={() => setIsWishlistOpen(true)}
              />
              <WishlistPage
                wishlistItems={wishlistItems}
                onRemove={handleRemoveFromWishlist}
                onMoveToCart={handleMoveToCart}
                onNavigate={handleNavigate}
              />
            </PageLayout>
          }
        />

        <Route
          path="/cashfree-callback"
          element={
            <ProtectedRoute user={user}>
              <PageLayout>
                <Header
                  user={user}
                  onLogout={handleLogout}
                  onNavigate={handleNavigate}
                  cartCount={cartItems.reduce((acc, item) => acc + item.qty, 0)}
                  onOpenCart={() => setIsCartOpen(true)}
                  wishlistCount={wishlistItems.length}
                  onOpenWishlist={() => setIsWishlistOpen(true)}
                />
                <CashfreeCallbackPage onNavigate={handleNavigate} />
              </PageLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute user={user} requiredRole="admin">
              <AdminLayout>
                <AdminDashboard user={user} onNavigate={handleNavigate} onLogout={handleLogout} />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all - 404 */}
        <Route
          path="/gift-and-card"
          element={
            <PageLayout>
              <Header
                user={user}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                cartCount={cartItems.reduce((acc, item) => acc + item.qty, 0)}
                onOpenCart={() => setIsCartOpen(true)}
                wishlistCount={wishlistItems.length}
                onOpenWishlist={() => setIsWishlistOpen(true)}
              />
              <GiftAndCardPage
                onNavigate={handleNavigate}
                onAddToCart={handleAddToCart}
              />
            </PageLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
