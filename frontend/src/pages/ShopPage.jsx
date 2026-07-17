import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { productV2API, categoryV2API, subCategoryV2API } from '../api/catalogV2Service';
import ProductCard from '../components/ProductCard';
import { Star, Grid, List, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';

export default function ShopPage({ onNavigate, onAddToCart, onAddToWishlist, user }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Dynamic filter states
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');

  const [dynamicAttributes, setDynamicAttributes] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState({});

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
    if (category) setSelectedCategory(category);
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
        // API returns { success: true, mappings: [...] }
        const raw = res.mappings || res.data || res || [];
        const attrs = Array.isArray(raw) ? raw : [];
        console.log('[ShopPage] dynamic attributes raw:', attrs);
        setDynamicAttributes(attrs);
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
  }, [location.search]);

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
    if (selectedCategory) {
      const pCatId = p.category?._id || p.category;
      if (pCatId !== selectedCategory) return false;
    }
    if (selectedSubCategory) {
      const pSubId = p.subCategory?._id || p.subCategory;
      if (pSubId !== selectedSubCategory) return false;
    }
    if (priceRange > 0) {
      const price = Number(p.discountPrice || p.basePrice || p.effectivePrice || p.price || 0);
      if (price < priceRange) return false;
    }
    for (const [attrId, selectedVals] of Object.entries(selectedAttributes)) {
      if (selectedVals.length > 0) {
        const pAttr = p.attributes?.find(a => (a.attribute?._id || a.attribute) === attrId);
        if (!pAttr) return false;
        const valId = pAttr.value?._id || pAttr.value;
        if (!selectedVals.includes(valId)) return false;
      }
    }
    return true;
  });

  const hasActiveFilters = selectedCategory || selectedSubCategory || priceRange > 0 || Object.values(selectedAttributes).some(v => v.length > 0);

  // Filter content — used inside the drawer
  const FilterContent = () => (
    <div className="space-y-5 divide-y divide-gray-100">
      {/* Categories */}
      <div className="pt-0">
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-400">Category</h3>
        <select
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubCategory(''); }}
          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#8B5E3C] focus:border-[#8B5E3C] bg-gray-50"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat._id} value={cat._id}>{cat.name || cat.title}</option>
          ))}
        </select>
      </div>

      {/* Sub Categories */}
      {selectedCategory && (
        <div className="pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-400">Sub Category</h3>
          <select
            value={selectedSubCategory}
            onChange={(e) => setSelectedSubCategory(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#8B5E3C] focus:border-[#8B5E3C] bg-gray-50"
          >
            <option value="">All Subcategories</option>
            {subCategories.map(subCat => (
              <option key={subCat._id} value={subCat._id}>{subCat.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Dynamic Attributes */}
      {dynamicAttributes.length > 0 && dynamicAttributes.map((attrMap, idx) => {
        const attr = attrMap.attribute || attrMap;
        const options = attr.values || attr.options || [];
        if (!attr || options.length === 0) return null;
        return (
          <div key={attr._id || idx} className="pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-400">{attr.name}</h3>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {options.map(opt => {
                const optId = opt._id?.toString() || opt._id;
                const isChecked = (selectedAttributes[attr._id] || []).includes(optId);
                return (
                  <label key={optId} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="hidden" checked={isChecked} onChange={() => toggleAttribute(attr._id, optId)} />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isChecked ? 'bg-[#8B5E3C] border-[#8B5E3C] text-white' : 'border-gray-300 bg-white group-hover:border-[#8B5E3C]'}`}>
                      {isChecked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span className={`text-sm transition-colors ${isChecked ? 'font-semibold text-[#8B5E3C]' : 'text-gray-600 group-hover:text-gray-900'}`}>{opt.name || opt.value}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Price Range */}
      <div className="pt-5">
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-400">Minimum Price</h3>
        <div className="px-1 mb-2">
          <input
            type="range" min="0" max="10000" step="100"
            value={priceRange}
            onChange={(e) => setPriceRange(Number(e.target.value))}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#8B5E3C]"
          />
        </div>
        <div className="flex items-center justify-between text-sm font-semibold text-gray-700 mt-3">
          <span>₹0</span>
          <span className="text-[#8B5E3C]">{priceRange > 0 ? `₹${priceRange.toLocaleString()}+` : 'Any'}</span>
        </div>
        {priceRange > 0 && (
          <button onClick={() => setPriceRange(0)} className="mt-2 text-xs text-[#8B5E3C] hover:underline w-full text-left">
            Clear price filter
          </button>
        )}
      </div>

      {/* Rating */}
      <div className="pt-5">
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-400">Rating</h3>
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
  );

  return (
    <div className="bg-[#FDF9F1] min-h-screen pt-24 pb-16 font-sans text-[#141225]">

      {/* Slide-in Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer Panel */}
          <div
            className="relative w-[300px] max-w-[85vw] bg-white h-full overflow-y-auto shadow-2xl z-10 flex flex-col"
            style={{ animation: 'slideInLeft 0.28s cubic-bezier(0.22,1,0.36,1)' }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#8B5E3C]">Filters</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 overflow-y-auto">
              <FilterContent />
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-full py-2.5 bg-[#8B5E3C] text-white text-sm font-semibold rounded-xl hover:bg-[#7a5235] transition-colors"
              >
                Show {filteredProducts.length} Results
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumbs */}
        <div className="text-xs text-gray-500 mb-6 flex items-center gap-2">
          <span className="cursor-pointer hover:text-gray-900" onClick={() => onNavigate('/')}>Home</span>
          <span>&gt;</span>
          <span className="font-semibold text-gray-900">Wooden Toys</span>
        </div>

        {/* Page Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-[#8B5E3C] mb-1">Wooden Toys</h1>
            <p className="text-sm text-gray-500">Showing {filteredProducts.length} of {products.length} results</p>
          </div>

          <div className="flex items-center gap-3 mt-4 sm:mt-0 flex-wrap">
            {/* Filter Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2 border border-[#8B5E3C] text-[#8B5E3C] rounded-xl text-sm font-semibold hover:bg-[#8B5E3C] hover:text-white transition-all duration-200"
            >
              <SlidersHorizontal size={15} />
              Filter
              {hasActiveFilters && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#8B5E3C] text-white text-[9px] flex items-center justify-center font-bold border-2 border-[#FDF9F1]">
                  {[selectedCategory ? 1 : 0, selectedSubCategory ? 1 : 0, priceRange > 0 ? 1 : 0].reduce((a, b) => a + b, 0)}
                </span>
              )}
            </button>

            {/* Sort */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Sort by:</span>
              <select className="border-none bg-transparent font-medium focus:ring-0 cursor-pointer pr-8 text-gray-900 outline-none">
                <option>Most Popular</option>
                <option>Newest</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
              </select>
            </div>

            {/* Grid / List toggles */}
            <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
              <button className="p-1.5 bg-[#8B5E3C] text-white rounded"><Grid size={16} /></button>
              <button className="p-1.5 text-gray-400 hover:text-[#8B5E3C]"><List size={16} /></button>
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-5">
            {selectedCategory && (
              <span className="flex items-center gap-1.5 text-xs bg-[#8B5E3C]/10 text-[#8B5E3C] px-3 py-1.5 rounded-full font-medium">
                {categories.find(c => c._id === selectedCategory)?.name || 'Category'}
                <button onClick={() => { setSelectedCategory(''); setSelectedSubCategory(''); }} className="hover:opacity-70 text-base leading-none">×</button>
              </span>
            )}
            {selectedSubCategory && (
              <span className="flex items-center gap-1.5 text-xs bg-[#8B5E3C]/10 text-[#8B5E3C] px-3 py-1.5 rounded-full font-medium">
                {subCategories.find(s => s._id === selectedSubCategory)?.name || 'Subcategory'}
                <button onClick={() => setSelectedSubCategory('')} className="hover:opacity-70 text-base leading-none">×</button>
              </span>
            )}
            {priceRange > 0 && (
              <span className="flex items-center gap-1.5 text-xs bg-[#8B5E3C]/10 text-[#8B5E3C] px-3 py-1.5 rounded-full font-medium">
                Min ₹{priceRange.toLocaleString()}
                <button onClick={() => setPriceRange(0)} className="hover:opacity-70 text-base leading-none">×</button>
              </span>
            )}
            <button
              onClick={() => { setSelectedCategory(''); setSelectedSubCategory(''); setPriceRange(0); setSelectedAttributes({}); }}
              className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 px-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <div key={n} className="animate-pulse bg-white rounded-2xl h-80 border border-gray-100 shadow-sm" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
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
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-[#8B5E3C]/10 flex items-center justify-center mb-5">
              <SlidersHorizontal size={32} className="text-[#8B5E3C]" />
            </div>
            <h3 className="text-xl font-medium text-gray-800 mb-2">No products found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or clear them to browse all products.</p>
            <button
              onClick={() => { setSelectedCategory(''); setSelectedSubCategory(''); setPriceRange(0); setSelectedAttributes({}); }}
              className="bg-[#8B5E3C] text-white px-6 py-3 rounded-xl hover:bg-[#7a5235] transition-colors text-sm font-semibold"
            >
              Clear All Filters
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
  );
}
