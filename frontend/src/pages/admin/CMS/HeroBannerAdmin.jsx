import React, { useState, useEffect, useRef } from 'react';
import { cmsService } from '../../../api/cmsService';
import { Pencil, Trash2, Plus, Eye, EyeOff, Upload, X } from 'lucide-react';

const emptyForm = {
  title: '', subtitle: '', description: '', buttonText: 'Shop Now',
  ctaURL: '', animation: 'Fade', sortOrder: 0, status: true,
  startDate: '', endDate: '', bannerImage: '', mobileBanner: '',
  desktopVideo: '', mobileVideo: '', items: [],
};

function MediaUploader({ label, value, onChange, accept = "image/*,video/mp4,video/webm" }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await cmsService.uploadImages([file]);
      onChange(res.data.urls[0]);
    } catch (err) { alert(err.message); }
    finally { setUploading(false); }
  };

  return (
    <div>
      <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">{label}</label>
      <div className="border-2 border-dashed border-[#E6DFD4] rounded-xl p-3 flex flex-col items-center gap-2 relative bg-[#F7F3EE]">
        {value ? (
          <div className="relative w-full">
            {value && value.match(/\.(mp4|webm)$/i) ? (
              <video src={value} className="w-full h-36 object-cover rounded-lg" controls />
            ) : (
              <img src={value} alt="preview" className="w-full h-36 object-cover rounded-lg" />
            )}
            <button type="button" onClick={() => onChange('')}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <div className="text-center py-4">
            <Upload className="w-6 h-6 text-brand-medium mx-auto mb-1" />
            <p className="text-xs text-brand-medium">{uploading ? 'Uploading...' : 'Click to upload'}</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept={accept} className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFile} />
        {!value && (
          <button type="button" onClick={() => inputRef.current.click()}
            className="text-xs text-brand-dark underline">{uploading ? 'Uploading...' : 'Browse file'}</button>
        )}
      </div>
      {value && <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full border border-[#E6DFD4] rounded-lg px-3 py-1.5 text-xs text-brand-medium" placeholder="Or paste image URL" />}
      {!value && <input type="text" onChange={e => onChange(e.target.value)}
        className="mt-1 w-full border border-[#E6DFD4] rounded-lg px-3 py-1.5 text-xs text-brand-medium" placeholder="Or paste image URL" />}
    </div>
  );
}

export default function HeroBannerAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await cmsService.getHeroBanners();
      setItems(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const toDateInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.items || form.items.length === 0 || !form.items.some(i => i.desktopUrl || i.mobileUrl)) {
      return alert('Please upload at least one image or video for the media items.');
    }
    setSaving(true);
    try {
      if (editId) await cmsService.updateHeroBanner(editId, form);
      else await cmsService.createHeroBanner(form);
      setShowForm(false); setForm(emptyForm); setEditId(null);
      fetchItems();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (item) => {
    setForm({
      title: item.title, subtitle: item.subtitle || '', description: item.description || '',
      buttonText: item.buttonText || 'Shop Now', ctaURL: item.ctaURL || '',
      animation: item.animation || 'Fade', sortOrder: item.sortOrder || 0,
      status: item.status, startDate: toDateInput(item.startDate), endDate: toDateInput(item.endDate),
      bannerImage: item.bannerImage || '', mobileBanner: item.mobileBanner || '',
      desktopVideo: item.desktopVideo || '', mobileVideo: item.mobileVideo || '',
      items: item.items || [],
    });
    setEditId(item._id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this banner?')) return;
    try { await cmsService.deleteHeroBanner(id); fetchItems(); }
    catch (err) { alert(err.message); }
  };

  const handleToggle = async (item) => {
    try { await cmsService.updateHeroBanner(item._id, { ...item, status: !item.status }); fetchItems(); }
    catch (err) { alert(err.message); }
  };

  const sf = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-brand-dark">Hero Banners</h3>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 bg-brand-dark text-white text-sm px-4 py-2 rounded-xl hover:bg-black transition-colors">
          <Plus className="w-4 h-4" /> Add Banner
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E6DFD4] p-6 shadow-sm">
          <h4 className="font-semibold text-brand-dark mb-5">{editId ? 'Edit Banner' : 'New Hero Banner'}</h4>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[['Title', 'title', false], ['Subtitle', 'subtitle', false], ['Button Text', 'buttonText', false], ['CTA URL', 'ctaURL', false]].map(([label, key, req]) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">{label}</label>
                  <input required={req} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Animation</label>
                <select value={form.animation} onChange={e => setForm(f => ({ ...f, animation: e.target.value }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm bg-white">
                  {['Fade', 'Slide', 'Zoom'].map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Start Date</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">End Date</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <div className="border-t border-[#E6DFD4] pt-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-brand-dark uppercase tracking-wider block">Media Items (Multi-Image / Multi-Video)</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, items: [...(f.items || []), { mediaType: 'image', desktopUrl: '', mobileUrl: '' }] }))}
                  className="text-xs flex items-center gap-1 bg-[#F7F3EE] px-3 py-1.5 rounded-lg font-semibold text-brand-dark hover:bg-[#E6DFD4]">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
              <div className="space-y-4">
                {(form.items || []).map((item, idx) => (
                  <div key={idx} className="p-4 border border-[#E6DFD4] rounded-xl bg-white relative">
                    <button type="button" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                      className="absolute top-2 right-2 p-1 bg-red-50 text-red-500 rounded hover:bg-red-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="mb-3 w-1/3">
                      <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Type</label>
                      <select value={item.mediaType || 'image'} onChange={e => {
                        const newItems = [...form.items];
                        newItems[idx].mediaType = e.target.value;
                        setForm(f => ({ ...f, items: newItems }));
                      }} className="w-full border border-[#E6DFD4] rounded-lg px-2 py-1.5 text-sm bg-white">
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <MediaUploader label={`Desktop ${item.mediaType === 'video' ? 'Video' : 'Image'}`} value={item.desktopUrl}
                        accept={item.mediaType === 'video' ? 'video/mp4,video/webm' : 'image/*'}
                        onChange={(val) => {
                          const newItems = [...form.items];
                          newItems[idx].desktopUrl = val;
                          setForm(f => ({ ...f, items: newItems }));
                        }} />
                      <MediaUploader label={`Mobile ${item.mediaType === 'video' ? 'Video' : 'Image'}`} value={item.mobileUrl}
                        accept={item.mediaType === 'video' ? 'video/mp4,video/webm' : 'image/*'}
                        onChange={(val) => {
                          const newItems = [...form.items];
                          newItems[idx].mobileUrl = val;
                          setForm(f => ({ ...f, items: newItems }));
                        }} />
                    </div>
                  </div>
                ))}
                {(!form.items || form.items.length === 0) && (
                  <p className="text-xs text-brand-medium text-center py-4 bg-[#F7F3EE] rounded-xl">No media items added yet. Click 'Add Item' above.</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="hero-status" checked={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.checked }))} />
              <label htmlFor="hero-status" className="text-sm text-brand-dark">Active (visible on site)</label>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-[#E6DFD4]">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-[#E6DFD4] rounded-lg text-brand-medium hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-6 py-2 text-sm bg-brand-dark text-white rounded-lg hover:bg-black disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Banner'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)
        ) : items.length === 0 ? (
          <div className="col-span-3 p-8 text-center text-brand-medium text-sm bg-white rounded-2xl border border-[#E6DFD4]">
            No banners yet. Add your first hero banner!
          </div>
        ) : items.map((item) => {
          const now = new Date();
          const start = new Date(item.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(item.endDate);
          end.setHours(23, 59, 59, 999);
          const isScheduled = start <= now && end >= now;
          return (
            <div key={item._id} className="bg-white rounded-2xl border border-[#E6DFD4] overflow-hidden shadow-sm">
              {item.bannerImage ? (
                <img src={item.bannerImage} alt={item.title} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-[#F7F3EE] flex items-center justify-center text-brand-medium text-xs">No Image</div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-brand-dark text-sm">{item.title}</h4>
                    {item.subtitle && <p className="text-xs text-brand-medium mt-0.5">{item.subtitle}</p>}
                  </div>
                  <div className="flex gap-1 flex-col items-end">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {item.status ? 'Active' : 'Off'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isScheduled ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {isScheduled ? 'Live' : 'Not Scheduled'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-brand-medium mb-3">
                  {new Date(item.startDate).toLocaleDateString()} → {new Date(item.endDate).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => handleToggle(item)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-[#E6DFD4] rounded-lg text-xs text-brand-medium hover:bg-[#F7F3EE] transition-colors">
                    {item.status ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {item.status ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => handleEdit(item)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-[#E6DFD4] rounded-lg text-xs text-brand-medium hover:bg-[#F7F3EE] transition-colors">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => handleDelete(item._id)}
                    className="p-1.5 border border-red-100 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
