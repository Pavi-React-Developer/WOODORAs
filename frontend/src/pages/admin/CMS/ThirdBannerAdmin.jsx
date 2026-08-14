import React, { useState, useEffect, useRef } from 'react';
import { cmsService } from '../../../api/cmsService';
import { Pencil, Trash2, Plus, Eye, EyeOff, Upload, X, SquarePen, Trash } from 'lucide-react';

function MultiImageUploader({ label, images, onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const res = await cmsService.uploadImages(files);
      onChange([...images, ...res.data]); // res.data contains Cloudinary objects
    } catch (err) { alert(err.message); }
    finally { setUploading(false); }
  };

  const removeImage = (idx) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const getMediaUrl = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val.url || '';
  };

  return (
    <div>
      <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-2">{label}</label>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {images.map((img, i) => (
          <div key={i} className="relative aspect-square">
            <img src={getMediaUrl(img)} alt="" className="w-full h-full object-cover rounded-lg" />
            <button type="button" onClick={() => removeImage(i)}
              className="text-red-500 hover:text-red-600 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => inputRef.current.click()}
          className="aspect-square border-2 border-dashed border-[#E6DFD4] rounded-lg flex flex-col items-center justify-center text-brand-medium hover:bg-[#F7F3EE] transition-colors">
          <Upload className="w-5 h-5 mb-1" />
          <span className="text-xs">{uploading ? '...' : 'Add'}</span>
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
    </div>
  );
}

const emptyForm = {
  title: '', sortOrder: 0, animation: 'Slide', status: true,
  leftImages: [], leftCtaUrl: '', leftButtonText: 'Explore Here', leftStartDate: '', leftEndDate: '',
  rightImages: [], rightCtaUrl: '', rightButtonText: 'Explore Here', rightStartDate: '', rightEndDate: '',
};

const toDateInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';

function FieldLabel({ children }) {
  return <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">{children}</label>;
}

