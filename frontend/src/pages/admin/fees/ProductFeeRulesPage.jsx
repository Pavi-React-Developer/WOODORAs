import { ActiveBadge, RequestBadge, OrderBadge } from '../../../components/admin/CommonComponents';
import React, { useState, useEffect } from 'react';
import { adminService } from '../../../api/adminService';
import { toast } from 'react-hot-toast';
import { SquarePen, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';
import useCartStore from '../../../store/useCartStore';

export default function ProductFeeRulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? rules.map(item => item._id) : []);
  };

  const toggleSelectOne = (id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const handleBulkStatusChange = async (activeStatus) => {
    if (!window.confirm(`Are you sure you want to set ${selectedIds.length} rules to ${activeStatus ? 'Active' : 'Inactive'}?`)) return;
    try {
      await Promise.all(selectedIds.map(id => adminService.updateProductFeeRule(id, { isActive: activeStatus })));
      toast.success(`Updated status for ${selectedIds.length} rules!`);
      setSelectedIds([]);
      fetchRules();
    } catch (error) {
      toast.error('Failed to update status for some rules');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} rules?`)) return;
    try {
      await Promise.all(selectedIds.map(id => adminService.deleteProductFeeRule(id)));
      toast.success(`Deleted ${selectedIds.length} rules!`);
      setSelectedIds([]);
      fetchRules();
    } catch (error) {
      toast.error('Failed to delete some rules');
    }
  };
  
  const [formData, setFormData] = useState({
    minVolume: '',
    maxVolume: '',
    boxSize: '',
    productFee: '',
    isActive: true
  });

  
  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await adminService.getProductFeeRules();
      setRules(data || []);
    } catch (error) {
      toast.error('Failed to load product fee rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.minVolume === '' || formData.maxVolume === '' || formData.productFee === '' || formData.boxSize === '') {
      toast.error('Please fill all required fields');
      return;
    }

    if (Number(formData.minVolume) > Number(formData.maxVolume)) {
      toast.error('Min Volume cannot be greater than Max Volume');
      return;
    }
    
    try {
      if (editingRuleId) {
        await adminService.updateProductFeeRule(editingRuleId, formData);
        toast.success('Product Fee Rule updated successfully!');
      } else {
        await adminService.createProductFeeRule(formData);
        toast.success('Product Fee Rule added successfully!');
      }
      setFormData({ minVolume: '', maxVolume: '', boxSize: '', productFee: '', isActive: true });
      setEditingRuleId(null);
      fetchRules();
    } catch (error) {
      toast.error(error.message || 'Failed to save rule');
    }
  };

  const handleToggleStatus = async (rule) => {
    try {
      await adminService.updateProductFeeRule(rule._id, { isActive: !rule.isActive });
      toast.success(`Rule ${!rule.isActive ? 'activated' : 'deactivated'}`);
      fetchRules();
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    try {
      await adminService.deleteProductFeeRule(id);
      toast.success('Rule deleted');
      if (editingRuleId === id) {
        handleCancelEdit();
      }
      fetchRules();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const handleEdit = (rule) => {
    setEditingRuleId(rule._id);
    setFormData({
      minVolume: rule.minVolume,
      maxVolume: rule.maxVolume,
      boxSize: rule.boxSize,
      productFee: rule.productFee,
      isActive: rule.isActive
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
    setFormData({ minVolume: '', maxVolume: '', boxSize: '', productFee: '', isActive: true });
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  if (editingRuleId) {
    return (
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <div className="mb-6">
          <p className="text-[13px] md:text-sm font-serif text-white mb-1">
            Dashboard &rsaquo; Fee Management &rsaquo; <span className="font-semibold text-[#8B5E3C]">Product Fee</span>
          </p>
          <h2 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Edit Product Fee Rule</h2>
        </div>

        <div className="animate-in fade-in flex justify-center">
          <div className="bg-white rounded-[20px] shadow-sm border border-[#E6DFD4] w-full max-w-4xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 md:px-8 border-b border-[#E6DFD4] bg-[#F8F4EC]">
              <div>
                <h2 className="text-[28px] font-serif font-bold text-[#141225] tracking-tight">Edit Product Fee Rule</h2>
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
                  <input type="text" value={formData.boxSize} onChange={(e) => setFormData({...formData, boxSize: e.target.value})} required className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all" />
                </div>
                <div>
                  <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Product Fee (₹)</label>
                  <input type="text" inputMode="numeric" value={formData.productFee} onChange={(e) => setFormData({...formData, productFee: e.target.value ? Number(e.target.value) : ''})} required className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all" />
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
                  onClick={handleCancelEdit}
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
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <p className="text-[13px] md:text-sm font-serif text-white mb-1">
            Dashboard &rsaquo; Fee Management &rsaquo; <span className="font-semibold text-[#8B5E3C]">Product Fee</span>
          </p>
          <h2 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Dynamic Product Fee Rules</h2>
        </div>
      </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6DFD4] mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[18px] font-serif font-bold text-[#3E2723]">
              Add New Rule
            </h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Min Volume (cm³)</label>
                <input 
                  type="text" inputMode="numeric" 
                  name="minVolume" 
                  value={formData.minVolume} 
                  onChange={(e) => setFormData({...formData, minVolume: e.target.value ? Number(e.target.value) : ''})} 
                  required 
                  min="0"
                  className="w-full p-2.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#8B5E3C] focus:border-[#8B5E3C] outline-none text-sm transition-all" 
                  placeholder="e.g. 0" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Max Volume (cm³)</label>
                <input 
                  type="text" inputMode="numeric" 
                  name="maxVolume" 
                  value={formData.maxVolume} 
                  onChange={(e) => setFormData({...formData, maxVolume: e.target.value ? Number(e.target.value) : ''})} 
                  required 
                  min="0"
                  className="w-full p-2.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#8B5E3C] focus:border-[#8B5E3C] outline-none text-sm transition-all" 
                  placeholder="e.g. 500" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Box Size</label>
                <input 
                  type="text" 
                  name="boxSize" 
                  value={formData.boxSize} 
                  onChange={(e) => setFormData({...formData, boxSize: e.target.value})} 
                  required 
                  className="w-full p-2.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#8B5E3C] focus:border-[#8B5E3C] outline-none text-sm transition-all" 
                  placeholder="e.g. XS" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product Fee (₹)</label>
                <input 
                  type="text" inputMode="numeric" 
                  name="productFee" 
                  value={formData.productFee} 
                  onChange={(e) => setFormData({...formData, productFee: e.target.value ? Number(e.target.value) : ''})} 
                  required 
                  min="0"
                  className="w-full p-2.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#8B5E3C] focus:border-[#8B5E3C] outline-none text-sm transition-all" 
                  placeholder="e.g. 30" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select 
                  name="isActive" 
                  value={formData.isActive} 
                  onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})} 
                  className="w-full p-2.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#8B5E3C] focus:border-[#8B5E3C] outline-none text-sm transition-all bg-white"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div>
                <button 
                  type="submit" 
                  className="admin-btn w-full"
                >
                  Add Rule
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedIds.length > 0 && (
          <div className="bg-[#FDF9F5] border border-[#E6DFD4] rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-[#8B5E3C]">{selectedIds.length} selected</span>
            <div className="flex gap-2 ml-auto flex-wrap">
              <button onClick={() => handleBulkStatusChange(true)} className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Set Active</button>
              <button onClick={() => handleBulkStatusChange(false)} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Set Inactive</button>
              <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">Delete Selected</button>
              <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] bg-white rounded-lg hover:bg-gray-50 transition-colors text-gray-500">Clear</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="sticky top-0">
              <tr className="bg-[#FAF4EF] text-[#8A817C] text-xs font-bold tracking-widest uppercase border-b border-[#E6DFD4]">
                <th className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={rules.length > 0 && selectedIds.length === rules.length}
                    onChange={e => toggleSelectAll(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Min Vol (cm³)</th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Max Vol (cm³)</th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Box Size</th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Fee (₹)</th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Status</th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6DFD4] text-[16px] text-brand-dark">
              {rules.map((rule) => (
                <tr key={rule._id} className="transition-colors hover:bg-[#FDF9F5] bg-white">
                  <td className="text-[16px] py-6 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(rule._id)}
                      onChange={(e) => toggleSelectOne(rule._id, e.target.checked)}
                      className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                    />
                  </td>
                  <td className="py-6 px-4 text-[16px] font-bold text-center text-gray-900">{rule.minVolume}</td>
                  <td className="py-6 px-4 text-[16px] font-bold text-center text-gray-900">{rule.maxVolume}</td>
                  <td className="py-6 px-4 text-[16px] font-semibold text-center text-gray-700">{rule.boxSize}</td>
                  <td className="py-6 px-4 text-[16px] font-bold text-center text-gray-900">₹{rule.productFee}</td>
                  <td className="text-[16px] py-6 px-4 text-center">
                    <ActiveBadge status={rule.isActive} size={16}/>
                  </td>
                  <td className="text-[16px] py-6 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(rule)} 
                        className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="Edit Rule"
                      >
                        <SquarePen size={16} />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(rule)} 
                        title={rule.isActive ? "Deactivate" : "Activate"}>
                            <ActiveBadge status={rule.isActive} size={16}/>
                      </button>
                      <button 
                        onClick={() => handleDelete(rule._id)} 
                        className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                        title="Delete Rule"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-[16px] px-6 py-12 text-center text-gray-500">No product fee rules configured.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
  );
}
