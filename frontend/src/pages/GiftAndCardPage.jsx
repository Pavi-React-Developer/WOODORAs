import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import CustomCalendar from '../components/CustomCalendar';
import { productV2API, categoryV2API, subCategoryV2API } from '../api/catalogV2Service';
import { getImageSrc } from '../utils/imageUtils';
import useWishlistStore from '../store/useWishlistStore';
import useCartStore from '../store/useCartStore';
import { cmsService } from '../api/cmsService';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade, EffectCreative, Controller } from 'swiper/modules';
import { IoLeaf } from 'react-icons/io5';

const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`;

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } };

function DynamicGiftCardBanner({ bannerData, onNavigate }) {
  const [firstSwiper, setFirstSwiper] = useState(null);
  const [secondSwiper, setSecondSwiper] = useState(null);

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
    <div className="max-w-4xl mx-auto w-full mb-12">
      {bannerData.title && (
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="relative flex flex-col md:flex-row items-center justify-center mb-8 min-h-[40px]">
          <div className="flex justify-center items-center gap-3 sm:gap-4">
            <IoLeaf className="text-[#B0611C] w-6 h-6 sm:w-8 sm:h-8" />
            <h2 className="text-xl md:text-2xl font-serif text-[#B0611C] tracking-widest uppercase text-center">{bannerData.title}</h2>
            <IoLeaf className="text-[#B0611C] transform scale-x-[-1] w-6 h-6 sm:w-8 sm:h-8" />
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* LEFT banner */}
        <div className="relative bg-[#8f827a] text-white p-10 h-80 flex flex-col justify-end overflow-hidden group rounded-sm">
          <div className="absolute inset-0 z-0">
            <Swiper
              modules={[Autoplay, Controller, EffectFade, EffectCreative]}
              effect={currentEffect}
              creativeEffect={creativeOptions}
              onSwiper={setFirstSwiper}
              controller={{ control: secondSwiper }}
              autoplay={{ delay: 3500, disableOnInteraction: false }}
              loop={(bannerData.leftImages?.length || 0) > 1}
              direction={swiperDirection}
              allowTouchMove={false}
              className="w-full h-full"
            >
              {bannerData.leftImages.map((img, i) => (
                <SwiperSlide key={i}>
                  <img src={img?.url || img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" onError={(e) => { e.target.style.display = 'none'; }} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
          <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none"></div>
          <div className="relative z-10 pointer-events-none">
            {bannerData.leftTitle && (
              <h3 className="text-2xl md:text-3xl font-serif mb-2 max-w-sm">{bannerData.leftTitle}</h3>
            )}
            {bannerData.leftDescription && (
              <p className="text-sm opacity-90 mb-6 max-w-sm">{bannerData.leftDescription}</p>
            )}
            <button onClick={() => onNavigate && onNavigate(bannerData.leftCtaUrl || '/')} className="pointer-events-auto bg-[#A66C1C] text-white px-6 py-3 text-sm font-semibold tracking-wider hover:bg-[#8B5E3C] transition-colors">
              {leftCtaLabel}
            </button>
          </div>
        </div>

        {/* RIGHT banner */}
        <div className="relative bg-[#e6e2df] text-white p-10 h-80 flex flex-col justify-end overflow-hidden group rounded-sm">
          <div className="absolute inset-0 z-0">
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
                  <img src={img?.url || img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" onError={(e) => { e.target.style.display = 'none'; }} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
          <div className="absolute inset-0 bg-black/30 z-0 pointer-events-none"></div>
          <div className="relative z-10 pointer-events-none">
            {bannerData.rightTitle && (
              <h3 className="text-2xl md:text-3xl font-serif mb-2 max-w-sm">{bannerData.rightTitle}</h3>
            )}
            {bannerData.rightDescription && (
              <p className="text-sm opacity-90 mb-6 max-w-sm">{bannerData.rightDescription}</p>
            )}
            <button onClick={() => onNavigate && onNavigate(bannerData.rightCtaUrl || '/')} className="pointer-events-auto bg-white text-[#A66C1C] px-6 py-3 text-sm font-semibold tracking-wider hover:bg-[#F9F6F0] transition-colors">
              {rightCtaLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GiftAndCardPage({ onNavigate, onAddToCart }) {
  const navigate = useNavigate();
  const { wishlistItems, toggleWishlist } = useWishlistStore();
  const [config, setConfig] = useState(null);
  const [message, setMessage] = useState('');
  const [style, setStyle] = useState('Classic');
  const [selectedDate, setSelectedDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [isGiftWrapper, setIsGiftWrapper] = useState(true);
  const [dynamicBanner, setDynamicBanner] = useState(null);

  // Product Selection States
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await axios.get(`${API_URL}/gift-cards/config`);
        setConfig(res.data);
      } catch (err) {
        console.error('Failed to fetch gift card config', err);
      }
    };
    fetchConfig();
    
    // Fetch dynamic banner
    cmsService.getGiftCardBanners()
      .then(res => {
        if (res.data && res.data.length > 0) {
          const activeBanner = res.data.find(b => b.status);
          if (activeBanner) setDynamicBanner(activeBanner);
        }
      })
      .catch(console.error);

    // Fetch initial categories
    categoryV2API.getAll({ isActive: 'true' })
      .then(res => {
        const data = Array.isArray(res) ? res : (res.data || res.categories || []);
        setCategories(data);
      })
      .catch(console.error);
  }, []);

  // Fetch Subcategories when Category changes
  useEffect(() => {
    if (!selectedCategory) {
      setSubCategories([]);
      setSelectedSubCategory('');
      return;
    }
    subCategoryV2API.getAll({ category: selectedCategory, isActive: 'true' })
      .then(res => {
        const data = Array.isArray(res) ? res : (res.data || res.subCategories || []);
        setSubCategories(data);
      })
      .catch(console.error);
  }, [selectedCategory]);

  // Fetch Products based on filters
  useEffect(() => {
    let isMounted = true;

    const delayDebounceFn = setTimeout(() => {
      const fetchParams = { isActive: 'true' };
      if (selectedCategory) fetchParams.category = selectedCategory;
      if (selectedSubCategory) fetchParams.subCategory = selectedSubCategory;
      if (searchQuery) fetchParams.search = searchQuery;

      productV2API.getAll(fetchParams)
        .then((res) => {
          if (isMounted) {
            let fetchedProducts = res.products || res.data || [];
            setProducts(fetchedProducts);
          }
        })
        .catch((err) => {
          if (isMounted) console.error(err);
        });
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(delayDebounceFn);
    };
  }, [selectedCategory, selectedSubCategory, searchQuery]);

  const handleConfirm = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product first.');
      return;
    }
    if (!selectedDate) {
      toast.error('Please select a delivery date.');
      return;
    }

    // Build a cart-compatible product object with ALL gift preferences embedded.
    // The useCartStore.addToCart() picks up these fields directly from the product arg.
    const productWithGiftPrefs = {
      ...selectedProduct,
      // Core product identity fields required by addToCart
      _id: selectedProduct._id,
      name: selectedProduct.name,
      price: selectedProduct.salePrice || selectedProduct.discountPrice || selectedProduct.price || 0,
      images: selectedProduct.images,
      // Gift preference fields – picked up by addToCart & stored in cart item
      isGift: true,
      isGiftWrapper: isGiftWrapper,
      giftMessage: message || '',
      giftMessageStyle: style,       // cart store maps this → giftCardStyle on the item
      deliveryDate: selectedDate,
      scheduledDeliveryDate: selectedDate,
    };

    localStorage.setItem('giftCardPreferences', JSON.stringify({
      productId: selectedProduct._id,
      message: message || '',
      style,
      deliveryDate: selectedDate,
    }));

    // Add product to cart and navigate
    if (onAddToCart && onNavigate) {
      await onAddToCart(productWithGiftPrefs);
      useCartStore.getState().setCheckoutOrigin('/gift-and-card');
      toast.success('Gift preferences saved! Added to cart.');
      onNavigate('/review-order');
    } else {
       toast.error('Navigation error. Please try again.');
    }
  };


  const handleDateSelect = (dStr) => {
    // Prevent selecting today's date based on user request
    const today = new Date();
    const tYear = today.getFullYear();
    const tMonth = String(today.getMonth() + 1).padStart(2, '0');
    const tDay = String(today.getDate()).padStart(2, '0');
    const todayStr = `${tYear}-${tMonth}-${tDay}`;

    if (dStr === todayStr) {
      toast.error("Delivery date must be different from today's date! Please select another date.");
      return;
    }

    setSelectedDate(dStr);
    setShowCalendar(false);
  };

  return (
    <div className="bg-[#FAF4EF] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Hero Section */}
        {dynamicBanner ? (
          <DynamicGiftCardBanner bannerData={dynamicBanner} onNavigate={navigate} />
        ) : (
          <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="relative bg-[#8f827a] text-white p-10 h-80 flex flex-col justify-end overflow-hidden group rounded-sm">
              <div className="absolute inset-0 bg-black/40 z-0"></div>
              <div className="relative z-10">
                <span className="bg-white text-black px-2 py-1 text-xs font-bold tracking-widest uppercase mb-4 inline-block">CUSTOM CURATION</span>
                <h2 className="text-4xl font-semibold mb-2">Build Your Own Box</h2>
                <p className="text-sm opacity-90 mb-6 max-w-sm">Choose from our curated collection of wooden toys and organic textiles to create a unique, meaningful gift.</p>
                <button className="bg-[#A66C1C] text-white px-6 py-3 text-sm font-semibold tracking-wider hover:bg-[#8B5E3C] transition-colors">START BUILDING</button>
              </div>
            </div>
            <div className="relative bg-[#e6e2df] text-white p-10 h-80 flex flex-col justify-end overflow-hidden group rounded-sm">
              <div className="absolute inset-0 bg-black/30 z-0"></div>
              <div className="relative z-10">
                <span className="bg-white text-black px-2 py-1 text-xs font-bold tracking-widest uppercase mb-4 inline-block">INSTANT DELIVERY</span>
                <h2 className="text-4xl font-semibold mb-2">Digital Gift Cards</h2>
                <p className="text-sm opacity-90 mb-6 max-w-sm">Let them choose their favorite treasures. Available instantly and valid on all collections.</p>
                <button className="bg-white text-[#A66C1C] px-6 py-3 text-sm font-semibold tracking-wider hover:bg-[#F9F6F0] transition-colors">PURCHASE CARD</button>
              </div>
            </div>
          </div>
        )}

        {/* Categories Section - Replaced with Product Selection */}
        <div className="bg-white p-8 shadow-sm rounded-sm border border-gray-100 max-w-4xl mx-auto w-full">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">SELECT YOUR GIFT</p>
          <h3 className="text-2xl font-semibold text-[#A66C1C] mb-6">Choose a Product</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubCategory(''); setSelectedProduct(null); }}
                className="w-full p-3 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#A66C1C] bg-gray-50"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name || cat.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Sub Category</label>
              <select
                value={selectedSubCategory}
                onChange={(e) => { setSelectedSubCategory(e.target.value); setSelectedProduct(null); }}
                className="w-full p-3 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#A66C1C] bg-gray-50"
                disabled={!selectedCategory}
              >
                <option value="">All Subcategories</option>
                {subCategories.map(sub => (
                  <option key={sub._id} value={sub._id}>{sub.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Search Products</label>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#A66C1C] bg-gray-50"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Available Products</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 content-start gap-4 p-1">
              {products.map(product => (
                <div 
                  key={product._id}
                  onClick={() => setSelectedProduct(product)}
                  className={`group cursor-pointer bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col border ${
                    selectedProduct?._id === product._id ? 'border-[#A66C1C] ring-1 ring-[#A66C1C]' : 'border-[#E6DFD4]'
                  }`}
                >
                  <div className="aspect-[4/5] sm:aspect-[4/3] bg-[#F7F3EE] relative overflow-hidden shrink-0">
                    {product.images?.[0] ? (
                      <img src={getImageSrc(product.images[0])} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#C8B9A0]">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <button 
                      className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:text-[#A66C1C] hover:scale-110 transition-all z-10" 
                      onClick={async (e) => { 
                        e.stopPropagation(); 
                        await toggleWishlist(product);
                      }}
                    >
                      <svg 
                        className={`w-3.5 h-3.5 transition-colors ${wishlistItems.some(w => (w._id || w) === product._id) ? 'text-red-500 fill-red-500' : 'fill-none'}`} 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="p-3 flex flex-col flex-grow text-left">
                    <h3 className="text-[13px] font-medium text-gray-900 truncate mb-1.5">{product.name}</h3>
                    <div className="flex flex-col gap-1 mt-auto">
                      <div className="flex flex-col sm:flex-row sm:items-center items-start gap-1 sm:gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-bold text-[#A66C1C]">₹{(product.salePrice || product.discountPrice || product.price || 0).toLocaleString()}</p>
                          {(product.price > (product.salePrice || product.discountPrice || product.price)) && (
                            <p className="text-[10px] text-gray-400 line-through">₹{product.price.toLocaleString()}</p>
                          )}
                        </div>
                        {(product.price > (product.salePrice || product.discountPrice || product.price)) && (
                          <span className="inline-flex items-center rounded-full bg-[#EFE6DB] px-1.5 py-0.5 text-[9px] font-bold text-[#A66C1C]">
                            -{Math.round(((product.price - (product.salePrice || product.discountPrice)) / product.price) * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        <span className="text-[10px] font-medium text-gray-500">{(product.rating || 0).toFixed(1)} ({(product.reviews?.length || 0)})</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="col-span-full py-8 text-center text-sm text-gray-500">
                  No products found for the selected filters.
                </div>
              )}
            </div>
          </div>

          {selectedProduct && (
            <div className="bg-[#FAF4EF] p-4 flex items-center gap-4 border border-gray-200 rounded-sm">
              <div className="w-16 h-16 bg-white rounded-sm overflow-hidden shrink-0 border border-gray-100">
                {selectedProduct.images?.[0] && (
                  <img src={getImageSrc(selectedProduct.images[0])} alt={selectedProduct.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">SELECTED GIFT</p>
                <p className="text-sm font-medium text-gray-900 line-clamp-1">{selectedProduct.name}</p>
                <p className="text-sm font-bold text-[#A66C1C] mt-0.5">₹{(selectedProduct.discountPrice || selectedProduct.price || 0).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Preferences Section */}
        <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Personalized Message */}
          <div className="bg-white p-6 shadow-sm rounded-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">TOUCH OF THOUGHT</p>
            <h3 className="text-xl font-semibold text-[#A66C1C] mb-4">Personalized Message</h3>
            
            <div className="mb-6 flex items-center justify-between bg-gray-50 p-4 rounded-sm border border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-900">Gift Wrapper</p>
                <p className="text-xs text-gray-500">Add premium wrapping and gift box</p>
              </div>
              <button 
                onClick={() => setIsGiftWrapper(!isGiftWrapper)}
                className={`flex-none shrink-0 relative inline-flex h-6 w-11 min-w-[44px] max-w-[44px] min-h-[24px] max-h-[24px] items-center rounded-full transition-colors ${isGiftWrapper ? 'bg-[#A66C1C]' : 'bg-gray-300'}`}
              >
                <span className={`flex-none shrink-0 inline-block h-4 w-4 min-w-[16px] max-w-[16px] min-h-[16px] max-h-[16px] transform rounded-full bg-white transition-transform ${isGiftWrapper ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">YOUR NOTE</label>
            <textarea
              rows="3"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your heartfelt message here..."
              className={`w-full border border-gray-200 p-3 focus:ring-[#A66C1C] focus:border-[#A66C1C] resize-none mb-4 rounded-sm ${
                style === 'Classic' ? 'font-serif text-sm' : style === 'Elegant' ? 'font-script italic text-base' : 'font-sans tracking-wide text-sm'
              }`}
            ></textarea>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {['Classic', 'Elegant', 'Modernist'].map(s => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`px-3 py-1.5 text-xs font-bold tracking-wider uppercase border ${style === s ? 'border-[#A66C1C] text-[#A66C1C]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className={`border border-dashed border-gray-300 p-4 text-center italic text-gray-600 min-h-[80px] flex items-center justify-center ${
              style === 'Classic' ? 'font-serif' : style === 'Elegant' ? 'font-script text-xl' : 'font-sans tracking-wide'
            }`}>
              {message || '"A little joy for a big heart."'}
            </div>
          </div>

          {/* Schedule Delivery */}
          <div className="bg-white p-6 shadow-sm rounded-sm border border-gray-100 flex flex-col">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">PERFECT TIMING</p>
            <h3 className="text-xl font-semibold text-[#A66C1C] mb-4">Schedule Delivery</h3>
            
            <div className="mb-6 flex-1 flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Today's Date</label>
                <input 
                  type="text" 
                  value={new Date().toLocaleDateString('en-GB')} 
                  disabled 
                  className="w-full h-11 border border-gray-200 px-3 text-sm bg-gray-50 text-gray-500 rounded-sm cursor-not-allowed"
                />
              </div>

              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Delivery Date</label>
                <div className="relative">
                  <div 
                    className="w-full h-11 border border-gray-200 px-3 text-sm bg-white cursor-pointer hover:border-gray-300 rounded-sm flex justify-between items-center"
                    onClick={() => setShowCalendar(!showCalendar)}
                  >
                    <span className={`truncate mr-2 ${selectedDate ? "text-gray-900" : "text-gray-400"}`}>
                      {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB') : 'Select a date'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="shrink-0 h-4 w-4 text-[#A66C1C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>

                  {showCalendar && (
                    <div className="absolute top-full mt-1 w-[280px] sm:w-[320px] z-50 shadow-xl rounded-lg bg-white border border-gray-100 right-0 origin-top-right">
                      <CustomCalendar 
                        selectedDate={selectedDate} 
                        onSelectDate={handleDateSelect} 
                        config={config} 
                        isAdminMode={false} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button onClick={handleConfirm} className="w-full bg-[#A66C1C] text-white px-6 py-3 text-sm font-bold tracking-widest uppercase hover:bg-[#8B5E3C] transition-colors mt-auto">
              Confirm Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
