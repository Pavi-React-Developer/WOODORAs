import React, { useState, useEffect } from 'react';
import { cmsService } from '../api/cmsService';
import { productV2API } from '../api/catalogV2Service';
import { catalogService } from '../api/catalogService';
import { reviewService } from '../api/reviewService';
import { getImageSrc } from '../utils/imageUtils';
import SectionRenderer from '../components/home/SectionRenderer';

const FALLBACK_HERO = [
  {
    bannerImage: '/hero1.jpeg',
    subtitle: 'Sustainable & Timeless',
    title: 'Play that grows\nwith them.',
    description: 'Our heirloom quality wooden toys are designed to spark curiosity, creativity, and conscious growth in every child.',
    buttonText: 'Shop Collection',
    ctaURL: '/',
    animation: 'Fade',
  },
  {
    bannerImage: '/hero2.jpeg',
    subtitle: 'Crafted for Imagination',
    title: 'Adventures on\nthe right track.',
    description: 'Encourage creative storytelling and motor skills with our beautifully crafted wooden train sets.',
    buttonText: 'Shop Collection',
    ctaURL: '/',
    animation: 'Fade',
  },
];

const TESTIMONIALS = [
  { rating: 5, quote: "The quality is exceptional. You can feel the craftsmanship in every piece.", author: "Sarah M.", context: "Verified Buyer" },
];

export default function Home({ user, cartItems, wishlistItems, onOpenCart, onOpenWishlist, onLogout, onNavigate, onAddToCart, onAddToWishlist }) {
  const [layout, setLayout] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [shopCategories, setShopCategories] = useState([]);
  const [thirdBanners, setThirdBanners] = useState([]);
  const [productGrids, setProductGrids] = useState([]);
  const [categoryGrids, setCategoryGrids] = useState([]);
  const [footerData, setFooterData] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredReviews, setFeaturedReviews] = useState(TESTIMONIALS);
  const [cmsLoaded, setCmsLoaded] = useState(false);
  const [heroBanners, setHeroBanners] = useState([]);

  useEffect(() => {
    const now = new Date();

    Promise.allSettled([
      cmsService.getLayout(),
      cmsService.getHeroBanners(),
      catalogService.getShopCategories(),
      cmsService.getThirdBanners(),
      cmsService.getProductGrids(),
      cmsService.getFooter(),
      productV2API.getAll({ limit: 10, isActive: 'true' }),
      reviewService.getFeaturedReviews(),
      cmsService.getCategoryGrids()
    ]).then(([layoutRes, heroRes, categoriesRes, thirdRes, gridRes, footerRes, prodRes, reviewRes, catGridRes]) => {
      
      if (layoutRes.status === 'fulfilled' && layoutRes.value.data) {
        setLayout((layoutRes.value.data.sections || []).sort((a,b) => a.order - b.order));
      } else {
        // Fallback layout if none exists
        setLayout([
            { id: 'navbar', visible: true, order: 1 },
            { id: 'heroBanner', visible: true, order: 2 },
            { id: 'thirdBanner', visible: true, order: 3 },
            { id: 'categoryGrid', visible: true, order: 4 },
            { id: 'productGrid', visible: true, order: 5 },
            { id: 'footer', visible: true, order: 6 },
        ]);
      }

      if (heroRes.status === 'fulfilled') {
        const heroes = heroRes.value.data || [];
        setHeroBanners(heroes);
        const active = heroes.filter(b => {
          if (!b.status) return false;
          if (b.startDate && b.endDate) {
            const start = new Date(b.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(b.endDate);
            end.setHours(23, 59, 59, 999);
            if (start > now || end < now) return false;
          }
          return true;
        });

        const flattened = active.flatMap(banner => {
          const mediaSlides = [];
          if (banner.desktopVideo || banner.mobileVideo) {
            mediaSlides.push({ ...banner, itemType: 'video', desktopUrl: getImageSrc(banner.desktopVideo), mobileUrl: getImageSrc(banner.mobileVideo) });
          } else if (banner.bannerImage || banner.mobileBanner) {
            mediaSlides.push({ ...banner, itemType: 'image', desktopUrl: getImageSrc(banner.bannerImage), mobileUrl: getImageSrc(banner.mobileBanner) });
          }
          if (banner.items && banner.items.length > 0) {
            banner.items.forEach(item => {
              mediaSlides.push({ ...banner, itemType: item.mediaType || 'image', desktopUrl: getImageSrc(item.desktopUrl), mobileUrl: getImageSrc(item.mobileUrl) });
            });
          }
          return mediaSlides.length > 0 ? mediaSlides : [{ ...banner, desktopUrl: getImageSrc(banner.bannerImage), mobileUrl: getImageSrc(banner.mobileBanner) }];
        });
        setHeroSlides(flattened.length > 0 ? flattened : FALLBACK_HERO);
      } else {
        setHeroSlides(FALLBACK_HERO);
      }

      if (categoriesRes.status === 'fulfilled') {
        const categories = categoriesRes.value.data || [];
        setShopCategories(categories);
      }

      if (thirdRes.status === 'fulfilled') {
        setThirdBanners((thirdRes.value.data || []).filter(b => b.status));
      }

      if (gridRes.status === 'fulfilled') {
        setProductGrids((gridRes.value.data || []).filter(g => g.status));
      }

      if (catGridRes?.status === 'fulfilled') {
        setCategoryGrids((catGridRes.value.data || []).filter(g => g.status));
      }

      if (footerRes.status === 'fulfilled') setFooterData(footerRes.value.data);

      if (prodRes.status === 'fulfilled') {
        const list = prodRes.value.products || prodRes.value.data || [];
        setFeaturedProducts(list.slice(0, 4));
      }

      if (reviewRes.status === 'fulfilled' && reviewRes.value?.reviews?.length > 0) {
        setFeaturedReviews(reviewRes.value.reviews);
      }

      setCmsLoaded(true);
    });
  }, []);

  const cartCount = cartItems?.reduce((acc, item) => acc + item.qty, 0) || 0;
  const wishlistCount = wishlistItems?.length || 0;

  const context = {
    user,
    heroSlides,
    heroBanners,
    shopCategories,
    thirdBanners,
    productGrids,
    categoryGrids,
    footerData,
    featuredProducts,
    featuredReviews,
    cmsLoaded,
    onNavigate,
    onAddToCart,
    onAddToWishlist,
    onLogout,
    cartCount,
    onOpenCart,
    wishlistCount,
    onOpenWishlist
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-beige/10 font-sans text-brand-dark">
      {layout.map(section => (
        <SectionRenderer key={section.id} section={section} context={context} />
      ))}
    </div>
  );
}
