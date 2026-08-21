import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { categoryV2API, clearCatalogCache } from '../../../api/catalogV2Service';
import { Plus, Download, RefreshCw, X, Image as ImageIcon, Trash2, SquarePen } from 'lucide-react';
import Pagination from '../../../components/common/Pagination';
import { downloadExcelFile } from '../../../utils/exportUtils';
import { API_BASE } from '../../../api/apiClient';

// ─── Reusable Badge ───────────────────────────────────────────────────────────
const StatusBadge = ({ active }) => (
  <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
    {active ? 'Active' : 'Inactive'}
  </span>
);

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">
      {label} {required && <span className="text-red-500 text-lg ml-1">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = 'w-full px-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-colors';

export const CategoriesPage = ({ canCreate = true, canEdit = true, canDelete = true }) => {
  // ─── State ────────────────────────────────────────────────────────────────
  const location = useLocation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Form / Drawer
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', slug: '', description: '', displayOrder: 1, isActive: true,
    seoTitle: '', seoDescription: '', seoKeywords: '', availableWoodTypes: '',
    image: null, // Category image (CloudinaryAsset object or null)
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null); // single delete confirm

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, page, limit: 10 };
      if (statusFilter !== '') params.isActive = statusFilter;
      const res = await categoryV2API.getAll(params);
      if (res.success) {
        setCategories(res.categories || []);
        setTotalPages(res.pagination?.pages || 1);
        setTotal(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, refreshKey]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  useEffect(() => {
    const checkRoute = async () => {
      const path = location.pathname;
      if (path === '/admin/catalog/categories/add') {
        if (!isFormOpen || editId) {
          openForm(null, true);
        }
      } else if (path.startsWith('/admin/catalog/categories/edit/')) {
        const id = path.split('/').pop();
        if (!isFormOpen || editId !== id) {
          try {
            const res = await categoryV2API.getById(id);
            if (res.success && res.category) {
              openForm(res.category, true);
            }
          } catch (err) {
            console.error("Failed to fetch category for edit", err);
            navigate('/admin/catalog/categories');
          }
        }
      } else {
        setIsFormOpen(false);
        setEditId(null);
      }
    };
    checkRoute();
  }, [location.pathname]); // omit categories dependency

  // ─── Handlers ────────────────────────────────────────────────────────────
  const openForm = (cat = null, isFromRoute = false) => {
    setErrorMsg('');
    setSuccessMsg('');
    setImageFile(null);
    if (cat) {
      setEditId(cat._id);
      setFormData({
        name: cat.name || '', slug: cat.slug || '', description: cat.description || '',
        displayOrder: cat.displayOrder || 1, isActive: cat.isActive !== false,
        seoTitle: cat.seoTitle || '', seoDescription: cat.seoDescription || '',
        seoKeywords: Array.isArray(cat.seoKeywords) ? cat.seoKeywords.join(', ') : '',
        availableWoodTypes: Array.isArray(cat.availableWoodTypes) ? cat.availableWoodTypes.join(', ') : '',
        image: cat.image || null, // CloudinaryAsset object
      });
      setImagePreview((typeof cat.image === 'object' ? cat.image?.url : cat.image) || null);
    } else {
      setEditId(null);
      setFormData({ name: '', slug: '', description: '', displayOrder: 1, isActive: true, seoTitle: '', seoDescription: '', seoKeywords: '', availableWoodTypes: '', image: null });
      setImagePreview(null);
    }
    setIsFormOpen(true);
    if (!isFromRoute) {
      if (cat) {
        navigate(`/admin/catalog/categories/edit/${cat._id}`);
      } else {
        navigate('/admin/catalog/categories/add');
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { setErrorMsg('Category Name is required.'); return; }
    setFormLoading(true);
    setErrorMsg('');
    try {
      let imageAsset = formData.image; // CloudinaryAsset object or null

      // Upload image if a new file was selected
      if (imageFile) {
        imageAsset = await uploadImage(imageFile); // returns full asset object
      }

      const payload = {
        ...formData,
        image: imageAsset || undefined, // pass CloudinaryAsset object or omit
        displayOrder: Number(formData.displayOrder),
        seoKeywords: formData.seoKeywords.split(',').map(s => s.trim()).filter(Boolean),
        availableWoodTypes: formData.availableWoodTypes.split(',').map(s => s.trim()).filter(Boolean),
      };
      if (editId) {
        await categoryV2API.update(editId, payload);
        setSuccessMsg('Category updated!');
      } else {
        await categoryV2API.create(payload);
        setSuccessMsg('Category created!');
      }
      navigate('/admin/catalog/categories');
      setImageFile(null);
      setImagePreview(null);
      fetchCategories();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save category.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (cat) => {
    try {
      await categoryV2API.update(cat._id, { isActive: !cat.isActive });
      fetchCategories();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await categoryV2API.delete(deleteTarget);
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) { alert(err.message); }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected categories?`)) return;
    try {
      await categoryV2API.bulkDelete(selectedIds);
      setSelectedIds([]);
      fetchCategories();
    } catch (err) { alert(err.message); }
  };

  const handleBulkStatus = async (isActive) => {
    if (!selectedIds.length) return;
    try {
      await categoryV2API.bulkStatus(selectedIds, isActive);
      setSelectedIds([]);
      fetchCategories();
    } catch (err) { alert(err.message); }
  };

  const exportCategoriesExcel = () => {
    const header = ['Category ID', 'Name', 'Slug', 'Active', 'Display Order', 'Created At'];
    const rows = categories.map(cat => ({
      'Category ID': cat._id,
      'Name': cat.name || '',
      'Slug': cat.slug || '',
      'Active': cat.isActive ? 'Yes' : 'No',
      'Display Order': cat.displayOrder ?? '',
      'Created At': cat.createdAt ? new Date(cat.createdAt).toLocaleString('en-IN') : '',
    }));
    downloadExcelFile('categories', header, rows);
  };

  const toggleSelectAll = (checked) =>
    setSelectedIds(checked ? categories.map(c => c._id) : []);

  const toggleSelectOne = (id, checked) =>
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));

  const setField = (key) => (e) =>
    setFormData(prev => ({ ...prev, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  // ─── Image Upload Handler ────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('Only image files are allowed (jpg, png, webp, gif)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 10MB');
      return;
    }

    setImageFile(file);
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    setErrorMsg('');
  };

  const uploadImage = async (file) => {
    const formDataUpload = new FormData();
    formDataUpload.append('images', file);

    const token = localStorage.getItem('token');
    const uploadUrl = `${API_BASE}/catalog/upload`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formDataUpload,
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('Upload error:', result);
      throw new Error(result.message || 'Failed to upload image');
    }

    // Backend returns: { success: true, data: [{ url, public_id, width, height, format, resource_type, bytes, created_at }] }
    const asset = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!asset || !asset.url) {
      throw new Error('Upload succeeded but no asset URL was returned');
    }
    console.log('Image uploaded successfully:', asset.url);
    return asset; // Return the full CloudinaryAsset object
  };

  const handleRefresh = () => {
    clearCatalogCache();
    setSearch('');
    setStatusFilter('');
    setPage(1);
    setRefreshKey(k => k + 1);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[13px] md:text-sm font-serif text-white mb-1">
            Dashboard &rsaquo; Catalog Management &rsaquo; <span className="font-semibold text-[#8B5E3C]">Categories</span>
          </p>
          <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Categories</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} className="admin-secondary-btn">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={exportCategoriesExcel} className="admin-export-btn">
            <Download size={16} /> Export Excel
          </button>
          {canCreate && (
            <button onClick={() => navigate('/admin/catalog/categories/add')} className="admin-btn">
              <Plus size={16} /> Add Category
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="py-2.5 px-3 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 bg-white"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-[#F8F4EC] border border-[#E6DFD4] rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[#8B5E3C]">{selectedIds.length} selected</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            {canEdit && (
              <>
                <button onClick={() => handleBulkStatus(true)} className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Set Active</button>
                <button onClick={() => handleBulkStatus(false)} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Set Inactive</button>
              </>
            )}
            {canDelete && (
              <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">Delete Selected</button>
            )}
            <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-white transition-colors text-gray-500">Clear</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#F8F4EC] border-b border-[#E6DFD4]">
              <tr>
                <th className="px-6 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === categories.length}
                    onChange={e => toggleSelectAll(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer mx-auto block"
                  />
                </th>
                {['Category Name', 'Slug', 'Display Order', 'Status', 'Created Date', 'Actions'].map(h => (
                  <th key={h} className={`px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#E9DED3]">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-4 whitespace-nowrap text-[16px] font-semibold text-gray-400 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#8B5E3C] border-t-transparent rounded-full animate-spin" />
                    Loading categories...
                  </div>
                </td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-4 whitespace-nowrap text-[16px] font-semibold text-gray-400 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-[#F8F4EC] rounded-full flex items-center justify-center text-2xl">🗂️</div>
                    <p className="font-medium">No categories found.</p>
                    {canCreate && (
                      <button onClick={() => navigate('/admin/catalog/categories/add')} className="text-[#8B5E3C] text-sm font-semibold hover:underline">+ Add your first category</button>
                    )}
                  </div>
                </td></tr>
              ) : (
                categories.map((cat, idx) => (
                  <tr
                    key={cat._id}
                    className={`border-b border-[#F0EAE2] transition-colors hover:bg-[#FDF9F5] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] font-semibold text-gray-400 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(cat._id)}
                        onChange={e => toggleSelectOne(cat._id, e.target.checked)}
                        className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer mx-auto block"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] font-bold text-black-400 text-center">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-[#F8F4EC] border border-[#E6DFD4] flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                          {cat.image ? (
                            <img src={cat.image?.url || cat.image} alt={cat.name} className="w-full h-full object-cover" />
                          ) : "🗂️"}
                        </div>
                        <span className="font-bold text-[16px] text-gray-800">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] font-bold text-black-400 text-center">
                      <span className="font-semibold text-[16px] text-gray-800">
                        {cat.slug}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] font-bold text-black-400 text-center">
                      <span className="font-semibold text-[16px] text-gray-800">
                        {cat.displayOrder}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] font-bold text-gray-400 text-center">
                      {canEdit ? (
                        <button onClick={() => handleToggleStatus(cat)} title="Click to toggle">
                          <StatusBadge active={cat.isActive} size={16} />
                        </button>
                      ) : (
                        <StatusBadge active={cat.isActive} size={16} />
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#8B5E3C] font-bold whitespace-nowrap text-center text-[16px]">
                      {new Date(cat.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                      <div className="flex items-center justify-center gap-2">
                        {canEdit && (
                          <button
                            onClick={() => navigate(`/admin/catalog/categories/edit/${cat._id}`)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <SquarePen size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget(cat._id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center bg-white">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* ── SIDE DRAWER FORM ──────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => navigate('/admin/catalog/categories')}>
          <div
            className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideInRight 0.25s ease' }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-8 py-8 border-b border-[#E6DFD4] bg-[#F8F4EC]">
              <div>
                <h2 className="text-3xl font-serif font-bold text-[#141225] tracking-tight">{editId ? 'Edit Category' : 'Add New Category'}</h2>
              </div>
              <button onClick={() => navigate('/admin/catalog/categories')} className="p-2 text-gray-400 hover:text-red-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Drawer Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{errorMsg}</div>
              )}

              {/* Basic Info */}
              <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-6 space-y-5">
                <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                  <span className="w-6 h-6 #E6DFD4] flex items-center justify-center text-sm font-semibold text-gray-800">📦</span>
                  Basic Information
                </h3>
                <Field label="Category Name" required>
                  <input type="text" required value={formData.name} onChange={setField('name')} placeholder="e.g. Musical Toys" className={inputCls} />
                </Field>
                <Field label="Slug (auto-generated if empty)">
                  <input type="text" value={formData.slug} onChange={setField('slug')} placeholder="e.g. musical-toys" className={inputCls + ' font-mono text-xs'} />
                </Field>
                <Field label="Description">
                  <textarea rows={3} value={formData.description} onChange={setField('description')} placeholder="Brief description of this category..." className={inputCls} />
                </Field>

                {/* Image Upload Field */}
                <Field label="Category Image">
                  <div className="space-y-3">
                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="relative w-full h-40 rounded-xl overflow-hidden bg-[#F8F4EC] border border-[#E6DFD4]">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setImageFile(null);
                            setFormData(prev => ({ ...prev, image: null }));
                          }}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                          title="Remove image"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )}
                    {/* File Input */}
                    <label className={`flex items-center justify-center px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${imagePreview ? 'border-[#E6DFD4] bg-[#FAFAFA]' : 'border-[#E6DFD4] hover:border-[#8B5E3C] hover:bg-[#F8F4EC]'
                      }`}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <div className="text-center">
                        <svg className="w-8 h-8 text-[#8B5E3C] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="text-sm font-semibold text-gray-700">{imagePreview ? 'Change Image' : 'Click to upload image'}</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP, GIF (max 10MB)</p>
                      </div>
                    </label>
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Display Order">
                    <input type="text" inputMode="numeric" min={1} value={formData.displayOrder} onChange={setField('displayOrder')} className={inputCls} />
                  </Field>
                  <div className="flex items-center gap-3 mt-6">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={formData.isActive} onChange={setField('isActive')} className="sr-only peer" />
                      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[#8B5E3C] transition-colors" />
                      <div className="absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full shadow transition-transform peer-checked:translate-x-5" />
                    </label>
                    <span className="text-sm font-semibold text-gray-700">{formData.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>

              {/* SEO Settings */}
              <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-6 space-y-5">
                <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                  <span className="w-6 h-6 #E6DFD4] flex items-center justify-center text-sm font-semibold text-gray-800">🔍</span>
                  SEO & Metadata
                </h3>
                <Field label="SEO Title">
                  <input type="text" value={formData.seoTitle} onChange={setField('seoTitle')} placeholder="Meta title for Google search" className={inputCls} />
                </Field>
                <Field label="SEO Description">
                  <textarea rows={2} value={formData.seoDescription} onChange={setField('seoDescription')} placeholder="Meta description for search snippets" className={inputCls} />
                </Field>
                <Field label="SEO Keywords (comma separated)">
                  <input type="text" value={formData.seoKeywords} onChange={setField('seoKeywords')} placeholder="toys, blocks, stacking" className={inputCls} />
                </Field>
              </div>

              {/* Preferences */}
              <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-6 space-y-5">
                <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                  <span className="w-6 h-6 #E6DFD4] flex items-center justify-center text-sm font-semibold text-gray-800">🪵</span>
                  Wood Preferences
                </h3>
                <Field label="Available Wood Types (comma separated)">
                  <input type="text" value={formData.availableWoodTypes} onChange={setField('availableWoodTypes')} placeholder="Oak, Pine, Maple" className={inputCls} />
                </Field>
              </div>
              {/* Form Actions */}
              <div className="flex items-center justify-center gap-4 pt-6 pb-2">
                <button type="button" onClick={() => navigate('/admin/catalog/categories')} className="admin-cancel-btn">CANCEL</button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 bg-[#8B5E3C] hover:bg-[#7a5234] disabled:opacity-60 text-white px-8 py-3 rounded-full text-[15px] font-bold transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {formLoading ? 'Saving...' : editId ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 text-center mb-2">Delete Category</h3>
            <p className="text-sm text-gray-500 text-center mb-6">This will soft-delete the category. Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="admin-cancel-btn">CANCEL</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Slide animation style */}
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
};

export default CategoriesPage;
