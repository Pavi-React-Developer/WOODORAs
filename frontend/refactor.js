const fs = require('fs');
let content = fs.readFileSync('./src/AppRouter.jsx', 'utf8');

// Replace imports with React.lazy
const pagesToLazyLoad = [
  'Home', 'ProductDetails', 'Login', 'AdminDashboard', 'CartPage', 
  'ReviewOrderPage', 'CompleteOrderPage', 'OrderSuccessPage', 
  'OrderHistoryPage', 'CashfreeCallbackPage', 'CustomerProfilePage', 
  'WishlistPage', 'GiftAndCardPage', 'OAuthCallback'
];

content = content.replace(/import React, \{ useState, useEffect \} from 'react';/, "import React, { useState, useEffect, Suspense, lazy } from 'react';");
content = content.replace(/import \{ Routes, Route, Navigate, useNavigate, useParams \} from 'react-router-dom';/, "import { Routes, Route, Navigate, useNavigate, useParams, Outlet } from 'react-router-dom';");

pagesToLazyLoad.forEach(page => {
  const regex = new RegExp(import  from '\\./pages/';\\n?);
  content = content.replace(regex, const  = lazy(() => import('./pages/'));\n);
});

// Update PageLayout to use Outlet
const newPageLayout = const PageLayout = ({ headerProps, hideHeaderFooter }) => (
  <div className="flex flex-col min-h-screen bg-brand-beige/10">
    {!hideHeaderFooter && <Header {...headerProps} />}
    <main className="flex-grow">
      <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-brown"></div></div>}>
        <Outlet />
      </Suspense>
    </main>
    {!hideHeaderFooter && <Footer />}
  </div>
);;
content = content.replace(/const PageLayout = \(\{ children, hideHeaderFooter \}\) => \([\s\S]*?<\/[dD]iv>\n\);\n/, newPageLayout + '\n');

// Replace the return block
const newReturn = 
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
        {/* Public Routes with Header/Footer */}
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

        {/* Routes without Header/Footer */}
        <Route element={<PageLayout headerProps={headerProps} hideHeaderFooter={true} />}>
          <Route path="/login" element={<Login onAuthSuccess={handleAuthSuccess} onNavigate={handleNavigate} />} />
          <Route path="/oauth-success" element={<OAuthCallback onAuthSuccess={handleAuthSuccess} />} />
        </Route>

        {/* Admin Routes */}
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
;

content = content.replace(/return \([\s\S]*\}\;/m, newReturn);
fs.writeFileSync('./src/AppRouter.jsx', content);
