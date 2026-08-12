import React, { useState, useEffect } from 'react';
import { adminService } from '../../../api/adminService';
import toast from 'react-hot-toast';

export default function EditGiftBoxRulePage({ ruleId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    minVolume: '',
    maxVolume: '',
    boxSize: 'XS',
    fee: '',
    isActive: true
  });

  useEffect(() => {
    const fetchRule = async () => {
      try {
        setLoading(true);
        const rules = await adminService.getGiftBoxRules();
        const rule = rules.find(r => r._id === ruleId);
        if (rule) {
          setFormData({
            minVolume: rule.minVolume,
            maxVolume: rule.maxVolume,
            boxSize: rule.boxSize,
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
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await adminService.updateGiftBoxRule(ruleId, formData);
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
    <div className="animate-in fade-in flex justify-center">
      <div className="bg-white rounded-[20px] shadow-sm border border-[#E6DFD4] w-full max-w-4xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 md:px-8 border-b border-[#E6DFD4] bg-[#F8F4EC]">
          <div>
            <h2 className="text-[28px] font-serif font-bold text-[#141225] tracking-tight">Edit Gift Box Rule</h2>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Min Volume (cm³)</label>
              <input type="text" inputMode="numeric" value={formData.minVolume} onChange={(e) => setFormData({...formData, minVolume: e.target.value ? Number(e.target.value) : ''})} required className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all" />
            </div>
            <div>
              <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Max Volume (cm³)</label>
              <input type="text" inputMode="numeric" value={formData.maxVolume} onChange={(e) => setFormData({...formData, maxVolume: e.target.value ? Number(e.target.value) : ''})} required className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all" />
            </div>
            <div>
              <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Box Size</label>
              <select value={formData.boxSize} onChange={(e) => setFormData({...formData, boxSize: e.target.value})} className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all appearance-none">
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </div>
            <div>
              <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Fee (₹)</label>
              <input type="text" inputMode="numeric" value={formData.fee} onChange={(e) => setFormData({...formData, fee: e.target.value ? Number(e.target.value) : ''})} required className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Status</label>
              <select value={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})} className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all appearance-none">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-[#E6DFD4] flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="admin-cancel-btn"
            >CANCEL</button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-[#8B5E3C] hover:bg-[#7a5234] text-white px-8 py-3 rounded-full text-[15px] font-bold shadow-sm transition-all uppercase tracking-wide"
            >
              SAVE CHANGES
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
