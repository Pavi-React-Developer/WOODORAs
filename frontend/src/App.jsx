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

export default function App() {
  const [view, setView] = useState('home'); // 'home' | 'login' | 'profile' | 'product-detail'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [user, setUser] = useState(null);
  
  // Profile query state
  const [profileData, setProfileData] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Cart state
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Wishlist state
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  const handleAddToCart = (product) => {
    const existingItemIndex = cartItems.findIndex(item => item._id === product._id || item.id === product.id);
    if (existingItemIndex >= 0) {
      const newCart = [...cartItems];
      newCart[existingItemIndex].quantity += 1;
      setCartItems(newCart);
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (index, delta) => {
    const newCart = [...cartItems];
    const newQuantity = newCart[index].quantity + delta;
    if (newQuantity > 0) {
      newCart[index].quantity = newQuantity;
      setCartItems(newCart);
    } else {
      handleRemoveFromCart(index);
    }
  };

  const handleRemoveFromCart = (index) => {
    const newCart = [...cartItems];
    newCart.splice(index, 1);
    setCartItems(newCart);
  };

  const handleAddToWishlist = (product) => {
    const exists = wishlistItems.some(item => item._id === product._id || item.id === product.id);
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

  // Load session from localStorage on mount
  useEffect(() => {
    const activeUser = authService.getCurrentUser();
    if (activeUser) {
      setUser(activeUser);
    }
  }, []);

  const handleAuthSuccess = (data) => {
    setUser({
      id: data._id,
      name: data.name,
      email: data.email,
      role: data.role
    });
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setView('home');
    setProfileData(null);
  };

  const handleNavigate = (targetView, payload = null) => {
    const activeUser = (targetView === 'admin' && payload && payload.role) ? payload : user || authService.getCurrentUser();
    if (targetView === 'admin' && (!activeUser || activeUser.role !== 'admin')) {
      alert("Unauthorized access");
      return;
    }
    setView(targetView);
    setSelectedProduct(targetView === 'product-detail' ? payload : null);
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

  return (
    <div className="flex flex-col min-h-screen bg-wood-cream/10">
      
      {/* Header component */}
      {view !== 'admin' && view !== 'login' && (
        <Header 
          user={user} 
          onLogout={handleLogout} 
          onNavigate={handleNavigate}
          cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
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

        {view === 'product-detail' && selectedProduct && (
          <ProductDetails
            product={selectedProduct}
            user={user}
            onNavigate={handleNavigate}
            onAddToCart={handleAddToCart}
            onAddToWishlist={handleAddToWishlist}
          />
        )}

        {view === 'login' && (
          <Login onAuthSuccess={handleAuthSuccess} onNavigate={handleNavigate} />
        )}

        {view === 'admin' && user?.role === 'admin' && (
          <AdminDashboard user={user} onNavigate={handleNavigate} />
        )}

        {view === 'profile' && user && (
          <section className="py-20 max-w-xl mx-auto px-6">
            <div className="bg-white border border-wood-medium/20 rounded-3xl p-8 shadow-2xl space-y-6 text-left relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2.5 bg-wood-dark"></div>
              
              <h2 className="font-serif text-3xl font-bold text-wood-dark">User Account</h2>
              <div className="w-12 h-1 bg-wood-medium rounded-full"></div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-wood-medium/20 border border-wood-medium text-wood-dark text-xl font-bold rounded-full flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-wood-dark">{user.name}</h3>
                    <span className="inline-block px-2.5 py-0.5 text-xs font-bold bg-wood-green/35 text-wood-dark rounded-full capitalize">
                      {user.role} Account
                    </span>
                  </div>
                </div>

                <div className="border-t border-wood-medium/10 pt-4 space-y-2.5 text-sm text-wood-dark">
                  <p><strong>Email Address:</strong> {user.email}</p>
                  <p><strong>Account ID:</strong> {user.id}</p>
                </div>

                {/* API Request Token Verification container */}
                <div className="bg-wood-cream border border-wood-medium/20 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-wood-medium tracking-wider">🔒 Protected Backend Profile</h4>
                    <span className="text-[10px] bg-wood-dark text-wood-cream px-2 py-0.5 rounded font-mono">Bearer Token</span>
                  </div>

                  {profileLoading && (
                    <p className="text-xs text-gray-500 italic">Querying `/api/auth/profile` with JWT auth headers...</p>
                  )}

                  {profileError && (
                    <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-lg text-left">
                      <p className="font-bold">Authorization Failure</p>
                      <p>{profileError}</p>
                    </div>
                  )}

                  {profileData && (
                    <div className="space-y-2">
                      <p className="text-xs text-green-700 font-bold">✔️ Access Authorized! Response:</p>
                      <pre className="bg-white/70 border border-wood-medium/10 p-2.5 rounded text-[10px] font-mono overflow-x-auto text-wood-dark max-h-32">
                        {JSON.stringify(profileData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => handleNavigate('home')}
                  className="bg-wood-light hover:bg-wood-medium/20 text-wood-dark font-bold text-xs px-5 py-2.5 rounded-xl border border-wood-medium/20 cursor-pointer"
                >
                  Return Home
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                >
                  Sign Out
                </button>
              </div>

            </div>
          </section>
        )}

      </main>

      {/* Footer component */}
      {view !== 'admin' && view !== 'login' && (
        <Footer />
      )}

    </div>
  );
}
