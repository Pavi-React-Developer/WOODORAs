import React, { useState, useEffect } from 'react';
import { Package, ShieldCheck, Truck, Droplets } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { catalogService } from '../api/catalogService';
import { productV2API } from '../api/catalogV2Service';
import { bulkOrderService } from '../api/bulkOrderService';

export default function BulkOrderPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    category: '',
    subCategory: '',
    product: '',
    customFields: []
  });
  
  const [dynamicFields, setDynamicFields] = useState([]);
  
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
        const [catsRes, subsRes, prodsRes, fieldsRes] = await Promise.all([
          catalogService.getCategories(),
          catalogService.getSubCategories(),
          productV2API.getAll({ limit: 1000 }),
          bulkOrderService.getAllFields()
        ]);
        // Extract data depending on API response format
        setCategories(catsRes?.data || catsRes || []);
        setSubCategories(subsRes?.data || subsRes || []);
        setProducts(prodsRes?.products || prodsRes?.data || prodsRes || []);
        if (fieldsRes?.success) {
          setDynamicFields(fieldsRes.data.filter(f => f.isActive));
        }
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

      if (name.startsWith('customField_')) {
        const fieldId = name.replace('customField_', '');
        const fieldDef = dynamicFields.find(f => f._id === fieldId);
        if (fieldDef) {
          let updatedCustomFields = [...(prev.customFields || [])];
          const existingIndex = updatedCustomFields.findIndex(cf => cf.fieldId === fieldId);
          const newValue = type === 'checkbox' ? checked : value;

          if (existingIndex >= 0) {
            updatedCustomFields[existingIndex].value = newValue;
          } else {
            updatedCustomFields.push({ fieldId, label: fieldDef.label, value: newValue });
          }
          newData.customFields = updatedCustomFields;
        }
        return newData;
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

      // Validate dynamic fields
      for (const field of dynamicFields) {
        if (field.isRequired) {
          const submittedField = formData.customFields?.find(cf => cf.fieldId === field._id);
          if (!submittedField || submittedField.value === '' || submittedField.value === false) {
            toast.error(`${field.label} is required`);
            setIsSubmitting(false);
            return;
          }
        }
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
          category: '',
          subCategory: '',
          product: '',
          customFields: []
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

  const getImageUrl = (prod) => {
    if (!prod) return null;
    let imgSrc = prod.images?.find(img => img.isThumbnail)?.url 
              || prod.images?.[0]?.url 
              || (typeof prod.images?.[0] === 'string' ? prod.images[0] : null)
              || prod.image?.url 
              || (typeof prod.image === 'string' ? prod.image : null) 
              || null;
    if (imgSrc && typeof imgSrc === 'string' && imgSrc.startsWith('/uploads')) {
      imgSrc = `http://localhost:5000${imgSrc}`;
    }
    return typeof imgSrc === 'string' ? imgSrc.trim() : null;
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

              {/* Dynamic Fields */}
              {dynamicFields.length > 0 && (
                <div className="pt-4 border-t border-[#E9DED3] space-y-4">
                  <h3 className="text-sm font-bold text-[#4A3326] uppercase tracking-wider mb-2">Additional Information</h3>
                  {dynamicFields.map(field => {
                    const fieldValue = formData.customFields?.find(cf => cf.fieldId === field._id)?.value || (field.type === 'checkbox' ? false : '');
                    
                    if (field.type === 'checkbox') {
                      return (
                        <div key={field._id} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`customField_${field._id}`}
                            name={`customField_${field._id}`}
                            checked={fieldValue}
                            onChange={handleChange}
                            className="w-5 h-5 text-[#4A3326] border-gray-300 rounded focus:ring-[#4A3326]"
                          />
                          <label htmlFor={`customField_${field._id}`} className="text-sm text-[#7C7370]">
                            {field.label} {field.isRequired && <span className="text-red-500">*</span>}
                          </label>
                        </div>
                      );
                    }

                    if (field.type === 'dropdown') {
                      return (
                        <div key={field._id}>
                          <label className="block text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">
                            {field.label} {field.isRequired && <span className="text-red-500">*</span>}
                          </label>
                          <select
                            name={`customField_${field._id}`}
                            value={fieldValue}
                            onChange={handleChange}
                            required={field.isRequired}
                            className="w-full px-4 py-3 rounded-lg border border-[#E9DED3] bg-[#FAF4EF] focus:bg-white focus:border-[#9C755A] focus:ring-1 focus:ring-[#9C755A] outline-none transition-all appearance-none"
                          >
                            <option value="">Select option...</option>
                            {field.options?.map((opt, i) => (
                              <option key={i} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    return (
                      <div key={field._id}>
                        <label className="block text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">
                          {field.label} {field.isRequired && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          name={`customField_${field._id}`}
                          value={fieldValue}
                          onChange={handleChange}
                          required={field.isRequired}
                          placeholder={field.placeholder || ''}
                          className="w-full px-4 py-3 rounded-lg border border-[#E9DED3] bg-[#FAF4EF] focus:bg-white focus:border-[#9C755A] focus:ring-1 focus:ring-[#9C755A] outline-none transition-all"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

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
              <div 
                onClick={() => navigate(`/product/${selectedProductDetails.slug || selectedProductDetails._id}`)}
                className="bg-white p-6 rounded-2xl border border-[#E9DED3] shadow-md transition-all cursor-pointer hover:border-[#9C755A] group"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-serif font-bold text-xl text-[#2E2E2E]">Selected Product</h3>
                  <span className="text-xs font-bold text-[#9A6031] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    View Details
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden mb-4 bg-[#FAF4EF] aspect-square flex items-center justify-center">
                  {(() => {
                    let productImageUrl = getImageUrl(selectedProductDetails);
                    if (!productImageUrl && selectedProductDetails.category) {
                      productImageUrl = getImageUrl(selectedProductDetails.category);
                    }
                    if (!productImageUrl && selectedProductDetails.subCategory) {
                      productImageUrl = getImageUrl(selectedProductDetails.subCategory);
                    }
                    
                    return productImageUrl ? (
                      <img 
                        src={productImageUrl} 
                        alt={selectedProductDetails.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img 
                        src="/wood-placeholder.png" 
                        alt="Placeholder" 
                        className="w-full h-full object-cover opacity-60 mix-blend-multiply"
                      />
                    );
                  })()}
                </div>
                <h4 className="font-bold text-[#4A3326] text-lg">{selectedProductDetails.name}</h4>
                <p className="text-sm text-[#7C7370] mt-2 line-clamp-2">{selectedProductDetails.shortDescription || selectedProductDetails.description || 'Premium handcrafted wooden product.'}</p>
                <div className="mt-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-bold text-[#333333]">₹{Number(selectedProductDetails.price || 0).toLocaleString()}</span>
                    {selectedProductDetails.compareAtPrice > selectedProductDetails.price && (
                      <>
                        <span className="text-sm text-[#999999] line-through">₹{Number(selectedProductDetails.compareAtPrice).toLocaleString()}</span>
                        <span className="inline-flex items-center self-center rounded-full bg-[#B1621F]/15 px-2 py-0.5 text-[11px] font-semibold text-[#B1621F]">
                          -{Math.round(((selectedProductDetails.compareAtPrice - selectedProductDetails.price) / selectedProductDetails.compareAtPrice) * 100)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
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
