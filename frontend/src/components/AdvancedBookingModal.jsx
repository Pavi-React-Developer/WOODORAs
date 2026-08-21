import React, { useState } from 'react';
import { X } from 'lucide-react';
import { advancedBookingService } from '../api/advancedBookingService';
import toast from 'react-hot-toast';

export default function AdvancedBookingModal({ isOpen, onClose, product, selectedVariants }) {
  const [formData, setFormData] = useState({
    quantity: 1,
    customerName: '',
    phoneNo: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.customerName.trim()) newErrors.customerName = 'Name is required';
    if (!formData.phoneNo.trim()) {
      newErrors.phoneNo = 'Phone number is required';
    } else if (!/^\d{10,15}$/.test(formData.phoneNo.replace(/\D/g, ''))) {
      newErrors.phoneNo = 'Please enter a valid phone number';
    }
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (formData.quantity < 1) newErrors.quantity = 'Quantity must be at least 1';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        product: product._id,
        category: product.category?.name || 'Uncategorized',
        subCategory: product.subCategory?.name || '',
        productName: product.name,
        productImage: typeof product.images?.[0] === 'string' ? product.images[0] : (product.images?.[0]?.url || product.images?.[0]?.image || ''),
        price: product.price,
        variants: selectedVariants,
        quantity: parseInt(formData.quantity, 10),
        customerName: formData.customerName,
        phoneNo: formData.phoneNo,
        address: formData.address
      };

      await advancedBookingService.createBooking(payload);
      toast.success('Advanced booking requested successfully!');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to submit booking');
    } finally {
      setLoading(false);
    }
  };

  // Get first image for preview
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const rawImage = typeof product.images?.[0] === 'string' ? product.images[0] : (product.images?.[0]?.url || product.images?.[0]?.image || '');
  const imageUrl = typeof rawImage === 'string' && rawImage.startsWith('http')
    ? rawImage
    : rawImage
      ? `${API_BASE}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`
      : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#FAF8F5] rounded-[24px] shadow-2xl w-full max-w-[550px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 md:px-8 border-b border-[#E6DFD4] bg-white">
          <h2 className="text-2xl font-serif font-bold tracking-tight text-[#141225]">Advanced Booking</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
          
          {/* Product Summary */}
          <div className="flex gap-4 items-center bg-white p-4 rounded-[16px] border border-[#E9DED3] mb-6 shadow-sm">
            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-[#F3E7D7] flex items-center justify-center border border-[#E6DFD4]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-[#8A817C]">No Image</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#8A817C] mb-1">
                {product.category?.name || 'Category'} {product.subCategory?.name && `> ${product.subCategory.name}`}
              </p>
              <h4 className="text-base font-bold text-[#141225] line-clamp-1 mb-1">{product.name}</h4>
              <p className="text-lg font-black text-[#A7632E]">₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Selected Variants */}
          {Object.keys(selectedVariants).length > 0 && (
            <div className="bg-[#F6F1E5]/50 p-4 rounded-[16px] border border-[#E9DED3]/50 mb-6 flex flex-wrap gap-3">
              {Object.entries(selectedVariants).map(([key, val]) => (
                <div key={key} className="bg-white px-3 py-1.5 rounded-lg border border-[#E6DFD4] text-xs">
                  <span className="font-semibold text-[#8A817C] mr-1">{key}:</span>
                  <span className="font-bold text-[#141225]">{val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Booking Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-[#4A403B] mb-1.5">Quantity <span className="text-red-500">*</span></label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                min="1"
                placeholder="Enter quantity"
                className={`w-full rounded-[10px] border ${errors.quantity ? 'border-red-300 focus:border-red-500' : 'border-[#E9DED3] focus:border-[#9A6031]'} px-4 py-3 text-sm text-[#141225] bg-white placeholder:text-[#A9A09B] focus:outline-none focus:ring-1 focus:ring-[#9A6031] transition-colors`}
              />
              {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-[#4A403B] mb-1.5">Customer Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                className={`w-full rounded-[10px] border ${errors.customerName ? 'border-red-300 focus:border-red-500' : 'border-[#E9DED3] focus:border-[#9A6031]'} px-4 py-3 text-sm text-[#141225] bg-white placeholder:text-[#A9A09B] focus:outline-none focus:ring-1 focus:ring-[#9A6031] transition-colors`}
              />
              {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-[#4A403B] mb-1.5">Phone Number <span className="text-red-500">*</span></label>
              <input
                type="tel"
                name="phoneNo"
                value={formData.phoneNo}
                onChange={handleInputChange}
                placeholder="Enter your mobile number"
                className={`w-full rounded-[10px] border ${errors.phoneNo ? 'border-red-300 focus:border-red-500' : 'border-[#E9DED3] focus:border-[#9A6031]'} px-4 py-3 text-sm text-[#141225] bg-white placeholder:text-[#A9A09B] focus:outline-none focus:ring-1 focus:ring-[#9A6031] transition-colors`}
              />
              {errors.phoneNo && <p className="text-xs text-red-500 mt-1">{errors.phoneNo}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-[#4A403B] mb-1.5">Shipping Address <span className="text-red-500">*</span></label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter full shipping address"
                rows="3"
                className={`w-full rounded-[10px] border ${errors.address ? 'border-red-300 focus:border-red-500' : 'border-[#E9DED3] focus:border-[#9A6031]'} px-4 py-3 text-sm text-[#141225] bg-white placeholder:text-[#A9A09B] focus:outline-none focus:ring-1 focus:ring-[#9A6031] transition-colors resize-none`}
              />
              {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
            </div>

            <div className="pt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 flex items-center justify-center h-[3.5rem] border border-red-200 rounded-full text-[15px] font-bold text-red-600 bg-white hover:bg-red-50 transition-colors shadow-sm uppercase tracking-wide"
                disabled={loading}
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={loading}
                className="admin-btn flex-1 !h-[3.5rem] rounded-full text-[15px] font-bold disabled:opacity-70 flex justify-center items-center uppercase tracking-wide shadow-sm"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  'CONFIRM BOOKING'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
