import React, { useState, useEffect } from 'react';
import { cmsService } from '../../../api/cmsService';
import { Pencil, Trash2, Plus, Eye, EyeOff, Search, X, SquarePen, Trash } from 'lucide-react';
import { categoryV2API, subCategoryV2API, productV2API } from '../../../api/catalogV2Service';
import { API_ORIGIN } from '../../../api/apiClient';

function ProductPicker({ selected, onChange, productsList }) {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [selectedCat, setSelectedCat] = useState('');
  const [selectedSubCat, setSelectedSubCat] = useState('');
  const [search, setSearch] = useState('');

  // Fetch categories on mount
  useEffect(() => {
    categoryV2API.getAll({ limit: 100 })
      .then(d => {
        const cats = d.data || d.categories || [];
        setCategories(cats);
      })
      .catch(console.error);

    subCategoryV2API.getAll({ limit: 100 })
      .then(d => {
        const subs = d.data || d.subCategories || d.subcategories || [];
        setSubcategories(subs);
      })
      .catch(console.error);
  }, []);

  const availableSubs = subcategories.filter(s => {
    const catId = typeof s.category === 'object' ? s.category?._id : s.category;
    return catId === selectedCat;
  });

  // Filter products
  const filtered = productsList.filter(p => {
    let match = true;
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) match = false;
    if (selectedCat) {
      const pCatId = typeof p.category === 'object' ? p.category?._id : p.category;
      if (pCatId !== selectedCat) match = false;
    }
    if (selectedSubCat) {
      const pSubId = typeof p.subCategory === 'object' ? p.subCategory?._id : p.subCategory;
      if (pSubId !== selectedSubCat) match = false;
    }
    return match;
  });

  const toggle = (product) => {
    const isSelected = selected.some(x => x._id === product._id);
    if (isSelected) {
      onChange(selected.filter(x => x._id !== product._id));
    } else {
      onChange([...selected, product]);
    }
  };

  return (
    <div className="space-y-3 bg-[#FDFCFB] p-4 rounded-xl border border-[#E6DFD4]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <select value={selectedCat} onChange={e => { setSelectedCat(e.target.value); setSelectedSubCat(''); }} className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <select value={selectedSubCat} onChange={e => setSelectedSubCat(e.target.value)} disabled={!selectedCat} className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-50">
            <option value="">All Subcategories</option>
            {availableSubs.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-brand-medium" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search products..." className="w-full pl-9 pr-3 py-2 text-sm border border-[#E6DFD4] rounded-lg" />
      </div>

      <div className="max-h-52 overflow-y-auto border border-[#E6DFD4] rounded-xl bg-white divide-y divide-[#E6DFD4]">
        {filtered.length === 0 ? <p className="p-3 text-xs text-brand-medium">No products found.</p> :
          filtered.map(p => {
            const isSelected = selected.some(x => x._id === p._id);
            return (
              <label key={p._id} className="flex items-center gap-3 px-3 py-2 hover:bg-[#F7F3EE] cursor-pointer">
                <input type="checkbox" checked={isSelected} onChange={() => toggle(p)} />
                {(p.images?.[0]?.url || p.images?.[0] || p.image) && <img src={p.images?.[0]?.url || p.images?.[0] || p.image} alt="" className="w-8 h-8 object-cover rounded" />}
                <span className="text-sm text-brand-dark">{p.name}</span>
              </label>
            );
          })}
      </div>
    </div>
  );
}

const emptyForm = { title: '', products: [], mobileCount: 2, desktopCount: 4, ctaText: '', ctaUrl: '', ctaPosition: 'right', showArrows: true, showDots: false, status: true, sortOrder: 0 };

