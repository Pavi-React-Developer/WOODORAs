import React, { useState, useEffect, useRef } from 'react';
import { feeAPI } from '../../../api/feeService';
import { X, ChevronDown } from 'lucide-react';

const tnDistricts = [
  "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kanchipuram", "Kanyakumari",
  "Karur", "Krishnagiri", "Madurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
  "Ramanathapuram", "Salem", "Sivaganga", "Thanjavur", "Theni", "Thoothukudi (Tuticorin)", "Tiruchirappalli",
  "Tirunelveli", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"
];

const allStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const normalizeCategoryName = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const isWeightCategory = (category) => normalizeCategoryName(category?.name).includes('weight');
const normalizeSlab = (slab, index) => ({
  ...slab,
  minWeight: slab.minWeight ?? '',
  maxWeight: slab.maxWeight ?? '',
  charge: slab.charge ?? slab.feeValue ?? '',
  status: slab.status !== false,
  displayOrder: slab.displayOrder ?? index,
});

export default function AddFeePage({ onNavigate, editingFee }) {
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [paymentMethod, setPaymentMethod] = useState('both');
  const [feeName, setFeeName] = useState('');
  const [feeCategory, setFeeCategory] = useState('');
  const [feeType, setFeeType] = useState('Fixed Amount');
  const [flatFeeValue, setFlatFeeValue] = useState('');
  const [applicationState, setApplicationState] = useState([]);
  const [weightSlabs, setWeightSlabs] = useState([{ minWeight: '', maxWeight: '', charge: '', status: true }]);
  const [active, setActive] = useState(true);

  // Error States
  const [errors, setErrors] = useState({});

  // Modal States
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showPmModal, setShowPmModal] = useState(false);
  const [newPmName, setNewPmName] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);

  useEffect(() => {
    loadDropdownData();
    if (editingFee) {
      // Map old payment method values to new ones
      let pmValue = 'both'; // default
      if (editingFee.paymentMethod) {
        const pmName = editingFee.paymentMethod?.name || editingFee.paymentMethod;
        if (pmName && typeof pmName === 'string') {
          const normalized = pmName.toLowerCase();
          if (normalized.includes('cod')) pmValue = 'cod';
          else if (normalized.includes('cashfree')) pmValue = 'cashfree';
          else if (normalized.includes('both')) pmValue = 'both';
        }
      }
      setPaymentMethod(pmValue);
      setFeeName(editingFee.feeName || '');
      setFeeCategory(editingFee.feeCategory?._id || editingFee.feeCategory || '');
      setFeeType(editingFee.feeType || 'Fixed Amount');
      setFlatFeeValue(editingFee.flatFeeValue || '');
      setApplicationState(Array.isArray(editingFee.applicationState) ? editingFee.applicationState : (editingFee.applicationState ? [editingFee.applicationState] : []));
      setWeightSlabs(editingFee.weightSlabs?.length > 0 ? editingFee.weightSlabs.map(normalizeSlab) : [{ minWeight: '', maxWeight: '', charge: '', status: true }]);
      setActive(editingFee.active !== false);
    }
  }, [editingFee]);

  const loadDropdownData = async () => {
    try {
      const [catsData, pmData] = await Promise.all([
        feeAPI.getFeeCategories(),
        feeAPI.getPaymentMethods()
      ]);
      setCategories(catsData);
      setPaymentMethods(pmData);
    } catch (error) {
      console.error('Failed to load dropdown data', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryObj = categories.find(c => c._id === feeCategory);
  const isWeightBased = isWeightCategory(selectedCategoryObj);

  const validateForm = () => {
    const newErrors = {};

    if (!feeName.trim()) {
      newErrors.feeName = "Fee name is required";
    } else if (feeName.trim().length < 3) {
      newErrors.feeName = "Minimum 3 characters required";
    } else if (!/^[a-zA-Z0-9\s]+$/.test(feeName)) {
      newErrors.feeName = "Only letters, numbers, and spaces allowed";
    }

    if (!feeCategory) newErrors.feeCategory = "Fee category is required";
    if (!feeType) newErrors.feeType = "Fee type is required";
    if (!applicationState || applicationState.length === 0) newErrors.applicationState = "Application state is required";

    // Tamil Nadu special validation (example)
    if (Array.isArray(applicationState) && applicationState.some(state => tnDistricts.includes(state))) {
      // Just as an example, enforcing strict format or extra check for TN
      if (applicationState.includes("Chennai") && feeName.toLowerCase().includes("outstation")) {
        newErrors.applicationState = "Outstation fees cannot apply to Chennai";
      }
    }

    if (!isWeightBased) {
      if (flatFeeValue === '' || isNaN(Number(flatFeeValue))) {
        newErrors.flatFeeValue = "Numeric fee value is required";
      }
    }

    if (isWeightBased) {
      const slabErrors = [];
      weightSlabs.forEach((slab, index) => {
        const slabErr = {};
        const min = Number(slab.minWeight);
        const max = Number(slab.maxWeight);
        const val = Number(slab.charge ?? slab.feeValue);

        if (slab.minWeight === '' || slab.minWeight === null || slab.minWeight === undefined || isNaN(min)) slabErr.minWeight = "Numeric min weight required";
        if (slab.maxWeight === '' || slab.maxWeight === null || slab.maxWeight === undefined || isNaN(max)) slabErr.maxWeight = "Numeric max weight required";
        if ((slab.charge ?? slab.feeValue) === '' || (slab.charge ?? slab.feeValue) === null || (slab.charge ?? slab.feeValue) === undefined || isNaN(val)) slabErr.charge = "Numeric charge required";

        if (min >= max && slab.maxWeight !== '' && slab.maxWeight !== null && slab.maxWeight !== undefined) {
          slabErr.maxWeight = "Max weight must be > Min weight";
        }

        // Check overlap with previous slabs
        for (let i = 0; i < index; i++) {
          const pMin = Number(weightSlabs[i].minWeight);
          const pMax = Number(weightSlabs[i].maxWeight);
          if (min <= pMax && max >= pMin) {
            slabErr.overlap = "Weight range overlaps with another slab";
            break;
          }
        }

        if (Object.keys(slabErr).length > 0) {
          slabErrors[index] = slabErr;
        }
      });

      if (slabErrors.filter(err => err && Object.keys(err).length > 0).length > 0) {
        newErrors.weightSlabs = slabErrors;
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      alert("Please fix the validation errors: " + Object.keys(newErrors).join(", "));
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    // Map payment method values to display names
    const paymentMethodMap = {
      'cod': 'COD',
      'cashfree': 'CashFree',
      'both': 'Both (COD & CashFree)'
    };

    const payload = {
      paymentMethod: paymentMethodMap[paymentMethod] || 'Both (COD & CashFree)',
      feeName,
      feeCategory,
      feeType,
      applicationState,
      flatFeeValue: isWeightBased ? undefined : Number(flatFeeValue),
      weightSlabs: isWeightBased ? weightSlabs.map((slab, index) => ({
        minWeight: Number(slab.minWeight),
        maxWeight: Number(slab.maxWeight),
        charge: Number(slab.charge ?? slab.feeValue),
        feeValue: Number(slab.charge ?? slab.feeValue),
        status: slab.status !== false,
        displayOrder: index,
      })) : [],
      active
    };

    try {
      if (editingFee) {
        await feeAPI.updateFee(editingFee._id, payload);
        alert('Fee updated successfully');
      } else {
        await feeAPI.createFee(payload);
        alert('Fee created successfully');
      }
      onNavigate('list');
    } catch (error) {
      alert(`Failed to save fee: ${error.message || 'Unknown error'}`);
      console.error(error);
    }
  };

  const handleAddSlab = () => {
    setWeightSlabs([...weightSlabs, { minWeight: '', maxWeight: '', charge: '', status: true }]);
  };

  const handleRemoveSlab = (index) => {
    setWeightSlabs(weightSlabs.filter((_, i) => i !== index));
  };

  const handleSlabChange = (index, field, value) => {
    const newSlabs = [...weightSlabs];
    newSlabs[index][field] = value;
    setWeightSlabs(newSlabs);
  };

  const handleMoveSlab = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= weightSlabs.length) return;
    const newSlabs = [...weightSlabs];
    [newSlabs[index], newSlabs[targetIndex]] = [newSlabs[targetIndex], newSlabs[index]];
    setWeightSlabs(newSlabs);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await feeAPI.createFeeCategory({ name: newCatName.trim(), isActive: true });
      setCategories([...categories, res]);
      setFeeCategory(res._id);
      setShowCatModal(false);
      setNewCatName('');
    } catch (error) {
      alert('Failed to add category. It may already exist.');
    }
  };

  const handleDeleteCategory = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await feeAPI.deleteFeeCategory(id);
      setCategories(categories.filter(c => c._id !== id));
      if (feeCategory === id) {
        setFeeCategory('');
      }
    } catch (error) {
      alert(`Failed to delete category: ${error.message || 'It may be in use.'}`);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newPmName.trim()) return;
    try {
      const res = await feeAPI.createPaymentMethod({ name: newPmName.trim(), isActive: true });
      setPaymentMethods([...paymentMethods, res]);
      setPaymentMethod(res._id);
      setShowPmModal(false);
      setNewPmName('');
    } catch (error) {
      alert('Failed to add payment method. It may already exist.');
    }
  };

  if (loading) return <div className="p-8">Loading form...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E6DFD4] pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-dark font-serif">{editingFee ? 'Edit Fee' : 'Add New Fee'}</h2>
          <p className="text-sm text-brand-medium">Configure fee parameters and rules</p>
        </div>
        <button
          onClick={() => onNavigate('list')}
          className="bg-white border border-[#E6DFD4] text-brand-dark hover:bg-gray-50 text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          Back to List
        </button>
      </div>

      <div className="bg-white border border-[#E6DFD4] rounded-2xl shadow-sm p-6 space-y-6">

        {/* Row 1: Fee Name & State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-brand-dark uppercase tracking-wider mb-2">Fee Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={feeName}
              onChange={(e) => setFeeName(e.target.value)}
              placeholder="e.g. Delivery Fee"
              className="w-full border border-[#E6DFD4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-medium"
            />
            {errors.feeName && <p className="text-red-500 text-xs mt-1">{errors.feeName}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-dark uppercase tracking-wider mb-2">Application State <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-6 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applicationState.includes('Tamil Nadu')}
                  onChange={(e) => {
                    if (e.target.checked) setApplicationState([...applicationState, 'Tamil Nadu']);
                    else setApplicationState(applicationState.filter(s => s !== 'Tamil Nadu'));
                  }}
                  className="w-4 h-4 rounded border-[#E6DFD4] text-brand-dark focus:ring-brand-dark"
                />
                <span className="text-sm font-medium text-brand-dark">Tamil Nadu</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applicationState.includes('Other State')}
                  onChange={(e) => {
                    if (e.target.checked) setApplicationState([...applicationState, 'Other State']);
                    else setApplicationState(applicationState.filter(s => s !== 'Other State'));
                  }}
                  className="w-4 h-4 rounded border-[#E6DFD4] text-brand-dark focus:ring-brand-dark"
                />
                <span className="text-sm font-medium text-brand-dark">Other State</span>
              </label>
            </div>
            {errors.applicationState && <p className="text-red-500 text-xs mt-2">{errors.applicationState}</p>}
          </div>
        </div>

        {/* Row 2: Category & Payment Method */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-brand-dark uppercase tracking-wider">Fee Category <span className="text-red-500">*</span></label>
              <button onClick={() => setShowCatModal(true)} className="text-[10px] text-brand-dark font-bold uppercase hover:underline">+ Add Category</button>
            </div>

            <div
              className="w-full border border-[#E6DFD4] rounded-xl px-4 py-3 text-sm bg-white cursor-pointer flex justify-between items-center"
              onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
            >
              <span className={feeCategory ? 'text-gray-900' : 'text-gray-500'}>
                {feeCategory ? categories.find(c => c._id === feeCategory)?.name || 'Select Category' : 'Select Category'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>

            {isCatDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsCatDropdownOpen(false)} />
                <div className="absolute z-20 w-full mt-1 bg-white border border-[#E6DFD4] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  <div
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-500 border-b border-gray-100"
                    onClick={() => { setFeeCategory(''); setIsCatDropdownOpen(false); }}
                  >
                    Select Category
                  </div>
                  {categories.map(c => (
                    <div
                      key={c._id}
                      className="px-4 py-2 hover:bg-brand-light/20 cursor-pointer text-sm text-gray-900 flex justify-between items-center group"
                      onClick={() => { setFeeCategory(c._id); setIsCatDropdownOpen(false); }}
                    >
                      <span>{c.name}</span>
                      <button
                        onClick={(e) => handleDeleteCategory(e, c._id)}
                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Delete category"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {errors.feeCategory && <p className="text-red-500 text-xs mt-1">{errors.feeCategory}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-brand-dark uppercase tracking-wider">Payment Method (Optional)</label>
            </div>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-[#E6DFD4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-medium"
            >
              <option value="both">Both (COD & CashFree)</option>
              <option value="cod">COD</option>
              <option value="cashfree">CashFree</option>
            </select>
            {errors.paymentMethod && <p className="text-red-500 text-xs mt-1">{errors.paymentMethod}</p>}
          </div>
        </div>

        {/* Row 3: Fee Type & Active */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-brand-dark uppercase tracking-wider mb-2">Fee Type <span className="text-red-500">*</span></label>
            <select
              value={feeType}
              onChange={(e) => setFeeType(e.target.value)}
              className="w-full border border-[#E6DFD4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-medium"
            >
              <option value="Fixed Amount">Fixed Amount</option>
              <option value="Percentage">Percentage</option>
            </select>
            {errors.feeType && <p className="text-red-500 text-xs mt-1">{errors.feeType}</p>}
          </div>

          <div className="flex items-center pt-8">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-brand-dark focus:ring-brand-dark"
              />
              <span className="ml-3 text-sm font-bold text-brand-dark">Active Status</span>
            </label>
          </div>
        </div>

        {isWeightBased && (
          <>
            <hr className="border-[#E6DFD4]" />

            {/* Weight Slabs */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-bold text-brand-dark uppercase tracking-wider">Weight-Based Fee Configuration</label>
                <button type="button" onClick={handleAddSlab} className="text-xs text-brand-dark font-bold uppercase border border-brand-dark px-3 py-1.5 rounded-lg hover:bg-gray-50">+ Add Slab</button>
              </div>

              <div className="space-y-4">
                {weightSlabs.map((slab, index) => (
                  <div key={index} className="flex flex-col bg-brand-light/30 p-4 rounded-xl border border-[#E6DFD4]">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Min Weight (kg)</label>
                        <input type="number" step="0.0001" min="0" value={slab.minWeight} onChange={e => handleSlabChange(index, 'minWeight', e.target.value)} className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="0.0001" />
                        {errors.weightSlabs?.[index]?.minWeight && <p className="text-red-500 text-[10px] mt-1">{errors.weightSlabs[index].minWeight}</p>}
                      </div>
                      <span className="hidden sm:block text-gray-400 font-bold px-2 pt-4">-</span>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Max Weight (kg)</label>
                        <input type="number" step="0.0001" min="0" value={slab.maxWeight} onChange={e => handleSlabChange(index, 'maxWeight', e.target.value)} className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="1.0000" />
                        {errors.weightSlabs?.[index]?.maxWeight && <p className="text-red-500 text-[10px] mt-1">{errors.weightSlabs[index].maxWeight}</p>}
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Charge {feeType === 'Fixed Amount' ? '(₹)' : '(%)'}</label>
                        <input type="number" step="0.01" min="0" value={slab.charge ?? slab.feeValue ?? ''} onChange={e => handleSlabChange(index, 'charge', e.target.value)} className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="200" />
                        {errors.weightSlabs?.[index]?.charge && <p className="text-red-500 text-[10px] mt-1">{errors.weightSlabs[index].charge}</p>}
                      </div>
                      <div className="flex flex-col gap-2 pt-5">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                          <input type="checkbox" checked={slab.status !== false} onChange={e => handleSlabChange(index, 'status', e.target.checked)} />
                          Active
                        </label>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => handleMoveSlab(index, -1)} disabled={index === 0} className="px-2 py-1 border border-[#E6DFD4] rounded text-xs disabled:opacity-40">Up</button>
                          <button type="button" onClick={() => handleMoveSlab(index, 1)} disabled={index === weightSlabs.length - 1} className="px-2 py-1 border border-[#E6DFD4] rounded text-xs disabled:opacity-40">Down</button>
                        </div>
                      </div>
                      {weightSlabs.length > 1 && (
                        <button type="button" onClick={() => handleRemoveSlab(index)} className="mt-5 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      )}
                    </div>
                    {errors.weightSlabs?.[index]?.overlap && <p className="text-red-500 text-xs w-full mt-3 font-semibold">{errors.weightSlabs[index].overlap}</p>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!isWeightBased && (
          <>
            <hr className="border-[#E6DFD4]" />
            <div>
              <label className="block text-xs font-bold text-brand-dark uppercase tracking-wider mb-2">Fee Value ({feeType === 'Fixed Amount' ? '₹' : '%'}) <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={flatFeeValue}
                onChange={(e) => setFlatFeeValue(e.target.value)}
                placeholder="e.g. 50"
                className="w-full md:w-1/2 border border-[#E6DFD4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-medium"
              />
              {errors.flatFeeValue && <p className="text-red-500 text-xs mt-1">{errors.flatFeeValue}</p>}
            </div>
          </>
        )}

          <div className="flex justify-end gap-3 pt-6">
            <button onClick={() => onNavigate('list')} className="px-6 py-3 border border-[#E6DFD4] rounded-xl text-sm font-bold text-brand-dark hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="px-6 py-3 bg-brand-dark text-white rounded-xl text-sm font-bold hover:bg-black shadow-md">Save Fee Configuration</button>
        </div>

      </div>

      {/* Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 font-serif">Add Category</h3>
            <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm" placeholder="Category Name" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCatModal(false)} className="px-4 py-2 text-xs font-bold text-gray-600">Cancel</button>
              <button onClick={handleAddCategory} className="px-4 py-2 bg-brand-dark text-white rounded-lg text-xs font-bold">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {showPmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 font-serif">Add Payment Method</h3>
            <input type="text" value={newPmName} onChange={e => setNewPmName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm" placeholder="e.g. UPI, Wallet" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPmModal(false)} className="px-4 py-2 text-xs font-bold text-gray-600">Cancel</button>
              <button onClick={handleAddPaymentMethod} className="px-4 py-2 bg-brand-dark text-white rounded-lg text-xs font-bold">Add</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
