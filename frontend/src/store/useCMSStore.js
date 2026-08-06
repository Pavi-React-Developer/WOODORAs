import { create } from 'zustand';
import { cmsService } from '../api/cmsService';
import { productV2API } from '../api/catalogV2Service';
import { catalogService } from '../api/catalogService';
import { reviewService } from '../api/reviewService';
import { getImageSrc } from '../utils/imageUtils';

const useCMSStore = create((set, get) => ({
  cmsData: null,
  isLoading: false,
  isLoaded: false,
  error: null,

  fetchCMSData: async (force = false) => {
    if (get().isLoaded && !force) return; // Don't fetch if already loaded
    if (get().isLoading) return; // Prevent concurrent fetches

    set({ isLoading: true, error: null });

    try {
      const now = new Date();
      const [layoutRes, heroRes, categoriesRes, thirdRes, gridRes, footerRes, prodRes, reviewRes, catGridRes, catsGridsRes] = await Promise.allSettled([
        cmsService.getLayout(),
        cmsService.getHeroBanners(),
        catalogService.getShopCategories(),
        cmsService.getThirdBanners(),
        cmsService.getProductGrids(),
        cmsService.getFooter(),
        productV2API.getAll({ limit: 10, isActive: 'true' }),
        reviewService.getFeaturedReviews(),
        cmsService.getCategoryGrids(),
        cmsService.getCategoriesGrids()
      ]);

      let layout = [];
      if (layoutRes.status === 'fulfilled' && layoutRes.value.data) {
        layout = (layoutRes.value.data.sections || []).sort((a,b) => a.order - b.order);
      } else {
        layout = [
            { id: 'navbar', visible: true, order: 1 },
            { id: 'heroBanner', visible: true, order: 2 },
            { id: 'thirdBanner', visible: true, order: 3 },
            { id: 'categoryGrid', visible: true, order: 4 },
            { id: 'categoriesGrid', visible: true, order: 5 },
            { id: 'productGrid', visible: true, order: 6 },
            { id: 'footer', visible: true, order: 7 },
        ];
      }

      let heroBanners = [];
      let heroSlides = [];
      if (heroRes.status === 'fulfilled') {
        const heroes = heroRes.value.data || [];
        heroBanners = heroes;
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

        heroSlides = active.flatMap(banner => {
          const mediaSlides = [];
          if (banner.desktopVideo || banner.mobileVideo) {
            mediaSlides.push({ ...banner, itemType: 'video', desktopUrl: getImageSrc(banner.desktopVideo), mobileUrl: getImageSrc(banner.mobileVideo) });
          } else if (banner.bannerImage || banner.mobileBanner) {
            mediaSlides.push({ ...banner, itemType: 'image', desktopUrl: getImageSrc(banner.bannerImage), mobileUrl: getImageSrc(banner.mobileBanner) });
          }
          return mediaSlides;
        });

        if (heroSlides.length === 0) {
           heroSlides = [];
        }
      }

      let shopCategories = [];
      if (categoriesRes.status === 'fulfilled') {
        shopCategories = (categoriesRes.value.data || []).filter(c => c.isActive);
      }

      let thirdBanners = [];
      if (thirdRes.status === 'fulfilled') {
        thirdBanners = (thirdRes.value.data || []).filter(b => b.status);
      }

      let productGrids = [];
      if (gridRes.status === 'fulfilled') {
        productGrids = (gridRes.value.data || []).filter(g => g.status);
      }

      let categoryGrids = [];
      if (catGridRes?.status === 'fulfilled') {
        categoryGrids = (catGridRes.value.data || []).filter(g => g.status);
      }

      let categoriesGrids = [];
      if (catsGridsRes?.status === 'fulfilled') {
        categoriesGrids = (catsGridsRes.value.data || []).filter(g => g.status);
      }

      let footerData = null;
      if (footerRes.status === 'fulfilled') {
        footerData = footerRes.value.data;
      }

      let featuredProducts = [];
      if (prodRes.status === 'fulfilled') {
        const list = prodRes.value.products || prodRes.value.data || [];
        featuredProducts = list.slice(0, 4);
      }

      let featuredReviews = [
        { rating: 5, quote: "The quality is exceptional. You can feel the craftsmanship in every piece.", author: "Sarah M.", context: "Verified Buyer" }
      ];
      if (reviewRes.status === 'fulfilled' && reviewRes.value?.reviews?.length > 0) {
        featuredReviews = reviewRes.value.reviews;
      }

      set({
        cmsData: {
          layout,
          heroBanners,
          heroSlides,
          shopCategories,
          thirdBanners,
          productGrids,
          categoryGrids,
          categoriesGrids,
          footerData,
          featuredProducts,
          featuredReviews
        },
        isLoading: false,
        isLoaded: true
      });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  }
}));

export default useCMSStore;
