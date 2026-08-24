import React, { useEffect, useState } from 'react';
import SectionRenderer from '../components/home/SectionRenderer';
import useCMSStore from '../store/useCMSStore';

import { Loader2 } from 'lucide-react';
import { FaStar, FaCircle, FaHeart, FaWhatsapp } from "react-icons/fa";
import { RiHeartAdd2Line } from "react-icons/ri";
import { TbTriangleFilled } from "react-icons/tb";
import { BsFillPuzzleFill } from "react-icons/bs";
import { MdAddBox } from "react-icons/md";

export default function Home({ user, cartItems, wishlistItems, onOpenCart, onOpenWishlist, onLogout, onNavigate, onAddToCart, onAddToWishlist }) {
  const { cmsData, fetchCMSData, isLoaded } = useCMSStore();

  useEffect(() => {
    fetchCMSData();
  }, [fetchCMSData]);

  const cartCount = cartItems ? new Set(cartItems.map(item => item.product)).size : 0;
  const wishlistCount = wishlistItems?.length || 0;

  const cachedLogoUrl = typeof window !== 'undefined' ? localStorage.getItem('cms_cached_logo') : null;
  const [logoError, setLogoError] = useState(false);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF5EE] space-y-16 overflow-hidden">
        <style>{`
          @keyframes orbitRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes scalePulse { 0%, 100% { transform: scale(1); filter: drop-shadow(0 4px 10px rgba(0,0,0,0.05)); } 50% { transform: scale(1.04); filter: drop-shadow(0 10px 15px rgba(177,98,29,0.15)); } }
          @keyframes textFade { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
          @keyframes dotBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
          @keyframes floatShape { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
          
          .animate-orbit { animation: orbitRotate 25s linear infinite; }
          .animate-logo-pulse { animation: scalePulse 3s ease-in-out infinite; }
          .animate-text-fade { animation: textFade 2s ease-in-out infinite; }
          .animate-dot-bounce { animation: dotBounce 1.2s infinite; }
          .animate-float { animation: floatShape 3.5s ease-in-out infinite; }
          
          .icon-shape {
            color: #b37a43;
            filter: drop-shadow(0px 3px 6px rgba(168,110,49,0.4));
          }
        `}</style>

        {/* Outer Orbit Container */}
        <div className="relative flex items-center justify-center w-[200px] h-[200px] md:w-[240px] md:h-[240px]">
          
          {/* Inner Solid Backdrop */}
          <div className="absolute w-[76%] h-[76%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4ece3] shadow-inner"></div>

          {/* Dotted Orbit Path */}
          <svg className="absolute inset-0 w-full h-full animate-orbit" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
            <circle cx="50" cy="50" r="50" fill="none" stroke="#C29A72" strokeWidth="1.2" strokeDasharray="2 5" strokeLinecap="round" opacity="0.8" />
          </svg>

          {/* WOODEN SHAPES (React Icons) */}
          
          {/* Top: MdAddBox (0 deg) */}
          <div className="absolute top-[0%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-20">
             <div className="animate-float" style={{ animationDelay: '0s' }}>
               <MdAddBox className="icon-shape w-6 h-6 md:w-8 md:h-8" />
             </div>
          </div>

          {/* Top Right: FaHeart (60 deg) */}
          <div className="absolute top-[25%] left-[93.3%] -translate-x-1/2 -translate-y-1/2 rotate-12 z-20">
             <div className="animate-float" style={{ animationDelay: '0.4s' }}>
                <FaHeart className="icon-shape w-5 h-5 md:w-7 md:h-7" />
             </div>
          </div>

          {/* Bottom Right: BsFillPuzzleFill (120 deg) */}
          <div className="absolute top-[75%] left-[93.3%] -translate-x-1/2 -translate-y-1/2 -rotate-[20deg] z-20">
             <div className="animate-float" style={{ animationDelay: '0.8s' }}>
                <BsFillPuzzleFill className="icon-shape w-5 h-5 md:w-7 md:h-7" />
             </div>
          </div>

          {/* Bottom: FaCircle (180 deg) */}
          <div className="absolute top-[100%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-20">
             <div className="animate-float" style={{ animationDelay: '1.2s' }}>
                <FaCircle className="icon-shape w-5 h-5 md:w-7 md:h-7" />
             </div>
          </div>

          {/* Bottom Left: TbTriangleFilled (240 deg) */}
          <div className="absolute top-[75%] left-[6.7%] -translate-x-1/2 -translate-y-1/2 -rotate-[30deg] z-20">
             <div className="animate-float" style={{ animationDelay: '1.6s' }}>
                <TbTriangleFilled className="icon-shape w-6 h-6 md:w-8 md:h-8" />
             </div>
          </div>

          {/* Top Left: FaStar (300 deg) */}
          <div className="absolute top-[25%] left-[6.7%] -translate-x-1/2 -translate-y-1/2 rotate-[15deg] z-20">
             <div className="animate-float" style={{ animationDelay: '2.0s' }}>
                <FaStar className="icon-shape w-6 h-6 md:w-8 md:h-8" />
             </div>
          </div>

          {/* Center Logo */}
          {cachedLogoUrl && cachedLogoUrl !== 'undefined' && !logoError ? (
            <img 
              src={cachedLogoUrl} 
              alt="Marakathai" 
              className="relative z-10 h-24 md:h-32 w-auto object-contain animate-logo-pulse" 
              onError={() => setLogoError(true)}
            />
          ) : (
             <div className="relative z-10 text-2xl md:text-3xl font-serif font-bold text-[#8c5a2c] animate-logo-pulse drop-shadow-md">Marakathai</div>
          )}
        </div>
        
        <div className="flex flex-col items-center gap-4 mt-4">
          <p className="text-[#966b42] text-[13px] md:text-[15px] font-bold tracking-[0.25em] uppercase animate-text-fade">
            Loading Marakathai
          </p>
          
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#E6C095] animate-dot-bounce shadow-sm" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#C99558] animate-dot-bounce shadow-sm" style={{ animationDelay: '200ms' }}></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#8A511B] animate-dot-bounce shadow-sm" style={{ animationDelay: '400ms' }}></div>
          </div>
        </div>
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
      
      {/* Floating WhatsApp Enquiry Button */}
      <a 
          href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '919789660115'}?text=${encodeURIComponent(`Hi, I have an inquiry about your products:`)}`}
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-[90px] right-6 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-[0_4px_14px_rgba(37,211,102,0.4)] hover:scale-110 hover:shadow-[0_6px_20px_rgba(37,211,102,0.6)] transition-all duration-300 md:bottom-8 md:right-8 group flex items-center justify-center animate-bounce-slow"
          aria-label="WhatsApp Enquiry"
      >
          <FaWhatsapp className="w-6 h-6 md:w-8 md:h-8" />
          {/* Optional tooltip */}
          <span className="absolute right-full mr-4 bg-white text-[#25D366] px-3 py-1.5 rounded-lg text-sm font-semibold shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none hidden md:block">
            Chat with us
          </span>
      </a>
    </div>
  );
}
