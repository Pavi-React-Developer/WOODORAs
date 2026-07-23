import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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
import ShopPage from './pages/ShopPage';
import BulkOrderPage from './pages/BulkOrderPage';
import GiftAndCardPage from './pages/GiftAndCardPage';
import CustomizePage from './pages/CustomizePage';
import OAuthCallback from './pages/OAuthCallback';
import { authService } from './api/authService';
import CartOffcanvas from './components/CartOffcanvas';
import WishlistOffcanvas from './components/WishlistOffcanvas';
import useCartStore from './store/useCartStore';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Error Boundary to prevent blank page on runtime errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('React Error Boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center">
          <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
          <p className="text-gray-600 mt-4">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/admin'; }}
            className="mt-6 px-6 py-2 bg-[#8B5E3C] text-white rounded-xl font-bold hover:bg-[#7a5234]"
          >
            Go to Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Protected Route Wrapper
function ProtectedRoute({ children, user, requiredRole }) {
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
}


// Layout component for pages with header/footer
function LayoutWithHeader({ children, user, cartItems, wishlistItems, onOpenCart, onOpenWishlist, onLogout, onNavigate }) {
  return (
    <div className="flex flex-col min-h-screen bg-brand-beige/10">
      <Header
        user={user}
        onLogout={onLogout}
        onNavigate={onNavigate}
        cartCount={cartItems.reduce((acc, item) => acc + item.qty, 0)}
        onOpenCart={onOpenCart}
        wishlistCount={wishlistItems.length}
        onOpenWishlist={onOpenWishlist}
      />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}

// Layout component for login (no header/footer)
function LoginLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-brand-beige/10">
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}

// Layout component for admin (no header/footer)
function AdminLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-brand-beige/10">
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [profileData, setProfileData] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Cart state from store
  const { cartItems, addToCart, updateQuantity, removeFromCart, hydrateCartFromBackend } = useCartStore();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Wishlist state
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  // Navigation handler (backwards compatible)
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

  const handleAuthSuccess = (data, skipNavigate = false) => {
    setUser({
      id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
      isStaff: data.isStaff
    });
    if (!skipNavigate) {
      navigate('/');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setProfileData(null);
    navigate('/');
  };

  const handleAddToCart = (product) => {
    const addedQuantity = product.quantity || 1;
    addToCart(product, addedQuantity);
    setIsCartOpen(true);
  };

  const handleBuyNow = (product) => {
    const addedQuantity = product.quantity || 1;
    addToCart(product, addedQuantity);
    navigate('/review-order');
  };

  const handleUpdateQuantity = (index, delta) => {
    const item = cartItems[index];
    if (!item) return;
    const newQuantity = item.qty + delta;
    if (newQuantity > 0) {
      updateQuantity(item.product, newQuantity, item.variant);
    } else {
      removeFromCart(item.product, item.variant);
    }
  };

  const handleRemoveFromCart = (index) => {
    const item = cartItems[index];
    if (item) {
      removeFromCart(item.product, item.variant);
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
      avatar: updatedUser.avatar ?? current?.avatar,
      profileImage: updatedUser.profileImage ?? current?.profileImage,
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

      <ScrollToTop />

      {/* Routes */}
      <Routes>
        {/* Home */}
        <Route
          path="/"
          element={
            <Home
              user={user}
              cartItems={cartItems}
              wishlistItems={wishlistItems}
              onOpenCart={() => setIsCartOpen(true)}
              onOpenWishlist={() => setIsWishlistOpen(true)}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
              onAddToCart={handleAddToCart}
              onAddToWishlist={handleAddToWishlist}
            />
          }
        />

        {/* Shop */}
        <Route
          path="/shop"
          element={
            <LayoutWithHeader
              user={user}
              cartItems={cartItems}
              wishlistItems={wishlistItems}
              onOpenCart={() => setIsCartOpen(true)}
              onOpenWishlist={() => setIsWishlistOpen(true)}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            >
              <ShopPage
                user={user}
                onNavigate={handleNavigate}
                onAddToCart={handleAddToCart}
                onAddToWishlist={handleAddToWishlist}
              />
            </LayoutWithHeader>
          }
        />

        {/* Bulk Orders */}
        <Route
          path="/bulk-orders"
          element={
            <LayoutWithHeader
              user={user}
              cartItems={cartItems}
              wishlistItems={wishlistItems}
              onOpenCart={() => setIsCartOpen(true)}
              onOpenWishlist={() => setIsWishlistOpen(true)}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            >
              <BulkOrderPage />
            </LayoutWithHeader>
          }
        />

        {/* Product Details */}
        <Route
          path="/product/:id"
          element={
            <LayoutWithHeader
              user={user}
              cartItems={cartItems}
              wishlistItems={wishlistItems}
              onOpenCart={() => setIsCartOpen(true)}
              onOpenWishlist={() => setIsWishlistOpen(true)}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            >
              <ProductDetails
                user={user}
                onNavigate={handleNavigate}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                onAddToWishlist={handleAddToWishlist}
              />
            </LayoutWithHeader>
          }
        />

        {/* Login */}
        <Route
          path="/login"
          element={
            <LoginLayout>
              <Login onAuthSuccess={handleAuthSuccess} onNavigate={handleNavigate} />
            </LoginLayout>
          }
        />

        {/* OAuth Callback */}
        <Route
          path="/oauth-success"
          element={
            <LoginLayout>
              <OAuthCallback onAuthSuccess={handleAuthSuccess} />
            </LoginLayout>
          }
        />

        {/* Cart */}
        <Route
          path="/cart"
          element={
            <LayoutWithHeader
              user={user}
              cartItems={cartItems}
              wishlistItems={wishlistItems}
              onOpenCart={() => setIsCartOpen(true)}
              onOpenWishlist={() => setIsWishlistOpen(true)}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            >
              <CartPage onNavigate={handleNavigate} />
            </LayoutWithHeader>
          }
        />

        {/* Review Order */}
        <Route
          path="/review-order"
          element={
            <LayoutWithHeader
              user={user}
              cartItems={cartItems}
              wishlistItems={wishlistItems}
              onOpenCart={() => setIsCartOpen(true)}
              onOpenWishlist={() => setIsWishlistOpen(true)}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            >
              <ReviewOrderPage onNavigate={handleNavigate} />
            </LayoutWithHeader>
          }
        />

        {/* Complete Order */}
        <Route
          path="/complete-order"
          element={
            <LayoutWithHeader
              user={user}
              cartItems={cartItems}
              wishlistItems={wishlistItems}
              onOpenCart={() => setIsCartOpen(true)}
              onOpenWishlist={() => setIsWishlistOpen(true)}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            >
              <CompleteOrderPage onNavigate={handleNavigate} user={user} onAuthSuccess={handleAuthSuccess} />
            </LayoutWithHeader>
          }
        />

        {/* Order Success */}
        <Route
          path="/order-success/:orderId"
          element={
            <ProtectedRoute user={user}>
              <LayoutWithHeader
                user={user}
                cartItems={cartItems}
                wishlistItems={wishlistItems}
                onOpenCart={() => setIsCartOpen(true)}
                onOpenWishlist={() => setIsWishlistOpen(true)}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
              >
                <OrderSuccessPage onNavigate={handleNavigate} />
              </LayoutWithHeader>
            </ProtectedRoute>
          }
        />

        {/* Order History */}
        <Route
          path="/order-history"
          element={
            <ProtectedRoute user={user}>
              <LayoutWithHeader
                user={user}
                cartItems={cartItems}
                wishlistItems={wishlistItems}
                onOpenCart={() => setIsCartOpen(true)}
                onOpenWishlist={() => setIsWishlistOpen(true)}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
              >
                <OrderHistoryPage onNavigate={handleNavigate} />
              </LayoutWithHeader>
            </ProtectedRoute>
          }
        />

        {/* Profile */}
        <Route
          path="/profile/*"
          element={
            <ProtectedRoute user={user}>
              <LayoutWithHeader
                user={user}
                cartItems={cartItems}
                wishlistItems={wishlistItems}
                onOpenCart={() => setIsCartOpen(true)}
                onOpenWishlist={() => setIsWishlistOpen(true)}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
              >
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
              </LayoutWithHeader>
            </ProtectedRoute>
          }
        />

        {/* Wishlist */}
        <Route
          path="/wishlist"
          element={
            <LayoutWithHeader
              user={user}
              cartItems={cartItems}
              wishlistItems={wishlistItems}
              onOpenCart={() => setIsCartOpen(true)}
              onOpenWishlist={() => setIsWishlistOpen(true)}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            >
              <WishlistPage
                wishlistItems={wishlistItems}
                onRemove={handleRemoveFromWishlist}
                onMoveToCart={handleMoveToCart}
                onNavigate={handleNavigate}
              />
            </LayoutWithHeader>
          }
        />

        {/* Cashfree Callback */}
        <Route
          path="/cashfree-callback"
          element={
            <ProtectedRoute user={user}>
              <LayoutWithHeader
                user={user}
                cartItems={cartItems}
                wishlistItems={wishlistItems}
                onOpenCart={() => setIsCartOpen(true)}
                onOpenWishlist={() => setIsWishlistOpen(true)}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
              >
                <CashfreeCallbackPage onNavigate={handleNavigate} />
              </LayoutWithHeader>
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute user={user} requiredRole="admin">
              <AdminLayout>
                <ErrorBoundary>
                  <AdminDashboard user={user} onNavigate={handleNavigate} onLogout={handleLogout} />
                </ErrorBoundary>
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Gift & Card Page */}
        <Route
          path="/gift-and-card"
          element={
            <LayoutWithHeader
              user={user}
              cartItems={cartItems}
              wishlistItems={wishlistItems}
              onOpenCart={() => setIsCartOpen(true)}
              onOpenWishlist={() => setIsWishlistOpen(true)}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            >
              <GiftAndCardPage
                onNavigate={handleNavigate}
                onAddToCart={handleAddToCart}
              />
            </LayoutWithHeader>
          }
        />

        {/* Customize Page */}
        <Route
          path="/customize"
          element={
            <LayoutWithHeader
              user={user}
              cartItems={cartItems}
              wishlistItems={wishlistItems}
              onOpenCart={() => setIsCartOpen(true)}
              onOpenWishlist={() => setIsWishlistOpen(true)}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            >
              <CustomizePage />
            </LayoutWithHeader>
          }
        />

        {/* Catch-all - 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