export default function ThirdBannerAdmin({ canCreate, canEdit, canDelete }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await cmsService.getThirdBanners();
      setItems(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const sf = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.leftImages.length || !form.rightImages.length) return alert('Please add at least one image for each column.');
    setSaving(true);
    try {
      if (editId) await cmsService.updateThirdBanner(editId, form);
      else await cmsService.createThirdBanner(form);
      (window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '')), setShowForm(false)); setForm(emptyForm); setEditId(null);
      fetchItems();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (item) => {
    setForm({
      title: item.title || '', sortOrder: item.sortOrder || 0, animation: item.animation || 'Slide', status: item.status,
      leftImages: item.leftImages || [], leftCtaUrl: item.leftCtaUrl || '', leftButtonText: item.leftButtonText || 'Explore Here',
      leftStartDate: toDateInput(item.leftStartDate), leftEndDate: toDateInput(item.leftEndDate),
      rightImages: item.rightImages || [], rightCtaUrl: item.rightCtaUrl || '', rightButtonText: item.rightButtonText || 'Explore Here',
      rightStartDate: toDateInput(item.rightStartDate), rightEndDate: toDateInput(item.rightEndDate),
    });
    setEditId(item._id); window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '') + '/edit'); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this banner section?')) return;
    try { await cmsService.deleteThirdBanner(id); fetchItems(); }
    catch (err) { alert(err.message); }
  };

  const handleToggle = async (item) => {
    try { await cmsService.updateThirdBanner(item._id, { ...item, status: !item.status }); fetchItems(); }
    catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-brand-dark">Dual Split Banners</h3>
        {canCreate && (
          <button onClick={() => { window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '') + '/edit'); setShowForm(true); setEditId(null); setForm(emptyForm); }}
            className="flex items-center gap-2 bg-[#8B5E3C] text-white px-5 py-2.5 rounded-full hover:bg-[#7a5234] transition-colors disabled:opacity-60">
            <Plus size={15} /> Add Split Banner
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E6DFD4] p-6 shadow-sm">
          <h4 className="font-semibold text-brand-dark mb-5">{editId ? 'Edit Dual Banner' : 'New Dual Banner'}</h4>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── General Settings ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <FieldLabel>Title (optional)</FieldLabel>
                <input value={form.title} onChange={sf('title')} className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <FieldLabel>Sort Order</FieldLabel>
                <input type="text" inputMode="numeric" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <FieldLabel>Animation Type</FieldLabel>
                <select value={form.animation} onChange={sf('animation')}
                  className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm bg-white">
                  {['Fade', 'Slide', 'Zoom', 'Creative'].map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* ── Left & Right Container Settings side-by-side ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* LEFT */}
              <div className="border border-[#E6DFD4] rounded-xl p-4 space-y-3 bg-[#FDFCFB]">
                <p className="text-xs font-bold text-brand-dark uppercase tracking-widest border-b border-[#E6DFD4] pb-2 mb-1">Left Container</p>
                <div>
                  <FieldLabel>Button Text</FieldLabel>
                  <input value={form.leftButtonText} onChange={sf('leftButtonText')}
                    className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="Explore Here" />
                </div>
                <div>
                  <FieldLabel>CTA URL (optional)</FieldLabel>
                  <input value={form.leftCtaUrl} onChange={sf('leftCtaUrl')}
                    className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="all-products" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Start Date (optional)</FieldLabel>
                    <input type="date" value={form.leftStartDate} onChange={sf('leftStartDate')}
                      className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <FieldLabel>End Date (optional)</FieldLabel>
                    <input type="date" value={form.leftEndDate} onChange={sf('leftEndDate')}
                      className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <MultiImageUploader label="Left Column Images *" images={form.leftImages}
                  onChange={(imgs) => setForm(f => ({ ...f, leftImages: imgs }))} />
              </div>

              {/* RIGHT */}
              <div className="border border-[#E6DFD4] rounded-xl p-4 space-y-3 bg-[#FDFCFB]">
                <p className="text-xs font-bold text-brand-dark uppercase tracking-widest border-b border-[#E6DFD4] pb-2 mb-1">Right Container</p>
                <div>
                  <FieldLabel>Button Text</FieldLabel>
                  <input value={form.rightButtonText} onChange={sf('rightButtonText')}
                    className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="Explore Here" />
                </div>
                <div>
                  <FieldLabel>CTA URL (optional)</FieldLabel>
                  <input value={form.rightCtaUrl} onChange={sf('rightCtaUrl')}
                    className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="all-products" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Start Date (optional)</FieldLabel>
                    <input type="date" value={form.rightStartDate} onChange={sf('rightStartDate')}
                      className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <FieldLabel>End Date (optional)</FieldLabel>
                    <input type="date" value={form.rightEndDate} onChange={sf('rightEndDate')}
                      className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <MultiImageUploader label="Right Column Images *" images={form.rightImages}
                  onChange={(imgs) => setForm(f => ({ ...f, rightImages: imgs }))} />
              </div>

            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="third-status" checked={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.checked }))} />
              <label htmlFor="third-status" className="text-sm text-brand-dark">Active</label>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-[#E6DFD4]">
              <button type="button" onClick={() => (window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '')), setShowForm(false))}
                className="admin-cancel-btn">CANCEL</button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-[#8B5E3C] text-white px-5 py-2.5 rounded-full hover:bg-[#7a5234] transition-colors disabled:opacity-6">
                {saving ? 'Saving...' : 'Save Banner'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          [1, 2].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-brand-medium text-sm bg-white rounded-2xl border border-[#E6DFD4]">
            No dual banners yet.
          </div>
        ) : items.map((item) => (
          <div key={item._id} className="bg-white rounded-2xl border border-[#E6DFD4] p-4 shadow-sm flex items-center gap-4">
            <div className="flex gap-2 flex-shrink-0">
              {item.leftImages?.slice(0, 2).map((u, i) => <img key={i} src={u.url || u} alt="" className="w-16 h-16 rounded-lg object-cover" />)}
              <div className="w-0.5 h-16 bg-[#E6DFD4]" />
              {item.rightImages?.slice(0, 2).map((u, i) => <img key={i} src={u.url || u} alt="" className="w-16 h-16 rounded-lg object-cover" />)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-brand-dark text-sm truncate">{item.title || 'Dual Banner'}</p>
              <p className="text-xs text-brand-medium mt-0.5">{item.leftImages?.length} left / {item.rightImages?.length} right images</p>
              <p className="text-xs text-brand-medium mt-0.5">L: "{item.leftButtonText || 'Explore Here'}" · R: "{item.rightButtonText || 'Explore Here'}"</p>
            </div>
            <div className="flex items-center gap-2">
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
