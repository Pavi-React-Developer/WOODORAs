import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade, EffectCreative, Navigation, Controller } from 'swiper/modules';
import { ChevronLeft, ChevronRight, Truck, Package, ShieldCheck, Banknote, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IoLeaf } from 'react-icons/io5';
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
      className="bg-white border border-gray-100 p-5 flex flex-col justify-between rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 w-full min-h-[160px]">
      <div>
        <div className="mb-2"><Stars rating={t?.rating || 5} /></div>
        <p className="text-xs italic text-brand-dark leading-relaxed line-clamp-3">"{t?.description || t?.title || t?.quote}"</p>
      </div>
      <div className="flex items-center gap-2 mt-4">
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
    <section className="py-5 bg-[#FDF9F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} className="relative flex flex-col md:flex-row items-center justify-center mb-5 min-h-[40px]">
            <div className="flex justify-center items-center gap-3 sm:gap-4">
              <IoLeaf className="text-[#B0611C] w-6 h-6 sm:w-8 sm:h-8" />
              <h2 className="text-xl md:text-2xl font-serif text-[#B0611C] tracking-widest uppercase text-center">What Parents Love</h2>
              <IoLeaf className="text-[#B0611C] transform scale-x-[-1] w-6 h-6 sm:w-8 sm:h-8" />
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
    <section className="py-5 bg-[#FDF9F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {bannerData.title && (
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="relative flex flex-col md:flex-row items-center justify-center mb-10 min-h-[40px]">
            <div className="flex justify-center items-center gap-3 sm:gap-4">
              <IoLeaf className="text-[#B0611C] w-6 h-6 sm:w-8 sm:h-8" />
              <h2 className="text-xl md:text-2xl font-serif text-[#B0611C] tracking-widest uppercase text-center">{bannerData.title}</h2>
              <IoLeaf className="text-[#B0611C] transform scale-x-[-1] w-6 h-6 sm:w-8 sm:h-8" />
            </div>
          </motion.div>
        )}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-5xl mx-auto">
            <div className="overflow-hidden rounded-2xl shadow-sm relative group h-[30vh] md:h-[50vh] min-h-[220px] md:min-h-[350px] max-h-[500px]">
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

            <div className="overflow-hidden rounded-2xl shadow-sm relative group h-[30vh] md:h-[50vh] min-h-[220px] md:min-h-[350px] max-h-[500px]">
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
  
  const showArrows = grid.showArrows !== false;
  const showDots = grid.showDots || false;

  return (
    <section className="py-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} className="relative flex flex-col md:flex-row items-center justify-center mb-5 min-h-[40px]">
            <div className="flex justify-center items-center gap-3 sm:gap-4">
              <IoLeaf className="text-[#B0611C] w-6 h-6 sm:w-8 sm:h-8" />
              <h2 className="text-xl md:text-2xl font-serif text-[#B0611C] tracking-widest uppercase text-center">{grid.title}</h2>
              <IoLeaf className="text-[#B0611C] transform scale-x-[-1] w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            {grid.ctaText && (
              <div className="mt-4 md:mt-0 md:absolute md:right-0">
                <button onClick={() => onNavigate(grid.ctaUrl || '/')} className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-[#B0611B] text-[#B0611B] hover:bg-[#B0611B] hover:text-white transition-colors">
                  {grid.ctaText} &gt;
                </button>
              </div>
            )}
          </motion.div>

          <div className="relative px-4 md:px-14 mt-4">
            <style>{`
              .custom-pagination-${grid._id} { position: relative; margin-top: 2rem; display: flex; justify-content: center; gap: 12px; }
              .custom-pagination-${grid._id} .swiper-pagination-bullet { width: 16px; height: 16px; background: #fff; border: 1px solid #999; opacity: 1; transition: all 0.2s; border-radius: 50%; cursor: pointer; }
              .custom-pagination-${grid._id} .swiper-pagination-bullet-active { background: #8b7355; border: 4px solid #fff; box-shadow: 0 0 0 1px #8b7355; }
              
              .pg-prev-${grid._id}, .pg-next-${grid._id} {
                position: absolute; top: 50%; transform: translateY(-50%); z-index: 10;
                width: 44px; height: 44px; border-radius: 50%; border: 1px solid #E6DFD4;
                background: white; color: #333; display: flex; align-items: center; justify-content: center;
                cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.2s;
              }
              .pg-prev-${grid._id}:hover, .pg-next-${grid._id}:hover { background: #F7F3EE; }
              .pg-prev-${grid._id}.swiper-button-disabled, .pg-next-${grid._id}.swiper-button-disabled { opacity: 0.3; cursor: not-allowed; }
              .pg-prev-${grid._id} { left: -12px; }
              .pg-next-${grid._id} { right: -12px; }
              @media (min-width: 768px) {
                .pg-prev-${grid._id} { left: -10px; }
                .pg-next-${grid._id} { right: -10px; }
              }
            `}</style>

            {showArrows && (
              <>
                <button ref={setPrevEl} className={`pg-prev-${grid._id}`}><ChevronLeft className="w-5 h-5" /></button>
                <button ref={setNextEl} className={`pg-next-${grid._id}`}><ChevronRight className="w-5 h-5" /></button>
              </>
            )}

            {((showArrows && prevEl && nextEl) || !showArrows) && (paginationEl || !showDots) ? (
              <Swiper
                modules={[Navigation, Pagination]}
                navigation={showArrows ? { prevEl: prevEl, nextEl: nextEl } : false}
                pagination={showDots ? { clickable: true, el: paginationEl } : false}
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
            {showDots && <div ref={setPaginationEl} className={`custom-pagination-${grid._id}`} />}
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
  const { onNavigate, onAddToCart, onAddToWishlist, user } = context;
  const [activeIdx, setActiveIdx] = useState(0);

  const allSections = specificData
    ? [specificData]
    : (context.categoryGrids || []);

  if (!allSections.length) return null;

  const activeSection = allSections[activeIdx];
  const activeProducts = Array.isArray(activeSection?.products) ? activeSection.products.filter(Boolean) : [];

  return (
    <section className="py-5">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>

          {/* Header */}
          <motion.div variants={fadeUp} className="relative flex flex-col md:flex-row items-center justify-center mb-8 min-h-[40px]">
            <div className="flex justify-center items-center gap-3">
              <IoLeaf className="text-[#B0611C] w-5 h-5 sm:w-7 sm:h-7" />
              <h2 className="text-xl md:text-2xl font-serif text-[#B0611C] tracking-widest uppercase text-center">
                {activeSection?.title || 'Our Products'}
              </h2>
              <IoLeaf className="text-[#B0611C] transform scale-x-[-1] w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div className="mt-3 md:mt-0 md:absolute md:right-0">
              <button
                onClick={() => onNavigate('/shop')}
                className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-[#B0611B] text-[#B0611B] hover:bg-[#B0611B] hover:text-white transition-colors"
              >
                View All &gt;
              </button>
            </div>
          </motion.div>

          {/* Main two-column container */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row rounded-2xl border border-[#E6DFD4] overflow-hidden shadow-sm">

            {/* LEFT: Category list */}
            <div className="w-full sm:w-[200px] md:w-[220px] shrink-0 border-b sm:border-b-0 sm:border-r border-[#E6DFD4] bg-[#FDFAF7]">
              <div className="flex sm:flex-col overflow-x-auto sm:overflow-visible">
                {allSections.map((section, i) => {
                  const imgUrl = section?.images?.find(img => img.isThumbnail)?.url || section?.images?.[0]?.url || '';
                  const isActive = i === activeIdx;
                  return (
                    <button
                      key={section._id || i}
                      onClick={() => setActiveIdx(i)}
                      className={`flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 shrink-0 sm:w-full border-r sm:border-r-0 sm:border-b border-[#E6DFD4] last:border-0 ${
                        isActive
                          ? 'bg-[#B0611C] text-white'
                          : 'hover:bg-[#F3EDE4] text-brand-dark'
                      }`}
                    >
                      {/* Small category thumbnail */}
                      <div className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 ${isActive ? 'ring-2 ring-white/60' : 'ring-1 ring-[#E6DFD4]'}`}>
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={section.title}
                            className="w-full h-full object-cover"
                            onError={e => e.target.src = '/wood-placeholder.png'}
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-[#F7F3EE] text-[#C8B9A0]'}`}>?</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{section.title}</p>
                        <p className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-white/70' : 'text-brand-medium'}`}>
                          {Array.isArray(section?.products) ? section.products.length : 0} products
                        </p>
                      </div>
                      {isActive && (
                        <div className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-white/80" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: Products of selected category */}
            <div className="flex-1 min-w-0 p-4 sm:p-5 bg-white">
              {activeProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {activeProducts.slice(0, 6).map((product) => (
                    <div key={product._id} className="h-full">
                      <ProductCard
                        product={product}
                        onNavigate={onNavigate}
                        onAddToCart={onAddToCart}
                        onAddToWishlist={onAddToWishlist}
                        user={user}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full min-h-[180px] items-center justify-center rounded-xl border border-dashed border-[#E6DFD4] text-sm text-brand-medium">
                  No products added to this category yet.
                </div>
              )}
            </div>

          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}

function CategoriesGridBlock({ grid, onNavigate }) {
  const [prevEl, setPrevEl] = useState(null);
  const [nextEl, setNextEl] = useState(null);
  const [paginationEl, setPaginationEl] = useState(null);

  const safeCategories = Array.isArray(grid.categories) ? grid.categories.filter(Boolean) : [];
  if (!safeCategories.length) return null;
  const mobileCount = grid.mobileCount || 2;
  const desktopCount = grid.desktopCount || 4;
  
  const showArrows = grid.showArrows !== false;
  const showDots = grid.showDots || false;

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} className="relative flex flex-col md:flex-row items-center justify-center mb-5 min-h-[40px]">
            <div className="flex justify-center items-center gap-3 sm:gap-4">
              <IoLeaf className="text-[#B0611C] w-6 h-6 sm:w-8 sm:h-8" />
              <h2 className="text-xl md:text-2xl font-serif text-[#B0611C] tracking-widest uppercase text-center">{grid.title}</h2>
              <IoLeaf className="text-[#B0611C] transform scale-x-[-1] w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            {grid.ctaText && (
              <div className="mt-4 md:mt-0 md:absolute md:right-0">
                <button onClick={() => onNavigate(grid.ctaUrl || '/')} className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-[#B0611B] text-[#B0611B] hover:bg-[#B0611B] hover:text-white transition-colors">
                  {grid.ctaText} &gt;
                </button>
              </div>
            )}
          </motion.div>

          <div className="relative px-4 md:px-14 mt-4">
            <style>{`
              .cat-pagination-${grid._id} { position: relative; margin-top: 2rem; display: flex; justify-content: center; gap: 12px; }
              .cat-pagination-${grid._id} .swiper-pagination-bullet { width: 16px; height: 16px; background: #fff; border: 1px solid #999; opacity: 1; transition: all 0.2s; border-radius: 50%; cursor: pointer; }
              .cat-pagination-${grid._id} .swiper-pagination-bullet-active { background: #8b7355; border: 4px solid #fff; box-shadow: 0 0 0 1px #8b7355; }

              .cat-prev-${grid._id}, .cat-next-${grid._id} {
                position: absolute;
                /* mobile: py-2(8px) + half of h-28(56px) = 64px, centre the 44px button */
                top: 64px;
                transform: translateY(-50%);
                z-index: 10;
                width: 44px; height: 44px; border-radius: 50%;
                border: 1.5px solid #E6DFD4;
                background: rgba(255,255,255,0.95);
                color: #6B5344;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 14px rgba(62,39,35,0.13);
                transition: all 0.2s ease;
              }
              .cat-prev-${grid._id}:hover, .cat-next-${grid._id}:hover {
                background: #B0611C; color: #fff; border-color: #B0611C;
                box-shadow: 0 6px 18px rgba(176,97,28,0.28);
                transform: translateY(-50%) scale(1.08);
              }
              .cat-prev-${grid._id}.swiper-button-disabled, .cat-next-${grid._id}.swiper-button-disabled { opacity: 0.25; cursor: not-allowed; pointer-events: none; }
              .cat-prev-${grid._id} { left: -4px; }
              .cat-next-${grid._id} { right: -4px; }

              @media (min-width: 768px) {
                .cat-prev-${grid._id}, .cat-next-${grid._id} {
                  /* desktop: py-2(8px) + half of h-36(72px) = 80px */
                  top: 80px;
                  width: 48px; height: 48px;
                }
                .cat-prev-${grid._id} { left: -6px; }
                .cat-next-${grid._id} { right: -6px; }
              }
            `}</style>

            {showArrows && (
              <>
                <button ref={setPrevEl} className={`cat-prev-${grid._id}`}><ChevronLeft className="w-5 h-5" /></button>
                <button ref={setNextEl} className={`cat-next-${grid._id}`}><ChevronRight className="w-5 h-5" /></button>
              </>
            )}

            {((showArrows && prevEl && nextEl) || !showArrows) && (paginationEl || !showDots) ? (
              <Swiper
                modules={[Navigation, Pagination]}
                navigation={showArrows ? { prevEl: prevEl, nextEl: nextEl } : false}
                pagination={showDots ? { clickable: true, el: paginationEl } : false}
                spaceBetween={16}
                slidesPerView={mobileCount}
                breakpoints={{ 768: { slidesPerView: desktopCount } }}
                className="w-full"
              >
                {safeCategories.map((c, i) => {
                  const imageSrc = c.image?.url || c.image || '/wood-placeholder.png';
                  return (
                    <SwiperSlide key={c._id || i} className="h-auto">
                      <motion.div
                        variants={fadeUp}
                        className="flex flex-col items-center gap-3 cursor-pointer group py-2"
                        onClick={() => onNavigate(`/shop?category=${c._id}`)}
                      >
                        {/* Circle image */}
                        <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden ring-2 ring-[#E6DFD4] group-hover:ring-[#B0611C] transition-all duration-300 shadow-md group-hover:shadow-lg shrink-0">
                          <img
                            src={imageSrc}
                            alt={c.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 group-hover:opacity-75"
                            onError={e => e.target.src='/wood-placeholder.png'}
                          />
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <span className="bg-white text-[#B0611C] text-[11px] md:text-xs font-bold px-3 py-1.5 rounded-full shadow-md transform translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                              Shop me
                            </span>
                          </div>
                        </div>
                        {/* Label */}
                        <h3 className="font-semibold text-brand-dark text-sm md:text-base text-center leading-tight px-1 group-hover:text-[#B0611C] transition-colors duration-200">
                          {c.name}
                        </h3>
                      </motion.div>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            ) : (
              <div className="w-full h-[300px] flex gap-4 overflow-hidden">
                <div className="flex-1 bg-gray-100 rounded-2xl animate-pulse" />
                <div className="hidden md:block flex-1 bg-gray-100 rounded-2xl animate-pulse" />
                <div className="hidden md:block flex-1 bg-gray-100 rounded-2xl animate-pulse" />
              </div>
            )}
            {showDots && <div ref={setPaginationEl} className={`cat-pagination-${grid._id}`} />}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function HomeCategoriesGrid({ context = {}, specificData }) {
  const { onNavigate } = context;
  const grids = specificData ? [specificData] : (context.categoriesGrids || []);
  if (!grids || !grids.length) return null;

  return (
    <>
      {grids.map((grid, i) => (
        <CategoriesGridBlock key={grid._id || i} grid={grid} onNavigate={onNavigate} />
      ))}
    </>
  );
}
