import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade, EffectCreative, Navigation, Controller } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import { ChevronLeft, ChevronRight, Leaf, Sun, Truck, Package, ShieldCheck, Banknote } from 'lucide-react';

import { cmsService } from '../api/cmsService';
import { productV2API } from '../api/catalogV2Service';
import { catalogService } from '../api/catalogService';
import { reviewService } from '../api/reviewService';
import { getImageSrc } from '../utils/imageUtils';

// ── Fallback static data (used if CMS returns no content) ───────────────────
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
  {
    bannerImage: '/hero3.jpeg',
    subtitle: 'Early Learning',
    title: 'Discover shapes\nand colors.',
    description: 'Engaging educational toys that help develop cognitive skills and problem-solving early on.',
    buttonText: 'Shop Collection',
    ctaURL: '/',
    animation: 'Fade',
  },
  {
    bannerImage: '/hero4.jpeg',
    subtitle: 'Natural Materials',
    title: 'Joy in every\nlittle piece.',
    description: 'Safe, non-toxic finishes and smooth wooden textures for worry-free playtime.',
    buttonText: 'Shop Collection',
    ctaURL: '/',
    animation: 'Fade',
  },
];

const TESTIMONIALS = [
  { rating: 5, quote: "The quality is exceptional. You can feel the craftsmanship in every piece. My daughter plays with the stacking set every single day.", author: "Sarah M.", context: "Verified Buyer" },
  { rating: 5, quote: "Beautifully designed and sustainably made. It's rare to find toys that look this good in a living room while being so engaging for kids.", author: "David R.", context: "Verified Buyer" },
  { rating: 5, quote: "The personalized name puzzle was the perfect gift for my nephew. Fast shipping and the wood feels incredibly smooth and safe.", author: "Elena T.", context: "Verified Buyer" },
];

// Static fallback categories (used if API returns no content)
const FALLBACK_SHOP_CATEGORIES = [
  { title: "Baby & Toddlers", subtitle: "0-3 Years", image: "/WhatsApp Image 2026-07-13 at 7.46.53 PM.jpeg" },
  { title: "Pretend Play", subtitle: "3-6 Years", image: "/WhatsApp Image 2026-07-13 at 7.47.29 PM.jpeg" },
  { title: "Building &\nConstruction", subtitle: "3-8 Years", image: "/WhatsApp Image 2026-07-13 at 7.48.05 PM.jpeg" },
  { title: "Puzzles & Games", subtitle: "4-10 Years", image: "/WhatsApp Image 2026-07-13 at 7.51.25 PM.jpeg" },
  { title: "Educational Toys", subtitle: "All Ages", image: "/WhatsApp Image 2026-07-13 at 7.43.27 PM.jpeg" },
  { title: "All Toys", subtitle: "View All", image: "/WhatsApp Image 2026-07-13 at 7.46.10 PM.jpeg" },
];

const getPricingInfo = (source = {}) => {
  const listPrice = Number(source.compareAtPrice ?? source.basePrice ?? source.effectivePrice ?? source.price ?? 0);
  const salePriceCandidate = source.discountPrice !== null && source.discountPrice !== undefined && source.discountPrice !== ''
    ? Number(source.discountPrice)
    : NaN;
  const salePrice = Number.isFinite(salePriceCandidate) && salePriceCandidate > 0
    ? salePriceCandidate
    : Number(source.basePrice ?? source.effectivePrice ?? source.price ?? 0);
  const effectiveListPrice = listPrice > 0 ? listPrice : salePrice;
  const hasDiscount = salePrice > 0 && effectiveListPrice > 0 && salePrice < effectiveListPrice;
  const discountPercent = hasDiscount ? Math.round((1 - salePrice / effectiveListPrice) * 100) : 0;
  return { salePrice, listPrice: effectiveListPrice, hasDiscount, discountPercent };
};

// ── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } };
const scaleUp = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 15 } } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };
const cardHover = { rest: { y: 0, scale: 1 }, hover: { y: -6, scale: 1.02, transition: { duration: 0.25 } } };

const starContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};
const starVariants = {
  hidden: { scale: 0, opacity: 0, rotate: -45 },
  visible: { scale: 1, opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } }
};

