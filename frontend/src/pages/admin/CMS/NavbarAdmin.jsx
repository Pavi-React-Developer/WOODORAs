import React, { useState, useEffect } from 'react';
import { cmsService } from '../../../api/cmsService';
import { Pencil, Trash2, Plus, GripVertical, Eye, EyeOff } from 'lucide-react';

const emptyForm = { title: '', url: '', icon: '', order: 0, status: true };

export default function NavbarAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await cmsService.getNavbars();
      setItems(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await cmsService.updateNavbar(editId, form);
      } else {
        await cmsService.createNavbar(form);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId(null);
      fetchItems();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setForm({ title: item.title, url: item.url, icon: item.icon || '', order: item.order, status: item.status });
    setEditId(item._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this menu item?')) return;
    try {
      await cmsService.deleteNavbar(id);
      fetchItems();
    } catch (err) { alert(err.message); }
  };

  const handleToggleStatus = async (item) => {
    try {
      await cmsService.updateNavbar(item._id, { ...item, status: !item.status });
      fetchItems();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-brand-dark">Navbar Menu Items</h3>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
          className="admin-btn"
        >
          <Plus className="w-4 h-4" /> Add Menu Item
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E6DFD4] p-6 shadow-sm">
          <h4 className="font-semibold text-brand-dark mb-4">{editId ? 'Edit Menu Item' : 'Add New Menu Item'}</h4>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Title *</label>
              <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="e.g. Shop" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">URL *</label>
              <input required value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
                className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="e.g. /shop" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Icon (optional)</label>
              <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}
                className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="e.g. ShoppingBag" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Sort Order</label>
              <input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) })}
                className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="navbar-status" checked={form.status} onChange={e => setForm({ ...form, status: e.target.checked })} />
              <label htmlFor="navbar-status" className="text-sm text-brand-dark">Active (visible on site)</label>
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-[#E6DFD4] rounded-lg text-brand-medium hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-6 py-2 text-sm bg-brand-dark text-white rounded-lg hover:bg-black disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E6DFD4] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-brand-medium text-sm">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-brand-medium text-sm">No menu items yet. Add your first one!</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E6DFD4] bg-[#F7F3EE]">
                <th className="px-4 py-3 text-left text-xs font-bold text-brand-medium uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-brand-medium uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-brand-medium uppercase tracking-wider">URL</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-brand-medium uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-brand-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6DFD4]">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-[#F7F3EE] transition-colors">
                  <td className="px-4 py-3 text-brand-medium"><GripVertical className="w-4 h-4" /></td>
                  <td className="px-4 py-3 font-medium text-brand-dark">{item.title}</td>
                  <td className="px-4 py-3 text-brand-medium font-mono text-xs">{item.url}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {item.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleStatus(item)} title="Toggle status"
                        className="p-1.5 rounded-lg hover:bg-[#E6DFD4] text-brand-medium transition-colors">
                        {item.status ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleEdit(item)}
                        className="p-1.5 rounded-lg hover:bg-[#E6DFD4] text-brand-medium transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item._id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
