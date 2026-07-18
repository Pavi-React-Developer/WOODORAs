import React, { useState, useEffect, useRef } from 'react';
import { cmsService } from '../../../api/cmsService';
import { Upload, X, Plus, Trash } from 'lucide-react';

function LogoUploader({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await cmsService.uploadImages([file]);
      onChange(res.data[0]); // pass object
    } catch (err) { alert(err.message); }
    finally { setUploading(false); }
  };

  const getMediaUrl = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val.url || '';
  };

  const url = getMediaUrl(value);

  return (
    <div>
      <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Footer Logo</label>
      <div className="flex items-center gap-3">
        {url ? (
          <div className="relative">
            <img src={url} alt="logo" className="h-12 object-contain rounded" />
            <button type="button" onClick={() => onChange(null)}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => inputRef.current.click()}
            className="flex items-center gap-2 border border-dashed border-[#E6DFD4] rounded-lg px-4 py-2 text-sm text-brand-medium hover:bg-[#F7F3EE]">
            <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Logo'}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

export default function FooterAdmin() {
  const [form, setForm] = useState({
    logo: '', description: '', email: '', phone: '',
    facebook: '', instagram: '', youtube: '', twitter: '', copyright: '', columns: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cmsService.getFooter().then(res => {
      if (res.data) setForm({ logo: res.data.logo || '', description: res.data.description || '', email: res.data.email || '', phone: res.data.phone || '', facebook: res.data.facebook || '', instagram: res.data.instagram || '', youtube: res.data.youtube || '', twitter: res.data.twitter || '', copyright: res.data.copyright || '', columns: res.data.columns || [] });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await cmsService.updateFooter(form); alert('Footer saved!'); }
    catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const field = (label, key, placeholder = '', type = 'text') => (
    <div>
      <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder} className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" />
    </div>
  );

  if (loading) return <div className="p-8 text-center text-brand-medium text-sm">Loading...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-brand-dark">Footer Configuration</h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#E6DFD4] p-6 shadow-sm space-y-4">
          <h4 className="font-semibold text-brand-dark">Branding</h4>
          <LogoUploader value={form.logo} onChange={(v) => setForm(f => ({ ...f, logo: v }))} />
          <div>
            <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of your brand..." className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
          {field('Copyright Text', 'copyright', '© 2025 WoodenToys. All rights reserved.')}
        </div>

        <div className="bg-white rounded-2xl border border-[#E6DFD4] p-6 shadow-sm space-y-4">
          <h4 className="font-semibold text-brand-dark">Contact Info</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('Email', 'email', 'hello@woodentoys.com', 'email')}
            {field('Phone', 'phone', '+91 98765 43210')}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6DFD4] p-6 shadow-sm space-y-4">
          <h4 className="font-semibold text-brand-dark">Social Media Links</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('Facebook URL', 'facebook', 'https://facebook.com/')}
            {field('Instagram URL', 'instagram', 'https://instagram.com/')}
            {field('YouTube URL', 'youtube', 'https://youtube.com/')}
            {field('Twitter / X URL', 'twitter', 'https://twitter.com/')}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6DFD4] p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-brand-dark">Footer Columns</h4>
            <button type="button" onClick={() => setForm(f => ({ ...f, columns: [...(f.columns || []), { title: '', links: [] }] }))} className="text-xs font-semibold text-brand-dark bg-[#F7F3EE] px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#E6DFD4]">
              <Plus className="w-3 h-3" /> Add Column
            </button>
          </div>
          
          <div className="space-y-6">
            {form.columns?.map((col, cIdx) => (
              <div key={cIdx} className="border border-[#E6DFD4] p-4 rounded-xl space-y-4 bg-gray-50">
                <div className="flex justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Column Title</label>
                    <input type="text" value={col.title} onChange={e => {
                      const newCols = [...form.columns];
                      newCols[cIdx].title = e.target.value;
                      setForm(f => ({ ...f, columns: newCols }));
                    }} placeholder="e.g. Shop, Support, Policies" className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm bg-white" />
                  </div>
                  <button type="button" onClick={() => {
                    const newCols = form.columns.filter((_, i) => i !== cIdx);
                    setForm(f => ({ ...f, columns: newCols }));
                  }} className="mt-6 text-red-500 p-2 hover:bg-red-50 rounded-lg">
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="pl-4 border-l-2 border-[#E6DFD4] space-y-3">
                  <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Links</label>
                  {col.links.map((link, lIdx) => (
                    <div key={lIdx} className="flex gap-2 items-center">
                      <input type="text" value={link.label} onChange={e => {
                        const newCols = [...form.columns];
                        newCols[cIdx].links[lIdx].label = e.target.value;
                        setForm(f => ({ ...f, columns: newCols }));
                      }} placeholder="Label (e.g. New Arrivals)" className="flex-1 border border-[#E6DFD4] rounded-lg px-3 py-1.5 text-sm bg-white" />
                      <input type="text" value={link.url} onChange={e => {
                        const newCols = [...form.columns];
                        newCols[cIdx].links[lIdx].url = e.target.value;
                        setForm(f => ({ ...f, columns: newCols }));
                      }} placeholder="URL (e.g. /shop?sort=newest)" className="flex-1 border border-[#E6DFD4] rounded-lg px-3 py-1.5 text-sm bg-white" />
                      <button type="button" onClick={() => {
                        const newCols = [...form.columns];
                        newCols[cIdx].links = newCols[cIdx].links.filter((_, i) => i !== lIdx);
                        setForm(f => ({ ...f, columns: newCols }));
                      }} className="text-red-500 p-1.5 hover:bg-red-50 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    const newCols = [...form.columns];
                    newCols[cIdx].links.push({ label: '', url: '' });
                    setForm(f => ({ ...f, columns: newCols }));
                  }} className="text-xs font-semibold text-brand-medium flex items-center gap-1 hover:text-brand-dark">
                    <Plus className="w-3 h-3" /> Add Link
                  </button>
                </div>
              </div>
            ))}
            {(form.columns?.length === 0 || !form.columns) && <p className="text-sm text-brand-medium italic">No dynamic columns added.</p>}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="px-8 py-3 bg-brand-dark text-white text-sm font-semibold rounded-xl hover:bg-black disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save Footer Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
