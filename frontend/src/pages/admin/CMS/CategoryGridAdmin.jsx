import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, X, Search } from 'lucide-react';
import { cmsService } from '../../../api/cmsService';
import { categoryV2API, productV2API } from '../../../api/catalogV2Service';
import { catalogService } from '../../../api/catalogService';
import { ImageUploader } from '../../../components/admin/ImageUploader';

const emptyForm = {
  title: '',
  category: '',
  products: [],
  images: [],
  animation: 'fade',
  ctaText: '',
  ctaUrl: '',
  status: true,
  sortOrder: 0,
};

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.categories)) return payload.categories;
  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
};

const getEntityId = (value) => {
  if (!value) return '';
  if (typeof value === 'object') {
    return value._id || value.id || value.categoryId || value.category_id || '';
  }
  return String(value);
};

function CategoryPicker({ selectedCategory, onChange, categories }) {
  return (
    <select value={selectedCategory} onChange={(e) => onChange(e.target.value)} className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm bg-white">
      <option value="">Select a category</option>
      {categories.map((category) => (
        <option key={category._id} value={category._id}>{category.name}</option>
      ))}
    </select>
  );
}

function ProductPicker({ selected, onChange, productsList, selectedCategory }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return productsList.filter((product) => {
      const categoryId = getEntityId(product.category) || getEntityId(product.categoryId) || getEntityId(product.category_id);
      const matchesCategory = !selectedCategory || categoryId === selectedCategory;
      const matchesSearch = !search || product.name?.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [productsList, search, selectedCategory]);

  const toggle = (product) => {
    const isSelected = selected.some((item) => item._id === product._id);
    if (isSelected) {
      onChange(selected.filter((item) => item._id !== product._id));
    } else {
      onChange([...selected, product]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-brand-medium" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-9 pr-3 py-2 text-sm border border-[#E6DFD4] rounded-lg" />
      </div>
      <div className="max-h-48 overflow-y-auto border border-[#E6DFD4] rounded-xl bg-white divide-y divide-[#E6DFD4]">
        {filtered.length === 0 ? <p className="p-3 text-xs text-brand-medium">No products found.</p> : filtered.map((product) => {
          const isSelected = selected.some((item) => item._id === product._id);
          return (
            <label key={product._id} className="flex items-center gap-3 px-3 py-2 hover:bg-[#F7F3EE] cursor-pointer">
              <input type="checkbox" checked={isSelected} onChange={() => toggle(product)} />
              <span className="text-sm text-brand-dark">{product.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function CategoryGridAdmin() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoryRes, productRes, gridRes] = await Promise.allSettled([
          categoryV2API.getAll({ limit: 1000, isActive: 'true' }).catch(() => null),
          productV2API.getAll({ limit: 1000, isActive: 'true' }).catch(() => null),
          cmsService.getCategoryGrids(),
        ]);

        const categoryPayload = categoryRes.status === 'fulfilled' && categoryRes.value ? categoryRes.value : null;
        const productPayload = productRes.status === 'fulfilled' && productRes.value ? productRes.value : null;

        const cats = normalizeList(categoryPayload).filter(Boolean);
        const products = normalizeList(productPayload).filter(Boolean);

        if (!cats.length) {
          const fallbackCategories = normalizeList(await catalogService.getCategories().catch(() => null));
          setCategories(fallbackCategories.filter(Boolean));
        } else {
          setCategories(cats);
        }

        if (!products.length) {
          const fallbackProducts = normalizeList(await catalogService.getProducts().catch(() => null));
          setAllProducts(fallbackProducts.filter(Boolean));
        } else {
          setAllProducts(products);
        }

        setItems(gridRes.status === 'fulfilled' ? (gridRes.value?.data || []) : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) return alert('Choose a category.');
    if (!form.products.length) return alert('Select at least one product.');

    setSaving(true);
    try {
      const payload = {
        ...form,
        category: form.category,
        products: form.products.map((product) => product._id || product),
        images: form.images.map((image) => ({
          url: image.url,
          altText: image.altText || '',
          isThumbnail: image.isThumbnail || false,
          displayOrder: image.displayOrder || 1,
        })),
      };

      if (editId) await cmsService.updateCategoryGrid(editId, payload);
      else await cmsService.createCategoryGrid(payload);

      setShowForm(false);
      setForm(emptyForm);
      setEditId(null);
      const refreshed = await cmsService.getCategoryGrids();
      setItems(refreshed.data || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    const populatedProducts = (item.products || []).map((productId) => {
      if (typeof productId === 'object' && productId._id) return productId;
      return allProducts.find((product) => product._id === productId) || { _id: productId, name: 'Unknown Product' };
    });

    setForm({
      title: item.title || '',
      category: item.category?._id || item.category || '',
      products: populatedProducts,
      images: item.images || [],
      animation: item.animation || 'fade',
      ctaText: item.ctaText || '',
      ctaUrl: item.ctaUrl || '',
      status: item.status !== false,
      sortOrder: item.sortOrder || 0,
    });
    setEditId(item._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category grid?')) return;
    try {
      await cmsService.deleteCategoryGrid(id);
      const refreshed = await cmsService.getCategoryGrids();
      setItems(refreshed.data || []);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggle = async (item) => {
    try {
      await cmsService.updateCategoryGrid(item._id, { ...item, products: item.products?.map((product) => product._id || product), status: !item.status });
      const refreshed = await cmsService.getCategoryGrids();
      setItems(refreshed.data || []);
    } catch (err) {
      alert(err.message);
    }
  };

  const removeSelectedProduct = (id) => {
    setForm((current) => ({ ...current, products: current.products.filter((product) => product._id !== id) }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-brand-dark">Category Grid Sections</h3>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }} className="flex items-center gap-2 bg-brand-dark text-white text-sm px-4 py-2 rounded-xl hover:bg-black transition-colors">
          <Plus className="w-4 h-4" /> Add Category Grid
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E6DFD4] p-6 shadow-sm">
          <h4 className="font-semibold text-brand-dark mb-5">{editId ? 'Edit Category Grid' : 'New Category Grid'}</h4>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Section Title *</label>
                <input required value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="e.g. Build Playtime" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={(e) => setForm((current) => ({ ...current, sortOrder: +e.target.value }))} className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Category *</label>
                <CategoryPicker selectedCategory={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} categories={categories} />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Animation</label>
                <select value={form.animation} onChange={(e) => setForm((current) => ({ ...current, animation: e.target.value }))} className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="zoom">Zoom</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">CTA Button Text (optional)</label>
                <input value={form.ctaText} onChange={(e) => setForm((current) => ({ ...current, ctaText: e.target.value }))} className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="View Collection" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">CTA URL (optional)</label>
                <input value={form.ctaUrl} onChange={(e) => setForm((current) => ({ ...current, ctaUrl: e.target.value }))} className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="all-products" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-2">Select Products *</label>
              <ProductPicker selected={form.products} onChange={(products) => setForm((current) => ({ ...current, products }))} productsList={allProducts} selectedCategory={form.category} />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-2">Section Images</label>
              <ImageUploader images={form.images} onChange={(images) => setForm((current) => ({ ...current, images }))} maxImages={4} />
            </div>

            {form.products.length > 0 && (
              <div className="bg-[#FDFCFB] p-4 rounded-xl border border-[#E6DFD4]">
                <p className="text-xs font-semibold text-brand-medium uppercase tracking-wider mb-3">Selected Products ({form.products.length})</p>
                <div className="flex flex-wrap gap-2">
                  {form.products.map((product) => (
                    <div key={product._id} className="flex items-center gap-2 bg-white border border-[#E6DFD4] px-3 py-1.5 rounded-lg text-sm text-brand-dark shadow-sm">
                      <span className="truncate max-w-37.5">{product.name || 'Unknown Product'}</span>
                      <button type="button" onClick={() => removeSelectedProduct(product._id)} className="text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input type="checkbox" id="category-grid-status" checked={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.checked }))} />
              <label htmlFor="category-grid-status" className="text-sm text-brand-dark">Active</label>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[#E6DFD4]">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-[#E6DFD4] rounded-lg text-brand-medium">Cancel</button>
              <button type="submit" disabled={saving} className="px-6 py-2 text-sm bg-brand-dark text-white rounded-lg hover:bg-black disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Grid'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? [1, 2].map((item) => <div key={item} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />) : items.length === 0 ? (
          <div className="p-8 text-center text-brand-medium text-sm bg-white rounded-2xl border border-[#E6DFD4]">No category grids yet.</div>
        ) : items.map((item) => (
          <div key={item._id} className="bg-white rounded-2xl border border-[#E6DFD4] p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm">
            <div className="flex gap-2 flex-shrink-0">
              {item.images?.slice(0,2).map((img, i) => (
                <img key={i} src={img.url || img} alt="" className="w-12 h-12 rounded-lg object-cover border border-[#E6DFD4] bg-[#F7F3EE]" />
              ))}
              {!item.images?.length && <div className="w-12 h-12 rounded-lg border border-[#E6DFD4] bg-[#F7F3EE]" />}
            </div>
            <div className="flex-1 w-full">
              <p className="font-semibold text-brand-dark text-sm">{item.title}</p>
              <div className="flex items-center gap-3 text-xs text-brand-medium mt-0.5">
                <span>{item.category?.name || 'Unassigned category'}</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span>{item.products?.length || 0} products</span>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end mt-2 sm:mt-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{item.status ? 'Active' : 'Off'}</span>
              <button onClick={() => handleToggle(item)} className="p-1.5 rounded-lg hover:bg-[#E6DFD4] text-brand-medium">
                {item.status ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg hover:bg-[#E6DFD4] text-brand-medium">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(item._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