export default function ProductGridAdmin({ canCreate, canEdit, canDelete }) {
  const [items, setItems] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch all products once to map IDs to objects easily
    productV2API.getAll({ limit: 500, isActive: 'true' })
      .then(d => setAllProducts(d.products || d.data || []))
      .catch(console.error);
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try { const res = await cmsService.getProductGrids(); setItems(res.data || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.products.length) return alert('Select at least one product.');
    setSaving(true);

    // We only want to send product IDs to the backend
    const payload = {
      ...form,
      products: form.products.map(p => p._id || p)
    };

    try {
      if (editId) await cmsService.updateProductGrid(editId, payload);
      else await cmsService.createProductGrid(payload);
      (window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '')), setShowForm(false)); setForm(emptyForm); setEditId(null); fetchItems();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (item) => {
    // Map product IDs back to objects so the picker shows them correctly
    const populatedProducts = (item.products || []).map(pId => {
      if (typeof pId === 'object' && pId._id) return pId; // Already populated
      return allProducts.find(x => x._id === pId) || { _id: pId, name: 'Unknown Product' };
    });

    setForm({
      title: item.title,
      products: populatedProducts,
      mobileCount: item.mobileCount || 2,
      desktopCount: item.desktopCount || 4,
      ctaText: item.ctaText || '',
      ctaUrl: item.ctaUrl || '',
      ctaPosition: item.ctaPosition || 'right',
      showArrows: item.showArrows !== false,
      showDots: item.showDots || false,
      status: item.status,
      sortOrder: item.sortOrder || 0
    });
    setEditId(item._id);
    window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '') + '/edit'); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product grid?')) return;
    try { await cmsService.deleteProductGrid(id); fetchItems(); }
    catch (err) { alert(err.message); }
  };

  const handleToggle = async (item) => {
    try { await cmsService.updateProductGrid(item._id, { ...item, products: item.products?.map(p => p._id || p), status: !item.status }); fetchItems(); }
    catch (err) { alert(err.message); }
  };

  const removeSelectedProduct = (id) => {
    setForm(f => ({ ...f, products: f.products.filter(p => p._id !== id) }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-brand-dark">Product Grid Sections</h3>
        {canCreate && (
          <button onClick={() => { window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '') + '/edit'); setShowForm(true); setEditId(null); setForm(emptyForm); }}
            className="flex items-center gap-2 bg-[#8B5E3C] text-white px-5 py-2.5 rounded-full hover:bg-[#7a5234] transition-colors disabled:opacity-60">
            <Plus size={15} /> Add Grid
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E6DFD4] p-6 shadow-sm">
          <h4 className="font-semibold text-brand-dark mb-5">{editId ? 'Edit Grid' : 'New Product Grid'}</h4>
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Section Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="e.g. Featured Products" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Sort Order</label>
                <input type="text" inputMode="numeric" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Mobile View Product Count</label>
                <input type="text" inputMode="numeric" min="1" value={form.mobileCount} onChange={e => setForm(f => ({ ...f, mobileCount: parseInt(e.target.value) || 2 }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="2" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Desktop View Product Count</label>
                <input type="text" inputMode="numeric" min="1" value={form.desktopCount} onChange={e => setForm(f => ({ ...f, desktopCount: parseInt(e.target.value) || 4 }))}
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
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="all-products" />
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
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-2">Select Products *</label>
              <ProductPicker selected={form.products} onChange={(products) => setForm(f => ({ ...f, products }))} productsList={allProducts} />
            </div>

            {/* Selected Products Display */}
            {form.products.length > 0 && (
              <div className="bg-[#FDFCFB] p-4 rounded-xl border border-[#E6DFD4]">
                <p className="text-xs font-semibold text-brand-medium uppercase tracking-wider mb-3">Selected Products ({form.products.length})</p>
                <div className="flex flex-wrap gap-2">
                  {form.products.map(p => (
                    <div key={p._id} className="flex items-center gap-2 bg-white border border-[#E6DFD4] px-3 py-1.5 rounded-lg text-sm text-brand-dark shadow-sm">
                      <span className="truncate max-w-[150px]">{p.name || 'Unknown Product'}</span>
                      <button type="button" onClick={() => removeSelectedProduct(p._id)} className="text-red-500 hover:text-red-600 transition-colors">
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
                {saving ? 'Saving...' : 'Save Grid'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? [1, 2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />) :
          items.length === 0 ? (
            <div className="p-8 text-center text-brand-medium text-sm bg-white rounded-2xl border border-[#E6DFD4]">No product grids yet.</div>
          ) : items.map(item => (
            <div key={item._id} className="bg-white rounded-2xl border border-[#E6DFD4] p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm">
              <div className="flex gap-1">
                {(item.products || []).slice(0, 4).map((p, i) => {
                  const populated = typeof p === 'object' ? p : allProducts.find(x => x._id === p);
                  let src = populated?.images?.[0]?.url || populated?.images?.[0] || (typeof populated?.image === 'object' ? populated?.image?.url : populated?.image) || null;
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
                  <span>{item.products?.length || 0} products</span>
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
                      {item.status ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-700 transition-colors">
                      <SquarePen size={15} />
                    </button>
                  </>
                )}
                {canDelete && (
                  <button onClick={() => handleDelete(item._id)} className="text-red-500 hover:text-red-600 transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
