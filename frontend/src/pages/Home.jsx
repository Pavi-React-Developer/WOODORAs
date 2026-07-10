import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade, EffectCreative, Navigation, Controller } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';

import { cmsService } from '../api/cmsService';
import { productV2API } from '../api/catalogV2Service';
import { catalogService } from '../api/catalogService';

// ── Fallback static data (used if CMS returns no content) ───────────────────
const FALLBACK_HERO = [
  {
    bannerImage: '/rainbow_stacker.png',
    subtitle: 'Sustainable & Timeless',
    title: 'Play that grows\nwith them.',
    description: 'Our heirloom quality wooden toys are designed to spark curiosity, creativity, and conscious growth in every child.',
    buttonText: 'Shop Collection',
    ctaURL: 'all-products',
    animation: 'Fade',
  },
  {
    bannerImage: '/wooden_train_set.png',
    subtitle: 'Crafted for Imagination',
    title: 'Adventures on\nthe right track.',
    description: 'Encourage creative storytelling and motor skills with our beautifully crafted wooden train sets.',
    buttonText: 'Shop Collection',
    ctaURL: 'all-products',
    animation: 'Fade',
  },
  {
    bannerImage: '/geometry_sorter.png',
    subtitle: 'Early Learning',
    title: 'Discover shapes\nand colors.',
    description: 'Engaging educational toys that help develop cognitive skills and problem-solving early on.',
    buttonText: 'Shop Collection',
    ctaURL: 'all-products',
    animation: 'Fade',
  },
];

const TESTIMONIALS = [
  { rating: 5, quote: "The quality is exceptional. You can feel the craftsmanship in every piece. My daughter plays with the stacking set every single day.", author: "Sarah M.", context: "Verified Buyer" },
  { rating: 5, quote: "Beautifully designed and sustainably made. It's rare to find toys that look this good in a living room while being so engaging for kids.", author: "David R.", context: "Verified Buyer" },
  { rating: 5, quote: "The personalized name puzzle was the perfect gift for my nephew. Fast shipping and the wood feels incredibly smooth and safe.", author: "Elena T.", context: "Verified Buyer" },
];

// ── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };
const cardHover = { rest: { y: 0, scale: 1 }, hover: { y: -6, scale: 1.02, transition: { duration: 0.25 } } };

