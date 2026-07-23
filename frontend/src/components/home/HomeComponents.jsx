import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade, EffectCreative, Navigation, Controller } from 'swiper/modules';
import { ChevronLeft, ChevronRight, Truck, Package, ShieldCheck, Banknote, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '../ProductCard';
import Header from '../Header';
import Footer from '../Footer';
import { cmsService } from '../../api/cmsService';
import { getImageSrc } from '../../utils/imageUtils';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

const starContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};
const starVariants = {
  hidden: { scale: 0, opacity: 0, rotate: -45 },
  visible: { scale: 1, opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } }
};

function Stars({ rating }) {
  return (
    <motion.div className="flex gap-0.5" variants={starContainerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      {[1, 2, 3, 4, 5].map(s => (
        <motion.svg variants={starVariants} key={s} className={`w-3 h-3 ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </motion.svg>
      ))}
    </motion.div>
  );
}

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

export function HomeNavbar({ context = {} }) {
  return <Header {...context} />;
}

export function HomeReviews({ context = {} }) {
  const { featuredReviews: contextReviews = [] } = context;
  const [config, setConfig] = useState(null);
  const [swiperReady, setSwiperReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    cmsService.getReviewConfig().then(res => setConfig(res.data)).catch(console.error);
  }, []);

  const mobileCols = config?.mobileColumns || 1;
  const desktopCols = config?.desktopColumns || 3;

  const getItemsPerSlide = useCallback(() => {
    if (typeof window === 'undefined') return desktopCols;
    if (window.innerWidth < 640) return mobileCols;
    if (window.innerWidth < 1024) return Math.min(desktopCols, 2);
    return desktopCols;
  }, [mobileCols, desktopCols]);

  const [itemsPerSlide, setItemsPerSlide] = useState(getItemsPerSlide());

  useEffect(() => {
    setItemsPerSlide(getItemsPerSlide());
    setCurrentPage(0);
    const handleResize = () => {
      setItemsPerSlide(getItemsPerSlide());
      setCurrentPage(0);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getItemsPerSlide]);

  const animationType = config?.animationType || 'marquee';
  const showArrows = config?.showArrows || false;
  const showDots = config?.showDots || false;
  const sliderSpeed = config?.sliderSpeed || 3000;
  const marqueeSpeed = config?.marqueeSpeed || 30;

  // Use featured reviews from CMS config if available, otherwise fall back to context
  const featuredIds = config?.featuredReviewIds
    ? config.featuredReviewIds.map(r => typeof r === 'object' ? r._id : r)
    : [];

  const displayReviews = featuredIds.length > 0
    ? contextReviews.filter(r => featuredIds.includes(r._id))
    : contextReviews;

  if (!displayReviews || displayReviews.length === 0) return null;

  const isNone = animationType === 'none';
  const isFade = animationType === 'fade';
  const isSlider = !isNone && animationType !== 'marquee';

  const getSwiperEffect = () => isFade ? 'fade' : undefined;

  const swiperModules = () => {
    const mods = [Navigation, Pagination, Autoplay];
    if (isFade) mods.push(EffectFade);
    return mods;
  };

  const renderReviewCard = (t, i) => (
    <motion.div key={i} whileHover={{ scale: 1.02 }}
      className="bg-white border border-gray-100 p-8 flex flex-col justify-between rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 w-full min-h-[220px]">
      <div>
        <div className="mb-4"><Stars rating={t?.rating || 5} /></div>
        <p className="text-sm italic text-brand-dark leading-relaxed line-clamp-4">"{t?.description || t?.title || t?.quote}"</p>
      </div>
      <div className="flex items-center gap-3 mt-8">
        <div className="w-9 h-9 bg-[#E6DFD4] rounded-full flex items-center justify-center text-xs font-bold text-brand-dark shrink-0">
          {(t?.user?.name || t?.author || 'G').charAt(0)}
        </div>
        <div className="overflow-hidden">
          <p className="text-[11px] font-bold text-brand-dark truncate">{t?.user?.name || t?.author || 'Guest'}</p>
          <p className="text-[9px] text-brand-medium truncate">{t?.isVerifiedPurchase ? 'Verified Buyer' : (t?.context || '')}</p>
        </div>
      </div>
    </motion.div>
  );

  return (
    <section className="py-24 bg-[#EAE6E1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex flex-col items-center gap-4 mb-10">
            <div className="flex justify-center items-center gap-4">
              <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#D4C3A3]">
                <path d="M2 10C10 10 18 5 28 10C32 12 36 12 38 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M14 8C11 2 5 2 5 10C11 10 14 8 14 8Z" fill="currentColor" opacity="0.8" />
                <path d="M24 8C21 2 15 2 15 10C21 10 24 8 24 8Z" fill="currentColor" opacity="0.5" />
              </svg>
              <h2 className="text-3xl font-serif text-[#B0611C] tracking-wide">What Parents Love</h2>
              <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#D4C3A3] transform scale-x-[-1]">
                <path d="M2 10C10 10 18 5 28 10C32 12 36 12 38 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M14 8C11 2 5 2 5 10C11 10 14 8 14 8Z" fill="currentColor" opacity="0.8" />
                <path d="M24 8C21 2 15 2 15 10C21 10 24 8 24 8Z" fill="currentColor" opacity="0.5" />
              </svg>
            </div>
          </motion.div>

          <div className="w-full py-4 relative">
            <style>{`
              .review-pagination { position: relative; margin-top: 2rem; display: flex; justify-content: center; gap: 12px; }
              .review-pagination .swiper-pagination-bullet { width: 12px; height: 12px; background: #D4C3A3; opacity: 1; border-radius: 50%; cursor: pointer; transition: none; }
              .review-pagination .swiper-pagination-bullet-active { background: #B0611C; border: 3px solid #fff; box-shadow: 0 0 0 1px #B0611C; }
              .review-prev-btn, .review-next-btn { position: absolute; top: 50%; transform: translateY(-50%); z-index: 10; width: 44px; height: 44px; border-radius: 50%; border: 2px solid #D4C3A3; background: white; color: #B0611C; display: flex; align-items: center; justify-content: center; font-size: 20px; line-height: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
              .review-prev-btn { left: 0px; }
              .review-next-btn { right: 0px; }
            `}</style>

            {isNone ? (
              <div className="relative">
                {showArrows && (
                  <div className="absolute top-0 left-0 w-full h-[260px] pointer-events-none z-10">
                    <div 
                      className={`review-prev-btn pointer-events-auto cursor-pointer ${currentPage === 0 ? 'opacity-50' : ''}`}
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    >&#8249;</div>
                    <div 
                      className={`review-next-btn pointer-events-auto cursor-pointer ${currentPage >= Math.ceil(displayReviews.length / itemsPerSlide) - 1 ? 'opacity-50' : ''}`}
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(displayReviews.length / itemsPerSlide) - 1, p + 1))}
                    >&#8250;</div>
                  </div>
                )}
                
                <div className={showArrows ? "px-20" : ""}>
                  <div className={`grid gap-6 ${
                    mobileCols === 2 ? 'grid-cols-2' : mobileCols === 3 ? 'grid-cols-3' : mobileCols === 4 ? 'grid-cols-4' : 'grid-cols-1'
                  } md:grid-cols-2 ${
                    desktopCols === 2 ? 'lg:grid-cols-2' : 
                    desktopCols === 4 ? 'lg:grid-cols-4' : 
                    desktopCols === 5 ? 'lg:grid-cols-5' : 
                    desktopCols === 6 ? 'lg:grid-cols-6' : 
                    'lg:grid-cols-3'
                  }`}>
                    {displayReviews.slice(currentPage * itemsPerSlide, (currentPage + 1) * itemsPerSlide).map((t, i) => renderReviewCard(t, currentPage * itemsPerSlide + i))}
                  </div>
                </div>
                
                {showDots && (
                  <div className="review-pagination">
                    {Array.from({ length: Math.ceil(displayReviews.length / itemsPerSlide) }).map((_, idx) => (
                      <span 
                        key={idx}
                        className={`swiper-pagination-bullet ${currentPage === idx ? 'swiper-pagination-bullet-active' : ''}`}
                        onClick={() => setCurrentPage(idx)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : animationType === 'marquee' ? (
              <div className="overflow-hidden w-full">
                <div className="animate-marquee flex gap-6" style={{ width: 'max-content', animationDuration: `${marqueeSpeed}s` }}>
                  {Array(10).fill(displayReviews).flat().map((t, i) => (
                    <div key={i} className="w-[280px] sm:w-[320px] shrink-0">
                      {renderReviewCard(t, i)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="relative">
                {/* Left Arrow */}
                {isSlider && showArrows && (
                  <div className="review-prev-btn cursor-pointer">&#8249;</div>
                )}

                {/* Slider */}
                <div className={showArrows ? "px-20" : ""}>
                  {isFade ? (
                    <Swiper
                      modules={swiperModules()}
                      effect={getSwiperEffect()}
                      navigation={showArrows ? {
                        prevEl: '.review-prev-btn',
                        nextEl: '.review-next-btn',
                      } : false}
                      pagination={showDots ? { el: '.review-pagination', clickable: true } : false}
                      autoplay={{ delay: sliderSpeed, disableOnInteraction: false }}
                      spaceBetween={0}
                      slidesPerView={1}
                      className="w-full"
                    >
                      {(() => {
                        const chunks = [];
                        for (let i = 0; i < displayReviews.length; i += itemsPerSlide) {
                          chunks.push(displayReviews.slice(i, i + itemsPerSlide));
                        }
                        return chunks.map((chunk, groupIdx) => (
                          <SwiperSlide key={groupIdx} className="h-auto">
                            <div className={`grid gap-6 ${
                              itemsPerSlide === 1 ? 'grid-cols-1' :
                              itemsPerSlide === 2 ? 'grid-cols-2' :
                              itemsPerSlide === 4 ? 'grid-cols-4' :
                              itemsPerSlide === 5 ? 'grid-cols-5' :
                              itemsPerSlide === 6 ? 'grid-cols-6' :
                              'grid-cols-3'
                            }`}>
                              {chunk.map((t, idx) => renderReviewCard(t, groupIdx * 3 + idx))}
                            </div>
                          </SwiperSlide>
                        ));
                      })()}
                    </Swiper>
                  ) : (
                    <Swiper
                      modules={swiperModules()}
                      navigation={showArrows ? {
                        prevEl: '.review-prev-btn',
                        nextEl: '.review-next-btn',
                      } : false}
                      pagination={showDots ? { el: '.review-pagination', clickable: true } : false}
                      autoplay={{ delay: sliderSpeed, disableOnInteraction: false }}
                      spaceBetween={24}
                      slidesPerView={mobileCols}
                      breakpoints={{ 640: { slidesPerView: Math.min(desktopCols, 2) }, 1024: { slidesPerView: desktopCols } }}
                      className="w-full"
                    >
                      {displayReviews.map((t, i) => (
                        <SwiperSlide key={i} className="h-auto">
                          {renderReviewCard(t, i)}
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  )}
                </div>

                {/* Right Arrow */}
                {isSlider && showArrows && (
                  <div className="review-next-btn cursor-pointer">&#8250;</div>
                )}

                {/* Dots */}
                {showDots && <div className="review-pagination" />}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function HomeFooter({ context = {} }) {
  return (
    <div className="bg-[#FDF9F1]">
      <Footer {...context} />
    </div>
  );
}

export function HomeHeroBanner({ context = {}, specificData }) {
  let heroSlides = [];
  
  if (specificData) {
    const banner = specificData;
    if (banner.status) {
        if (banner.desktopVideo || banner.mobileVideo) {
            heroSlides.push({ ...banner, itemType: 'video', desktopUrl: getImageSrc(banner.desktopVideo), mobileUrl: getImageSrc(banner.mobileVideo) });
        } else if (banner.bannerImage || banner.mobileBanner) {
            heroSlides.push({ ...banner, itemType: 'image', desktopUrl: getImageSrc(banner.bannerImage), mobileUrl: getImageSrc(banner.mobileBanner) });
        }
        if (banner.items && banner.items.length > 0) {
            banner.items.forEach(item => {
                heroSlides.push({ ...banner, itemType: item.mediaType || 'image', desktopUrl: getImageSrc(item.desktopUrl), mobileUrl: getImageSrc(item.mobileUrl) });
            });
        }
        if (heroSlides.length === 0) {
            heroSlides.push({ ...banner, desktopUrl: getImageSrc(banner.bannerImage), mobileUrl: getImageSrc(banner.mobileBanner) });
        }
    }
  } else {
      heroSlides = context.heroSlides;
  }

  const [prevEl, setPrevEl] = useState(null);
  const [nextEl, setNextEl] = useState(null);
  const [paginationEl, setPaginationEl] = useState(null);

  if (!heroSlides || !heroSlides.length) return null;
  return (
    <section className="relative w-full h-[50vh] md:h-[70vh] lg:h-[90vh] min-h-[350px] md:min-h-[450px] lg:min-h-[600px] overflow-hidden bg-brand-dark group">
      {prevEl && nextEl && paginationEl ? (
        <Swiper
          modules={[Autoplay, Pagination, EffectFade, EffectCreative, Navigation]}
          effect="fade"
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true, el: paginationEl }}
          navigation={{ prevEl: prevEl, nextEl: nextEl }}
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
                      {slide.desktopUrl && (
                        isDesktopVid ? (
                          <video src={slide.desktopUrl} className={`w-full h-full object-cover object-center brightness-90 ${slide.mobileUrl ? 'hidden md:block' : ''}`} autoPlay muted loop playsInline />
                        ) : (
                          <img src={slide.desktopUrl} alt={slide.title} className={`w-full h-full object-cover object-center brightness-90 ${slide.mobileUrl ? 'hidden md:block' : ''}`} onError={e => { e.target.src = '/wood-placeholder.png'; }} />
                        )
                      )}
                      {slide.mobileUrl && (
                        isMobileVid ? (
                          <video src={slide.mobileUrl} className={`w-full h-full object-cover object-center brightness-90 ${slide.desktopUrl ? 'block md:hidden' : ''}`} autoPlay muted loop playsInline />
                        ) : (
                          <img src={slide.mobileUrl} alt={slide.title} className={`w-full h-full object-cover object-center brightness-90 ${slide.desktopUrl ? 'block md:hidden' : ''}`} onError={e => { e.target.src = '/wood-placeholder.png'; }} />
                        )
                      )}
                      {(!slide.desktopUrl && !slide.mobileUrl) && (
                        <img src={slide.bannerImage || '/wood-placeholder.png'} alt={slide.title} className="w-full h-full object-cover object-center brightness-90" onError={e => { e.target.src = '/wood-placeholder.png'; }} />
                      )}
                    </>
                  );
                })()}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        <div className="w-full h-full bg-brand-dark" />
      )}
      <button ref={setPrevEl} type="button" className="hero-prev absolute top-1/2 left-4 z-20 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur transition-all md:opacity-0 md:group-hover:opacity-100">
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button ref={setNextEl} type="button" className="hero-next absolute top-1/2 right-4 z-20 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur transition-all md:opacity-0 md:group-hover:opacity-100">
        <ChevronRight className="w-6 h-6" />
      </button>
      <div ref={setPaginationEl} className="hero-dots absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3" />
    </section>
  );
}

function ThirdBannerItem({ bannerData, onNavigate }) {
  const [firstSwiper, setFirstSwiper] = useState(null);
  const [secondSwiper, setSecondSwiper] = useState(null);
  const [paginationEl, setPaginationEl] = useState(null);

  if (!bannerData || !bannerData.leftImages?.length) return null;

  const isSlide = !bannerData.animation || bannerData.animation === 'Slide';
  const effectMap = { 'Fade': 'fade', 'Creative': 'creative', 'Zoom': 'creative' };
  const currentEffect = effectMap[bannerData.animation] || undefined;
  const swiperDirection = isSlide ? 'vertical' : 'horizontal';
  const creativeOptions = currentEffect === 'creative'
    ? { prev: { shadow: true, translate: ['-120%', 0, -500] }, next: { translate: ['100%', 0, 0] } }
    : undefined;

  const leftCtaLabel = bannerData.leftButtonText || 'Explore Here';
  const rightCtaLabel = bannerData.rightButtonText || 'Explore Here';

  return (
    <section className="py-16 bg-[#FDF9F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {bannerData.title && (
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center text-3xl font-serif text-brand-dark mb-12 tracking-wide">{bannerData.title}</motion.h2>
        )}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="overflow-hidden rounded-2xl shadow-sm relative group h-[30vh] md:h-[70vh] min-h-[220px] md:min-h-[400px] max-h-[600px]">
              {paginationEl ? (
                <Swiper
                  modules={[Autoplay, Pagination, Controller, EffectFade, EffectCreative]}
                  effect={currentEffect}
                  creativeEffect={creativeOptions}
                  onSwiper={setFirstSwiper}
                  controller={{ control: secondSwiper }}
                  autoplay={{ delay: 3500, disableOnInteraction: false }}
                  loop={bannerData.leftImages.length > 1}
                  direction={swiperDirection}
                  pagination={{ clickable: true, el: paginationEl }}
                  className="w-full h-full"
                >
                  {bannerData.leftImages.map((img, i) => (
                    <SwiperSlide key={i}>
                      <img src={img?.url || img || '/wood-placeholder.png'} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = '/wood-placeholder.png'; }} />
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                <div className="w-full h-full bg-[#E6DFD4]" />
              )}
              <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/55 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute inset-0 z-20 flex items-end p-8 pointer-events-none">
                <button onClick={() => onNavigate && onNavigate(bannerData.leftCtaUrl || '/')} className="pointer-events-auto bg-white text-brand-dark text-xs font-bold px-8 py-4 uppercase tracking-widest hover:bg-brand-dark hover:text-white transition-colors">
                  {leftCtaLabel} <span className="ml-1">→</span>
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl shadow-sm relative group h-[30vh] md:h-[70vh] min-h-[220px] md:min-h-[400px] max-h-[600px]">
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
              >
                {bannerData.rightImages?.map((img, i) => (
                  <SwiperSlide key={i}>
                    <img src={img?.url || img || '/wood-placeholder.png'} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = '/wood-placeholder.png'; }} />
                  </SwiperSlide>
                ))}
              </Swiper>
              <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/55 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute inset-0 z-20 flex items-end p-8 pointer-events-none">
                <button onClick={() => onNavigate && onNavigate(bannerData.rightCtaUrl || '/')} className="pointer-events-auto bg-white text-brand-dark text-xs font-bold px-8 py-4 uppercase tracking-widest hover:bg-brand-dark hover:text-white transition-colors">
                  {rightCtaLabel} <span className="ml-1">→</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="absolute top-0 bottom-4 md:bottom-0 left-0 md:left-1/2 md:-translate-x-1/2 right-0 md:right-auto flex flex-col md:items-center justify-end md:justify-center z-30 pointer-events-none">
            <div ref={setPaginationEl} className="dual-banner-pagination flex flex-row md:flex-col justify-center gap-3 pointer-events-auto mb-4 md:mb-0" style={{ position: 'relative', top: 'auto', bottom: 'auto', left: 'auto', right: 'auto', transform: 'none', width: 'auto', height: 'auto' }} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeThirdBanner({ context = {}, specificData }) {
  const { onNavigate } = context;
  const banner = specificData || (context.thirdBanners ? context.thirdBanners[0] : null);
  if (!banner) return null;

  return <ThirdBannerItem bannerData={banner} onNavigate={onNavigate} />;
}

function ProductGridBlock({ grid, onNavigate, onAddToCart, onAddToWishlist, user }) {
  const [prevEl, setPrevEl] = useState(null);
  const [nextEl, setNextEl] = useState(null);
  const [paginationEl, setPaginationEl] = useState(null);

  const safeProducts = Array.isArray(grid.products) ? grid.products.filter(Boolean) : [];
  if (!safeProducts.length) return null;
  const mobileCount = grid.mobileCount || 2;
  const desktopCount = grid.desktopCount || 4;

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
                <button ref={setPrevEl} className="w-10 h-10 rounded-full border border-[#E6DFD4] flex items-center justify-center text-brand-dark hover:bg-[#F7F3EE] disabled:opacity-30 transition-colors shadow-sm">&lt;</button>
                <button ref={setNextEl} className="w-10 h-10 rounded-full border border-[#E6DFD4] flex items-center justify-center text-brand-dark hover:bg-[#F7F3EE] disabled:opacity-30 transition-colors shadow-sm">&gt;</button>
              </div>
            </div>
          </motion.div>

          <div className="relative group px-2 md:px-4 mt-4">
            <style>{`
              .custom-pagination-${grid._id} { position: relative; margin-top: 2rem; display: flex; justify-content: center; gap: 12px; }
              .custom-pagination-${grid._id} .swiper-pagination-bullet { width: 16px; height: 16px; background: #fff; border: 1px solid #999; opacity: 1; transition: all 0.2s; border-radius: 50%; }
              .custom-pagination-${grid._id} .swiper-pagination-bullet-active { background: #8b7355; border: 4px solid #fff; box-shadow: 0 0 0 1px #8b7355; }
            `}</style>
            {prevEl && nextEl && paginationEl ? (
              <Swiper
                modules={[Navigation, Pagination]}
                navigation={{ prevEl: prevEl, nextEl: nextEl }}
                pagination={{ clickable: true, el: paginationEl }}
                spaceBetween={16}
                slidesPerView={mobileCount}
                breakpoints={{ 768: { slidesPerView: desktopCount } }}
                className="w-full"
              >
                {safeProducts.map((p, i) => (
                  <SwiperSlide key={p._id || i} className="h-auto">
                    <motion.div variants={fadeUp} className="h-full">
                      <ProductCard product={p} onNavigate={onNavigate} onAddToCart={onAddToCart} onAddToWishlist={onAddToWishlist} user={user} />
                    </motion.div>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="w-full h-[300px] flex gap-4 overflow-hidden">
                <div className="flex-1 bg-gray-100 rounded-2xl animate-pulse" />
                <div className="hidden md:block flex-1 bg-gray-100 rounded-2xl animate-pulse" />
                <div className="hidden md:block flex-1 bg-gray-100 rounded-2xl animate-pulse" />
              </div>
            )}
            <div ref={setPaginationEl} className={`custom-pagination-${grid._id}`} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}



export function HomeProductGrid({ context = {}, specificData }) {
  const { onNavigate, onAddToCart, onAddToWishlist, user } = context;
  const grids = specificData ? [specificData] : (context.productGrids || []);
  if (!grids || !grids.length) return null;

  return (
    <>
      {grids.map((grid, i) => (
        <ProductGridBlock key={grid._id || i} grid={grid} onNavigate={onNavigate} onAddToCart={onAddToCart} onAddToWishlist={onAddToWishlist} user={user} />
      ))}
    </>
  );
}

export function HomeCategoryGrid({ context = {}, specificData }) {
  const { shopCategories, onNavigate, onAddToCart, onAddToWishlist, user } = context;
  
  const [catPrev, setCatPrev] = useState(null);
  const [catNext, setCatNext] = useState(null);

  const activeSection = specificData || (context.categoryGrids ? context.categoryGrids[0] : null);

  const activeProducts = Array.isArray(activeSection?.products) ? activeSection.products : [];
  const activeImage = activeSection?.images?.find((image) => image.isThumbnail)?.url || activeSection?.images?.[0]?.url || '';
  const animationVariant = activeSection?.animation === 'slide' ? { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 } } : activeSection?.animation === 'zoom' ? { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 } } : { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

  return (
    <>
      {/* SHOP BY CATEGORIES (Top slider) - only rendered if no specificData is provided (legacy mode) or if explicitly requested. We'll leave it here for now if specificData is null. But actually, if they want separate blocks, maybe we should just render the grid itself. Let's assume shopCategories is a separate block or rendered before. */}
      
      {/* CATEGORY PRODUCTS */}
      {activeSection && (
        <section className="py-16 border-y border-[#EFE5DA]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.div variants={fadeUp} className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-3xl md:text-4xl font-serif text-[#333333] mb-4 tracking-tight leading-tight">{activeSection.title}</h2>
                  <p className="text-[#5A5A5A] text-lg leading-relaxed">{activeSection.subtitle}</p>
                </div>
                <button onClick={() => onNavigate('/shop')} className="text-[10px] font-bold uppercase tracking-widest text-brand-medium hover:text-brand-dark">View All &gt;</button>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-6 rounded-3xl border border-[#E6DFD4] bg-[#FDFCFB] p-4 sm:p-6">
                <div className="relative overflow-hidden rounded-2xl bg-[#F7F3EE] min-h-[250px]">
                  {activeImage ? (
                    <div className="absolute inset-0">
                      <motion.img
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
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
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
                    {activeProducts.length ? activeProducts.slice(0, 4).map((product) => (
                      <div key={product._id} className="h-full">
                        <ProductCard product={product} onNavigate={onNavigate} onAddToCart={onAddToCart} onAddToWishlist={onAddToWishlist} user={user} />
                      </div>
                    )) : <div className="col-span-2 rounded-xl border border-dashed border-[#E6DFD4] p-6 text-sm text-brand-medium">No products selected for this category yet.</div>}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </>
  );
}
