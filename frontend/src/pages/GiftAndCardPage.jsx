import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import CustomCalendar from '../components/CustomCalendar';
import { productV2API, categoryV2API, subCategoryV2API } from '../api/catalogV2Service';
import { getImageSrc } from '../utils/imageUtils';

const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`;

export default function GiftAndCardPage({ onNavigate, onAddToCart }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [message, setMessage] = useState('');
  const [style, setStyle] = useState('Classic');
  const [selectedDate, setSelectedDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [isGiftWrapper, setIsGiftWrapper] = useState(true);

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
    // Assign preferences to selected product
    selectedProduct.giftMessage = message;
    selectedProduct.giftMessageStyle = style;
    selectedProduct.scheduledDeliveryDate = selectedDate;
    selectedProduct.isGift = true;
    selectedProduct.isGiftWrapper = isGiftWrapper;
    
    // Add product to cart and navigate
    if (onAddToCart && onNavigate) {
      await onAddToCart(selectedProduct);
      toast.success('Gift preferences saved! Added to cart.');
      onNavigate('/cart');
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative bg-[#8f827a] text-white p-10 h-80 flex flex-col justify-end overflow-hidden group rounded-sm">
            <img src="/gift-box-custom.png" alt="Build Your Own Box" className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-black/40 z-0"></div>
            <div className="relative z-10">
              <span className="bg-white text-black px-2 py-1 text-xs font-bold tracking-widest uppercase mb-4 inline-block">CUSTOM CURATION</span>
              <h2 className="text-4xl font-semibold mb-2">Build Your Own Box</h2>
              <p className="text-sm opacity-90 mb-6 max-w-sm">Choose from our curated collection of wooden toys and organic textiles to create a unique, meaningful gift.</p>
              <button className="bg-black text-white px-6 py-3 text-sm font-semibold tracking-wider hover:bg-gray-800 transition-colors">START BUILDING</button>
            </div>
          </div>
          <div className="relative bg-[#e6e2df] text-white p-10 h-80 flex flex-col justify-end overflow-hidden group rounded-sm">
            <img src="/digital-gift-card.png" alt="Digital Gift Cards" className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-black/30 z-0"></div>
            <div className="relative z-10">
              <span className="bg-white text-black px-2 py-1 text-xs font-bold tracking-widest uppercase mb-4 inline-block">INSTANT DELIVERY</span>
              <h2 className="text-4xl font-semibold mb-2">Digital Gift Cards</h2>
              <p className="text-sm opacity-90 mb-6 max-w-sm">Let them choose their favorite treasures. Available instantly and valid on all collections.</p>
              <button className="bg-white text-black px-6 py-3 text-sm font-semibold tracking-wider hover:bg-gray-100 transition-colors">PURCHASE CARD</button>
            </div>
          </div>
        </div>

        {/* Categories Section - Replaced with Product Selection */}
        <div className="bg-white p-8 shadow-sm rounded-sm border border-gray-100 max-w-4xl mx-auto w-full">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">SELECT YOUR GIFT</p>
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Choose a Product</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubCategory(''); setSelectedProduct(null); }}
                className="w-full p-3 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-black bg-gray-50"
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
                className="w-full p-3 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-black bg-gray-50"
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
                className="w-full p-3 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-black bg-gray-50"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Available Products</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-1">
              {products.map(product => (
                <div 
                  key={product._id}
                  onClick={() => setSelectedProduct(product)}
                  className={`cursor-pointer border rounded-sm p-3 flex flex-col items-center text-center transition-all ${
                    selectedProduct?._id === product._id ? 'border-black ring-1 ring-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className="w-full aspect-square bg-gray-100 rounded-sm mb-3 overflow-hidden">
                    {product.images?.[0] ? (
                      <img src={getImageSrc(product.images[0])} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>
                    )}
                  </div>
                  <h4 className="text-xs font-semibold text-gray-900 line-clamp-2 mb-1">{product.name}</h4>
                  <p className="text-xs font-bold text-[#8B5E3C]">₹{(product.discountPrice || product.price || 0).toLocaleString()}</p>
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
                <p className="text-sm font-bold text-[#8B5E3C] mt-0.5">₹{(selectedProduct.discountPrice || selectedProduct.price || 0).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Preferences Section */}
        <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Personalized Message */}
          <div className="bg-white p-6 shadow-sm rounded-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">TOUCH OF THOUGHT</p>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Personalized Message</h3>
            
            <div className="mb-6 flex items-center justify-between bg-gray-50 p-4 rounded-sm border border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-900">Gift Wrapper</p>
                <p className="text-xs text-gray-500">Add premium wrapping and gift box</p>
              </div>
              <button 
                onClick={() => setIsGiftWrapper(!isGiftWrapper)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isGiftWrapper ? 'bg-black' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isGiftWrapper ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">YOUR NOTE</label>
            <textarea
              rows="3"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your heartfelt message here..."
              className="w-full border border-gray-200 p-3 text-sm focus:ring-black focus:border-black resize-none mb-4 rounded-sm"
            ></textarea>
            
            <div className="flex gap-2 mb-6">
              {['Classic', 'Elegant', 'Modernist'].map(s => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`px-3 py-1.5 text-xs font-bold tracking-wider uppercase border ${style === s ? 'border-black text-black' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
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
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Schedule Delivery</h3>
            
            <div className="mb-6 flex-1 flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Today's Date</label>
                <input 
                  type="text" 
                  value={new Date().toLocaleDateString('en-GB')} 
                  disabled 
                  className="w-full border border-gray-200 p-3 text-sm bg-gray-50 text-gray-500 rounded-sm cursor-not-allowed"
                />
              </div>

              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Delivery Date</label>
                <div className="relative">
                  <div 
                    className="w-full border border-gray-200 p-3 text-sm bg-white cursor-pointer hover:border-gray-300 rounded-sm flex justify-between items-center"
                    onClick={() => setShowCalendar(!showCalendar)}
                  >
                    <span className={selectedDate ? "text-gray-900" : "text-gray-400"}>
                      {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB') : 'Select a date'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

            <button onClick={handleConfirm} className="w-full bg-black text-white px-6 py-3 text-sm font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors mt-auto">
              Confirm Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
