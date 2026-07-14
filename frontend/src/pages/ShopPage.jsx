import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { productV2API, categoryV2API, subCategoryV2API } from '../api/catalogV2Service';
import ProductCard from '../components/ProductCard';
import { Star, Grid, List, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ShopPage({ onNavigate, onAddToCart, onAddToWishlist, user }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  
  // Dynamic filter states
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  
  const [dynamicAttributes, setDynamicAttributes] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  
  // Price is acting as a minimum price filter based on user request
  const [priceRange, setPriceRange] = useState(0);

  // Fetch initial categories
  useEffect(() => {
    categoryV2API.getAll({ isActive: 'true' })
      .then(res => {
         const data = Array.isArray(res) ? res : (res.data || res.categories || []);
         setCategories(data);
      })
      .catch(console.error);
  }, []);

  // Sync with URL category if present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const category = searchParams.get('category');
    if (category) {
      setSelectedCategory(category);
    }
  }, [location.search]);

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

  // Fetch Attributes when SubCategory changes
  useEffect(() => {
    if (!selectedSubCategory) {
      setDynamicAttributes([]);
      setSelectedAttributes({});
      return;
    }
    subCategoryV2API.getMappedAttributes(selectedSubCategory)
      .then(res => {
         const attrs = res.data || res || [];
         // Make sure it's an array
         setDynamicAttributes(Array.isArray(attrs) ? attrs : []);
         setSelectedAttributes({});
      })
      .catch(console.error);
  }, [selectedSubCategory]);

  // Fetch Products
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const category = searchParams.get('category');
    const sort = searchParams.get('sort');

    const fetchParams = { isActive: 'true' };
    // Always fetch everything or just by initial URL category, 
    // we'll filter the rest on the frontend to avoid constant refetching for dropdowns
    if (category && !selectedCategory) fetchParams.categoryId = category;

    setLoading(true);
    productV2API.getAll(fetchParams)
      .then((res) => {
        let fetchedProducts = res.products || res.data || [];
        
        if (sort === 'newest') {
          fetchedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        setProducts(fetchedProducts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [location.search]); // intentionally only running on mount/url change

  // Toggle attribute selection
  const toggleAttribute = (attrId, valueId) => {
    setSelectedAttributes(prev => {
      const currentVals = prev[attrId] || [];
      const newVals = currentVals.includes(valueId)
        ? currentVals.filter(v => v !== valueId)
        : [...currentVals, valueId];
      return { ...prev, [attrId]: newVals };
    });
  };

  const filteredProducts = products.filter(p => {
    // 1. Filter by category
    if (selectedCategory) {
       const pCatId = p.category?._id || p.category;
       if (pCatId !== selectedCategory) return false;
    }
    
    // 2. Filter by subcategory
    if (selectedSubCategory) {
       const pSubId = p.subCategory?._id || p.subCategory;
       if (pSubId !== selectedSubCategory) return false;
    }

    // 3. Filter by min price
    // "if the product price is 500 the user change the ranges above 600 it does not show"
    if (priceRange > 0) {
      const price = Number(p.discountPrice || p.basePrice || p.effectivePrice || p.price || 0);
      if (price < priceRange) return false; // Hide products cheaper than selected min price
    }

    // 4. Filter by dynamic attributes
    for (const [attrId, selectedVals] of Object.entries(selectedAttributes)) {
      if (selectedVals.length > 0) {
        // Product attributes usually look like [{ attribute: { _id }, value: { _id } }, ...]
        const pAttr = p.attributes?.find(a => (a.attribute?._id || a.attribute) === attrId);
        if (!pAttr) return false;
        
        const valId = pAttr.value?._id || pAttr.value;
        if (!selectedVals.includes(valId)) return false;
      }
    }

    return true;
  });

  return (
    <div className="bg-[#FDF9F1] min-h-screen pt-24 pb-16 font-sans text-[#141225]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <div className="text-xs text-gray-500 mb-6 flex items-center gap-2">
            <span className="cursor-pointer hover:text-gray-900" onClick={() => onNavigate('/')}>Home</span>
            <span>&gt;</span>
            <span className="font-semibold text-gray-900">Wooden Toys</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar */}
          <div className="w-full lg:w-[280px] shrink-0 space-y-6">
            
            {/* Categories */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-gray-900">Category</h3>
              <select 
                value={selectedCategory} 
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubCategory(''); // reset subcategory on category change
                }}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#8B5E3C] focus:border-[#8B5E3C]"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name || cat.title}</option>
                ))}
              </select>
            </div>

            {/* Sub Categories (Only show if a category is selected) */}
            {selectedCategory && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-gray-900">Sub Category</h3>
                <select 
                  value={selectedSubCategory} 
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#8B5E3C] focus:border-[#8B5E3C]"
                >
                  <option value="">All Subcategories</option>
                  {subCategories.map(subCat => (
                    <option key={subCat._id} value={subCat._id}>{subCat.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Dynamic Attributes */}
            {dynamicAttributes.map((attrMap, idx) => {
              // The API might return { attribute: { _id, name, options: [] } } or similar
              const attr = attrMap.attribute || attrMap; 
              if (!attr || !attr.options || attr.options.length === 0) return null;

              return (
                <div key={attr._id || idx} className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-gray-900">{attr.name}</h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {attr.options.map(opt => {
                      const isChecked = (selectedAttributes[attr._id] || []).includes(opt._id);
                      return (
                        <label key={opt._id} className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isChecked} 
                            onChange={() => toggleAttribute(attr._id, opt._id)} 
                          />
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-[#8B5E3C] border-[#8B5E3C] text-white' : 'border-gray-300 bg-white'}`}>
                            {isChecked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L4 7L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span className={`text-sm ${isChecked ? 'font-semibold text-[#8B5E3C]' : 'text-gray-600'}`}>
                            {opt.name || opt.value}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              );
            })}

            {/* Price Range (Min Price) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-gray-900">Minimum Price</h3>
              <div className="px-2 mb-2">
                <input 
                  type="range" 
                  min="0" 
                  max="10000" 
                  step="100"
                  value={priceRange} 
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#8B5E3C]"
                />
              </div>
              <div className="flex items-center justify-between text-sm font-semibold text-gray-900 mt-4">
                <span>₹0</span>
                <span className="text-[#8B5E3C]">{priceRange > 0 ? `₹${priceRange.toLocaleString()}+` : 'Any'}</span>
              </div>
              {priceRange > 0 && (
                <button
                  onClick={() => setPriceRange(0)}
                  className="mt-3 text-xs text-[#8B5E3C] hover:underline w-full text-left"
                >
                  Clear price filter
                </button>
              )}
            </div>

            {/* Rating */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-gray-900">Rating</h3>
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="flex text-amber-400">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} className="text-gray-300" />
                </div>
                <span className="text-sm text-gray-600">&amp; Up</span>
              </div>
            </div>

          </div>

          {/* Main Content */}
          <div className="flex-1">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 pb-6 border-b border-gray-200">
              <div>
                <h1 className="text-3xl font-bold text-[#8B5E3C] mb-2">Wooden Toys</h1>
                <p className="text-sm text-gray-500">Showing {filteredProducts.length} of {products.length} results</p>
              </div>
              <div className="flex items-center gap-4 mt-4 sm:mt-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Sort by:</span>
                  <select className="border-none bg-transparent font-medium focus:ring-0 cursor-pointer pr-8 text-gray-900 outline-none">
                    <option>Most Popular</option>
                    <option>Newest</option>
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                  <button className="p-1.5 bg-[#8B5E3C] text-white rounded"><Grid size={16} /></button>
                  <button className="p-1.5 text-gray-400 hover:text-[#8B5E3C]"><List size={16} /></button>
                </div>
              </div>
            </div>



            {/* Product Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} className="animate-pulse bg-white rounded-2xl h-80 border border-gray-100 shadow-sm" />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onNavigate={onNavigate}
                    onAddToCart={(p) => {
                      if (!user) { alert('Please sign in'); onNavigate('/login'); return; }
                      onAddToCart?.(p);
                    }}
                    onAddToWishlist={(p) => {
                      if (!user) { alert('Please sign in'); onNavigate('/login'); return; }
                      onAddToWishlist?.(p);
                    }}
                    user={user}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <h3 className="text-xl font-medium text-brand-dark mb-2">No products found</h3>
                <p className="text-brand-medium mb-6">Try adjusting your filters or browse all products.</p>
                <button
                  onClick={() => onNavigate('/')}
                  className="bg-[#4A5441] text-white px-6 py-3 rounded-xl hover:bg-[#3d4536] transition-colors"
                >
                  View All Products
                </button>
              </div>
            )}

            {/* Pagination */}
            {filteredProducts.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-12 border-t border-gray-200 pt-8">
                <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#8B5E3C]"><ChevronLeft size={16} /></button>
                <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#8B5E3C] text-white font-medium text-sm">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#8B5E3C]/10 hover:text-[#8B5E3C] text-gray-600 font-medium text-sm transition-colors">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#8B5E3C]/10 hover:text-[#8B5E3C] text-gray-600 font-medium text-sm transition-colors">3</button>
                <span className="text-gray-400 px-1">...</span>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#8B5E3C]/10 hover:text-[#8B5E3C] text-gray-600 font-medium text-sm transition-colors">12</button>
                <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#8B5E3C]"><ChevronRight size={16} /></button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
