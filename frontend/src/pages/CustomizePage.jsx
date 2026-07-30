import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { User, MapPin, Package, UploadCloud, Edit3, HelpCircle } from 'lucide-react';
import { customizeService } from '../api/customizeService';
import { ImageUploader } from '../components/admin/ImageUploader';

// Extracted Components to prevent re-renders on every keystroke
const CardHeader = ({ icon: Icon, title }) => (
  <h2 className="text-lg font-bold text-[#7A4B3A] flex items-center gap-3 mb-5 border-b border-[#E9DED3] pb-3">
    <Icon className="w-5 h-5 text-[#9E6544]" /> {title}
  </h2>
);

const InputLabel = ({ label, required }) => (
  <label className="block text-xs font-semibold text-[#7A4B3A] mb-1.5">
    {label} {required && <span className="text-red-500">*</span>}
  </label>
);

const InputField = ({ type = "text", placeholder, value, onChange, onBlur, required, error }) => (
  <div>
    <input 
      type={type} required={required}
      value={value || ''} onChange={onChange} onBlur={onBlur}
      placeholder={placeholder}
      className={`w-full px-3 py-2.5 text-sm rounded-lg border ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-[#E9DED3] focus:ring-[#9E6544] focus:border-[#9E6544]'} bg-white transition-all text-gray-700`}
    />
    {error && <p className="text-red-500 text-[10px] mt-1 font-medium">{error}</p>}
  </div>
);

const SelectField = ({ options, placeholder, value, onChange, onBlur, required, error }) => (
  <div>
    <select
      required={required}
      value={value || ''} onChange={onChange} onBlur={onBlur}
      className={`w-full px-3 py-2.5 text-sm rounded-lg border ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-[#E9DED3] focus:ring-[#9E6544] focus:border-[#9E6544]'} bg-white transition-all text-gray-700`}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    {error && <p className="text-red-500 text-[10px] mt-1 font-medium">{error}</p>}
  </div>
);

