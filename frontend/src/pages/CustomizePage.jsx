import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { customizeService } from '../api/customizeService';
import { Ruler, TreePine, Package, User, MapPin, Mail, Phone, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { ImageUploader } from '../components/admin/ImageUploader';

export default function CustomizePage() {
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerInfo: { fullName: '', email: '', phone: '' },
    shippingAddress: { address: '', city: '', state: '', pinCode: '' },
    productDetails: {},
    images: []
  });

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const fields = await customizeService.getActiveFields();
      setCustomFields(fields);
      // Initialize product details state for these fields
      const initialDetails = {};
      fields.forEach(f => {
        initialDetails[f.label] = f.type === 'checkbox' ? false : '';
      });
      setFormData(prev => ({ ...prev, productDetails: initialDetails }));
    } catch (error) {
      toast.error('Failed to load customize fields');
    }
  };

  const handleChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Transform productDetails object to array of {label, value}
    const formattedProductDetails = Object.entries(formData.productDetails).map(([label, value]) => ({
      label,
      value
    }));

    try {
      await customizeService.submitRequest({
        ...formData,
        productDetails: formattedProductDetails
      });
      toast.success('Your customization request has been submitted successfully! We will contact you soon.');
      
      const resetDetails = {};
      customFields.forEach(f => {
        resetDetails[f.label] = f.type === 'checkbox' ? false : '';
      });

      setFormData({
        customerInfo: { fullName: '', email: '', phone: '' },
        shippingAddress: { address: '', city: '', state: '', pinCode: '' },
        productDetails: resetDetails,
        images: []
      });
    } catch (error) {
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-[#E9DED3]">
        <div className="bg-[#4A3326] px-8 py-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
          <h1 className="text-3xl font-bold text-white mb-2 relative z-10">Request a Custom Order</h1>
          <p className="text-[#D3C7BD] text-lg relative z-10">Fill out the details below and we'll craft the perfect wooden toy for you.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Customer Info Section */}
          <section>
            <h2 className="text-xl font-bold text-[#4A3326] flex items-center gap-2 mb-4 border-b border-[#E9DED3] pb-2">
              <User className="w-5 h-5 text-[#B0611C]" /> Customer Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#7D7065] mb-1">Full Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-[#C1B2A5]" />
                  </div>
                  <input required type="text" value={formData.customerInfo.fullName} onChange={(e) => handleChange('customerInfo', 'fullName', e.target.value)} className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E9DED3] focus:ring-2 focus:ring-[#B0611C] focus:border-[#B0611C] bg-[#FDFBF7] transition-all" placeholder="John Doe" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#7D7065] mb-1">Email *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-[#C1B2A5]" />
                  </div>
                  <input required type="email" value={formData.customerInfo.email} onChange={(e) => handleChange('customerInfo', 'email', e.target.value)} className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E9DED3] focus:ring-2 focus:ring-[#B0611C] focus:border-[#B0611C] bg-[#FDFBF7] transition-all" placeholder="john@example.com" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#7D7065] mb-1">Phone Number *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-[#C1B2A5]" />
                  </div>
                  <input required type="tel" value={formData.customerInfo.phone} onChange={(e) => handleChange('customerInfo', 'phone', e.target.value)} className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E9DED3] focus:ring-2 focus:ring-[#B0611C] focus:border-[#B0611C] bg-[#FDFBF7] transition-all" placeholder="+1 (555) 000-0000" />
                </div>
              </div>
            </div>
          </section>

          {/* Shipping Address Section */}
          <section>
            <h2 className="text-xl font-bold text-[#4A3326] flex items-center gap-2 mb-4 border-b border-[#E9DED3] pb-2">
              <MapPin className="w-5 h-5 text-[#B0611C]" /> Shipping Address
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#7D7065] mb-1">Street Address *</label>
                <input required type="text" value={formData.shippingAddress.address} onChange={(e) => handleChange('shippingAddress', 'address', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#E9DED3] focus:ring-2 focus:ring-[#B0611C] focus:border-[#B0611C] bg-[#FDFBF7] transition-all" placeholder="123 Main St, Apt 4B" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#7D7065] mb-1">City *</label>
                <input required type="text" value={formData.shippingAddress.city} onChange={(e) => handleChange('shippingAddress', 'city', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#E9DED3] focus:ring-2 focus:ring-[#B0611C] focus:border-[#B0611C] bg-[#FDFBF7] transition-all" placeholder="New York" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#7D7065] mb-1">State *</label>
                <input required type="text" value={formData.shippingAddress.state} onChange={(e) => handleChange('shippingAddress', 'state', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#E9DED3] focus:ring-2 focus:ring-[#B0611C] focus:border-[#B0611C] bg-[#FDFBF7] transition-all" placeholder="NY" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#7D7065] mb-1">ZIP / Pincode *</label>
                <input required type="text" value={formData.shippingAddress.pinCode} onChange={(e) => handleChange('shippingAddress', 'pinCode', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#E9DED3] focus:ring-2 focus:ring-[#B0611C] focus:border-[#B0611C] bg-[#FDFBF7] transition-all" placeholder="10001" />
              </div>
            </div>
          </section>

          {/* Product Details Section */}
          <section>
            <h2 className="text-xl font-bold text-[#4A3326] flex items-center gap-2 mb-4 border-b border-[#E9DED3] pb-2">
              <Package className="w-5 h-5 text-[#B0611C]" /> Product Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {customFields.map((field, idx) => (
                <div key={idx} className={field.type === 'text' || field.type === 'dropdown' ? 'md:col-span-2' : ''}>
                  {field.type === 'checkbox' ? (
                    <label className="flex items-center gap-3 p-4 bg-[#FDFBF7] rounded-xl border border-[#E9DED3] cursor-pointer hover:border-[#B0611C] transition-colors">
                      <input 
                        type="checkbox" 
                        required={field.isRequired}
                        checked={formData.productDetails[field.label] || false}
                        onChange={(e) => handleChange('productDetails', field.label, e.target.checked)}
                        className="w-5 h-5 text-[#B0611C] rounded border-gray-300 focus:ring-[#B0611C]"
                      />
                      <span className="text-sm font-medium text-[#4A3326]">
                        {field.label} {field.isRequired && '*'}
                      </span>
                    </label>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-[#7D7065] mb-1">
                        {field.label} {field.isRequired && '*'}
                      </label>
                      
                      {field.type === 'dropdown' ? (
                        <select 
                          required={field.isRequired} 
                          value={formData.productDetails[field.label] || ''} 
                          onChange={(e) => handleChange('productDetails', field.label, e.target.value)} 
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E9DED3] focus:ring-2 focus:ring-[#B0611C] bg-[#FDFBF7] appearance-none text-[#4A3326]"
                        >
                          <option value="" disabled>Select {field.label.toLowerCase()}</option>
                          {field.options.map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input 
                          type="text" 
                          required={field.isRequired} 
                          value={formData.productDetails[field.label] || ''} 
                          onChange={(e) => handleChange('productDetails', field.label, e.target.value)} 
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E9DED3] focus:ring-2 focus:ring-[#B0611C] bg-[#FDFBF7] transition-all" 
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      )}
                    </>
                  )}
                </div>
              ))}

              <div className="md:col-span-2 mt-4">
                <label className="block text-sm font-medium text-[#7D7065] mb-2 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#C1B2A5]" />
                  Reference Images (Max 5)
                </label>
                <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#E9DED3]">
                  <ImageUploader 
                    images={formData.images} 
                    onChange={(newImages) => setFormData(prev => ({ ...prev, images: newImages }))} 
                    maxImages={5} 
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={loading} className="px-8 py-3 bg-[#B0611C] hover:bg-[#9C5516] text-white font-medium rounded-xl shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center">
              {loading ? 'Submitting...' : 'Request Quote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
