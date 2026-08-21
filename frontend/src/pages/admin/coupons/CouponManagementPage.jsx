import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminService } from '../../../api/adminService';
import { catalogService } from '../../../api/catalogService';
import { Download, Plus, SquarePen, Trash, Trash2, RefreshCw, X, BadgeX, BadgeCheck, Check, Eye, Search, Loader2, ChevronLeft, Ticket } from 'lucide-react';
import { downloadExcelFile } from '../../../utils/exportUtils';
import Pagination from '../../../components/common/Pagination';
import BulkActions from '../../../components/admin/BulkActions';

const emptyForm = {
  couponCode: '',
  offerType: 'General Offer',
  discountType: 'Percentage',
  discountValue: '',
  minOrderValue: '',
  maxDiscount: '',
  usageLimit: '',
  startDate: '',
  endDate: '',
  status: 'active',
  visible: true,
  description: '',
  category: '',
  subCategory: '',
  product: '',
  minimumQuantity: '1',
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStatusBadge = (status) => {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700';
  if (status === 'inactive') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-200 text-slate-700';
};


export default function CouponManagementPage({ canCreate = true, canEdit = true, canDelete = true }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive mode from URL path
  const isAddRoute = location.pathname.endsWith('/add');
  const isEditRoute = location.pathname.endsWith('/edit');
  const isFormMode = isAddRoute || isEditRoute;

  const [coupons, setCoupons] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? coupons.map(item => item._id) : []);
  };

  const toggleSelectOne = (id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const [loading, setLoading] = useState(true);
  const [editingCoupon, setEditingCoupon] = useState(() => {
    try {
      if (isEditRoute) {
        const saved = sessionStorage.getItem('coupon_edit_state');
        return saved ? JSON.parse(saved).coupon : null;
      }
    } catch (e) { return null; }
    return null;
  });
  const [viewingCoupon, setViewingCoupon] = useState(null);
  const [form, setForm] = useState(() => {
    try {
      if (isEditRoute) {
        const saved = sessionStorage.getItem('coupon_edit_state');
        return saved ? JSON.parse(saved).form : emptyForm;
      }
    } catch (e) { return emptyForm; }
    return emptyForm;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [offerFilter, setOfferFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  const loadCatalogOptions = async () => {
    try {
      const [cats, subs, prods] = await Promise.all([
        catalogService.getCategories(),
        catalogService.getSubCategories(),
        catalogService.getProducts(),
      ]);
      setCategories(cats || []);
      setSubCategories(subs || []);
      setProducts(prods || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const data = await adminService.getCoupons({
        page,
        limit,
        search,
        status: statusFilter === 'all' ? '' : statusFilter,
        offerType: offerFilter === 'all' ? '' : offerFilter,
      });
      setCoupons(data?.coupons || []);
      setPagination(data?.pagination || { total: 0, pages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected coupons?`)) {
      try {
        await Promise.all(selectedIds.map(id => adminService.deleteCoupon(id)));
        setSuccess('Coupons deleted successfully');
        setSelectedIds([]);
        await loadCoupons();
      } catch (err) {
        setError('Failed to delete some coupons');
      }
    }
  };

  const handleBulkStatus = async (isActive) => {
    const targetStatus = isActive ? 'active' : 'inactive';
    try {
      await Promise.all(selectedIds.map(id => adminService.updateCoupon(id, { status: targetStatus })));
      setSuccess(`Coupons marked as ${targetStatus}`);
      setSelectedIds([]);
      await loadCoupons();
    } catch (err) {
      setError('Failed to update status for some coupons');
    }
  };

  useEffect(() => {
    loadCatalogOptions();
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [page, statusFilter, offerFilter, search]);

  // When navigating back to list, clear messages
  useEffect(() => {
    if (!isFormMode) {
      setSuccess('');
      setError('');
      setViewingCoupon(null);
    }
  }, [isFormMode]);

  // If we land on /edit route but no editing coupon set (even after checking session), redirect to list
  useEffect(() => {
    if (isEditRoute && !editingCoupon) {
      navigate('/admin/coupons', { replace: true });
    }
  }, [isEditRoute, editingCoupon]);

  const sortedCoupons = useMemo(() => {
    const list = [...coupons];
    list.sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      if (typeof av === 'string' && typeof bv === 'string') {
        return av.localeCompare(bv) * multiplier;
      }
      return (Number(av || 0) - Number(bv || 0)) * multiplier;
    });
    return list;
  }, [coupons, sortField, sortDirection]);

  const getSubCategoryParentId = (subCategory) => {
    if (!subCategory) return '';
    return subCategory.category?._id || subCategory.category || subCategory.parentCategory?._id || subCategory.parentCategory || '';
  };

  const filteredSubCategories = useMemo(() => {
    if (!form.category) return [];
    return subCategories.filter((subCategory) => getSubCategoryParentId(subCategory) === form.category);
  }, [form.category, subCategories]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingCoupon(null);
    setError('');
    setSuccess('');
    setFormErrors({});
  };

  const openAdd = () => {
    resetForm();
    navigate('/admin/coupons/add');
  };

  const openEdit = (coupon) => {
    const newForm = {
      couponCode: coupon.couponCode || '',
      offerType: coupon.offerType || 'General Offer',
      discountType: coupon.discountType || 'Percentage',
      discountValue: coupon.discountValue ?? '',
      minOrderValue: coupon.minOrderValue ?? '',
      maxDiscount: coupon.maxDiscount ?? '',
      usageLimit: coupon.usageLimit ?? '',
      startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().slice(0, 10) : '',
      endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().slice(0, 10) : '',
      status: coupon.status || 'active',
      visible: coupon.visible !== false,
      description: coupon.description || '',
      category: coupon.category?._id || coupon.category || '',
      subCategory: coupon.subCategory?._id || coupon.subCategory || '',
      product: coupon.product?._id || coupon.product || '',
      minimumQuantity: coupon.minimumQuantity ?? '1',
    };
    setEditingCoupon(coupon);
    setForm(newForm);
    sessionStorage.setItem('coupon_edit_state', JSON.stringify({ coupon, form: newForm }));
    navigate('/admin/coupons/edit');
  };

  const goBack = () => {
    resetForm();
    navigate('/admin/coupons');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    let errors = {};

    if (!form.couponCode.trim()) errors.couponCode = 'Coupon code is required';
    if (!form.offerType) errors.offerType = 'Offer type is required';
    if (!form.discountType) errors.discountType = 'Discount type is required';
    if (form.discountValue === '' || Number(form.discountValue) < 0) errors.discountValue = 'Valid discount value is required';
    if (Number(form.minOrderValue) < 0) errors.minOrderValue = 'Minimum order cannot be negative';
    if (Number(form.usageLimit) < 0) errors.usageLimit = 'Usage limit cannot be negative';
    if (form.discountType === 'Percentage' && Number(form.discountValue) > 100) errors.discountValue = 'Percentage cannot exceed 100%';
    if (form.discountType === 'Percentage' && (form.maxDiscount === '' || Number(form.maxDiscount) < 0)) errors.maxDiscount = 'Valid max discount is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
      setError('Start date cannot be greater than end date');
      return;
    }

    if (form.offerType === 'Cart Offer' && (form.minOrderValue === '' || Number(form.minOrderValue) <= 0)) {
      setError('Minimum order value is required for cart offers');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        couponCode: form.couponCode.trim().toUpperCase(),
        discountValue: Number(form.discountValue),
        minOrderValue: Number(form.minOrderValue || 0),
        maxDiscount: Number(form.maxDiscount || 0),
        usageLimit: Number(form.usageLimit || 0),
        minimumQuantity: Number(form.minimumQuantity || 1),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        category: form.category || null,
        subCategory: form.subCategory || null,
        product: form.product || null,
        visible: form.visible,
        status: form.status,
      };

      if (editingCoupon) {
        await adminService.updateCoupon(editingCoupon._id, payload);
        setSuccess('Coupon updated successfully');
      } else {
        await adminService.createCoupon(payload);
        setSuccess('Coupon created successfully');
      }
      setForm(emptyForm);
      setEditingCoupon(null);
      setPage(1);
      await loadCoupons();
      navigate('/admin/coupons');
    } catch (err) {
      setError(err.message || 'Failed to save coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await adminService.deleteCoupon(confirmDelete._id);
      setConfirmDelete(null);
      setSuccess('Coupon deleted successfully');
      await loadCoupons();
    } catch (err) {
      setError(err.message || 'Failed to delete coupon');
    }
  };

  const handleToggleStatus = async (coupon) => {
    try {
      await adminService.toggleCouponStatus(coupon._id);
      await loadCoupons();
      setSuccess('Coupon status updated');
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleToggleVisibility = async (coupon) => {
    try {
      await adminService.toggleCouponVisibility(coupon._id);
      await loadCoupons();
      setSuccess('Coupon visibility updated');
    } catch (err) {
      setError(err.message || 'Failed to update visibility');
    }
  };

  const exportExcel = () => {
    const rows = sortedCoupons.map((coupon) => ({
      'Coupon Code': coupon.couponCode,
      'Offer Type': coupon.offerType,
      'Discount Type': coupon.discountType,
      'Discount Value': coupon.discountValue,
      'Validity': `${formatDate(coupon.startDate)} - ${formatDate(coupon.endDate)}`,
      'Status': coupon.status,
      'Visibility': coupon.visible ? 'Visible' : 'Hidden',
      'Usage': `${coupon.usageCount || 0}/${coupon.usageLimit || 0}`,
    }));
    const header = ['Coupon Code', 'Offer Type', 'Discount Type', 'Discount Value', 'Validity', 'Status', 'Visibility', 'Usage'];
    downloadExcelFile('coupons', header, rows);
  };

  // â”€â”€â”€ INPUT STYLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const inputCls = 'w-full px-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-colors bg-white';

  // â”€â”€â”€ FORM VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isFormMode) {
    return (
      <div className="flex-1 overflow-y-auto p-8 min-h-full">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[13px] md:text-sm font-serif text-white mb-1">
              Dashboard &rsaquo; Coupons &amp; Offers &rsaquo;{' '}
              <span className="font-semibold text-[#8B5E3C]">
                {editingCoupon ? 'Edit Coupon' : 'Add Coupon'}
              </span>
            </p>
            <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">
              {editingCoupon ? 'Edit Coupon' : 'Add Coupon'}
            </h1>
          </div>
          <button
            onClick={goBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#E6DFD4] bg-white text-sm font-bold text-[#6B4F37] hover:bg-[#F8F4EC] transition-colors shadow-sm"
          >
            <ChevronLeft size={16} /> Back
          </button>
        </div>

        {/* Error / Success */}
        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* â”€â”€ Coupon Details â”€â”€ */}
          <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-6 space-y-5">
            <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
              <span className="w-6 h-6 #E6DFD4] flex items-center justify-center text-sm font-semibold text-gray-800"><svg className="w-3.5 h-3.5 text-[#8B5E3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg></span>
              Coupon Details
            </h3>
            <div className="grid gap-5 md:grid-cols-2">
              {/* Coupon Code */}
              <div>
                <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">
                  Coupon Code <span className="text-red-500 text-lg ml-1">*</span>
                </label>
                <input
                  value={form.couponCode}
                  onChange={(e) => { setForm({ ...form, couponCode: e.target.value }); if (formErrors.couponCode) setFormErrors({ ...formErrors, couponCode: '' }); }}
                  className={`${inputCls} uppercase ${formErrors.couponCode ? 'border-red-500 bg-red-50' : ''}`}
                  placeholder="WELCOME10"
                  required
                />
                {formErrors.couponCode && <p className="text-red-500 text-xs mt-1">{formErrors.couponCode}</p>}
              </div>

              {/* Offer Type */}
              <div>
                <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">
                  Offer Type <span className="text-red-500 text-lg ml-1">*</span>
                </label>
                <select value={form.offerType} onChange={(e) => setForm({ ...form, offerType: e.target.value })} className={inputCls}>
                  <option>General Offer</option>
                  <option>Cart Offer</option>
                  <option>Product Offer</option>
                  <option>Category Offer</option>
                </select>
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">
                  Discount Type <span className="text-red-500 text-lg ml-1">*</span>
                </label>
                <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className={inputCls}>
                  <option>Percentage</option>
                  <option>Fixed Amount</option>
                </select>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">
                  Discount Value <span className="text-red-500 text-lg ml-1">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  min="0"
                  value={form.discountValue}
                  onChange={(e) => { setForm({ ...form, discountValue: e.target.value }); if (formErrors.discountValue) setFormErrors({ ...formErrors, discountValue: '' }); }}
                  className={`${inputCls} ${formErrors.discountValue ? 'border-red-500 bg-red-50' : ''}`}
                  placeholder={form.discountType === 'Percentage' ? '10' : '150'}
                  required
                />
                {formErrors.discountValue && <p className="text-red-500 text-xs mt-1">{formErrors.discountValue}</p>}
              </div>
            </div>
          </div>

          {/* â”€â”€ Conditions â”€â”€ */}
          {(form.offerType === 'General Offer' || form.offerType === 'Category Offer' || form.offerType === 'Cart Offer' || form.discountType === 'Percentage') && (
            <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-6 space-y-5">
              <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                <span className="w-6 h-6 #E6DFD4] flex items-center justify-center text-sm font-semibold text-gray-800"><svg className="w-3.5 h-3.5 text-[#8B5E3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg></span>
                Conditions
              </h3>
              <div className="grid gap-5 md:grid-cols-2">
                {(form.offerType === 'General Offer' || form.offerType === 'Category Offer' || form.offerType === 'Cart Offer') && (
                  <div>
                    <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">
                      Minimum Order Value
                      {form.offerType === 'Cart Offer' && <span className="text-red-500 text-lg ml-1">*</span>}
                    </label>
                    <input type="text" inputMode="numeric" min="0" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} className={inputCls} placeholder="0" />
                    {formErrors.minOrderValue && <p className="text-red-500 text-xs mt-1">{formErrors.minOrderValue}</p>}
                  </div>
                )}
                {form.discountType === 'Percentage' && (
                  <div>
                    <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">
                      Maximum Discount <span className="text-red-500 text-lg ml-1">*</span>
                    </label>
                    <input type="text" inputMode="numeric" min="0" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} className={`${inputCls} ${formErrors.maxDiscount ? 'border-red-500 bg-red-50' : ''}`} placeholder="500" />
                    {formErrors.maxDiscount && <p className="text-red-500 text-xs mt-1">{formErrors.maxDiscount}</p>}
                  </div>
                )}
                {(form.offerType === 'Category Offer' || form.offerType === 'Product Offer') && (
                  <div>
                    <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Minimum Quantity</label>
                    <input type="text" inputMode="numeric" min="1" value={form.minimumQuantity} onChange={(e) => setForm({ ...form, minimumQuantity: e.target.value })} className={inputCls} placeholder="1" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* â”€â”€ Product Offer Fields â”€â”€ */}
          {form.offerType === 'Product Offer' && (
            <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-6 space-y-5">
              <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                PLACEHOLDER
                Applicable To
              </h3>
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, subCategory: '' })} className={inputCls}>
                    <option value="">Any</option>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Sub Category</label>
                  <select value={form.subCategory} onChange={(e) => setForm({ ...form, subCategory: e.target.value })} className={inputCls} disabled={!form.category || filteredSubCategories.length === 0}>
                    <option value="">{form.category ? (filteredSubCategories.length === 0 ? 'No sub-categories' : 'Any sub-category') : 'Select category first'}</option>
                    {filteredSubCategories.map((sub) => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Product</label>
                  <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className={inputCls}>
                    <option value="">Any</option>
                    {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* â”€â”€ Category Offer Fields â”€â”€ */}
          {form.offerType === 'Category Offer' && (
            <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-6 space-y-5">
              <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                PLACEHOLDER
                Applicable Category
              </h3>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, subCategory: '' })} className={inputCls}>
                    <option value="">Any</option>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Sub Category</label>
                  <select value={form.subCategory} onChange={(e) => setForm({ ...form, subCategory: e.target.value })} className={inputCls} disabled={!form.category || filteredSubCategories.length === 0}>
                    <option value="">{form.category ? (filteredSubCategories.length === 0 ? 'No sub-categories' : 'Any sub-category') : 'Select category first'}</option>
                    {filteredSubCategories.map((sub) => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* â”€â”€ Schedule & Limits â”€â”€ */}
          <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-6 space-y-5">
            <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
              PLACEHOLDER
              Schedule &amp; Limits
            </h3>
            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Usage Limit</label>
                <input type="text" inputMode="numeric" min="0" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className={inputCls} placeholder="0 = unlimited" />
              </div>
              <div>
                <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Start Date</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">End Date</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inputCls} />
              </div>
            </div>
          </div>

          {/* â”€â”€ Status & Visibility â”€â”€ */}
          <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-6 space-y-5">
            <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
              PLACEHOLDER
              Status &amp; Visibility
            </h3>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="flex items-center mt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={form.visible}
                      onChange={(e) => setForm({ ...form, visible: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B5E3C]"></div>
                  </div>
                  <span className="text-[15px] font-serif font-bold text-[#3E2723]">
                    {form.visible ? 'Visible to Customers' : 'Hidden from Customers'}
                  </span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Description</label>
              <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="Describe the offer..." />
            </div>
          </div>

          {/* â”€â”€ Form Actions â”€â”€ */}
          <div className="flex items-center justify-center gap-4 pt-2 pb-8">
            <button
              type="button"
              onClick={goBack}
              className="admin-cancel-btn"
            >CANCEL</button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-[#8B5E3C] hover:bg-[#7a5234] disabled:opacity-60 text-white px-8 py-3 rounded-full text-[15px] font-bold transition-colors shadow-sm uppercase tracking-wide"
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              )}
              {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // â”€â”€â”€ LIST VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="p-6 lg:p-8 min-h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <p className="text-[13px] md:text-sm font-serif text-white mb-1">
            Dashboard &rsaquo; <span className="font-semibold text-[#8B5E3C]">Coupons &amp; Offers</span>
          </p>
          <h2 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Coupons &amp; Offers</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={loadCoupons} className="admin-secondary-btn flex items-center gap-2">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={exportExcel} className="admin-export-btn">
            <Download size={16} /> Export Excel
          </button>
          {canCreate && (
            <button onClick={openAdd} className="admin-btn flex items-center gap-2">
              <Plus size={16} /> Add Coupon
            </button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      {/* View Modal */}
      {viewingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-[#2F241D]">Coupon Details</h3>
                <button onClick={() => setViewingCoupon(null)} className="p-2 text-gray-400 hover:text-red-700 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ['Coupon Code', viewingCoupon.couponCode],
                  ['Offer Type', viewingCoupon.offerType],
                  ['Discount Type', viewingCoupon.discountType],
                  ['Discount', `${viewingCoupon.discountValue}${viewingCoupon.discountType === 'Percentage' ? '%' : ''}`],
                  ['Applicable Product', viewingCoupon.product?.name || '-'],
                  ['Applicable Category', viewingCoupon.category?.name || '-'],
                  ['Validity', `${formatDate(viewingCoupon.startDate)} - ${formatDate(viewingCoupon.endDate)}`],
                  ['Status', viewingCoupon.status],
                  ['Visibility', viewingCoupon.visible ? 'Visible' : 'Hidden'],
                  ['Usage Count', viewingCoupon.usageCount || 0],
                  ['Created Date', formatDate(viewingCoupon.createdAt)],
                  ['Description', viewingCoupon.description || '-'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-[#FCF8F2] p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
                    <p className="mt-1 font-semibold text-[#2F241D]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-3xl border border-[#E6DFD4] bg-white p-4 shadow-sm mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="relative block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search coupon code" className="w-full rounded-xl border border-[#E6DFD4] pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#8B5E3C]" />
          </label>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 text-sm outline-none focus:border-[#8B5E3C]">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
          <select value={offerFilter} onChange={(e) => { setOfferFilter(e.target.value); setPage(1); }} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 text-sm outline-none focus:border-[#8B5E3C]">
            <option value="all">All Offer Types</option>
            <option value="General Offer">General Offer</option>
            <option value="Cart Offer">Cart Offer</option>
            <option value="Product Offer">Product Offer</option>
            <option value="Category Offer">Category Offer</option>
          </select>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 shrink-0">Sort</label>
            <select value={`${sortField}:${sortDirection}`} onChange={(e) => { const [field, direction] = e.target.value.split(':'); setSortField(field); setSortDirection(direction); }} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 text-sm outline-none focus:border-[#8B5E3C]">
              <option value="createdAt:desc">Newest</option>
              <option value="couponCode:asc">Code A-Z</option>
              <option value="discountValue:desc">Discount High-Low</option>
            </select>
          </div>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        onBulkDelete={handleBulkDelete}
        onBulkStatusChange={handleBulkStatus}
        onClear={() => setSelectedIds([])}
      />

      <div className="overflow-x-auto rounded-3xl border border-[#E6DFD4] bg-white shadow-sm">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-[#F8F4EC]" />)}
          </div>
        ) : sortedCoupons.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F8F4EC] text-[#8B5E3C]">
              <Ticket size={28} />
            </div>
            <h3 className="text-lg font-semibold text-[#2F241D]">No coupons found</h3>
            <p className="text-sm text-gray-500 mt-1">Create your first coupon to start offering discounts.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#F8F4EC] border-b border-[#E6DFD4]">
              <tr>
                <th className="px-6 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={coupons.length > 0 && selectedIds.length === coupons.length}
                    onChange={e => toggleSelectAll(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer mx-auto block"
                  />
                </th>
                <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Coupon Code</th>
                <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Discount Type</th>
                <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Offer Type</th>
                <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Validity</th>
                <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Status</th>
                <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Visibility</th>
                <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#E9DED3] text-sm">
              {sortedCoupons.map((coupon, index) => (
                <tr key={coupon._id} className={`border-b border-[#F0EAE2] transition-colors hover:bg-[#FDF9F5] ${index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(coupon._id)}
                      onChange={e => toggleSelectOne(coupon._id, e.target.checked)}
                      className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer mx-auto block"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-[16px] font-bold text-[#2F241D]">{coupon.couponCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-[16px] font-semibold">{coupon.discountType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-[16px] font-semibold">{coupon.offerType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">{formatDate(coupon.startDate)} - {formatDate(coupon.endDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]"><span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${getStatusBadge(coupon.status)}`}>{coupon.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">{coupon.visible ? <span className="text-sm font-semibold text-emerald-700">Visible</span> : <span className="text-sm font-semibold text-slate-500">Hidden</span>}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setViewingCoupon(coupon)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                      {canEdit && <button onClick={() => openEdit(coupon)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Edit"><SquarePen className="w-4 h-4" /></button>}
                      {canDelete && <button onClick={() => setConfirmDelete(coupon)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>}
                      {canEdit && <button onClick={() => handleToggleStatus(coupon)} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors" title="Enable/Disable">{coupon.status === 'active' ? <BadgeX className="w-[15px] h-[15px]" /> : <BadgeCheck className="w-[15px] h-[15px]" />}</button>}
                      {canEdit && <button onClick={() => handleToggleVisibility(coupon)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors" title="Visible/Invisible">{coupon.visible ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center bg-white">
          <Pagination
            currentPage={page}
            totalPages={pagination.pages || 1}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash size={16} className="text-red-500" />
            </div>
            <h4 className="text-lg font-bold text-[#2F241D] text-center">Delete Coupon?</h4>
            <p className="mt-2 text-sm text-gray-600 text-center">
              Are you sure you want to delete <strong>{confirmDelete.couponCode}</strong>? This action will soft delete it.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => setConfirmDelete(null)} className="admin-cancel-btn">CANCEL</button>
              <button onClick={handleDelete} className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


