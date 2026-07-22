import React, { useState, useEffect } from 'react';
import useCartStore from '../store/useCartStore';
import { orderService } from '../api/orderService';
import { authService } from '../api/authService';
import { ArrowLeft, Plus, Minus, MapPin, Trash2, Edit2, CreditCard, Banknote, Loader2, CheckCircle2, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import { stateDistricts } from '../utils/indiaStates';
import { feeAPI } from '../api/feeService';
import { adminService } from '../api/adminService';
import { createCashfreeSession } from '../api/cashfreeService';
import { calculateOrderFees } from '../utils/feeCalculator';
import { getImageSrc } from '../utils/imageUtils';
import CouponSection from '../components/CouponSection';
import LoginModal from '../components/LoginModal';

export default function CompleteOrderPage({ onNavigate, user, onAuthSuccess }) {
  const { cartItems, getSubtotal, clearCart, updateQuantity } = useCartStore();

  const handleQtyChange = (productId, newQty, variant = null, maxStock = 999) => {
    if (newQty >= 1 && newQty <= maxStock) {
      updateQuantity(productId, newQty, variant);
    }
  };

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [editingAddressIndex, setEditingAddressIndex] = useState(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fees, setFees] = useState([]);
  const [productFeeRules, setProductFeeRules] = useState([]);
  const [giftBoxRules, setGiftBoxRules] = useState([]);
  const [cityError, setCityError] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const currentUser = user || authService.getCurrentUser();

  // Form state
  const [formData, setFormData] = useState({
    fullName: currentUser?.name || '',
    address: '',
    city: '',
    state: '',
    customState: '',
    pinCode: '',
    phone: '',
    landmark: ''
  });

  const availableDistricts = formData.state ? stateDistricts[formData.state] || [] : [];

  useEffect(() => {
    if (cartItems.length === 0) {
      onNavigate('/');
    }

    // Load saved addresses
    const loadAddresses = async () => {
      let loadedAddresses = [];
      if (authService.isAuthenticated()) {
        try {
          const profile = await authService.getProfile();
          if (profile?.user?.addresses?.length > 0) {
            loadedAddresses = profile.user.addresses;
            localStorage.setItem('wooden_toys_addresses', JSON.stringify(loadedAddresses));
          }
        } catch (error) {
          console.error('Failed to load profile addresses', error);
        }
      }

      if (loadedAddresses.length === 0) {
        loadedAddresses = JSON.parse(localStorage.getItem('wooden_toys_addresses') || '[]');
      }

      setSavedAddresses(loadedAddresses);
      if (loadedAddresses.length === 0) {
        setIsAddingAddress(true);
      }
    };

    loadAddresses();

    // Fetch fees
    const fetchFees = async () => {
      try {
        const [feesData, productRules, giftRules] = await Promise.all([
          feeAPI.getAllFees(),
          feeAPI.getProductFeeRules().catch(() => []),
          adminService.getGiftBoxRules().catch(() => [])
        ]);
        setFees(feesData || []);
        setProductFeeRules(productRules || []);
        setGiftBoxRules(giftRules || []);
      } catch (err) {
        console.error('Error fetching fees', err);
      }
    };
    fetchFees();
  }, [cartItems, onNavigate]);

  const subtotal = getSubtotal();

  const currentState = savedAddresses.length > 0 && !isAddingAddress
    ? savedAddresses[selectedAddressIndex]?.state
    : formData.state;

  const feeSummary = calculateOrderFees({
    fees,
    subtotal,
    items: cartItems,
    state: currentState,
    paymentMethod,
  });
  const { totalWeight, shippingCharge, codAdvance, extraFeesList, appliedFees } = feeSummary;
  const extraChargeSum = extraFeesList.reduce((sum, fee) => sum + fee.amount, 0);
  const discountedSubtotal = Math.max(subtotal - discountAmount, 0);

  // Calculate dynamic gift box fee and product fee
  let dynamicGiftBoxFee = 0;
  let dynamicProductFee = 0;

  cartItems.forEach(item => {
    // Calculate volume: length * width * height
    let volume = 0;
    if (item.dimensions && item.dimensions.length && item.dimensions.width && item.dimensions.height) {
      volume = item.dimensions.length * item.dimensions.width * item.dimensions.height;
    }

    // Product and Gift Fees
    if (item.isGift) {
      // Gift Fee
      const gRule = giftBoxRules.find(r => r.isActive && volume >= r.minVolume && volume <= r.maxVolume);
      if (gRule) {
         dynamicGiftBoxFee += (gRule.fee * item.qty);
      } else if (item.giftBox && item.giftBox.giftFee) {
         // Fallback to legacy
         dynamicGiftBoxFee += (Number(item.giftBox.giftFee) * item.qty);
      }
    } else {
      // Product Fee (only applies if NOT a gift)
      const pRule = productFeeRules.find(r => r.isActive && volume >= r.minVolume && volume <= r.maxVolume);
      if (pRule) {
        dynamicProductFee += (pRule.fee * item.qty);
      }
    }
  });

  if (dynamicProductFee > 0 && !appliedFees.some(f => f.name === 'Product Fee')) {
    appliedFees.push({ name: 'Product Fee', amount: dynamicProductFee });
  }

  if (dynamicGiftBoxFee > 0 && !appliedFees.some(f => f.name === 'Gift Box Fee')) {
    appliedFees.push({ name: 'Gift Box Fee', amount: dynamicGiftBoxFee });
  }

  const orderTotal = discountedSubtotal + shippingCharge + extraChargeSum + dynamicGiftBoxFee + dynamicProductFee;
  const isCodAdvance = paymentMethod === 'COD' && codAdvance > 0;
  const balanceAmount = isCodAdvance ? (orderTotal - codAdvance) : 0; // Deduct advance from order total

  const total = orderTotal;

  const handleApplyCoupon = (result) => {
    if (!result?.coupon) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      return;
    }

    setAppliedCoupon(result?.coupon || null);
    setDiscountAmount(Number(result?.discountAmount || 0));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Real-time TN district validation for Other State
    if (name === 'city' && formData.state === 'Other State') {
      const userCity = value.trim().toLowerCase().replace(/ district| dt| dist/g, '').trim();
      const tnDistrictsLower = (stateDistricts['Tamil Nadu'] || []).map(d => d.toLowerCase());
      const isTnDistrict = tnDistrictsLower.some(d => {
        const cleanD = d.replace(/ \(.*\)/g, '').trim();
        return cleanD === userCity || d === userCity || (userCity.length > 2 && userCity.includes(cleanD));
      });
      setCityError(isTnDistrict ? 'âš ï¸ This is a Tamil Nadu district. Please select Tamil Nadu as your state.' : '');
    } else if (name === 'city') {
      setCityError('');
    }
    if (name === 'state') {
      setCityError('');
      setFormData(prev => ({ ...prev, city: '', customCity: '', customState: '' }));
    }
  };

  const handleSaveAddress = (e) => {
    e.preventDefault();
    const finalCity = (formData.state === 'Tamil Nadu' && formData.city === 'Other') ? formData.customCity : formData.city;

    let finalState = formData.state;
    if (formData.state === 'Other State') {
      if (!formData.customState || !formData.customState.trim()) {
        return toast.error('Please enter your state');
      }
      finalState = formData.customState.trim();

      if (finalCity) {
        const userCity = finalCity.trim().toLowerCase().replace(/ district| dt| dist/g, '').trim();
        const tnDistrictsLower = (stateDistricts['Tamil Nadu'] || []).map(d => d.toLowerCase());

        const isTnDistrict = tnDistrictsLower.some(d => {
          const cleanD = d.replace(/ \(.*\)/g, '').trim(); // Remove brackets like (Tuticorin)
          return cleanD === userCity || d === userCity || userCity.includes(cleanD);
        });

        if (isTnDistrict) {
          return toast.error('Please select Tamil Nadu as your state for Tamil Nadu districts.');
        }
      }
    }

    if (!formData.fullName || !formData.address || !finalCity || !formData.state || !formData.pinCode || !formData.phone) {
      return toast.error('Please fill all required fields');
    }
    if (formData.phone.length < 10) {
      return toast.error('Please enter a valid phone number');
    }

    const addressToSave = { ...formData, city: finalCity, state: finalState };
    let updatedAddresses;
    if (editingAddressIndex !== null) {
      updatedAddresses = [...savedAddresses];
      updatedAddresses[editingAddressIndex] = addressToSave;
    } else {
      updatedAddresses = [...savedAddresses, addressToSave];
    }

    setSavedAddresses(updatedAddresses);
    localStorage.setItem('wooden_toys_addresses', JSON.stringify(updatedAddresses));

    // Sync with profile
    if (authService.isAuthenticated()) {
      authService.updateProfile({ addresses: updatedAddresses }).catch(err => console.error('Failed to sync address to profile:', err));
    }

    setSelectedAddressIndex(editingAddressIndex !== null ? editingAddressIndex : updatedAddresses.length - 1);
    setIsAddingAddress(false);
    setEditingAddressIndex(null);
    toast.success(editingAddressIndex !== null ? 'Address updated!' : 'Address saved!');
  };

  const handleEditAddress = (index) => {
    const addr = savedAddresses[index];
    setFormData({
      fullName: addr.fullName || '',
      address: addr.address || '',
      city: addr.city || '',
      state: addr.state || '',
      customState: addr.customState || '',
      pinCode: addr.pinCode || '',
      phone: addr.phone || '',
      landmark: addr.landmark || ''
    });
    setEditingAddressIndex(index);
    setIsAddingAddress(true);
  };

  const handleAddNewAddress = () => {
    setFormData({
      fullName: currentUser?.name || '',
      address: '',
      city: '',
      state: '',
      customState: '',
      pinCode: '',
      phone: '',
      landmark: ''
    });
    setEditingAddressIndex(null);
    setIsAddingAddress(true);
  };

  const handleDeleteAddress = (index) => {
    const updated = savedAddresses.filter((_, i) => i !== index);
    setSavedAddresses(updated);
    localStorage.setItem('wooden_toys_addresses', JSON.stringify(updated));

    // Sync with profile
    if (authService.isAuthenticated()) {
      authService.updateProfile({ addresses: updated }).catch(err => console.error('Failed to sync address deletion to profile:', err));
    }

    if (selectedAddressIndex === index) setSelectedAddressIndex(0);
    if (updated.length === 0) setIsAddingAddress(true);
  };

  const handlePlaceOrder = async () => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }

    if (savedAddresses.length === 0 && !isAddingAddress) {
      return toast.error('Please add a shipping address');
    }

    const shippingAddress = savedAddresses[selectedAddressIndex];
    if (!shippingAddress) {
      return toast.error('Please select a shipping address');
    }

    try {
      setLoading(true);
      
      const orderData = {
        orderItems: cartItems.map(item => ({
          name: item.variantOptions ? `${item.name} (${item.variantOptions})` : item.name,
          qty: item.qty,
          image: item.image,
          price: item.price,
          product: item.product,
          variant: item.variant,
          weight: item.weight
        })),
        shippingAddress,
        paymentMethod,
        itemsPrice: subtotal,
        taxPrice: 0,
        shippingPrice: shippingCharge,
        totalPrice: total,
        codAdvance,
        balanceAmount,
        orderNotes,
        fees: appliedFees,
        couponCode: appliedCoupon?.couponCode || null,
        discountAmount,
        ...giftProps
      };

      // Create the order in our backend first
      const order = await orderService.createOrder(orderData);
      localStorage.removeItem('giftCardPreferences');

      if (paymentMethod === 'Cashfree' || isCodAdvance) {
        // — Cashfree online payment flow —
        const session = await createCashfreeSession(order._id);

        // Load Cashfree JS SDK dynamically (sandbox)
        if (!window.Cashfree) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
            document.head.appendChild(script);
          });
        }

        // Store orderId so the callback page can verify
        localStorage.setItem('cf_pending_order_id', order._id);
        localStorage.setItem('cf_pending_cf_order_id', session.cfOrderId || `cf_${order._id}`);

        // Launch Cashfree checkout (opens payment page)
        const cashfree = window.Cashfree({ mode: 'sandbox' });
        cashfree.checkout({
          paymentSessionId: session.paymentSessionId,
          redirectTarget: '_self', // Redirect in same tab
        });

        // clearCart will be called after payment verification on callback page
        return;
      }

      // COD / other methods – order is complete immediately
      toast.success('Order placed successfully!');
      clearCart();
      onNavigate(`/order-success/${order._id}`);

    } catch (error) {
      toast.error(error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F4EC] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Progress Bar */}
        <div className="flex items-center justify-center mb-10 max-w-2xl mx-auto">
          <div className="flex items-center text-[#8B5E3C] font-bold">
            <div className="w-8 h-8 rounded-full bg-[#8B5E3C] text-white flex items-center justify-center text-sm shadow-md">1</div>
            <span className="hidden sm:inline ml-2">Cart</span>
          </div>
          <div className="w-10 sm:w-32 h-1 bg-[#8B5E3C] mx-2 sm:mx-4 rounded"></div>
          <div className="flex items-center text-[#8B5E3C] font-bold">
            <div className="w-8 h-8 rounded-full bg-[#8B5E3C] text-white flex items-center justify-center text-sm shadow-md">2</div>
            <span className="hidden sm:inline ml-2">Review</span>
          </div>
          <div className="w-10 sm:w-32 h-1 bg-[#8B5E3C] mx-2 sm:mx-4 rounded"></div>
          <div className="flex items-center text-[#8B5E3C] font-bold">
            <div className="w-8 h-8 rounded-full border-2 border-[#8B5E3C] bg-white flex items-center justify-center text-sm">3</div>
            <span className="hidden sm:inline ml-2">Payment</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => onNavigate('/review-order')} className="p-2 bg-white rounded-full text-gray-500 hover:text-[#8B5E3C] shadow-sm transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Order</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Left Column */}
          <div className="lg:w-2/3 space-y-6">

            {/* Shipping Details Card */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E6DFD4]">
              <div className="flex items-center gap-3 mb-6 border-b border-[#E6DFD4] pb-4">
                <div className="w-10 h-10 bg-[#8B5E3C]/10 rounded-full flex items-center justify-center text-[#8B5E3C]">
                  <MapPin className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Shipping Details</h2>
              </div>

              {savedAddresses.length > 0 && !isAddingAddress && (
                <div className="space-y-4 mb-4">
                  {savedAddresses.map((addr, idx) => (
                    <div key={idx} className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedAddressIndex === idx ? 'border-[#8B5E3C] bg-[#F8F4EC]/50' : 'border-[#E6DFD4] hover:border-[#8B5E3C]/50'}`} onClick={() => setSelectedAddressIndex(idx)}>
                      {selectedAddressIndex === idx && (
                        <div className="absolute top-4 right-4 text-[#8B5E3C]">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                      <div className="pr-8">
                        <p className="font-bold text-gray-900">{addr.fullName} <span className="font-normal text-gray-500 ml-2">{addr.phone}</span></p>
                        <p className="text-sm text-gray-600 mt-1">{addr.address}</p>
                        <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.pinCode}</p>
                        {addr.landmark && <p className="text-xs text-gray-500 mt-1">Landmark: {addr.landmark}</p>}
                      </div>
                      <div className="absolute bottom-4 right-4 flex gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditAddress(idx); }}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          title="Edit Address"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteAddress(idx); }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete Address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleAddNewAddress} className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-[#E6DFD4] rounded-2xl text-[#8B5E3C] font-semibold hover:border-[#8B5E3C] hover:bg-[#F8F4EC]/30 transition-all">
                    <Plus className="w-5 h-5" /> Add New Address
                  </button>
                </div>
              )}

              {isAddingAddress && (
                <form onSubmit={handleSaveAddress} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                      <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">House / Street Address *</label>
                    <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">State *</label>
                      <select name="state" value={formData.state} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 bg-white" required>
                        <option value="">Select State</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Other State">Other State</option>
                      </select>
                      {formData.state === 'Other State' && (
                        <input type="text" name="customState" value={formData.customState || ''} onChange={handleInputChange} placeholder="Type your state" className="mt-3 w-full px-4 py-2.5 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30" required />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">City / District *</label>
                      {formData.state === 'Tamil Nadu' ? (
                        <>
                          <select name="city" value={formData.city} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 bg-white" required>
                            <option value="">Select District</option>
                            {availableDistricts.map(district => (
                              <option key={district} value={district}>{district}</option>
                            ))}
                            <option value="Other">Other (Type manually)</option>
                          </select>
                          {formData.city === 'Other' && (
                            <input type="text" name="customCity" value={formData.customCity || ''} onChange={handleInputChange} placeholder="Type your district" className="mt-3 w-full px-4 py-2.5 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30" required />
                          )}
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder="Enter your district"
                            className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 ${cityError ? 'border-red-400 focus:ring-red-300' : 'border-[#E6DFD4]'}`}
                            required
                          />
                          {cityError && (
                            <p className="mt-1.5 text-xs text-red-500 font-medium">{cityError}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Pincode *</label>
                      <input type="text" name="pinCode" value={formData.pinCode} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Landmark (Optional)</label>
                      <input type="text" name="landmark" value={formData.landmark} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30" />
                    </div>
                  </div>
                  <div className="pt-2 flex gap-3">
                    {savedAddresses.length > 0 && (
                      <button type="button" onClick={() => { setIsAddingAddress(false); setEditingAddressIndex(null); }} className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                    )}
                    <button type="submit" className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#8B5E3C] font-semibold text-white hover:bg-[#7A5234] transition-colors">
                      {editingAddressIndex !== null ? 'Update Address' : 'Save Address'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Payment Method Card */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E6DFD4]">
              <div className="flex items-center gap-3 mb-6 border-b border-[#E6DFD4] pb-4">
                <div className="w-10 h-10 bg-[#8B5E3C]/10 rounded-full flex items-center justify-center text-[#8B5E3C]">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Payment Method</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${paymentMethod === 'COD' ? 'border-[#8B5E3C] bg-[#F8F4EC]/50' : 'border-[#E6DFD4] hover:border-[#8B5E3C]/50'}`}>
                  <input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === 'COD'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 text-[#8B5E3C] focus:ring-[#8B5E3C]" />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-gray-800">Cash on Delivery</span>
                  </div>
                </label>

                <label className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${paymentMethod === 'Cashfree' ? 'border-[#8B5E3C] bg-[#F8F4EC]/50' : 'border-[#E6DFD4] hover:border-[#8B5E3C]/50'}`}>
                  <input type="radio" name="paymentMethod" value="Cashfree" checked={paymentMethod === 'Cashfree'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 text-[#8B5E3C] focus:ring-[#8B5E3C]" />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-800 block">Pay Online</span>
                      <span className="text-xs text-gray-500">via Cashfree Gateway</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E6DFD4]">
              <CouponSection subtotal={subtotal} items={cartItems} onApplyCoupon={handleApplyCoupon} />
            </div>

            {/* Order Notes Card */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E6DFD4]">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Order Notes (Optional)</h2>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Notes about your order, e.g. special notes for delivery."
                className="w-full px-4 py-3 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 min-h-25 resize-y"
              />
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E6DFD4] sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Your Order</h2>

              <div className="space-y-4 mb-6 border-b border-[#E6DFD4] pb-6 max-h-75 overflow-y-auto pr-2 custom-scrollbar">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-[#F8F4EC] rounded-xl overflow-hidden shrink-0 relative">
                      {item.image ? (
                        <img src={getImageSrc(item.image)} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-200"></div>
                      )}
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">{item.qty}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</h4>
                      {item.variantOptions && (
                        <p className="text-xs text-gray-500 line-clamp-1">{item.variantOptions}</p>
                      )}
                      {item.isGift && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FFF0E6] text-[#D95F24] text-[10px] font-bold tracking-wider">
                            <Gift className="w-3 h-3" />
                            GIFT & CARD
                          </span>
                        </div>
                      )}
                      {item.weight && !isNaN(Number(item.weight)) && Number(item.weight) > 0 && (
                        <p className="text-xs text-gray-500">{(Number(item.weight) * item.qty)} kg</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleQtyChange(item.product, item.qty - 1, item.variant)}
                          disabled={item.qty <= 1}
                          className="w-6 h-6 flex items-center justify-center rounded border border-[#E6DFD4] bg-white text-gray-600 hover:bg-[#F8F4EC] hover:text-[#8B5E3C] disabled:opacity-50 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                        <button
                          onClick={() => handleQtyChange(item.product, item.qty + 1, item.variant, item.maxStock)}
                          disabled={item.maxStock !== undefined && item.qty >= item.maxStock}
                          className="w-6 h-6 flex items-center justify-center rounded border border-[#E6DFD4] bg-white text-gray-600 hover:bg-[#F8F4EC] hover:text-[#8B5E3C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900 text-sm">
                      ₹{(item.price * item.qty).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-sm mb-6 border-b border-[#E6DFD4] pb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="text-gray-900 font-medium">₹{subtotal.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && appliedCoupon && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon {appliedCoupon.couponCode}</span>
                    <span>-₹{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {appliedFees.filter(fee => fee.name.toLowerCase() !== 'advance').map((fee, idx) => (
                  <div key={idx} className="flex justify-between text-gray-600">
                    <span>{fee.name} {fee.isWeightFee ? `(${totalWeight.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} kg)` : ''}</span>
                    <span className="text-gray-900 font-medium">₹{fee.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-gray-800 pt-2 border-t border-[#E6DFD4]/50">
                  <span>Order Total</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>
              </div>

              {isCodAdvance ? (
                <>
                  <div className="flex justify-between text-[#8B5E3C] font-bold mb-2">
                    <span>Advance to Pay Now</span>
                    <span>₹{codAdvance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 mb-6 font-medium">
                    <span>Balance to Pay on Delivery</span>
                    <span>₹{balanceAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-end mb-8">
                    <span className="text-lg font-bold text-gray-900">Total To Pay Now</span>
                    <span className="text-3xl font-black text-[#8B5E3C]">₹{codAdvance.toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <>

                  <div className="flex justify-between items-end mb-8">
                    <span className="text-lg font-bold text-gray-900">Total To Pay</span>
                    <span className="text-3xl font-black text-[#8B5E3C]">₹{total.toLocaleString()}</span>
                  </div>
                </>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={loading || (savedAddresses.length === 0 && !isAddingAddress)}
                className="w-full flex items-center justify-center gap-2 bg-[#8B5E3C] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#7a5234] transition-colors shadow-md shadow-[#8B5E3C]/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Place Order'}
              </button>
            </div>
          </div>

        </div>
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onAuthSuccess={(data) => {
          onAuthSuccess(data, true);
        }}
      />
    </div>
  );
}