export default function CustomizePage() {
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerInfo: { fullName: '', email: '', phone: '', company: '' },
    shippingAddress: { address: '', city: '', state: '', pinCode: '', country: '' },
    productDetails: {},
    images: [],
    notes: '',
    agreed: false
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const fields = await customizeService.getActiveFields();
      setCustomFields(fields);
      const initialDetails = {};
      fields.forEach(f => {
        initialDetails[f.label] = f.type === 'checkbox' ? false : '';
      });
      setFormData(prev => ({ ...prev, productDetails: initialDetails }));
    } catch (error) {
      toast.error('Failed to load customize fields');
    }
  };

  const validateField = (section, field, value) => {
    let errorMsg = '';
    
    if (section === 'customerInfo') {
      if (field === 'fullName') {
        if (!value.trim()) errorMsg = 'Full name is required';
        else if (!/^[a-zA-Z\s]+$/.test(value)) errorMsg = 'Name should only contain letters';
      }
      if (field === 'email') {
        if (!value.trim()) errorMsg = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errorMsg = 'Invalid email address';
      }
      if (field === 'phone') {
        if (!value.trim()) errorMsg = 'Phone number is required';
        else if (!/^\d{10}$/.test(value.replace(/\D/g, ''))) errorMsg = 'Phone number must be at least 10 digits';
      }
    }
    
    if (section === 'shippingAddress') {
      if (field === 'address' && !value.trim()) errorMsg = 'Street address is required';
      if (field === 'city' && !value.trim()) errorMsg = 'City is required';
      if (field === 'state' && !value.trim()) errorMsg = 'State is required';
      if (field === 'country' && !value.trim()) errorMsg = 'Country is required';
      if (field === 'pinCode') {
        if (!value.trim()) errorMsg = 'ZIP / Pincode is required';
        else if (!/^\d{5,6}$/.test(value)) errorMsg = 'Invalid ZIP / Pincode';
      }
    }

    if (section === 'productDetails') {
      const customField = customFields.find(f => f.label === field);
      if (customField && customField.isRequired && (value === '' || value === false)) {
        errorMsg = `${field} is required`;
      }
    }

    return errorMsg;
  };

  const handleChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    // Clear error dynamically as user types
    if (section) {
      setErrors(prev => ({
        ...prev,
        [`${section}.${field}`]: validateField(section, field, value)
      }));
    }
  };

  const handleBlur = (section, field, value) => {
    const errorMsg = validateField(section, field, value);
    setErrors(prev => ({ ...prev, [`${section}.${field}`]: errorMsg }));
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // Validate Customer Info
    Object.keys(formData.customerInfo).forEach(field => {
      const err = validateField('customerInfo', field, formData.customerInfo[field]);
      if (err) {
        newErrors[`customerInfo.${field}`] = err;
        isValid = false;
      }
    });

    // Validate Shipping Address
    Object.keys(formData.shippingAddress).forEach(field => {
      const err = validateField('shippingAddress', field, formData.shippingAddress[field]);
      if (err) {
        newErrors[`shippingAddress.${field}`] = err;
        isValid = false;
      }
    });

    // Validate Product Details
    customFields.forEach(field => {
      const err = validateField('productDetails', field.label, formData.productDetails[field.label]);
      if (err) {
        newErrors[`productDetails.${field.label}`] = err;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the validation errors before submitting.");
      return;
    }

    if (!formData.agreed) {
      toast.error("Please agree to the terms & conditions.");
      return;
    }
    
    setLoading(true);

    const formattedProductDetails = Object.entries(formData.productDetails).map(([label, value]) => ({
      label,
      value
    }));
    
    if (formData.notes) {
        formattedProductDetails.push({ label: 'Additional Notes', value: formData.notes });
    }

    try {
      await customizeService.submitRequest({
        customerInfo: formData.customerInfo,
        shippingAddress: formData.shippingAddress,
        productDetails: formattedProductDetails,
        images: formData.images
      });
      toast.success('Your customization request has been submitted successfully!');
      
      const resetDetails = {};
      customFields.forEach(f => {
        resetDetails[f.label] = f.type === 'checkbox' ? false : '';
      });

      setFormData({
        customerInfo: { fullName: '', email: '', phone: '', company: '' },
        shippingAddress: { address: '', city: '', state: '', pinCode: '', country: '' },
        productDetails: resetDetails,
        images: [],
        notes: '',
        agreed: false
      });
      setErrors({});
    } catch (error) {
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24 relative">
      <div className="h-64 bg-[#3B2920] relative overflow-hidden flex flex-col justify-center px-8 md:px-16 lg:px-32">
        <img src="/customize banner.jpeg" alt="Customize Banner" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Request a Custom Order</h1>
          <p className="text-[#D3C7BD] text-lg max-w-xl">Design your own handcrafted wooden toy. Share your idea, and we'll create it just for you.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 hidden md:flex items-center justify-center gap-4 text-xs font-semibold text-[#7A4B3A]">
        {['Customer Details', 'Shipping Address', 'Product Configuration', 'Upload & Notes', 'Submit Request'].map((step, idx) => (
          <React.Fragment key={step}>
            <div className={`flex items-center gap-2 ${idx > 2 ? 'opacity-50' : ''}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-[#9E6544] text-white' : 'border border-[#9E6544] text-[#9E6544]'}`}>{idx + 1}</span>
              {step}
            </div>
            {idx < 4 && <div className="border-t border-dashed border-[#D2C5BB] w-12 lg:w-20"></div>}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN */}
          <div className="space-y-8">
            <div className="bg-[#FAF8F5] rounded-2xl shadow-sm border border-[#E9DED3] p-6">
              <CardHeader icon={User} title="Customer Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <InputLabel label="Full Name" required />
                  <InputField 
                    value={formData.customerInfo.fullName} 
                    onChange={(e) => handleChange('customerInfo', 'fullName', e.target.value)} 
                    onBlur={(e) => handleBlur('customerInfo', 'fullName', e.target.value)}
                    placeholder="Enter full name" 
                    error={errors['customerInfo.fullName']}
                    required 
                  />
                </div>
                <div>
                  <InputLabel label="Email" required />
                  <InputField 
                    type="email" 
                    value={formData.customerInfo.email} 
                    onChange={(e) => handleChange('customerInfo', 'email', e.target.value)} 
                    onBlur={(e) => handleBlur('customerInfo', 'email', e.target.value)}
                    placeholder="Enter email address" 
                    error={errors['customerInfo.email']}
                    required 
                  />
                </div>
                <div>
                  <InputLabel label="Phone Number" required />
                  <InputField 
                    type="tel" 
                    value={formData.customerInfo.phone} 
                    onChange={(e) => handleChange('customerInfo', 'phone', e.target.value)} 
                    onBlur={(e) => handleBlur('customerInfo', 'phone', e.target.value)}
                    placeholder="Enter phone number" 
                    error={errors['customerInfo.phone']}
                    required 
                  />
                </div>
                <div>
                  <InputLabel label="Company Name (Optional)" />
                  <InputField 
                    value={formData.customerInfo.company} 
                    onChange={(e) => handleChange('customerInfo', 'company', e.target.value)} 
                    placeholder="Enter company name" 
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#FAF8F5] rounded-2xl shadow-sm border border-[#E9DED3] p-6">
              <CardHeader icon={Package} title="Product Configuration" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {customFields.map((field, idx) => (
                  <div key={idx} className={field.type === 'text' || field.type === 'dropdown' ? 'md:col-span-2' : ''}>
                    {field.type === 'checkbox' ? (
                      <div>
                        <label className={`flex items-center gap-3 p-4 bg-white rounded-xl border ${errors[`productDetails.${field.label}`] ? 'border-red-500' : 'border-[#E9DED3] hover:border-[#9E6544]'} cursor-pointer transition-colors`}>
                          <input
                            type="checkbox"
                            required={field.isRequired}
                            checked={formData.productDetails[field.label] || false}
                            onChange={(e) => handleChange('productDetails', field.label, e.target.checked)}
                            className="w-4 h-4 text-[#9E6544] rounded border-gray-300 focus:ring-[#9E6544]"
                          />
                          <span className="text-xs font-semibold text-gray-700">
                            {field.label} {field.isRequired && '*'}
                          </span>
                        </label>
                        {errors[`productDetails.${field.label}`] && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors[`productDetails.${field.label}`]}</p>}
                      </div>
                    ) : (
                      <>
                        <InputLabel label={field.label} required={field.isRequired} />
                        {field.type === 'dropdown' ? (
                          <SelectField 
                            value={formData.productDetails[field.label] || ''}
                            onChange={(e) => handleChange('productDetails', field.label, e.target.value)}
                            onBlur={(e) => handleBlur('productDetails', field.label, e.target.value)}
                            options={field.options} 
                            placeholder={`Select ${field.label.toLowerCase()}`} 
                            required={field.isRequired} 
                            error={errors[`productDetails.${field.label}`]}
                          />
                        ) : (
                          <InputField 
                            value={formData.productDetails[field.label] || ''}
                            onChange={(e) => handleChange('productDetails', field.label, e.target.value)}
                            onBlur={(e) => handleBlur('productDetails', field.label, e.target.value)}
                            placeholder={`Enter ${field.label.toLowerCase()}`} 
                            required={field.isRequired} 
                            error={errors[`productDetails.${field.label}`]}
                          />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-8">
            <div className="bg-[#FAF8F5] rounded-2xl shadow-sm border border-[#E9DED3] p-6">
              <CardHeader icon={MapPin} title="Shipping Address" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <InputLabel label="Street Address" required />
                  <InputField 
                    value={formData.shippingAddress.address} 
                    onChange={(e) => handleChange('shippingAddress', 'address', e.target.value)} 
                    onBlur={(e) => handleBlur('shippingAddress', 'address', e.target.value)}
                    placeholder="Enter street address" 
                    error={errors['shippingAddress.address']}
                    required 
                  />
                </div>
                <div>
                  <InputLabel label="City" required />
                  <InputField 
                    value={formData.shippingAddress.city} 
                    onChange={(e) => handleChange('shippingAddress', 'city', e.target.value)} 
                    onBlur={(e) => handleBlur('shippingAddress', 'city', e.target.value)}
                    placeholder="Enter city" 
                    error={errors['shippingAddress.city']}
                    required 
                  />
                </div>
                <div>
                  <InputLabel label="State" required />
                  <InputField 
                    value={formData.shippingAddress.state} 
                    onChange={(e) => handleChange('shippingAddress', 'state', e.target.value)} 
                    onBlur={(e) => handleBlur('shippingAddress', 'state', e.target.value)}
                    placeholder="Enter state" 
                    error={errors['shippingAddress.state']}
                    required 
                  />
                </div>
                <div>
                  <InputLabel label="Country" required />
                  <SelectField 
                    value={formData.shippingAddress.country} 
                    onChange={(e) => handleChange('shippingAddress', 'country', e.target.value)} 
                    onBlur={(e) => handleBlur('shippingAddress', 'country', e.target.value)}
                    options={['India', 'United States', 'United Kingdom', 'Australia']} 
                    placeholder="Select country" 
                    error={errors['shippingAddress.country']}
                    required 
                  />
                </div>
                <div>
                  <InputLabel label="ZIP / Pincode" required />
                  <InputField 
                    value={formData.shippingAddress.pinCode} 
                    onChange={(e) => handleChange('shippingAddress', 'pinCode', e.target.value)} 
                    onBlur={(e) => handleBlur('shippingAddress', 'pinCode', e.target.value)}
                    placeholder="Enter pincode" 
                    error={errors['shippingAddress.pinCode']}
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#FAF8F5] rounded-2xl shadow-sm border border-[#E9DED3] p-6">
              <h2 className="text-lg font-bold text-[#7A4B3A] flex items-center gap-3 mb-2">
                <UploadCloud className="w-5 h-5 text-[#9E6544]" /> Reference Upload
              </h2>
              <p className="text-xs text-gray-500 mb-5 pb-3 border-b border-[#E9DED3]">Upload any reference images, sketches or documents that will help us understand your requirement better.</p>
              
              <div className="bg-white p-4 rounded-xl border border-[#E9DED3]">
                 <ImageUploader
                    images={formData.images}
                    onChange={(newImages) => setFormData(prev => ({ ...prev, images: newImages }))}
                    maxImages={5}
                 />
              </div>
            </div>
          </div>
        </div>

        {/* FULL WIDTH SECTIONS */}
        <div className="bg-[#FAF8F5] rounded-2xl shadow-sm border border-[#E9DED3] p-6">
          <h2 className="text-lg font-bold text-[#7A4B3A] flex items-center gap-3 mb-2">
            <Edit3 className="w-5 h-5 text-[#9E6544]" /> Additional Notes
          </h2>
          <p className="text-xs text-gray-500 mb-5 pb-3 border-b border-[#E9DED3]">Describe your custom wooden toy, preferred colors, size, engraving, or any other special requirements.</p>
          
          <textarea 
            value={formData.notes} onChange={(e) => handleChange(null, 'notes', e.target.value)}
            rows="4" className="w-full px-4 py-3 text-sm rounded-lg border border-[#E9DED3] focus:ring-1 focus:ring-[#9E6544] focus:border-[#9E6544] bg-white resize-none" placeholder="Enter your notes here..."
          ></textarea>
          <div className="text-right text-[10px] text-gray-400 mt-1">{formData.notes.length}/1000</div>
        </div>

        <div className="flex flex-col items-center gap-6 pb-10">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" required checked={formData.agreed} onChange={(e) => handleChange(null, 'agreed', e.target.checked)} className="w-4 h-4 text-[#9E6544] rounded border-gray-300 focus:ring-[#9E6544]" />
            <span className="text-xs font-semibold text-gray-600">I confirm that the above details are correct and agree to the <span className="text-[#9E6544]">terms & conditions</span>.</span>
          </label>
          <button type="submit" disabled={loading} className="px-10 py-3.5 bg-[#9E6544] hover:bg-[#7A4B3A] text-white font-bold tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            {loading ? 'Submitting...' : 'Request a Quote'}
          </button>
        </div>

      </form>
    </div>
  );
}

