import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { adminService } from '../../../api/adminService';
import toast from 'react-hot-toast';

export default function EditProductFeeRulePage({ ruleId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    minVolume: '',
    maxVolume: '',
    sizeName: 'XS',
    fee: '',
    isActive: true
  });

  useEffect(() => {
    const fetchRule = async () => {
      try {
        setLoading(true);
        const rules = await adminService.getProductFeeRules();
        const rule = rules.find(r => r._id === ruleId);
        if (rule) {
          setFormData({
            minVolume: rule.minVolume,
            maxVolume: rule.maxVolume,
            sizeName: rule.sizeName,
            fee: rule.fee,
            isActive: rule.isActive
          });
        }
      } catch (err) {
        toast.error('Failed to load rule details');
      } finally {
        setLoading(false);
      }
    };
    if (ruleId) fetchRule();
  }, [ruleId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.minVolume === '' || formData.maxVolume === '' || formData.fee === '') {
      toast.error('Please fill all required numeric fields properly');
      return;
    }
    try {
      await adminService.updateProductFeeRule(ruleId, formData);
      toast.success('Rule updated successfully!');
      onBack(); // Go back after successful update
    } catch (err) {
      toast.error('Failed to update rule');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading rule details...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-2xl font-serif font-bold text-gray-900">Edit Product Fee Rule</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Min Volume (cm³)</label>
              <input type="number" value={formData.minVolume} onChange={(e) => setFormData({...formData, minVolume: e.target.value ? Number(e.target.value) : ''})} required className="w-full px-4 py-3 border border-[#E6DFD4] rounded-xl text-sm focus:outline-none focus:border-[#8B5E3C]" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Max Volume (cm³)</label>
              <input type="number" value={formData.maxVolume} onChange={(e) => setFormData({...formData, maxVolume: e.target.value ? Number(e.target.value) : ''})} required className="w-full px-4 py-3 border border-[#E6DFD4] rounded-xl text-sm focus:outline-none focus:border-[#8B5E3C]" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Size Name</label>
              <input type="text" value={formData.sizeName} onChange={(e) => setFormData({...formData, sizeName: e.target.value})} className="w-full px-4 py-3 border border-[#E6DFD4] rounded-xl text-sm bg-white focus:outline-none focus:border-[#8B5E3C]" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Fee (₹)</label>
              <input type="number" value={formData.fee} onChange={(e) => setFormData({...formData, fee: e.target.value ? Number(e.target.value) : ''})} required className="w-full px-4 py-3 border border-[#E6DFD4] rounded-xl text-sm focus:outline-none focus:border-[#8B5E3C]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
              <select value={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})} className="w-full px-4 py-3 border border-[#E6DFD4] rounded-xl text-sm bg-white focus:outline-none focus:border-[#8B5E3C]">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onBack} className="px-6 py-2.5 bg-white border border-[#E6DFD4] text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 bg-[#8B5E3C] text-white font-bold rounded-xl hover:bg-[#7A5234] transition-colors">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
