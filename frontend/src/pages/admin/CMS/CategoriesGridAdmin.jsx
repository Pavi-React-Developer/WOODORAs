import React, { useState, useEffect } from 'react';
import { cmsService } from '../../../api/cmsService';
import { Pencil, Trash2, Plus, Eye, EyeOff, Search, X, SquarePen, Trash } from 'lucide-react';
import { categoryV2API } from '../../../api/catalogV2Service';
import { API_ORIGIN } from '../../../api/apiClient';

function CategoryPicker({ selected, onChange, categoriesList }) {
  const [search, setSearch] = useState('');

  // Filter categories
  const filtered = categoriesList.filter(c => {
    let match = true;
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) match = false;
    return match;
  });

  const toggle = (category) => {
    const isSelected = selected.some(x => x._id === category._id);
    if (isSelected) {
      onChange(selected.filter(x => x._id !== category._id));
    } else {
      onChange([...selected, category]);
    }
  };

  return (
    <div className="space-y-3 bg-[#FDFCFB] p-4 rounded-xl border border-[#E6DFD4]">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-brand-medium" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search categories..." className="w-full pl-9 pr-3 py-2 text-sm border border-[#E6DFD4] rounded-lg" />
      </div>

      <div className="max-h-52 overflow-y-auto border border-[#E6DFD4] rounded-xl bg-white divide-y divide-[#E6DFD4]">
        {filtered.length === 0 ? <p className="p-3 text-xs text-brand-medium">No categories found.</p> :
          filtered.map(c => {
            const isSelected = selected.some(x => x._id === c._id);
            return (
              <label key={c._id} className="flex items-center gap-3 px-3 py-2 hover:bg-[#F7F3EE] cursor-pointer">
                <input type="checkbox" checked={isSelected} onChange={() => toggle(c)} />
                {(c.image?.url || c.image) && <img src={c.image?.url || c.image} alt="" className="w-8 h-8 object-cover rounded" />}
                <span className="text-sm text-brand-dark">{c.name}</span>
              </label>
            );
          })}
      </div>
    </div>
  );
}

const emptyForm = { title: '', categories: [], mobileCount: '2', desktopCount: '4', ctaText: '', ctaUrl: '', ctaPosition: 'right', showArrows: true, showDots: false, status: true, sortOrder: '0' };

