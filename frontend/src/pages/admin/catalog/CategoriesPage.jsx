import React, { useState, useEffect, useCallback } from 'react';
import { categoryV2API } from '../../../api/catalogV2Service';
import { Download, RefreshCw, Plus } from 'lucide-react';
import { downloadExcelFile } from '../../../utils/exportUtils';

// ─── Reusable Badge ───────────────────────────────────────────────────────────
const StatusBadge = ({ active }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
    active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

// ─── Input Field Wrapper ──────────────────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = 'w-full px-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-colors';

export const CategoriesPage = ({ canCreate = true, canEdit = true, canDelete = true }) => {
  // ─── State ────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Form / Drawer
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', slug: '', description: '', displayOrder: 1, isActive: true,
    seoTitle: '', seoDescription: '', seoKeywords: '', availableWoodTypes: '',
  });
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
  }, [search, statusFilter, page]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const openForm = (cat = null) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (cat) {
      setEditId(cat._id);
      setFormData({
        name: cat.name || '', slug: cat.slug || '', description: cat.description || '',
        displayOrder: cat.displayOrder || 1, isActive: cat.isActive !== false,
        seoTitle: cat.seoTitle || '', seoDescription: cat.seoDescription || '',
        seoKeywords: Array.isArray(cat.seoKeywords) ? cat.seoKeywords.join(', ') : '',
        availableWoodTypes: Array.isArray(cat.availableWoodTypes) ? cat.availableWoodTypes.join(', ') : '',
      });
    } else {
      setEditId(null);
      setFormData({ name: '', slug: '', description: '', displayOrder: 1, isActive: true, seoTitle: '', seoDescription: '', seoKeywords: '', availableWoodTypes: '' });
    }
    setIsFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { setErrorMsg('Category Name is required.'); return; }
    setFormLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        ...formData,
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
      setIsFormOpen(false);
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1">
            Dashboard &rsaquo; Catalog Management &rsaquo; <span className="text-[#8B5E3C] font-semibold">Categories</span>
          </p>
          <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage product categories, SEO settings, and wood preferences.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchCategories} className="admin-secondary-btn">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={exportCategoriesExcel} className="admin-export-btn">
            <Download size={16} /> Export Excel
          </button>
          <button
            onClick={() => openForm()}
            className="admin-btn"
          >
            <Plus size={16} /> Add Category
          </button>
        </div>
      </div>

      {/* Filters */}
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
        <button onClick={fetchCategories} className="p-2.5 border border-[#E6DFD4] rounded-xl hover:bg-[#F8F4EC] transition-colors" title="Refresh">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#F8F4EC] border border-[#E6DFD4] rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[#8B5E3C]">{selectedIds.length} selected</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => handleBulkStatus(true)} className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Set Active</button>
            <button onClick={() => handleBulkStatus(false)} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Set Inactive</button>
            <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">Delete Selected</button>
            <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-white transition-colors text-gray-500">Clear</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#F8F4EC] border-b border-[#E6DFD4]">
              <tr>
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === categories.length}
                    onChange={e => toggleSelectAll(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                  />
                </th>
                {['Category Name', 'Slug', 'Display Order', 'Status', 'Created Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#8B5E3C] border-t-transparent rounded-full animate-spin" />
                    Loading categories...
                  </div>
                </td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-[#F8F4EC] rounded-full flex items-center justify-center text-2xl">🗂️</div>
                    <p className="font-medium">No categories found.</p>
                    <button onClick={() => openForm()} className="text-[#8B5E3C] text-sm font-semibold hover:underline">+ Add your first category</button>
                  </div>
                </td></tr>
              ) : (
                categories.map((cat, idx) => (
                  <tr
                    key={cat._id}
                    className={`border-b border-[#F0EAE2] transition-colors hover:bg-[#FDF9F5] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(cat._id)}
                        onChange={e => toggleSelectOne(cat._id, e.target.checked)}
                        className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#F8F4EC] border border-[#E6DFD4] flex items-center justify-center text-base">🗂️</div>
                        <span className="font-semibold text-gray-800">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="text-xs bg-[#F8F4EC] text-[#8B5E3C] px-2 py-1 rounded-md font-mono">{cat.slug}</code>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-[#F8F4EC] text-[#8B5E3C] text-xs font-bold rounded-full border border-[#E6DFD4]">
                        {cat.displayOrder}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => handleToggleStatus(cat)} title="Click to toggle">
                        <StatusBadge active={cat.isActive} />
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(cat.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2 justify-end">
                        {canEdit && (
                        <button
                          onClick={() => openForm(cat)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        )}
                        {canDelete && (
                        <button
                          onClick={() => setDeleteTarget(cat._id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[#E6DFD4] flex items-center justify-between bg-[#FAFAFA]">
            <p className="text-xs text-gray-500">Showing {categories.length} of {total} categories</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs border border-[#E6DFD4] rounded-lg disabled:opacity-40 hover:bg-[#F8F4EC]">Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 text-xs border rounded-lg ${p === page ? 'bg-[#8B5E3C] text-white border-[#8B5E3C]' : 'border-[#E6DFD4] hover:bg-[#F8F4EC]'}`}>{p}</button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs border border-[#E6DFD4] rounded-lg disabled:opacity-40 hover:bg-[#F8F4EC]">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── SIDE DRAWER FORM ──────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)}>
          <div
            className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideInRight 0.25s ease' }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E6DFD4] bg-[#F8F4EC]">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{editId ? 'Edit Category' : 'Add New Category'}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{editId ? 'Update the category details below.' : 'Fill in the details to create a new category.'}</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-2 rounded-xl hover:bg-[#E6DFD4] text-gray-400 hover:text-gray-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Drawer Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{errorMsg}</div>
              )}

              {/* Basic Info */}
              <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#F8F4EC] border border-[#E6DFD4] rounded-lg flex items-center justify-center text-xs">📦</span>
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
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Display Order">
                    <input type="number" min={1} value={formData.displayOrder} onChange={setField('displayOrder')} className={inputCls} />
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
              <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#F8F4EC] border border-[#E6DFD4] rounded-lg flex items-center justify-center text-xs">🔍</span>
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
              <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#F8F4EC] border border-[#E6DFD4] rounded-lg flex items-center justify-center text-xs">🪵</span>
                  Wood Preferences
                </h3>
                <Field label="Available Wood Types (comma separated)">
                  <input type="text" value={formData.availableWoodTypes} onChange={setField('availableWoodTypes')} placeholder="Oak, Pine, Maple" className={inputCls} />
                </Field>
              </div>
            </form>

            {/* Drawer Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E6DFD4] bg-[#FAFAFA]">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-5 py-2.5 border border-[#E6DFD4] rounded-xl text-sm font-semibold text-gray-600 hover:bg-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={formLoading}
                className="flex items-center gap-2 bg-[#8B5E3C] hover:bg-[#7a5234] disabled:opacity-60 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {formLoading ? 'Saving...' : editId ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 text-center mb-2">Delete Category</h3>
            <p className="text-sm text-gray-500 text-center mb-6">This will soft-delete the category. Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-[#E6DFD4] rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
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
