import React, { useState, useEffect } from 'react';
import { Package, ShieldCheck, Truck, Droplets } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { catalogService } from '../api/catalogService';

export default function BulkOrderPage() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    estimatedQuantity: '',
    category: '',
    subCategory: '',
    product: '',
    customizationRequests: '',
    customBranding: false
  });
  
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [filteredSubCategories, setFilteredSubCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, subsRes, prodsRes] = await Promise.all([
          catalogService.getCategories(),
          catalogService.getSubCategories(),
          catalogService.getProducts()
        ]);
        // Extract data depending on API response format
        setCategories(catsRes?.data || catsRes || []);
        setSubCategories(subsRes?.data || subsRes || []);
        setProducts(prodsRes?.data || prodsRes || []);
      } catch (err) {
        console.error('Failed to load catalog data for bulk orders:', err);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      if (name === 'category') {
        // Reset subCategory and product
        newData.subCategory = '';
        newData.product = '';
        // Filter subCategories based on selected category
        const filtered = subCategories.filter(sc => 
          sc.category?._id === value || sc.category === value
        );
        setFilteredSubCategories(filtered);
        setFilteredProducts([]);
        setSelectedProductDetails(null);
      }

      if (name === 'subCategory') {
        // Reset product
        newData.product = '';
        // Filter products based on selected subCategory
        const filtered = products.filter(p => 
          p.subCategory === value || p.subCategory?._id === value
        );
        setFilteredProducts(filtered);
        setSelectedProductDetails(null);
      }

      if (name === 'product') {
        const selectedProd = products.find(p => p._id === value);
        setSelectedProductDetails(selectedProd || null);
      }

      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to submit a bulk order request');
        setIsSubmitting(false);
        return;
      }
      
      if (!formData.category || !formData.subCategory || !formData.product) {
        toast.error('Please select Category, Subcategory, and Product');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('http://localhost:5000/api/bulk-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Bulk order request submitted successfully!');
        setFormData({
          companyName: '',
          contactPerson: '',
          email: '',
          phone: '',
          estimatedQuantity: '',
          category: '',
          subCategory: '',
          product: '',
          customizationRequests: '',
          customBranding: false
        });
        setFilteredSubCategories([]);
        setFilteredProducts([]);
        setSelectedProductDetails(null);
      } else {
        toast.error(data.message || 'Failed to submit request');
      }
    } catch (err) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getImageUrl = (images) => {
    if (!images || !images[0]) return null;
    const rawUrl = images[0].url || images[0];
    return typeof rawUrl === 'string' ? rawUrl.trim() : null;
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] py-16 px-4 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#4A3326] mb-4">Bulk & Wholesale Orders</h1>
          <p className="text-lg text-[#7C7370] max-w-2xl mx-auto">
            Elevate your corporate gifting, schools, and retail with eco-friendly, handcrafted wooden treasures.
            Designed for endurance, masterfully finished, and delivered with professional precision.
          </p>
          <div className="flex justify-center gap-8 mt-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#4A3326]">
              <ShieldCheck className="w-5 h-5" /> SUSTAINABLY SOURCED
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#4A3326]">
              <Package className="w-5 h-5" /> MASTER CRAFTSMANSHIP
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Form Section */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-[#E9DED3]">
            <h2 className="text-2xl font-serif font-bold text-[#4A3326] mb-6 border-b border-[#E9DED3] pb-4">Quick Bulk Order Form</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Product Selection */}
              <div className="space-y-4 bg-[#FAF4EF] p-4 rounded-xl border border-[#E9DED3]">
                <h3 className="text-sm font-bold text-[#4A3326] uppercase tracking-wider">Select Product</h3>
                
                <div>
                  <label className="block text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    disabled={isLoadingData}
                    className="w-full px-4 py-3 rounded-lg border border-[#E9DED3] bg-white focus:border-[#9C755A] focus:ring-1 focus:ring-[#9C755A] outline-none transition-all appearance-none"
                  >
                    <option value="">Select Category...</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">Sub Category</label>
                  <select
                    name="subCategory"
                    value={formData.subCategory}
                    onChange={handleChange}
                    required
                    disabled={!formData.category}
                    className="w-full px-4 py-3 rounded-lg border border-[#E9DED3] bg-white focus:border-[#9C755A] focus:ring-1 focus:ring-[#9C755A] outline-none transition-all appearance-none"
                  >
                    <option value="">Select Subcategory...</option>
                    {filteredSubCategories.map(sub => (
                      <option key={sub._id} value={sub._id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">Product</label>
                  <select
                    name="product"
                    value={formData.product}
                    onChange={handleChange}
                    required
                    disabled={!formData.subCategory}
                    className="w-full px-4 py-3 rounded-lg border border-[#E9DED3] bg-white focus:border-[#9C755A] focus:ring-1 focus:ring-[#9C755A] outline-none transition-all appearance-none"
                  >
                    <option value="">Select Product...</option>
                    {filteredProducts.map(prod => (
                      <option key={prod._id} value={prod._id}>{prod.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Oak & Iron Studio"
                    className="w-full px-4 py-3 rounded-lg border border-[#E9DED3] bg-[#FAF4EF] focus:bg-white focus:border-[#9C755A] focus:ring-1 focus:ring-[#9C755A] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">Contact Person</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    required
                    placeholder="Full Name"
                    className="w-full px-4 py-3 rounded-lg border border-[#E9DED3] bg-[#FAF4EF] focus:bg-white focus:border-[#9C755A] focus:ring-1 focus:ring-[#9C755A] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="name@company.com"
                    className="w-full px-4 py-3 rounded-lg border border-[#E9DED3] bg-[#FAF4EF] focus:bg-white focus:border-[#9C755A] focus:ring-1 focus:ring-[#9C755A] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 rounded-lg border border-[#E9DED3] bg-[#FAF4EF] focus:bg-white focus:border-[#9C755A] focus:ring-1 focus:ring-[#9C755A] outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">Estimated Order Quantity</label>
                <select
                  name="estimatedQuantity"
                  value={formData.estimatedQuantity}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-[#E9DED3] bg-[#FAF4EF] focus:bg-white focus:border-[#9C755A] focus:ring-1 focus:ring-[#9C755A] outline-none transition-all appearance-none"
                >
                  <option value="">Select volume range...</option>
                  <option value="50-100">50 - 100 units</option>
                  <option value="101-500">101 - 500 units</option>
                  <option value="501-1000">501 - 1000 units</option>
                  <option value="1000+">1000+ units</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">Customization Requests</label>
                <textarea
                  name="customizationRequests"
                  value={formData.customizationRequests}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Tell us about laser engraving, specific wood types (Oak, Walnut, Cedar), or custom dimensions required."
                  className="w-full px-4 py-3 rounded-lg border border-[#E9DED3] bg-[#FAF4EF] focus:bg-white focus:border-[#9C755A] focus:ring-1 focus:ring-[#9C755A] outline-none transition-all resize-none"
                ></textarea>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="customBranding"
                  name="customBranding"
                  checked={formData.customBranding}
                  onChange={handleChange}
                  className="w-5 h-5 text-[#4A3326] border-gray-300 rounded focus:ring-[#4A3326]"
                />
                <label htmlFor="customBranding" className="text-sm text-[#7C7370]">
                  I require custom branding/logo engraving on the products.
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#4A3326] text-white py-4 rounded-xl font-bold tracking-wider hover:bg-[#3A281E] transition-colors disabled:opacity-70 disabled:cursor-not-allowed uppercase"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
              </button>
            </form>
          </div>

          {/* Info Section */}
          <div className="space-y-6">
            
            {/* Display Product Details / Image if selected */}
            {selectedProductDetails ? (
              <div className="bg-white p-6 rounded-2xl border border-[#E9DED3] shadow-md transition-all">
                <h3 className="font-serif font-bold text-xl text-[#2E2E2E] mb-4">Selected Product</h3>
                <div className="rounded-xl overflow-hidden mb-4 bg-[#FAF4EF] aspect-square flex items-center justify-center">
                  {(() => {
                    let productImageUrl = null;
                    if (selectedProductDetails.images && selectedProductDetails.images.length > 0) {
                      productImageUrl = getImageUrl(selectedProductDetails.images);
                    } else if (selectedProductDetails.category && selectedProductDetails.category.image?.url) {
                      productImageUrl = selectedProductDetails.category.image.url;
                    } else if (selectedProductDetails.subCategory && selectedProductDetails.subCategory.image?.url) {
                      productImageUrl = selectedProductDetails.subCategory.image.url;
                    }
                    
                    return productImageUrl ? (
                      <img 
                        src={productImageUrl} 
                        alt={selectedProductDetails.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[#8A817C] font-medium">No Image Available</span>
                    );
                  })()}
                </div>
                <h4 className="font-bold text-[#4A3326] text-lg">{selectedProductDetails.name}</h4>
                <p className="text-sm text-[#7C7370] mt-2 line-clamp-2">{selectedProductDetails.shortDescription || selectedProductDetails.description || 'Premium handcrafted wooden product.'}</p>
                <div className="mt-4 flex gap-4">
                  <div className="px-3 py-1 bg-[#F9F6F0] rounded text-xs font-bold text-[#4A3326]">SKU: {selectedProductDetails.sku || 'N/A'}</div>
                </div>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl overflow-hidden relative group">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors z-10"></div>
                <img src="/wood-placeholder.png" alt="Premium Black Walnut" className="w-full h-64 object-cover scale-105 group-hover:scale-100 transition-transform duration-700" />
                <div className="absolute bottom-6 left-6 z-20 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 mb-1">Standard Material</p>
                  <p className="font-serif text-2xl font-bold">Premium Black Walnut</p>
                  <p className="text-sm mt-2 text-white/90">Select a product to view specific details.</p>
                </div>
              </div>
            )}

            <div className="bg-[#EBF3F8] p-6 rounded-2xl flex items-start gap-4">
              <div className="bg-[#4A3326] text-white p-3 rounded-xl shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#2E2E2E]">Volume Discounts</h3>
                <p className="text-[#7C7370] text-sm mt-1">Tiered pricing structures designed to support large-scale procurement for retail and distribution partners.</p>
              </div>
            </div>

            <div className="bg-[#EBF3F8] p-6 rounded-2xl flex items-start gap-4">
              <div className="bg-[#4A3326] text-white p-3 rounded-xl shrink-0">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#2E2E2E]">Custom Branding</h3>
                <p className="text-[#7C7370] text-sm mt-1">Precision laser engraving and custom milling to incorporate your corporate identity directly into the timber.</p>
              </div>
            </div>

            <div className="bg-[#EBF3F8] p-6 rounded-2xl flex items-start gap-4">
              <div className="bg-[#4A3326] text-white p-3 rounded-xl shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#2E2E2E]">Worldwide Shipping</h3>
                <p className="text-[#7C7370] text-sm mt-1">Fully insured global logistics network ensuring your bulk orders arrive safely and on schedule, wherever you are.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
