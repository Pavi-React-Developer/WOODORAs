import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import { authService } from './api/authService';
import CartOffcanvas from './components/CartOffcanvas';
import WishlistOffcanvas from './components/WishlistOffcanvas';
import CartPage from './pages/CartPage';
import ReviewOrderPage from './pages/ReviewOrderPage';
import CompleteOrderPage from './pages/CompleteOrderPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import useCartStore from './store/useCartStore';
import { Toaster } from 'react-hot-toast';
import CashfreeCallbackPage from './pages/CashfreeCallbackPage';
import CustomerProfilePage from './pages/CustomerProfilePage';

export default function App() {
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'cashfree-callback') {
      return 'cashfree-callback';
    }

    const savedView = localStorage.getItem('currentView') || 'home';
    const savedUser = authService.getCurrentUser();
    // If the saved view requires auth but there is no user, reset to home
    const authRequiredViews = ['admin', 'profile', 'review-order', 'complete-order', 'order-success', 'order-history', 'cashfree-callback'];
    if (authRequiredViews.includes(savedView) && !savedUser) {
      localStorage.setItem('currentView', 'home');
      return 'home';
    }
    return savedView;
  }); // 'home' | 'login' | 'profile' | 'product-detail' | 'admin'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [user, setUser] = useState(() => authService.getCurrentUser());
  
  // Profile query state
  const [profileData, setProfileData] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Cart state from store
  const { cartItems, addToCart, updateQuantity, removeFromCart, hydrateCartFromBackend } = useCartStore();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Wishlist and Saved state
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [savedItems, setSavedItems] = useState([]);

  const handleAddToCart = (product) => {
    const addedQuantity = product.quantity || 1;
    // Map to store format to ensure consistency if needed, but addToCart handles product mapping
    addToCart(product, addedQuantity);
    setIsCartOpen(true);
  };

  const handleBuyNow = (product) => {
    const addedQuantity = product.quantity || 1;
    addToCart(product, addedQuantity);
    handleNavigate('checkout');
  };

  const handleUpdateQuantity = (index, delta) => {
    // CartOffcanvas uses array index, but useCartStore uses productId
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
    handleNavigate('cart');
  };

  // Removed redundant load session on mount since it's now initialized in useState

  const handleAuthSuccess = (data) => {
    setUser({
      id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
      isStaff: data.isStaff
    });
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setView('home');
    localStorage.removeItem('currentView');
    localStorage.removeItem('user');
    setProfileData(null);
  };

  const handleNavigate = (targetView, payload = null) => {
    const activeUser = (targetView === 'admin' && payload && payload.role) ? payload : user || authService.getCurrentUser();
    if (targetView === 'admin' && (!activeUser || (activeUser.role?.toLowerCase() !== 'admin' && !activeUser.isStaff))) {
      alert("Unauthorized access");
      return;
    }
    setView(targetView);
    localStorage.setItem('currentView', targetView);
    if (targetView === 'product-detail' || targetView === 'order-success' || targetView === 'cashfree-callback') {
      setSelectedProduct(payload);
    } else {
      setSelectedProduct(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch data from backend protected profile endpoint to test authentication flow
  useEffect(() => {
    if (view === 'profile' && user) {
      setProfileLoading(true);
      setProfileError('');
      setProfileData(null);
      
      authService.getProfile()
        .then(data => {
          setProfileData(data);
        })
        .catch(err => {
          setProfileError(err.message || 'Failed to fetch protected profile data.');
        })
        .finally(() => {
          setProfileLoading(false);
        });
    }
  }, [view, user]);

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
    <div className="flex flex-col min-h-screen bg-brand-beige/10">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      
      {/* Header component */}
      {view !== 'admin' && view !== 'login' && (
        <Header 
          user={user} 
          onLogout={handleLogout} 
          onNavigate={handleNavigate}
          cartCount={cartItems.reduce((acc, item) => acc + item.qty, 0)}
          onOpenCart={() => setIsCartOpen(true)}
          wishlistCount={wishlistItems.length}
          onOpenWishlist={() => setIsWishlistOpen(true)}
        />
      )}

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

      {/* Main Pages content */}
      <main className="flex-grow">
        
        {view === 'home' && (
          <Home 
            user={user} 
            onNavigate={handleNavigate} 
            onAddToCart={handleAddToCart} 
            onAddToWishlist={handleAddToWishlist} 
          />
        )}

        {view === 'product-detail' && (
          <ProductDetails
            product={selectedProduct}
            user={user}
            onNavigate={handleNavigate}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onAddToWishlist={handleAddToWishlist}
          />
        )}

        {view === 'login' && (
          <Login onAuthSuccess={handleAuthSuccess} onNavigate={handleNavigate} />
        )}

        {view === 'admin' && (user?.role?.toLowerCase() === 'admin' || user?.isStaff) ? (
          <AdminDashboard user={user} onNavigate={handleNavigate} onLogout={handleLogout} />
        ) : view === 'admin' ? (
          <div className="p-10 text-center">
            <h1 className="text-2xl font-bold text-red-600">Access Blocked or Debugging Info</h1>
            <pre className="text-left bg-gray-100 p-4 mt-4 inline-block text-sm">
              {JSON.stringify({ user, role: user?.role, isStaff: user?.isStaff, rawRole: user?.role?.toLowerCase() }, null, 2)}
            </pre>
            <button onClick={() => { localStorage.clear(); window.location.href = '/?view=login'; }} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Reset & Login</button>
          </div>
        ) : null}

        {view === 'cart' && (
          <CartPage onNavigate={handleNavigate} />
        )}

        {view === 'review-order' && user && (
          <ReviewOrderPage onNavigate={handleNavigate} />
        )}

        {view === 'complete-order' && user && (
          <CompleteOrderPage onNavigate={handleNavigate} />
        )}

        {view === 'order-success' && user && (
          <OrderSuccessPage orderId={selectedProduct} onNavigate={handleNavigate} />
        )}

        {view === 'cashfree-callback' && user && (
          <CashfreeCallbackPage onNavigate={handleNavigate} />
        )}

        {view === 'order-history' && user && (
          <OrderHistoryPage onNavigate={handleNavigate} />
        )}

        {view === 'profile' && user && (
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
            savedItems={savedItems}
          />
        )}

      </main>

      {/* Footer component */}
      {view !== 'admin' && view !== 'login' && (
        <Footer />
      )}

    </div>
  );
}
