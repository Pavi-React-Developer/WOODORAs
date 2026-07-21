import React, { useEffect, useMemo, useState } from 'react';
import { adminService } from '../../../api/adminService';
import { catalogService } from '../../../api/catalogService';
import { Plus, Search, FileDown, Eye, Pencil, Trash2, CheckCircle2, XCircle, Loader2, BadgeCheck, BadgeX, ChevronLeft, ChevronRight, Ticket } from 'lucide-react';
import { downloadExcelFile } from '../../../utils/exportUtils';

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
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStatusBadge = (status) => {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700';
  if (status === 'inactive') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-200 text-slate-700';
};

export default function CouponManagementPage({ canCreate = true, canEdit = true, canDelete = true }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('list');
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [viewingCoupon, setViewingCoupon] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  useEffect(() => {
    loadCatalogOptions();
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [page, statusFilter, offerFilter, search]);

  useEffect(() => {
    if (mode === 'list') {
      setSuccess('');
      setError('');
    }
  }, [mode]);

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
  };

  const openAdd = () => {
    resetForm();
    setMode('form');
  };

  const openEdit = (coupon) => {
    setEditingCoupon(coupon);
    setForm({
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
    });
    setMode('form');
  };

  const openView = (coupon) => {
    setViewingCoupon(coupon);
    setMode('view');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.couponCode.trim()) {
      setError('Coupon code is required');
      return;
    }
    if (!form.offerType) {
      setError('Offer type is required');
      return;
    }
    if (!form.discountType) {
      setError('Discount type is required');
      return;
    }
    if (form.discountValue === '' || Number(form.discountValue) < 0) {
      setError('Discount value is required');
      return;
    }
    if (Number(form.minOrderValue) < 0) {
      setError('Minimum order cannot be negative');
      return;
    }
    if (Number(form.usageLimit) < 0) {
      setError('Usage limit cannot be negative');
      return;
    }
    if (form.discountType === 'Percentage' && Number(form.discountValue) > 100) {
      setError('Discount percentage cannot exceed 100%');
      return;
    }
    if (form.discountType === 'Percentage' && (form.maxDiscount === '' || Number(form.maxDiscount) < 0)) {
      setError('Maximum discount is required for percentage offers');
      return;
    }
    if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
      setError('Start date cannot be greater than end date');
      return;
    }

    // Cart Offer requires a minimum order value
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
      setMode('list');
      setPage(1);
      await loadCoupons();
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

  return (
    <div className="p-6 lg:p-8 bg-[#F8F4EC] min-h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#2F241D]">Coupons & Offers</h2>
          <p className="text-sm text-gray-600 mt-1">Manage promotional offers, discount rules, and visibility.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="admin-export-btn">
            <FileDown size={16} /> Export Excel
          </button>
          {canCreate && (
            <button onClick={openAdd} className="inline-flex items-center gap-2 bg-[#8B5E3C] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#7A4E31]">
              <Plus size={16} /> Add Coupon
            </button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      {mode === 'list' && (
        <>
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
                <label className="text-sm text-gray-600">Sort</label>
                <select value={`${sortField}:${sortDirection}`} onChange={(e) => { const [field, direction] = e.target.value.split(':'); setSortField(field); setSortDirection(direction); }} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 text-sm outline-none focus:border-[#8B5E3C]">
                  <option value="createdAt:desc">Newest</option>
                  <option value="couponCode:asc">Code A-Z</option>
                  <option value="discountValue:desc">Discount High-Low</option>
                </select>
              </div>
            </div>
          </div>

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
              <table className="min-w-full divide-y divide-[#E6DFD4]">
                <thead className="bg-[#FCF8F2] text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Coupon Code</th>
                    <th className="px-4 py-3">Discount Type</th>
                    <th className="px-4 py-3">Offer Type</th>
                    <th className="px-4 py-3">Validity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Visibility</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DFD4] text-sm">
                  {sortedCoupons.map((coupon) => (
                    <tr key={coupon._id} className="hover:bg-[#FCF8F2]">
                      <td className="px-4 py-3 font-semibold text-[#2F241D]">{coupon.couponCode}</td>
                      <td className="px-4 py-3">{coupon.discountType}</td>
                      <td className="px-4 py-3">{coupon.offerType}</td>
                      <td className="px-4 py-3">{formatDate(coupon.startDate)} – {formatDate(coupon.endDate)}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadge(coupon.status)}`}>{coupon.status}</span></td>
                      <td className="px-4 py-3">{coupon.visible ? <span className="text-emerald-700">Visible</span> : <span className="text-slate-500">Hidden</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => openView(coupon)} className="p-1.5 text-teal-600 hover:text-teal-700 transition-colors" title="View"><Eye size={15} /></button>
                          {canEdit && <button onClick={() => openEdit(coupon)} className="p-1.5 text-blue-600 hover:text-blue-700 transition-colors" title="Edit"><Pencil size={15} /></button>}
                          {canDelete && <button onClick={() => setConfirmDelete(coupon)} className="p-1.5 text-red-500 hover:text-red-700 transition-colors" title="Delete"><Trash2 size={15} /></button>}
                          {canEdit && <button onClick={() => handleToggleStatus(coupon)} className="p-1.5 text-amber-600 hover:text-amber-700 transition-colors" title="Enable/Disable">{coupon.status === 'active' ? <BadgeX size={15} /> : <BadgeCheck size={15} />}</button>}
                          {canEdit && <button onClick={() => handleToggleVisibility(coupon)} className="p-1.5 text-indigo-600 hover:text-indigo-700 transition-colors" title="Visible/Invisible">{coupon.visible ? <XCircle size={15} /> : <CheckCircle2 size={15} />}</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>Showing {sortedCoupons.length} of {pagination.total}</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-[#E6DFD4] px-3 py-2 disabled:opacity-50"><ChevronLeft size={15} /></button>
              <span>Page {page} of {pagination.pages || 1}</span>
              <button disabled={page >= (pagination.pages || 1)} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-[#E6DFD4] px-3 py-2 disabled:opacity-50"><ChevronRight size={15} /></button>
            </div>
          </div>
        </>
      )}

      {mode === 'form' && (
        <div className="rounded-3xl border border-[#E6DFD4] bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-[#2F241D]">{editingCoupon ? 'Edit Coupon' : 'Add Coupon'}</h3>
              <p className="text-sm text-gray-600 mt-1">Create or update a promotional offer for the Wooden Toys store.</p>
            </div>
            <button onClick={() => { resetForm(); setMode('list'); }} className="rounded-xl border border-[#E6DFD4] px-4 py-2 text-sm font-semibold text-[#6B4F37]">Back</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-[#2F241D]">Coupon Code *</span>
                <input value={form.couponCode} onChange={(e) => setForm({ ...form, couponCode: e.target.value })} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]" placeholder="WELCOME10" required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-[#2F241D]">Offer Type *</span>
                <select value={form.offerType} onChange={(e) => setForm({ ...form, offerType: e.target.value })} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]">
                  <option>General Offer</option>
                  <option>Cart Offer</option>
                  <option>Product Offer</option>
                  <option>Category Offer</option>
                </select>
                {form.offerType === 'Cart Offer'}
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-[#2F241D]">Discount Type *</span>
                <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]">
                  <option>Percentage</option>
                  <option>Fixed Amount</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-[#2F241D]">Discount Value *</span>
                <input type="number" min="0" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]" placeholder={form.discountType === 'Percentage' ? '10' : '150'} required />
              </label>
            </div>

            {(form.offerType === 'General Offer' || form.offerType === 'Category Offer' || form.offerType === 'Cart Offer' || form.discountType === 'Percentage') && (
              <div className="grid gap-4 md:grid-cols-2">
                {(form.offerType === 'General Offer' || form.offerType === 'Category Offer' || form.offerType === 'Cart Offer') && (
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold text-[#2F241D]">Minimum Order Value{form.offerType === 'Cart Offer' ? ' *' : ''}</span>
                    <input type="number" min="0" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]" />
                  </label>
                )}

                {form.discountType === 'Percentage' && (
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold text-[#2F241D]">Maximum Discount</span>
                    <input type="number" min="0" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]" />
                  </label>
                )}

                {(form.offerType === 'Category Offer' || form.offerType === 'Product Offer') && (
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold text-[#2F241D]">Minimum Quantity</span>
                    <input type="number" min="1" value={form.minimumQuantity} onChange={(e) => setForm({ ...form, minimumQuantity: e.target.value })} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]" />
                  </label>
                )}
              </div>
            )}

            {form.offerType === 'Product Offer' && (
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-[#2F241D]">Applicable Category</span>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value, subCategory: '' })}
                    className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]"
                  >
                    <option value="">Any</option>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-[#2F241D]">Applicable Sub Category</span>
                  <select
                    value={form.subCategory}
                    onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                    className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]"
                    disabled={!form.category || filteredSubCategories.length === 0}
                  >
                    <option value="">
                      {form.category
                        ? filteredSubCategories.length === 0
                          ? 'No applicable sub-categories'
                          : 'Any sub-category'
                        : 'Select a category first'}
                    </option>
                    {filteredSubCategories.map((sub) => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-[#2F241D]">Applicable Product</span>
                  <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]">
                    <option value="">Any</option>
                    {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </label>
              </div>
            )}

            {form.offerType === 'Category Offer' && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-[#2F241D]">Applicable Category</span>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value, subCategory: '' })}
                    className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]"
                  >
                    <option value="">Any</option>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-[#2F241D]">Applicable Sub Category</span>
                  <select
                    value={form.subCategory}
                    onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                    className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]"
                    disabled={!form.category || filteredSubCategories.length === 0}
                  >
                    <option value="">
                      {form.category
                        ? filteredSubCategories.length === 0
                          ? 'No applicable sub-categories'
                          : 'Any sub-category'
                        : 'Select a category first'}
                    </option>
                    {filteredSubCategories.map((sub) => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
                  </select>
                </label>
              </div>
            )}

            

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-[#2F241D]">Usage Limit</span>
                <input type="number" min="0" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-[#2F241D]">Start Date</span>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-[#2F241D]">End Date</span>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-[#2F241D]">Status</span>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-[#E6DFD4] px-3 py-3 text-sm font-medium text-[#2F241D]">
                <input checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} type="checkbox" className="h-4 w-4 rounded border-[#E6DFD4]" />
                Visible to Customers
              </label>
            </div>

            <label className="text-sm block">
              <span className="mb-1 block font-semibold text-[#2F241D]">Description</span>
              <textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 outline-none focus:border-[#8B5E3C]" placeholder="Describe the offer" />
            </label>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { resetForm(); setMode('list'); }} className="rounded-xl border border-[#E6DFD4] px-5 py-2.5 text-sm font-semibold text-[#6B4F37]">Cancel</button>
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-[#8B5E3C] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : null}
                {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
              </button>
            </div>
          </form>
        </div>
      )}

      {mode === 'view' && viewingCoupon && (
        <div className="rounded-3xl border border-[#E6DFD4] bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-[#2F241D]">Coupon Details</h3>
              <p className="text-sm text-gray-600 mt-1">Read-only summary of the selected coupon.</p>
            </div>
            <button onClick={() => setMode('list')} className="rounded-xl border border-[#E6DFD4] px-4 py-2 text-sm font-semibold text-[#6B4F37]">Back</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-[#FCF8F2] p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Coupon Code</p><p className="mt-1 font-semibold text-[#2F241D]">{viewingCoupon.couponCode}</p></div>
            <div className="rounded-2xl bg-[#FCF8F2] p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Offer Type</p><p className="mt-1 font-semibold text-[#2F241D]">{viewingCoupon.offerType}</p></div>
            <div className="rounded-2xl bg-[#FCF8F2] p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Discount Type</p><p className="mt-1 font-semibold text-[#2F241D]">{viewingCoupon.discountType}</p></div>
            <div className="rounded-2xl bg-[#FCF8F2] p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Discount</p><p className="mt-1 font-semibold text-[#2F241D]">{viewingCoupon.discountValue}{viewingCoupon.discountType === 'Percentage' ? '%' : ''}</p></div>
            <div className="rounded-2xl bg-[#FCF8F2] p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Applicable Product</p><p className="mt-1 font-semibold text-[#2F241D]">{viewingCoupon.product?.name || '—'}</p></div>
            <div className="rounded-2xl bg-[#FCF8F2] p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Applicable Category</p><p className="mt-1 font-semibold text-[#2F241D]">{viewingCoupon.category?.name || '—'}</p></div>
            <div className="rounded-2xl bg-[#FCF8F2] p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Validity</p><p className="mt-1 font-semibold text-[#2F241D]">{formatDate(viewingCoupon.startDate)} – {formatDate(viewingCoupon.endDate)}</p></div>
            <div className="rounded-2xl bg-[#FCF8F2] p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Status</p><p className="mt-1 font-semibold text-[#2F241D]">{viewingCoupon.status}</p></div>
            <div className="rounded-2xl bg-[#FCF8F2] p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Visibility</p><p className="mt-1 font-semibold text-[#2F241D]">{viewingCoupon.visible ? 'Visible' : 'Hidden'}</p></div>
            <div className="rounded-2xl bg-[#FCF8F2] p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Usage Count</p><p className="mt-1 font-semibold text-[#2F241D]">{viewingCoupon.usageCount || 0}</p></div>
            <div className="rounded-2xl bg-[#FCF8F2] p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Created Date</p><p className="mt-1 font-semibold text-[#2F241D]">{formatDate(viewingCoupon.createdAt)}</p></div>
            <div className="rounded-2xl bg-[#FCF8F2] p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Description</p><p className="mt-1 font-semibold text-[#2F241D]">{viewingCoupon.description || '—'}</p></div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-bold text-[#2F241D]">Delete Coupon?</h4>
            <p className="mt-2 text-sm text-gray-600">Are you sure you want to delete this coupon? This action will soft delete it and it will no longer be available.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="rounded-xl border border-[#E6DFD4] px-4 py-2 text-sm font-semibold text-[#6B4F37]">Cancel</button>
              <button onClick={handleDelete} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