// ── Stars Component ──────────────────────────────────────────────────────────
function Stars({ rating }) {
  return (
    <motion.div className="flex gap-0.5" variants={starContainerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      {[1,2,3,4,5].map(s => (
        <motion.svg variants={starVariants} key={s} className={`w-3 h-3 ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </motion.svg>
      ))}
    </motion.div>
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
    <section className="py-16 bg-[#FDF9F1]">
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
                    <img src={img || '/wood-placeholder.png'} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = '/wood-placeholder.png'; }} />
                  </SwiperSlide>
                ))}
              </Swiper>
              {/* Gradient overlay + hero-style button */}
              <div className="absolute inset-0 z-10 bg-linear-to-r from-black/55 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute inset-0 z-20 flex items-end p-8 pointer-events-none">
                <button
                  onClick={() => onNavigate && onNavigate(bannerData.leftCtaUrl || '/')}
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
                    <img src={img || '/wood-placeholder.png'} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = '/wood-placeholder.png'; }} />
                  </SwiperSlide>
                ))}
              </Swiper>
              {/* Gradient overlay + hero-style button */}
              <div className="absolute inset-0 z-10 bg-linear-to-r from-black/55 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute inset-0 z-20 flex items-end p-8 pointer-events-none">
                <button
                  onClick={() => onNavigate && onNavigate(bannerData.rightCtaUrl || '/')}
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
    if (!user) { alert(`Please sign in to add to ${type.toLowerCase()}.`); onNavigate('/login'); return; }
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
                <button onClick={() => onNavigate(grid.ctaUrl || '/')} className="text-[10px] font-bold uppercase tracking-widest text-brand-medium hover:text-brand-dark">
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
                      animate="rest" onClick={() => onNavigate(`/product/${p._id}`)}
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
                        {(() => {
                          const pricing = getPricingInfo(p);
                          return (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-brand-medium mt-0.5">₹{pricing.salePrice.toFixed(2)}</p>
                                {pricing.hasDiscount && (
                                  <p className="text-[10px] text-brand-medium line-through">₹{pricing.listPrice.toFixed(2)}</p>
                                )}
                              </div>
                              {pricing.hasDiscount && (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                                  -{pricing.discountPercent}%
                                </span>
                              )}
                            </div>
                          );
                        })()}
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
    <section className="py-16 border-y border-[#EFE5DA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-dark">Shop by Category</h2>
              <p className="text-xs text-brand-medium mt-1">Tap a category to explore.</p>
            </div>
            <button onClick={() => onNavigate('/')} className="text-[10px] font-bold uppercase tracking-widest text-brand-medium hover:text-brand-dark">View All &gt;</button>
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
                      <div key={product._id} className="group cursor-pointer" onClick={() => onNavigate(`/product/${product._id}`)}>
                        <div className="aspect-square bg-white rounded-xl overflow-hidden mb-2 relative border border-[#E6DFD4]">
                          <img src={product.images?.find((image) => image.isThumbnail)?.url || product.images?.[0]?.url || (product.image && product.image.trim() !== '' ? product.image : '') || '/wood-placeholder.png'} alt={product.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.target.src = '/wood-placeholder.png'; }} />
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-end justify-center pb-3 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); if (!user) { onNavigate('/login'); return; } onAddToCart?.(product); }} className="bg-brand-dark text-white text-[9px] uppercase tracking-widest font-bold px-3 py-1.5">Add to Cart</button>
                          </div>
                        </div>
                        <h3 className="text-sm font-medium text-brand-dark truncate">{product.name}</h3>
                        {(() => {
                          const pricing = getPricingInfo(product);
                          return (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-brand-medium">₹{pricing.salePrice.toFixed(2)}</p>
                                {pricing.hasDiscount && (
                                  <p className="text-[10px] text-brand-medium line-through">₹{pricing.listPrice.toFixed(2)}</p>
                                )}
                              </div>
                              {pricing.hasDiscount && (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                                  -{pricing.discountPercent}%
                                </span>
                              )}
                            </div>
                          );
                        })()}
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
  const [shopCategories, setShopCategories] = useState([]);
  const [thirdBanners, setThirdBanners] = useState([]);
  const [productGrids, setProductGrids] = useState([]);
  const [footerData, setFooterData] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredReviews, setFeaturedReviews] = useState(TESTIMONIALS);
  const [cmsLoaded, setCmsLoaded] = useState(false);

  useEffect(() => {
    const now = new Date();

    Promise.allSettled([
      cmsService.getHeroBanners(),
      catalogService.getShopCategories(),
      cmsService.getThirdBanners(),
      cmsService.getProductGrids(),
      cmsService.getFooter(),
      productV2API.getAll({ limit: 4, isActive: 'true' }),
      reviewService.getFeaturedReviews(),
    ]).then(([heroRes, categoriesRes, thirdRes, gridRes, footerRes, prodRes, reviewRes]) => {
      // Hero banners — filter by date scheduling and status
      if (heroRes.status === 'fulfilled') {
        const active = (heroRes.value.data || []).filter(b => {
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

        // Flatten banners to support multiple images/videos per banner
        const flattened = active.flatMap(banner => {
          const mediaSlides = [];
          
          // Legacy check
          if (banner.desktopVideo || banner.mobileVideo) {
            mediaSlides.push({ ...banner, itemType: 'video', desktopUrl: getImageSrc(banner.desktopVideo), mobileUrl: getImageSrc(banner.mobileVideo) });
          } else if (banner.bannerImage || banner.mobileBanner) {
            mediaSlides.push({ ...banner, itemType: 'image', desktopUrl: getImageSrc(banner.bannerImage), mobileUrl: getImageSrc(banner.mobileBanner) });
          }

          // New dynamic items
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

      // Fetch shop categories dynamically
      if (categoriesRes.status === 'fulfilled') {
        const categories = categoriesRes.value.data || [];
        if (categories.length > 0) {
          setShopCategories(categories);
        } else {
          setShopCategories([]);
        }
      } else {
        setShopCategories([]);
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

      if (reviewRes.status === 'fulfilled' && reviewRes.value?.reviews?.length > 0) {
        setFeaturedReviews(reviewRes.value.reviews);
      }

      setCmsLoaded(true);
    });
  }, []);

  const handleAction = (type, product) => {
    if (!user) { alert(`Please sign in to add to ${type.toLowerCase()}.`); onNavigate('/login'); return; }
    if (type === 'Cart') onAddToCart?.(product);
    else onAddToWishlist?.(product);
  };

  return (
    <div className="bg-[#FDF9F1] font-sans text-brand-dark">

      {/* ── HERO BANNER SLIDER ── */}
      <section className="relative w-full h-[90vh] min-h-150 overflow-hidden bg-brand-dark group">
        <Swiper
          modules={[Autoplay, Pagination, EffectFade, EffectCreative, Navigation]}
          effect="fade"
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true, el: '.hero-dots' }}
          navigation={{ prevEl: '.hero-prev', nextEl: '.hero-next' }}
          loop={heroSlides.length > 1}
          className="w-full h-full"
        >
          {heroSlides.map((slide, i) => (
            <SwiperSlide key={i}>
              <div className="relative w-full h-full">
                {(() => {
                  const isDesktopVid = slide.desktopUrl && slide.desktopUrl.match(/\.(mp4|webm)$/i);
                  const isMobileVid = slide.mobileUrl && slide.mobileUrl.match(/\.(mp4|webm)$/i);
                  
                  return (
                    <>
                      {/* Desktop Render */}
                      {slide.desktopUrl && (
                        isDesktopVid ? (
                          <video 
                            src={slide.desktopUrl} 
                            className={`w-full h-full object-cover object-center brightness-90 ${slide.mobileUrl ? 'hidden md:block' : ''}`}
                            autoPlay muted loop playsInline
                          />
                        ) : (
                          <img src={slide.desktopUrl} alt={slide.title}
                            className={`w-full h-full object-cover object-center brightness-90 ${slide.mobileUrl ? 'hidden md:block' : ''}`}
                            onError={e => { e.target.src = '/wood-placeholder.png'; }} />
                        )
                      )}
                      
                      {/* Mobile Render */}
                      {slide.mobileUrl && (
                        isMobileVid ? (
                          <video 
                            src={slide.mobileUrl} 
                            className={`w-full h-full object-cover object-center brightness-90 ${slide.desktopUrl ? 'block md:hidden' : ''}`}
                            autoPlay muted loop playsInline
                          />
                        ) : (
                          <img src={slide.mobileUrl} alt={slide.title}
                            className={`w-full h-full object-cover object-center brightness-90 ${slide.desktopUrl ? 'block md:hidden' : ''}`}
                            onError={e => { e.target.src = '/wood-placeholder.png'; }} />
                        )
                      )}

                      {/* Fallback Render */}
                      {(!slide.desktopUrl && !slide.mobileUrl) && (
                        <img src={slide.bannerImage || '/wood-placeholder.png'} alt={slide.title}
                          className="w-full h-full object-cover object-center brightness-90"
                          onError={e => { e.target.src = '/wood-placeholder.png'; }} />
                      )}
                    </>
                  );
                })()}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        
        {/* Navigation Arrows */}
        <button type="button" className="hero-prev absolute top-1/2 left-4 z-20 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur transition-all md:opacity-0 md:group-hover:opacity-100">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button type="button" className="hero-next absolute top-1/2 right-4 z-20 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur transition-all md:opacity-0 md:group-hover:opacity-100">
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Radio button style pagination dots */}
        <div className="hero-dots absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3" />
      </section>

      {/* ── SHOP BY CATEGORIES ── */}
      {shopCategories.length > 0 && (
      <section className="py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Heading slides in from top */}
          <motion.div
            className="flex items-center justify-center gap-4 mb-12"
            initial={{ opacity: 0, y: -30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#D4C3A3]">
              <path d="M2 10C10 10 18 5 28 10C32 12 36 12 38 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M14 8C11 2 5 2 5 10C11 10 14 8 14 8Z" fill="currentColor" opacity="0.8"/>
              <path d="M24 8C21 2 15 2 15 10C21 10 24 8 24 8Z" fill="currentColor" opacity="0.5"/>
            </svg>
            <h2 className="text-3xl font-serif text-[#4A5441] tracking-wide">Shop by Categories</h2>
            <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#D4C3A3] transform scale-x-[-1]">
              <path d="M2 10C10 10 18 5 28 10C32 12 36 12 38 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M14 8C11 2 5 2 5 10C11 10 14 8 14 8Z" fill="currentColor" opacity="0.8"/>
              <path d="M24 8C21 2 15 2 15 10C21 10 24 8 24 8Z" fill="currentColor" opacity="0.5"/>
            </svg>
          </motion.div>

          {/* Cards slide in from left with stagger */}
          <motion.div
            className="relative group px-10 md:px-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.12 } }
            }}
          >
            <Swiper
              modules={[Navigation]}
              navigation={{ nextEl: '.cat-next', prevEl: '.cat-prev' }}
              spaceBetween={24}
              slidesPerView={1.2}
              breakpoints={{
                480: { slidesPerView: 2 },
                768: { slidesPerView: 3 },
                1024: { slidesPerView: 4 },
                1280: { slidesPerView: 4.5 },
              }}
            >
              {shopCategories.map((cat, i) => (
                <SwiperSlide key={i}>
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, x: -80 },
                      visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: 'easeOut' } }
                    }}
                    onClick={() => {
                      const catId = cat._id || cat.id;
                      if (catId) {
                        onNavigate(`/shop?category=${catId}`);
                      } else {
                        onNavigate(`/shop`);
                      }
                    }}
                    className="group cursor-pointer flex flex-col rounded-[24px] border border-[#E9DED3] bg-white overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="aspect-square w-full overflow-hidden">
                      <img
                        src={cat.image || cat.imageUrl}
                        alt={cat.title || cat.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={e => { e.target.src = '/wood-placeholder.png'; }}
                      />
                    </div>
                    <div className="flex flex-col items-center justify-center py-3 text-center">
                      <h3 className="text-sm font-bold text-[#141225] mb-1">{cat.title || cat.name}</h3>
                      <p className="text-[11px] text-[#8A817C]">View All</p>
                    </div>
                  </motion.div>
                </SwiperSlide>
              ))}
            </Swiper>
            <button type="button" className="cat-prev absolute top-1/2 left-0 z-10 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-[#767676] hover:bg-[#555555] text-white rounded-full transition-colors shadow-md">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" className="cat-next absolute top-1/2 right-0 z-10 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-[#767676] hover:bg-[#555555] text-white rounded-full transition-colors shadow-md">
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </section>
      )}


      {/* ── BEST SELLERS ── */}
      <section id="trending" className="py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.1 }} variants={stagger}>
            
            {/* Header */}
            <motion.div
              className="flex justify-center items-center gap-4 mb-10"
              initial={{ opacity: 0, y: -30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#D4C3A3]">
                <path d="M2 10C10 10 18 5 28 10C32 12 36 12 38 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M14 8C11 2 5 2 5 10C11 10 14 8 14 8Z" fill="currentColor" opacity="0.8"/>
                <path d="M24 8C21 2 15 2 15 10C21 10 24 8 24 8Z" fill="currentColor" opacity="0.5"/>
              </svg>
              <h2 className="text-3xl font-serif text-[#4A5441] tracking-wide">Best Sellers</h2>
              <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#D4C3A3] transform scale-x-[-1]">
                <path d="M2 10C10 10 18 5 28 10C32 12 36 12 38 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M14 8C11 2 5 2 5 10C11 10 14 8 14 8Z" fill="currentColor" opacity="0.8"/>
                <path d="M24 8C21 2 15 2 15 10C21 10 24 8 24 8Z" fill="currentColor" opacity="0.5"/>
              </svg>
            </motion.div>

            {/* Slider - slides in from right with stagger */}
            <motion.div
              className="relative group px-2 md:px-10 mt-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.15 }}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.12 } }
              }}
            >
              <Swiper
                modules={[Navigation]}
                navigation={{ nextEl: '.bs-next', prevEl: '.bs-prev' }}
                spaceBetween={28}
                slidesPerView={1.2}
                breakpoints={{
                  480: { slidesPerView: 2 },
                  768: { slidesPerView: 2.5 },
                  1024: { slidesPerView: 3 },
                  1280: { slidesPerView: 4 }
                }}
                className="w-full pb-8"
              >
                {!cmsLoaded ? [1,2,3,4,5].map(i => <SwiperSlide key={i}><SkeletonCard /></SwiperSlide>) :
                  featuredProducts.map((p) => (
                    <SwiperSlide key={p._id || p.id} className="h-auto">
                      <motion.div
                        variants={{
                          hidden: { opacity: 0, x: 80 },
                          visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: 'easeOut' } }
                        }}
                        whileHover={{ y: -4 }}
                        className="group relative cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-[#F0E6D8] transition-shadow duration-300 h-full flex flex-col"
                        onClick={() => onNavigate(`/product/${p._id}`)}
                      >
                        {/* Image area */}
                        <div className="aspect-square relative overflow-hidden">
                          {(() => {
                            let imgSrc = p.images?.find(img => img.isThumbnail)?.url || p.images?.[0]?.url || (typeof p.images?.[0] === 'string' ? p.images[0] : null) || p.image || '/wooden_train_set.png';
                            if (imgSrc && imgSrc.startsWith('/uploads')) imgSrc = `http://localhost:5000${imgSrc}`;
                            return (
                              <motion.img
                                src={imgSrc}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                variants={{ rest: { scale: 1 }, hover: { scale: 1.05 } }}
                                transition={{ duration: 0.3 }}
                                onError={e => e.target.style.display='none'}
                              />
                            );
                          })()}
                        </div>
                        
                        {/* Content area */}
                        <div className="p-4 flex flex-col flex-1 bg-white">
                          <h3 className="text-sm font-semibold text-[#333333] mb-2 line-clamp-1">{p.name}</h3>
                          
                          {(() => {
                            const pricing = getPricingInfo(p);
                            return (
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm font-bold text-[#333333]">₹{pricing.salePrice.toLocaleString()}</span>
                                {pricing.hasDiscount && (
                                  <span className="text-[11px] text-[#999999] line-through">₹{pricing.listPrice.toLocaleString()}</span>
                                )}
                              </div>
                            );
                          })()}
                          
                          {/* Rating */}
                          <div className="flex items-center gap-1 mt-auto">
                            <svg className="w-3.5 h-3.5 text-[#F5C518]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                            <span className="text-[11px] font-medium text-[#666666]">4.9 <span className="text-[#999999] font-normal">(98)</span></span>
                          </div>
                        </div>
                      </motion.div>
                    </SwiperSlide>
                  ))
                }
              </Swiper>
              {/* Slider Arrows */}
              <button type="button" className="bs-prev absolute top-[40%] left-0 z-10 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white hover:bg-[#F9F9F9] text-[#333333] border border-[#E6DFD4] rounded-full transition-colors shadow-sm disabled:opacity-50 hidden md:flex">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button type="button" className="bs-next absolute top-[40%] right-0 z-10 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white hover:bg-[#F9F9F9] text-[#333333] border border-[#E6DFD4] rounded-full transition-colors shadow-sm disabled:opacity-50 hidden md:flex">
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>


            {/* View All Button */}
            <div className="flex justify-center mt-6 mb-12">
              <button 
                onClick={() => onNavigate('/')}
                className="bg-[#8B5E3C] text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-[#4A5441] transition-colors inline-flex items-center gap-2"
              >
                View All Products <span>→</span>
              </button>
            </div>

            {/* Trust Badges Strip */}
            <div className="border border-[#E6DFD4] rounded-3xl lg:rounded-full bg-white px-4 md:px-8 py-5 md:py-6 mt-8">
              <div className="flex flex-col lg:flex-row justify-between items-center gap-6 lg:gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#E6DFD4]">
                
                <div className="flex items-center gap-4 w-full lg:w-1/4 pt-4 lg:pt-0 lg:px-6 first:pt-0 justify-center lg:justify-start">
                  <Truck className="w-7 h-7 text-[#5A5A5A] shrink-0" strokeWidth={1.5} />
                  <div>
                    <h4 className="text-[13px] font-bold text-[#333333]">Free Shipping</h4>
                    <p className="text-[11px] text-[#7A7A7A] mt-0.5">On orders above ₹999</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-1/4 pt-4 lg:pt-0 lg:px-6 justify-center lg:justify-start">
                  <Package className="w-7 h-7 text-[#5A5A5A] shrink-0" strokeWidth={1.5} />
                  <div>
                    <h4 className="text-[13px] font-bold text-[#333333]">Easy Returns</h4>
                    <p className="text-[11px] text-[#7A7A7A] mt-0.5">Within 7 days</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-1/4 pt-4 lg:pt-0 lg:px-6 justify-center lg:justify-start">
                  <ShieldCheck className="w-7 h-7 text-[#5A5A5A] shrink-0" strokeWidth={1.5} />
                  <div>
                    <h4 className="text-[13px] font-bold text-[#333333]">Secure Payments</h4>
                    <p className="text-[11px] text-[#7A7A7A] mt-0.5">100% Safe & Secure</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-1/4 pt-4 lg:pt-0 lg:px-6 justify-center lg:justify-start">
                  <Banknote className="w-7 h-7 text-[#5A5A5A] shrink-0" strokeWidth={1.5} />
                  <div>
                    <h4 className="text-[13px] font-bold text-[#333333]">COD Available</h4>
                    <p className="text-[11px] text-[#7A7A7A] mt-0.5">Pay on Delivery</p>
                  </div>
                </div>

              </div>
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
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} className="flex justify-center items-center gap-4 mb-10">
              <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#D4C3A3]">
                <path d="M2 10C10 10 18 5 28 10C32 12 36 12 38 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M14 8C11 2 5 2 5 10C11 10 14 8 14 8Z" fill="currentColor" opacity="0.8"/>
                <path d="M24 8C21 2 15 2 15 10C21 10 24 8 24 8Z" fill="currentColor" opacity="0.5"/>
              </svg>
              <h2 className="text-3xl font-serif text-[#4A5441] tracking-wide">What Parents Love</h2>
              <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#D4C3A3] transform scale-x-[-1]">
                <path d="M2 10C10 10 18 5 28 10C32 12 36 12 38 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M14 8C11 2 5 2 5 10C11 10 14 8 14 8Z" fill="currentColor" opacity="0.8"/>
                <path d="M24 8C21 2 15 2 15 10C21 10 24 8 24 8Z" fill="currentColor" opacity="0.5"/>
              </svg>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredReviews.map((t, i) => (
                <motion.div key={i} variants={scaleUp} whileHover={{ scale: 1.02 }}
                  className="bg-white border border-gray-100 p-8 flex flex-col justify-between rounded-2xl shadow-md hover:shadow-lg transition-all duration-300">
                  <div>
                    <div className="mb-4"><Stars rating={t.rating || 5} /></div>
                    <p className="text-sm italic text-brand-dark leading-relaxed">"{t.description || t.title || t.quote}"</p>
                  </div>
                  <div className="flex items-center gap-3 mt-8">
                    <div className="w-9 h-9 bg-[#E6DFD4] rounded-full flex items-center justify-center text-xs font-bold text-brand-dark">
                      {(t.user?.name || t.author || 'G').charAt(0)}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-brand-dark">{t.user?.name || t.author || 'Guest'}</p>
                      <p className="text-[9px] text-brand-medium">{t.isVerifiedPurchase ? 'Verified Buyer' : (t.context || '')}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>



    </div>
  );
}
