import React, { useEffect } from 'react';
import SectionRenderer from '../components/home/SectionRenderer';
import useCMSStore from '../store/useCMSStore';

import { Loader2 } from 'lucide-react';

export default function Home({ user, cartItems, wishlistItems, onOpenCart, onOpenWishlist, onLogout, onNavigate, onAddToCart, onAddToWishlist }) {
  const { cmsData, fetchCMSData, isLoaded } = useCMSStore();

  useEffect(() => {
    fetchCMSData();
  }, [fetchCMSData]);

  const cartCount = cartItems ? new Set(cartItems.map(item => item.product)).size : 0;
  const wishlistCount = wishlistItems?.length || 0;

  const cachedLogoUrl = typeof window !== 'undefined' ? (localStorage.getItem('cms_cached_logo') || '/brand-logo.jpeg') : '/brand-logo.jpeg';

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDF9F1] space-y-10">
        <div className="relative flex items-center justify-center w-48 h-48 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          {/* Static Background Track */}
          <div className="absolute -inset-1 rounded-full border-[3px] border-[#F2EBE4]"></div>
          
          {/* Spinning Ring (Matching 2nd image color) */}
          <div className="absolute -inset-1 rounded-full border-[3px] border-[#b1621d] border-t-transparent border-r-transparent animate-spin" style={{ animationDuration: '1.2s' }}></div>
          
          {/* Brand Logo inside */}
          <img src={cachedLogoUrl} alt="Marakathai" className="h-28 w-auto object-contain p-2 animate-pulse" />
        </div>
        
        <p className="text-[#b1621d] text-[15px] font-bold tracking-[0.25em] uppercase">Loading Marakathai...</p>
      </div>
    );
  }

  const context = {
    user,
    heroSlides: cmsData?.heroSlides || [],
    heroBanners: cmsData?.heroBanners || [],
    shopCategories: cmsData?.shopCategories || [],
    thirdBanners: cmsData?.thirdBanners || [],
    productGrids: cmsData?.productGrids || [],
    categoryGrids: cmsData?.categoryGrids || [],
    categoriesGrids: cmsData?.categoriesGrids || [],
    footerData: cmsData?.footerData || null,
    featuredProducts: cmsData?.featuredProducts || [],
    featuredReviews: cmsData?.featuredReviews || [],
    cmsLoaded: isLoaded,
    onNavigate,
    onAddToCart,
    onAddToWishlist,
    onLogout,
    cartCount,
    onOpenCart,
    wishlistCount,
    onOpenWishlist
  };

  const renderedTypes = new Set();
  const layout = cmsData?.layout || [
    { id: 'navbar', visible: true, order: 1 },
    { id: 'heroBanner', visible: true, order: 2 },
    { id: 'thirdBanner', visible: true, order: 3 },
    { id: 'categoryGrid', visible: true, order: 4 },
    { id: 'categoriesGrid', visible: true, order: 5 },
    { id: 'productGrid', visible: true, order: 6 },
    { id: 'footer', visible: true, order: 7 },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#FDF9F1] font-sans text-brand-dark">
      {layout.map(section => (
        <SectionRenderer key={section.id} section={section} context={context} renderedTypes={renderedTypes} />
      ))}
    </div>
  );
}
