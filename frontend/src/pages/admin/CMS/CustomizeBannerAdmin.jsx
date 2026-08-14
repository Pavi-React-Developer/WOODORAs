import React, { useState, useEffect } from 'react';
import { cmsService } from '../../../api/cmsService';
import { ImageUploader } from '../../../components/admin/ImageUploader';
import toast from 'react-hot-toast';

export default function CustomizeBannerAdmin({ canCreate, canEdit, canDelete }) {
  const [data, setData] = useState({ title: '', description: '', image: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await cmsService.getCustomizeBanner();
      if (res.data) setData(res.data);
    } catch (err) {
      toast.error('Failed to load Customize Banner');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await cmsService.updateCustomizeBanner(data);
      toast.success('Customize Banner updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to save Customize Banner');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Loading...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#F2EAE1]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-brand-dark font-serif">Customize Page Banner</h3>
          <p className="text-xs text-brand-medium mt-1">Manage the hero banner on the Customize page.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        <ImageUploader
          label="Background Image"
          images={data.image ? [typeof data.image === 'string' ? { url: data.image } : data.image] : []}
          maxImages={1}
          onChange={(imgs) => setData({ ...data, image: imgs.length > 0 ? imgs[0] : '' })}
        />

        <div>
          <label className="block text-xs font-semibold text-brand-dark mb-1">Title</label>
          <input
            type="text"
            className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#8C6B52] outline-none text-sm transition-shadow"
            value={data.title}
            onChange={(e) => setData({ ...data, title: e.target.value })}
            placeholder="e.g. Request a Custom Order"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-dark mb-1">Description</label>
          <textarea
            className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#8C6B52] outline-none text-sm transition-shadow min-h-[120px]"
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            placeholder="e.g. Design your own handcrafted wooden toy..."
            required
          />
        </div>

        {canEdit && (
          <div className="flex justify-end pt-4 border-t border-[#F2EAE1]">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#8B5E3C] text-white px-5 py-2.5 rounded-full hover:bg-[#7a5234] transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
