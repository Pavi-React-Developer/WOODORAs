import React, { useState, useEffect } from 'react';
import { Package, ShieldCheck, Truck, Droplets, Headset, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { catalogService } from '../api/catalogService';
import { productV2API } from '../api/catalogV2Service';
import { bulkOrderService } from '../api/bulkOrderService';
import { cmsService } from '../api/cmsService';
import { API_ORIGIN } from '../api/apiClient';

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
  const [banner, setBanner] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, subsRes, prodsRes, fieldsRes, bannerRes] = await Promise.all([
          catalogService.getCategories(),
          catalogService.getSubCategories(),
          productV2API.getAll({ limit: 1000 }),
          bulkOrderService.getAllFields(),
          cmsService.getBulkOrderBanner().catch(() => null)
        ]);
        // Extract data depending on API response format
        setCategories(catsRes?.data || catsRes || []);
        setSubCategories(subsRes?.data || subsRes || []);
        setProducts(prodsRes?.products || prodsRes?.data || prodsRes || []);
        if (fieldsRes?.success) {
          setDynamicFields(fieldsRes.data.filter(f => f.isActive));
        }
        if (bannerRes && bannerRes.data) {
          setBanner(bannerRes.data);
        }
      } catch (err) {
        console.error('Failed to load catalog data for bulk orders:', err);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const validateField = (fieldDef, value) => {
    let errorMsg = '';
    
    if (fieldDef.isRequired && (value === undefined || value === '' || value === false || value === null)) {
      return `${fieldDef.label} is required`;
    }

    if (value && typeof value === 'string') {
      const labelLower = fieldDef.label.toLowerCase();
      
      if (labelLower.includes('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errorMsg = 'Invalid email address';
      } else if (labelLower.includes('phone') && !/^\d{10}$/.test(value.replace(/\D/g, ''))) {
        errorMsg = 'Phone number must be exactly 10 digits';
      } else if ((labelLower.includes('name') || labelLower.includes('nmae')) && !/^[a-zA-Z\s]+$/.test(value)) {
        errorMsg = 'Name should only contain letters';
      }
    }
    return errorMsg;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      if (name === 'category') {
        newData.subCategory = '';
        newData.product = '';
        const filtered = subCategories.filter(sc => 
          sc.category?._id === value || sc.category === value
        );
        setFilteredSubCategories(filtered);
        setFilteredProducts([]);
        setSelectedProductDetails(null);
      }

      if (name === 'subCategory') {
        newData.product = '';
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
          
          setErrors(errs => ({ ...errs, [name]: validateField(fieldDef, newValue) }));
        }
        return newData;
      } else {
        setErrors(errs => ({ ...errs, [name]: value ? '' : 'This field is required' }));
      }

      return newData;
    });
  };

  const handleBlur = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('customField_')) {
      const fieldId = name.replace('customField_', '');
      const fieldDef = dynamicFields.find(f => f._id === fieldId);
      if (fieldDef) {
        const val = type === 'checkbox' ? checked : value;
        setErrors(prev => ({ ...prev, [name]: validateField(fieldDef, val) }));
      }
    } else if (['category', 'subCategory', 'product'].includes(name)) {
      setErrors(prev => ({ ...prev, [name]: value ? '' : 'This field is required' }));
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    if (!formData.category) { newErrors.category = 'Category is required'; isValid = false; }
    if (!formData.subCategory) { newErrors.subCategory = 'Subcategory is required'; isValid = false; }
    if (!formData.product) { newErrors.product = 'Product is required'; isValid = false; }

    for (const field of dynamicFields) {
      const submittedField = formData.customFields?.find(cf => cf.fieldId === field._id);
      const val = submittedField !== undefined ? submittedField.value : (field.type === 'checkbox' ? false : '');
      const err = validateField(field, val);
      if (err) {
        newErrors[`customField_${field._id}`] = err;
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await bulkOrderService.createBulkOrder(formData);
      if (data.success) {
        toast.success('Bulk order request submitted successfully!');
        setFormData({ category: '', subCategory: '', product: '', customFields: [] });
        setFilteredSubCategories([]);
        setFilteredProducts([]);
        setSelectedProductDetails(null);
        setErrors({});
      } else {
        toast.error(data.message || 'Failed to submit request');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred. Please try again.');
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
      imgSrc = `${API_ORIGIN}${imgSrc}`;
    }
    return typeof imgSrc === 'string' ? imgSrc.trim() : null;
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] py-16 px-4 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#A66C1C] mb-4">
            Bulk & Wholesale Orders
          </h1>
          <p className="text-lg text-[#7C7370] max-w-2xl mx-auto">
            Elevate your corporate gifting, schools, and retail with eco-friendly, handcrafted wooden treasures.
            Designed for endurance, masterfully finished, and delivered with professional precision.
          </p>
          <div className="flex justify-center gap-8 mt-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#A66C1C]">
              <ShieldCheck className="w-5 h-5" /> SUSTAINABLY SOURCED
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#A66C1C]">
              <Package className="w-5 h-5" /> MASTER CRAFTSMANSHIP
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Form Section */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-[#E9DED3]">
            <h2 className="text-2xl font-serif font-bold text-[#A66C1C] mb-6 border-b border-[#E9DED3] pb-4">Quick Bulk Order Form</h2>
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              
              {/* Product Selection */}
              <div className="space-y-4 bg-[#FAF4EF] p-4 rounded-xl border border-[#E9DED3]">
                <h3 className="text-sm font-bold text-[#A66C1C] uppercase tracking-wider">Select Product</h3>
                
                <div>
                  <label className="block text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">Category <span className="text-red-500">*</span></label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    disabled={isLoadingData}
                    className={`w-full px-4 py-3 rounded-lg border ${errors.category ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-[#E9DED3] focus:ring-[#9C755A] focus:border-[#9C755A]'} bg-white outline-none transition-all appearance-none`}
                  >
                    <option value="">Select Category...</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                  {errors.category && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.category}</p>}
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">Sub Category <span className="text-red-500">*</span></label>
                  <select
                    name="subCategory"
                    value={formData.subCategory}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    disabled={!formData.category}
                    className={`w-full px-4 py-3 rounded-lg border ${errors.subCategory ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-[#E9DED3] focus:ring-[#9C755A] focus:border-[#9C755A]'} bg-white outline-none transition-all appearance-none`}
                  >
                    <option value="">Select Subcategory...</option>
                    {filteredSubCategories.map(sub => (
                      <option key={sub._id} value={sub._id}>{sub.name}</option>
                    ))}
                  </select>
                  {errors.subCategory && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.subCategory}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">Product <span className="text-red-500">*</span></label>
                  <select
                    name="product"
                    value={formData.product}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    disabled={!formData.subCategory}
                    className={`w-full px-4 py-3 rounded-lg border ${errors.product ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-[#E9DED3] focus:ring-[#9C755A] focus:border-[#9C755A]'} bg-white outline-none transition-all appearance-none`}
                  >
                    <option value="">Select Product...</option>
                    {filteredProducts.map(prod => (
                      <option key={prod._id} value={prod._id}>{prod.name}</option>
                    ))}
                  </select>
                  {errors.product && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.product}</p>}
                </div>
              </div>

              {/* Dynamic Fields */}
              {dynamicFields.length > 0 && (
                <div className="pt-4 border-t border-[#E9DED3] space-y-4">
                  <h3 className="text-sm font-bold text-[#A66C1C] uppercase tracking-wider mb-2">Additional Information</h3>
                  {dynamicFields.map(field => {
                    const fieldValue = formData.customFields?.find(cf => cf.fieldId === field._id)?.value || (field.type === 'checkbox' ? false : '');
                    const fieldError = errors[`customField_${field._id}`];
                    
                    if (field.type === 'checkbox') {
                      return (
                        <div key={field._id}>
                          <div className={`flex items-center gap-3 p-3 rounded-lg ${fieldError ? 'border border-red-500 bg-red-50' : ''}`}>
                            <input
                              type="checkbox"
                              id={`customField_${field._id}`}
                              name={`customField_${field._id}`}
                              checked={fieldValue}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              className="w-5 h-5 text-[#A66C1C] border-gray-300 rounded focus:ring-[#A66C1C]"
                            />
                            <label htmlFor={`customField_${field._id}`} className="text-sm text-[#7C7370]">
                              {field.label} {field.isRequired && <span className="text-red-500">*</span>}
                            </label>
                          </div>
                          {fieldError && <p className="text-red-500 text-[10px] mt-1 font-medium">{fieldError}</p>}
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
                            onBlur={handleBlur}
                            required={field.isRequired}
                            className={`w-full px-4 py-3 rounded-lg border ${fieldError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-[#E9DED3] focus:ring-[#9C755A] focus:border-[#9C755A]'} bg-[#FAF4EF] focus:bg-white outline-none transition-all appearance-none`}
                          >
                            <option value="">Select option...</option>
                            {field.options?.map((opt, i) => (
                              <option key={i} value={opt}>{opt}</option>
                            ))}
                          </select>
                          {fieldError && <p className="text-red-500 text-[10px] mt-1 font-medium">{fieldError}</p>}
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
                          onBlur={handleBlur}
                          required={field.isRequired}
                          placeholder={field.placeholder || ''}
                          className={`w-full px-4 py-3 rounded-lg border ${fieldError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-[#E9DED3] focus:ring-[#9C755A] focus:border-[#9C755A]'} bg-[#FAF4EF] focus:bg-white outline-none transition-all`}
                        />
                        {fieldError && <p className="text-red-500 text-[10px] mt-1 font-medium">{fieldError}</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#A66C1C] text-white py-4 rounded-xl font-bold tracking-wider hover:bg-[#3A281E] transition-colors disabled:opacity-70 disabled:cursor-not-allowed uppercase"
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
                      <div className="w-full h-full flex items-center justify-center bg-[#F2EBE4] text-[#A66C1C]">
                        <Package className="w-12 h-12 opacity-50" />
                      </div>
                    );
                  })()}
                </div>
                <h4 className="font-bold text-[#A66C1C] text-lg">{selectedProductDetails.name}</h4>
                <p className="text-sm text-[#7C7370] mt-2 line-clamp-2">{selectedProductDetails.shortDescription || selectedProductDetails.description || 'Premium handcrafted wooden product.'}</p>
                <div className="mt-4 flex flex-col gap-1">
                  {(() => {
                    let listPrice = 0, salePrice = 0;
                    if (selectedProductDetails.hasVariants && selectedProductDetails.variants && selectedProductDetails.variants.length > 0) {
                      listPrice = Math.min(...selectedProductDetails.variants.map((v) => v.basePrice || v.price || 0));
                      salePrice = Math.min(...selectedProductDetails.variants.map((v) => v.discountPrice || v.salePrice || v.basePrice || v.price || 0));
                    } else {
                      listPrice = selectedProductDetails.basePrice || selectedProductDetails.compareAtPrice || selectedProductDetails.price || 0;
                      salePrice = selectedProductDetails.discountPrice || selectedProductDetails.salePrice || selectedProductDetails.price || listPrice;
                    }
                    const hasDiscount = salePrice < listPrice;
                    const discountPercent = hasDiscount ? Math.round(((listPrice - salePrice) / listPrice) * 100) : 0;

                    return (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl font-bold text-[#333333]">₹{Number(salePrice).toLocaleString()}</span>
                        {hasDiscount && (
                          <>
                            <span className="text-sm text-[#999999] line-through">₹{Number(listPrice).toLocaleString()}</span>
                            <span className="inline-flex items-center self-center rounded-full bg-[#B1621F]/15 px-2 py-0.5 text-[11px] font-semibold text-[#B1621F]">
                              -{discountPercent}%
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="mt-4 flex gap-4">
                  <div className="px-3 py-1 bg-[#F9F6F0] rounded text-xs font-bold text-[#A66C1C]">SKU: {selectedProductDetails.sku || 'N/A'}</div>
                </div>
              </div>
            ) : (
              <div 
                className={`rounded-3xl overflow-hidden relative shadow-sm border border-[#E9DED3] group bg-gradient-to-br from-[#FAF4EF] to-[#E9DED3] flex items-center justify-center bg-cover bg-center ${banner?.image ? 'min-h-[350px] p-8' : 'h-48'}`}
                style={banner?.image ? {
                  backgroundImage: `url(${typeof banner.image === 'string' ? banner.image : banner.image.url})`
                } : {}}
              >
                 {banner?.image && <div className="absolute inset-0 bg-black/30 z-0"></div>}
                 <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
                   {(banner ? banner.title : 'BULK ORDERS') ? (
                     <p className={`font-bold text-xl tracking-widest ${banner?.image ? 'text-white' : 'text-[#A66C1C] opacity-50'}`}>
                       {banner ? banner.title : 'BULK ORDERS'}
                     </p>
                   ) : null}
                   {banner?.description && (
                     <p className={`text-sm mt-2 max-w-xs ${banner?.image ? 'text-white/90' : 'text-[#7C7370]'}`}>
                       {banner.description}
                     </p>
                   )}
                 </div>
              </div>
            )}

            <div className="bg-[#EBF3F8] p-6 rounded-2xl flex items-start gap-4">
              <div className="bg-[#A66C1C] text-white p-3 rounded-xl shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#2E2E2E]">Volume Discounts</h3>
                <p className="text-[#7C7370] text-sm mt-1">Tiered pricing structures designed to support large-scale procurement for retail and distribution partners.</p>
              </div>
            </div>

            <div className="bg-[#EBF3F8] p-6 rounded-2xl flex items-start gap-4">
              <div className="bg-[#A66C1C] text-white p-3 rounded-xl shrink-0">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#2E2E2E]">Custom Branding</h3>
                <p className="text-[#7C7370] text-sm mt-1">Precision laser engraving and custom milling to incorporate your corporate identity directly into the timber.</p>
              </div>
            </div>

            <div className="bg-[#EBF3F8] p-6 rounded-2xl flex items-start gap-4">
              <div className="bg-[#A66C1C] text-white p-3 rounded-xl shrink-0">
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