// ── Stars Component ──────────────────────────────────────────────────────────
function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} className={`w-3 h-3 ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  );
}

// ── Skeleton Loader ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square bg-gray-200 rounded-xl mb-3" />
      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

function DualBannerSection({ bannerData, onNavigate }) {
  const [firstSwiper, setFirstSwiper] = useState(null);
  const [secondSwiper, setSecondSwiper] = useState(null);

  if (!bannerData || !bannerData.leftImages?.length) return null;

  // Swiper's EffectFade & EffectCreative are NOT compatible with direction="vertical"
  // So we use vertical only for Slide, horizontal for all other effects
  const isSlide = !bannerData.animation || bannerData.animation === 'Slide';
  const effectMap = { 'Fade': 'fade', 'Creative': 'creative', 'Zoom': 'creative' };
  const currentEffect = effectMap[bannerData.animation] || undefined;
  const swiperDirection = isSlide ? 'vertical' : 'horizontal';
  const creativeOptions = currentEffect === 'creative'
    ? { prev: { shadow: true, translate: ['-120%', 0, -500] }, next: { translate: ['100%', 0, 0] } }
    : undefined;

  // Per-container date scheduling
  const now = new Date();
  const checkDate = (start, end) => {
    if (!start || !end) return true; // no dates set = always show
    const s = new Date(start); s.setHours(0,0,0,0);
    const e = new Date(end); e.setHours(23,59,59,999);
    return s <= now && e >= now;
  };
  const showLeft = bannerData.status && checkDate(bannerData.leftStartDate, bannerData.leftEndDate);
  const showRight = bannerData.status && checkDate(bannerData.rightStartDate, bannerData.rightEndDate);

  if (!showLeft && !showRight) return null;

  const leftCtaLabel = bannerData.leftButtonText || 'Explore Here';
  const rightCtaLabel = bannerData.rightButtonText || 'Explore Here';
  const containerHeight = { height: '70vh', minHeight: 400, maxHeight: 600 };

  return (
    <section className="py-16 bg-[#FAFAF8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {bannerData.title && (
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center text-3xl font-serif text-brand-dark mb-12 tracking-wide">{bannerData.title}</motion.h2>
        )}
        <div className="relative">
          <div className="grid grid-cols-2 gap-4 md:gap-8">

            {/* LEFT CONTAINER */}
            <div className="overflow-hidden rounded-2xl shadow-sm relative group" style={containerHeight}>
              <Swiper
                modules={[Autoplay, Pagination, Controller, EffectFade, EffectCreative]}
                effect={currentEffect}
                creativeEffect={creativeOptions}
                onSwiper={setFirstSwiper}
                controller={{ control: secondSwiper }}
                autoplay={{ delay: 3500, disableOnInteraction: false }}
                loop={bannerData.leftImages.length > 1}
                direction={swiperDirection}
                pagination={{ clickable: true, el: '.dual-banner-pagination' }}
                className="w-full h-full"
                style={containerHeight}
              >
                {bannerData.leftImages.map((img, i) => (
                  <SwiperSlide key={i}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </SwiperSlide>
                ))}
              </Swiper>
              {/* Gradient overlay + hero-style button */}
              <div className="absolute inset-0 z-10 bg-linear-to-r from-black/55 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute inset-0 z-20 flex items-end p-8 pointer-events-none">
                <button
                  onClick={() => onNavigate && onNavigate(bannerData.leftCtaUrl || 'all-products')}
                  className="pointer-events-auto bg-white text-brand-dark text-xs font-bold px-8 py-4 uppercase tracking-widest hover:bg-brand-dark hover:text-white transition-colors"
                >
                  {leftCtaLabel} <span className="ml-1">→</span>
                </button>
              </div>
            </div>

            {/* RIGHT CONTAINER */}
            <div className="overflow-hidden rounded-2xl shadow-sm relative group" style={containerHeight}>
              <Swiper
                modules={[Controller, EffectFade, EffectCreative]}
                effect={currentEffect}
                creativeEffect={creativeOptions}
                onSwiper={setSecondSwiper}
                controller={{ control: firstSwiper }}
                loop={(bannerData.rightImages?.length || 0) > 1}
                direction={swiperDirection}
                allowTouchMove={false}
                className="w-full h-full"
                style={containerHeight}
              >
                {bannerData.rightImages?.map((img, i) => (
                  <SwiperSlide key={i}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </SwiperSlide>
                ))}
              </Swiper>
              {/* Gradient overlay + hero-style button */}
              <div className="absolute inset-0 z-10 bg-linear-to-r from-black/55 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute inset-0 z-20 flex items-end p-8 pointer-events-none">
                <button
                  onClick={() => onNavigate && onNavigate(bannerData.rightCtaUrl || 'all-products')}
                  className="pointer-events-auto bg-white text-brand-dark text-xs font-bold px-8 py-4 uppercase tracking-widest hover:bg-brand-dark hover:text-white transition-colors"
                >
                  {rightCtaLabel} <span className="ml-1">→</span>
                </button>
              </div>
            </div>

          </div>

          {/* Center Pagination Dots */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center z-30 pointer-events-none">
            <div
              className="dual-banner-pagination flex flex-col justify-center gap-3 pointer-events-auto"
              style={{ position: 'relative', top: 'auto', bottom: 'auto', left: 'auto', right: 'auto', transform: 'none', width: 'auto', height: 'auto' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Product Grid Section ─────────────────────────────────────────────────────
function ProductGridSection({ grid, onNavigate, onAddToCart, onAddToWishlist, user }) {
  if (!grid) return null;
  const safeProducts = Array.isArray(grid.products) ? grid.products.filter(Boolean) : [];
  if (!safeProducts.length) return null;
  const handleAction = (type, product, e) => {
    e.stopPropagation();
    if (!user) { alert(`Please sign in to add to ${type.toLowerCase()}.`); onNavigate('login'); return; }
    if (type === 'Cart') onAddToCart?.(product);
    else onAddToWishlist?.(product);
  };

  const mobileCount = grid.mobileCount || 2;
  const desktopCount = grid.desktopCount || 4;
  const maxCount = Math.max(mobileCount, desktopCount);

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex justify-between items-end mb-8">
            <h2 className="text-xl font-bold tracking-tight text-brand-dark">{grid.title}</h2>
            <div className="flex items-center gap-4">
              {grid.ctaText && (
                <button onClick={() => onNavigate(grid.ctaUrl || 'all-products')} className="text-[10px] font-bold uppercase tracking-widest text-brand-medium hover:text-brand-dark">
                  {grid.ctaText} &gt;
                </button>
              )}
              <div className="flex gap-2">
                <button className={`custom-prev-${grid._id} w-10 h-10 rounded-full border border-[#E6DFD4] flex items-center justify-center text-brand-dark hover:bg-[#F7F3EE] disabled:opacity-30 transition-colors shadow-sm`}>
                  &lt;
                </button>
                <button className={`custom-next-${grid._id} w-10 h-10 rounded-full border border-[#E6DFD4] flex items-center justify-center text-brand-dark hover:bg-[#F7F3EE] disabled:opacity-30 transition-colors shadow-sm`}>
                  &gt;
                </button>
              </div>
            </div>
          </motion.div>
          
            <div className="relative group px-2 md:px-4 mt-4">
              <style>{`
                .custom-pagination-${grid._id} {
                  position: relative;
                  margin-top: 2rem;
                  display: flex;
                  justify-content: center;
                  gap: 12px;
                }
                .custom-pagination-${grid._id} .swiper-pagination-bullet {
                  width: 16px; height: 16px; background: #fff; border: 1px solid #999; opacity: 1; transition: all 0.2s; border-radius: 50%;
                }
                .custom-pagination-${grid._id} .swiper-pagination-bullet-active {
                  background: #8b7355; border: 4px solid #fff; box-shadow: 0 0 0 1px #8b7355;
                }
              `}</style>
              <Swiper
                modules={[Navigation, Pagination]}
                navigation={{ nextEl: `.custom-next-${grid._id}`, prevEl: `.custom-prev-${grid._id}` }}
                pagination={{ clickable: true, el: `.custom-pagination-${grid._id}` }}
                spaceBetween={16}
                slidesPerView={mobileCount}
                breakpoints={{
                  768: { slidesPerView: desktopCount }
                }}
                className="w-full"
              >
                {safeProducts.map((p, i) => (
                  <SwiperSlide key={p._id || i}>
                    <motion.div variants={fadeUp} initial="rest" whileHover="hover"
                      animate="rest" onClick={() => onNavigate('product-detail', p)}
                      className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-[#E6DFD4] shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-square bg-[#F7F3EE] p-4 relative overflow-hidden">
                        {(() => {
                          let imgSrc = p.images?.find(img => img.isThumbnail)?.url || p.images?.[0]?.url || (typeof p.images?.[0] === 'string' ? p.images[0] : null) || p.image || null;
                          if (imgSrc && imgSrc.startsWith('/uploads')) imgSrc = `http://localhost:5000${imgSrc}`;
                          
                          return imgSrc ? (
                            <motion.img
                              src={imgSrc}
                              alt={p.name}
                              className="w-full h-full object-contain mix-blend-multiply"
                              variants={{ rest: { scale: 1 }, hover: { scale: 1.08 } }}
                              transition={{ duration: 0.35 }}
                              onError={e => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#C8B9A0]">
                              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                          );
                        })()}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-end justify-center pb-3 gap-2 opacity-0 group-hover:opacity-100">
                          <button onClick={e => handleAction('Cart', p, e)} className="bg-brand-dark text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-black transition-colors">Add to Cart</button>
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-medium text-brand-dark truncate">{p.name || 'Untitled Product'}</h3>
                        <p className="text-sm text-brand-medium mt-0.5">₹{Number(p.price || 0).toFixed(2)}</p>
                      </div>
                    </motion.div>
                  </SwiperSlide>
                ))}
              </Swiper>
              <div className={`custom-pagination-${grid._id}`} />
            </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Category Products ────────────────────────────────────────────────────────
function CategoryProductsSection({ onNavigate, onAddToCart, user }) {
  const [cmsSections, setCmsSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cmsService.getCategoryGrids()
      .then((res) => {
        const sections = (res.data || []).filter((item) => item.status !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setCmsSections(sections);
        if (sections.length) setActiveSection(sections[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !cmsSections.length) return null;

  const activeProducts = Array.isArray(activeSection?.products) ? activeSection.products : [];
  const activeImage = activeSection?.images?.find((image) => image.isThumbnail)?.url || activeSection?.images?.[0]?.url || '';
  const animationVariant = activeSection?.animation === 'slide' ? { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 } } : activeSection?.animation === 'zoom' ? { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 } } : { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

  return (
    <section className="py-16 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-dark">Shop by Category</h2>
              <p className="text-xs text-brand-medium mt-1">Tap a category to explore.</p>
            </div>
            <button onClick={() => onNavigate('all-products')} className="text-[10px] font-bold uppercase tracking-widest text-brand-medium hover:text-brand-dark">View All &gt;</button>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
            <div className="space-y-3">
              {cmsSections.map((section) => (
                <button
                  key={section._id}
                  onClick={() => setActiveSection(section)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${activeSection?._id === section._id ? 'bg-brand-dark text-white border-brand-dark shadow' : 'bg-[#FDFCFB] border-[#E6DFD4] text-brand-dark hover:border-brand-dark'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-xl bg-[#F7F3EE] shrink-0">
                      {section.images?.[0]?.url ? <img src={section.images[0].url} alt={section.title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[10px] text-brand-medium">IMG</div>}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{section.title}</p>
                      <p className="text-xs mt-1 opacity-80">{section.category?.name || 'Category'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection?._id}
                initial={animationVariant.initial}
                animate={animationVariant.animate}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-6 rounded-3xl border border-[#E6DFD4] bg-[#FDFCFB] p-4 sm:p-6"
              >
                <div className="relative overflow-hidden rounded-2xl bg-[#F7F3EE] min-h-70">
                  {activeSection?.images?.length ? (
                    <div className="absolute inset-0">
                      <motion.img
                        key={activeImage}
                        src={activeImage}
                        alt={activeSection.title}
                        className="w-full h-full object-cover"
                        initial={{ opacity: 0, scale: 1.03 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35 }}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-brand-medium">No image</div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                    <p className="text-xs uppercase tracking-[0.3em] opacity-80">{activeSection?.category?.name || 'Featured'}</p>
                    <h3 className="text-xl font-semibold mt-2">{activeSection?.title}</h3>
                    {activeSection?.ctaText && (
                      <button onClick={() => activeSection?.ctaUrl && onNavigate(activeSection.ctaUrl)} className="mt-4 inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-dark">
                        {activeSection.ctaText}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-brand-dark">{activeSection?.category?.name || 'Category Products'}</p>
                      <p className="text-xs text-brand-medium">{activeProducts.length} products in this collection</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {activeProducts.length ? activeProducts.slice(0, 4).map((product) => (
                      <div key={product._id} className="group cursor-pointer" onClick={() => onNavigate('product-detail', product)}>
                        <div className="aspect-square bg-white rounded-xl overflow-hidden mb-2 relative border border-[#E6DFD4]">
                          <img src={product.images?.find((image) => image.isThumbnail)?.url || product.images?.[0]?.url || product.image || ''} alt={product.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.target.style.display = 'none'; }} />
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-end justify-center pb-3 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); if (!user) { onNavigate('login'); return; } onAddToCart?.(product); }} className="bg-brand-dark text-white text-[9px] uppercase tracking-widest font-bold px-3 py-1.5">Add to Cart</button>
                          </div>
                        </div>
                        <h3 className="text-sm font-medium text-brand-dark truncate">{product.name}</h3>
                        <p className="text-xs text-brand-medium">₹{Number(product.price || 0).toFixed(2)}</p>
                      </div>
                    )) : <div className="col-span-2 rounded-xl border border-dashed border-[#E6DFD4] p-6 text-sm text-brand-medium">No products selected for this category yet.</div>}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Main Home Component ──────────────────────────────────────────────────────
export default function Home({ user, onNavigate, onAddToCart, onAddToWishlist }) {
  const [heroSlides, setHeroSlides] = useState([]);
  const [thirdBanners, setThirdBanners] = useState([]);
  const [productGrids, setProductGrids] = useState([]);
  const [footerData, setFooterData] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [cmsLoaded, setCmsLoaded] = useState(false);

  useEffect(() => {
    const now = new Date();

    Promise.allSettled([
      cmsService.getHeroBanners(),
      cmsService.getThirdBanners(),
      cmsService.getProductGrids(),
      cmsService.getFooter(),
      productV2API.getAll({ limit: 4, isActive: 'true' }),
    ]).then(([heroRes, thirdRes, gridRes, footerRes, prodRes]) => {
      // Hero banners — filter by date scheduling and status
      if (heroRes.status === 'fulfilled') {
        const active = (heroRes.value.data || []).filter(b => {
          if (!b.status) return false;
          const start = new Date(b.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(b.endDate);
          end.setHours(23, 59, 59, 999);
          return start <= now && end >= now;
        });
        setHeroSlides(active.length > 0 ? active : FALLBACK_HERO);
      } else {
        setHeroSlides(FALLBACK_HERO);
      }

      if (thirdRes.status === 'fulfilled') {
        const active = (thirdRes.value.data || []).filter(b => b.status);
        setThirdBanners(active);
      }

      if (gridRes.status === 'fulfilled') {
        setProductGrids((gridRes.value.data || []).filter(g => g.status));
      }

      if (footerRes.status === 'fulfilled') setFooterData(footerRes.value.data);

      if (prodRes.status === 'fulfilled') {
        const list = prodRes.value.products || prodRes.value.data || [];
        setFeaturedProducts(list.slice(0, 4));
      }

      setCmsLoaded(true);
    });
  }, []);

  const handleAction = (type, product) => {
    if (!user) { alert(`Please sign in to add to ${type.toLowerCase()}.`); onNavigate('login'); return; }
    if (type === 'Cart') onAddToCart?.(product);
    else onAddToWishlist?.(product);
  };

  return (
    <div className="bg-brand-light font-sans text-brand-dark">

      {/* ── HERO BANNER SLIDER ── */}
      <section className="relative w-full h-[90vh] min-h-150 overflow-hidden bg-brand-dark">
        <Swiper
          modules={[Autoplay, Pagination, EffectFade, EffectCreative]}
          effect="fade"
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true, el: '.hero-dots' }}
          loop={heroSlides.length > 1}
          className="w-full h-full"
        >
          {heroSlides.map((slide, i) => (
            <SwiperSlide key={i}>
              <div className="relative w-full h-full">
                <img src={slide.bannerImage} alt={slide.title}
                  className="w-full h-full object-cover object-center brightness-90"
                  onError={e => { e.target.style.display='none'; e.target.parentElement.style.background='#2C1A0E'; }} />
                <div className="absolute inset-0 bg-linear-to-r from-black/60 via-black/25 to-transparent" />
                <div className="absolute inset-0 flex items-center">
                  <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
                    <motion.div
                      initial={{ opacity: 0, x: -40 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="max-w-xl"
                    >
                      {slide.subtitle && (
                        <p className="text-[11px] font-bold tracking-[0.25em] text-white/80 uppercase mb-4">{slide.subtitle}</p>
                      )}
                      <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium text-white leading-[1.08] tracking-tight mb-6 whitespace-pre-line">
                        {slide.title}
                      </h1>
                      {slide.description && (
                        <p className="text-white/80 text-sm md:text-base leading-relaxed mb-10 max-w-md font-light">{slide.description}</p>
                      )}
                      <motion.button
                        onClick={() => onNavigate(slide.ctaURL || 'all-products')}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        className="bg-white text-brand-dark text-xs font-bold px-8 py-4 uppercase tracking-widest hover:bg-brand-beige transition-colors"
                      >
                        {slide.buttonText || 'Shop Collection'} <span className="ml-1">→</span>
                      </motion.button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="hero-dots absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2" />
      </section>

      {/* ── SHOP BY AGE RIBBON ── */}
      <section className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x divide-gray-200">
          <div className="py-4 md:py-6 md:pr-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-full md:w-auto text-center md:text-left">Shop By Age</div>
          <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 text-center">
            {['0-6 Months','6-12 Months','1-2 Years','3+ Years'].map((label, i) => {
              const [num, unit] = label.split(' ');
              return (
                <motion.button key={i} whileHover={{ backgroundColor: '#F9F7F4' }}
                  className="py-4 md:py-6 group transition-colors">
                  <span className="block text-sm font-bold text-brand-dark">{num}</span>
                  <span className="block text-[9px] text-brand-medium uppercase tracking-widest mt-1">{unit}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ── */}
      <section id="trending" className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-brand-dark">Trending Sets</h2>
                <p className="text-xs text-brand-medium mt-1">Chosen by parents this week.</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => onNavigate('all-products')} className="text-[10px] font-bold uppercase tracking-widest text-brand-medium hover:text-brand-dark">View All &gt;</button>
                <div className="flex gap-2">
                  <button className="trending-prev w-10 h-10 rounded-full border border-[#E6DFD4] flex items-center justify-center text-brand-dark hover:bg-[#F7F3EE] disabled:opacity-30 transition-colors shadow-sm">
                    &lt;
                  </button>
                  <button className="trending-next w-10 h-10 rounded-full border border-[#E6DFD4] flex items-center justify-center text-brand-dark hover:bg-[#F7F3EE] disabled:opacity-30 transition-colors shadow-sm">
                    &gt;
                  </button>
                </div>
              </div>
            </motion.div>
            <div className="relative group px-2 md:px-4 mt-4">
              <style>{`
                .trending-pagination {
                  position: relative;
                  margin-top: 2rem;
                  display: flex;
                  justify-content: center;
                  gap: 12px;
                }
                .trending-pagination .swiper-pagination-bullet {
                  width: 16px; height: 16px; background: #fff; border: 1px solid #999; opacity: 1; transition: all 0.2s; border-radius: 50%;
                }
                .trending-pagination .swiper-pagination-bullet-active {
                  background: #8b7355; border: 4px solid #fff; box-shadow: 0 0 0 1px #8b7355;
                }
              `}</style>
              <Swiper
                modules={[Navigation, Pagination]}
                navigation={{ nextEl: '.trending-next', prevEl: '.trending-prev' }}
                pagination={{ clickable: true, el: '.trending-pagination' }}
                spaceBetween={24}
                slidesPerView={1}
                breakpoints={{
                  640: { slidesPerView: 2 },
                  1024: { slidesPerView: 4 }
                }}
                className="w-full"
              >
                {!cmsLoaded ? [1,2,3,4].map(i => <SwiperSlide key={i}><SkeletonCard /></SwiperSlide>) :
                  featuredProducts.map((p) => (
                    <SwiperSlide key={p._id || p.id}>
                      <motion.div
                        variants={fadeUp}
                        initial="rest" whileHover="hover" animate="rest"
                        className="group relative cursor-pointer"
                        onClick={() => onNavigate('product-detail', p)}
                      >
                        <div className="aspect-square bg-[#F8F8F8] p-4 relative mb-4 overflow-hidden">
                          {(() => {
                            let imgSrc = p.images?.find(img => img.isThumbnail)?.url || p.images?.[0]?.url || (typeof p.images?.[0] === 'string' ? p.images[0] : null) || p.image || '/wooden_train_set.png';
                            if (imgSrc && imgSrc.startsWith('/uploads')) imgSrc = `http://localhost:5000${imgSrc}`;
                            return (
                              <motion.img
                                src={imgSrc}
                                alt={p.name}
                                className="w-full h-full object-contain mix-blend-multiply"
                                variants={{ rest: { scale: 1 }, hover: { scale: 1.07 } }}
                                transition={{ duration: 0.3 }}
                                onError={e => e.target.style.display='none'}
                              />
                            );
                          })()}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-end justify-center pb-4 gap-2 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); handleAction('Cart', p); }}
                              className="bg-white text-brand-dark text-[10px] font-bold uppercase tracking-widest px-4 py-2 hover:bg-brand-dark hover:text-white transition-colors shadow-sm">Add to Cart</button>
                            <button onClick={e => { e.stopPropagation(); handleAction('Wishlist', p); }}
                              className="bg-white text-brand-dark p-2 hover:bg-gray-100 transition-colors shadow-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm text-brand-dark font-medium">{p.name}</h3>
                            <p className="text-sm text-brand-medium mt-1">₹{p.price?.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-1 bg-[#F9F9F9] px-1.5 py-0.5 rounded">
                            <svg className="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                            <span className="text-[10px] text-brand-medium">4.9</span>
                          </div>
                        </div>
                      </motion.div>
                    </SwiperSlide>
                  ))
                }
              </Swiper>
              <div className="trending-pagination" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── THIRD BANNER (DUAL SLIDER) ── */}
      {thirdBanners.map(banner => (
        <DualBannerSection key={banner._id} bannerData={banner} onNavigate={onNavigate} />
      ))}

      {/* ── DYNAMIC PRODUCT GRIDS FROM CMS ── */}
      {productGrids.map(grid => (
        <ProductGridSection key={grid._id} grid={grid} onNavigate={onNavigate}
          onAddToCart={onAddToCart} onAddToWishlist={onAddToWishlist} user={user} />
      ))}

      {/* ── CATEGORY-BASED PRODUCTS ── */}
      <CategoryProductsSection onNavigate={onNavigate} onAddToCart={onAddToCart} user={user} />

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center mb-12">
            <h2 className="text-2xl font-serif text-brand-dark">What Parents Love</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} variants={fadeUp} whileHover={{ y: -4 }}
                className="bg-white border border-gray-100 p-8 flex flex-col justify-between rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <div className="mb-4"><Stars rating={t.rating} /></div>
                  <p className="text-sm italic text-brand-dark leading-relaxed">"{t.quote}"</p>
                </div>
                <div className="flex items-center gap-3 mt-8">
                  <div className="w-9 h-9 bg-[#E6DFD4] rounded-full flex items-center justify-center text-xs font-bold text-brand-dark">
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-brand-dark">{t.author}</p>
                    <p className="text-[9px] text-brand-medium">{t.context}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── NEWSLETTER ── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="bg-linear-to-br from-[#2C1A0E] to-[#4A2C17] rounded-3xl p-12 text-center max-w-4xl mx-auto">
          <h2 className="text-2xl font-serif text-white mb-3">Join the WoodenToys Family</h2>
          <p className="text-white/70 text-sm max-w-md mx-auto mb-8">
            {footerData?.description || 'Get early access to new collections, gift guides, and stories about mindful parenting.'}
          </p>
          <form className="max-w-md mx-auto flex" onSubmit={(e) => { e.preventDefault(); alert('Subscribed!'); }}>
            <input type="email" placeholder="Email Address" required
              className="flex-1 px-4 py-3 text-sm focus:outline-none border-none rounded-l-xl" />
            <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="bg-white text-brand-dark px-6 py-3 text-[10px] font-bold tracking-widest uppercase rounded-r-xl">
              Subscribe
            </motion.button>
          </form>
        </motion.div>
      </section>

    </div>
  );
}