export default function CategoriesGridAdmin({ canCreate, canEdit, canDelete }) {
  const [items, setItems] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch all categories once to map IDs to objects easily
    categoryV2API.getAll({ limit: 500, isActive: 'true' })
      .then(d => setAllCategories(d.categories || d.data || []))
      .catch(console.error);
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try { const res = await cmsService.getCategoriesGrids(); setItems(res.data || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.categories.length) return alert('Select at least one category.');
    setSaving(true);

    // We only want to send category IDs to the backend
    const payload = {
      ...form,
      sortOrder: parseInt(form.sortOrder) || 0,
      mobileCount: parseInt(form.mobileCount) || 2,
      desktopCount: parseInt(form.desktopCount) || 4,
      categories: form.categories.map(c => c._id || c)
    };

    try {
      if (editId) await cmsService.updateCategoriesGrid(editId, payload);
      else await cmsService.createCategoriesGrid(payload);
      (window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '')), setShowForm(false)); setForm(emptyForm); setEditId(null); fetchItems();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleEdit = async (item) => {
    // If categories haven't loaded yet, fetch them first
    let cats = allCategories;
    if (!cats.length) {
      try {
        const d = await categoryV2API.getAll({ limit: 500, isActive: 'true' });
        cats = d.categories || d.data || [];
        setAllCategories(cats);
      } catch (e) {
        console.error(e);
      }
    }

    // Map category IDs back to objects so the picker shows them correctly
    const populatedCategories = (item.categories || []).map(cId => {
      if (typeof cId === 'object' && cId._id) return cId; // Already populated
      return cats.find(x => x._id === cId) || { _id: cId, name: 'Unknown Category' };
    });

    setForm({
      title: item.title,
      categories: populatedCategories,
      mobileCount: String(item.mobileCount ?? 2),
      desktopCount: String(item.desktopCount ?? 4),
      ctaText: item.ctaText || '',
      ctaUrl: item.ctaUrl || '',
      ctaPosition: item.ctaPosition || 'right',
      showArrows: item.showArrows !== false,
      showDots: item.showDots || false,
      status: item.status,
      sortOrder: String(item.sortOrder ?? 0)
    });
    setEditId(item._id);
    window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '') + '/edit'); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this categories grid?')) return;
    try { await cmsService.deleteCategoriesGrid(id); fetchItems(); }
    catch (err) { alert(err.message); }
  };

  const handleToggle = async (item) => {
    try { await cmsService.updateCategoriesGrid(item._id, { ...item, categories: item.categories?.map(c => c._id || c), status: !item.status }); fetchItems(); }
    catch (err) { alert(err.message); }
  };

  const removeSelectedCategory = (id) => {
    setForm(f => ({ ...f, categories: f.categories.filter(c => c._id !== id) }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-brand-dark">Categories Grid Sections</h3>
        {canCreate && (
          <button onClick={() => { window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '') + '/edit'); setShowForm(true); setEditId(null); setForm(emptyForm); }}
            className="flex items-center gap-2 bg-[#8B5E3C] text-white px-5 py-2.5 rounded-full hover:bg-[#7a5234] transition-colors disabled:opacity-60">
            <Plus size={15} /> Add Categories Grid
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E6DFD4] p-6 shadow-sm">
          <h4 className="font-semibold text-brand-dark mb-5">{editId ? 'Edit Categories Grid' : 'New Categories Grid'}</h4>
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Section Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="e.g. Shop by Category" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Sort Order</label>
                <input type="text" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Mobile View Category Count</label>
                <input type="text" value={form.mobileCount} onChange={e => setForm(f => ({ ...f, mobileCount: e.target.value }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="2" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Desktop View Category Count</label>
                <input type="text" value={form.desktopCount} onChange={e => setForm(f => ({ ...f, desktopCount: e.target.value }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="4" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">CTA Button Text (optional)</label>
                <input value={form.ctaText} onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="View All" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">CTA URL (optional)</label>
                <input value={form.ctaUrl} onChange={e => setForm(f => ({ ...f, ctaUrl: e.target.value }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="categories" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">CTA Position</label>
                <select value={form.ctaPosition} onChange={e => setForm(f => ({ ...f, ctaPosition: e.target.value }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div className="flex gap-4 items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.showArrows} onChange={e => setForm(f => ({ ...f, showArrows: e.target.checked }))} className="rounded border-gray-300 text-brand-dark focus:ring-brand-dark" />
                  <span className="text-sm font-semibold text-brand-medium uppercase tracking-wider block">Show Arrows</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.showDots} onChange={e => setForm(f => ({ ...f, showDots: e.target.checked }))} className="rounded border-gray-300 text-brand-dark focus:ring-brand-dark" />
                  <span className="text-sm font-semibold text-brand-medium uppercase tracking-wider block">Show Dots</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-2">Select Categories *</label>
              <CategoryPicker selected={form.categories} onChange={(categories) => setForm(f => ({ ...f, categories }))} categoriesList={allCategories} />
            </div>

            {/* Selected Categories Display */}
            {form.categories.length > 0 && (
              <div className="bg-[#FDFCFB] p-4 rounded-xl border border-[#E6DFD4]">
                <p className="text-xs font-semibold text-brand-medium uppercase tracking-wider mb-3">Selected Categories ({form.categories.length})</p>
                <div className="flex flex-wrap gap-2">
                  {form.categories.map(c => (
                    <div key={c._id} className="flex items-center gap-2 bg-white border border-[#E6DFD4] px-3 py-1.5 rounded-lg text-sm text-brand-dark shadow-sm">
                      <span className="truncate max-w-[150px]">{c.name || 'Unknown Category'}</span>
                      <button type="button" onClick={() => removeSelectedCategory(c._id)} className="text-red-500 hover:text-red-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input type="checkbox" id="grid-status" checked={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.checked }))} />
              <label htmlFor="grid-status" className="text-sm text-brand-dark">Active</label>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[#E6DFD4]">
              <button type="button" onClick={() => (window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '')), setShowForm(false))}
                className="admin-cancel-btn">CANCEL</button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-[#8B5E3C] text-white px-5 py-2.5 rounded-full hover:bg-[#7a5234] transition-colors disabled:opacity-60">
                {saving ? 'Saving...' : editId ? 'Update Grid' : 'Save Grid'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? [1, 2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />) :
          items.length === 0 ? (
            <div className="p-8 text-center text-brand-medium text-sm bg-white rounded-2xl border border-[#E6DFD4]">No categories grids yet.</div>
          ) : items.map(item => (
            <div key={item._id} className="bg-white rounded-2xl border border-[#E6DFD4] p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm">
              <div className="flex gap-1">
                {(item.categories || []).slice(0, 4).map((c, i) => {
                  const populated = typeof c === 'object' ? c : allCategories.find(x => x._id === c);
                  let src = populated?.image?.url || populated?.image || null;
                  if (src && typeof src === 'string' && src.startsWith('/uploads')) {
                    src = `${API_ORIGIN}${src}`;
                  }
                  if (!src) return <div key={i} className="w-10 h-10 rounded-lg border border-[#E6DFD4] bg-[#F7F3EE]" />;
                  return <img key={i} src={src} alt="" onError={e => e.target.style.display = 'none'} className="w-10 h-10 rounded-lg object-cover border border-[#E6DFD4] bg-[#F7F3EE]" />;
                })}
              </div>
              <div className="flex-1 w-full">
                <p className="font-semibold text-brand-dark text-sm">{item.title}</p>
                <div className="flex items-center gap-3 text-xs text-brand-medium mt-0.5">
                  <span>{item.categories?.length || 0} categories</span>
                  <span className="w-1 h-1 text-sm font-semibold text-gray-800" />
                  <span>M: {item.mobileCount || 2}</span>
                  <span className="w-1 h-1 text-sm font-semibold text-gray-800" />
                  <span>D: {item.desktopCount || 4}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {item.status ? 'Active' : 'Off'}
                </span>
                {canEdit && (
                  <>
                    <button onClick={() => handleToggle(item)} className="text-green-600 hover:text-green-700 transition-colors">
                      {item.status ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-700 transition-colors">
                      <SquarePen size={16} />
                    </button>
                  </>
                )}
                {canDelete && (
                  <button onClick={() => handleDelete(item._id)} className="text-red-500 hover:text-red-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
