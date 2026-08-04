import React, { useEffect } from 'react';
import SectionRenderer from '../components/home/SectionRenderer';
import useCMSStore from '../store/useCMSStore';

export default function Home({ user, cartItems, wishlistItems, onOpenCart, onOpenWishlist, onLogout, onNavigate, onAddToCart, onAddToWishlist }) {
  const { cmsData, fetchCMSData, isLoaded } = useCMSStore();

  useEffect(() => {
    fetchCMSData();
  }, [fetchCMSData]);

  const cartCount = cartItems ? new Set(cartItems.map(item => item.product)).size : 0;
  const wishlistCount = wishlistItems?.length || 0;

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
