import React, { useState, useEffect } from 'react';
import { adminService } from '../../../api/adminService';
import { CheckCircle2, Save, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_ORIGIN } from '../../../api/apiClient';
import useCartStore from '../../../store/useCartStore';

export default function GlobalFeeSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    productFee: 0,
    giftFee: 0,
    isActive: true,
  });

  const { fetchGlobalFee } = useCartStore();

  useEffect(() => {
    let mounted = true;
    const fetchConfig = async () => {
      try {
        const res = await axios.get(`${API_ORIGIN}/api/global-fees`);
        if (mounted && res.data) {
          setFormData({
            productFee: res.data.productFee || 0,
            giftFee: res.data.giftFee || 0,
            isActive: res.data.isActive ?? true,
          });
        }
      } catch (err) {
        console.error('Failed to load global fees', err);
        toast.error('Failed to load Global Fees configuration.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchConfig();
    return () => { mounted = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value) || 0,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_ORIGIN}/api/global-fees`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Global fees updated successfully');
      // Update global state immediately
      fetchGlobalFee();
    } catch (err) {
      console.error('Failed to save', err);
      toast.error('Failed to update global fees.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B5E3C]" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD4] overflow-hidden p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 font-serif">Global Fees Configuration</h2>
        <p className="text-gray-500 mt-2">
          Manage flat-rate fees for Products and Gift Wrapping. These fees are applied exactly once per order based on cart contents.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Fee */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Product Fee (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
              <input
                type="number"
                name="productFee"
                value={formData.productFee}
                onChange={handleChange}
                min="0"
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8B5E3C]/20 focus:border-[#8B5E3C] transition-all bg-gray-50 focus:bg-white"
                required
              />
            </div>
            <p className="text-xs text-gray-500">Applied once per order if the cart has items.</p>
          </div>

          {/* Gift Fee */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Gift Wrap Fee (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
              <input
                type="number"
                name="giftFee"
                value={formData.giftFee}
                onChange={handleChange}
                min="0"
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8B5E3C]/20 focus:border-[#8B5E3C] transition-all bg-gray-50 focus:bg-white"
                required
              />
            </div>
            <p className="text-xs text-gray-500">Applied once per order if the gift toggle is ON.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-5 h-5 rounded border-gray-300 text-[#8B5E3C] focus:ring-[#8B5E3C]"
            />
            <div>
              <span className="font-bold text-gray-900 block">Enable Global Fees</span>
              <span className="text-sm text-gray-500">If unchecked, neither Product Fee nor Gift Fee will be applied.</span>
            </div>
          </label>
        </div>

        <div className="pt-6">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-[#8B5E3C] text-white rounded-xl font-bold hover:bg-[#7a5234] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg w-full sm:w-auto"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? 'Saving Changes...' : 'Save Global Fees'}
          </button>
        </div>
      </form>
    </div>
  );
}
