import React, { useState, useEffect } from 'react';
import { adminService } from '../../../api/adminService';
import { toast } from 'react-hot-toast';
import { SquarePen, ToggleLeft, ToggleRight, Trash, X } from 'lucide-react';
import useCartStore from '../../../store/useCartStore';

export default function ProductFeeRulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState(null);
  
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

  return (
    <div className="bg-[#fcfbf9] min-h-screen">
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Dynamic Product Fee Rules</h2>
            <p className="text-sm text-gray-500">
              Configure dynamic volume ranges (Min Volume and Max Volume in cm³) to determine Box Size and Product Fee.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-md font-semibold text-gray-800">
              {editingRuleId ? 'Edit Product Fee Rule' : 'Add New Rule'}
            </h3>
            {editingRuleId && (
              <button onClick={handleCancelEdit} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            )}
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
                  className="w-full bg-[#B0611C] hover:bg-[#8e4d15] text-white p-2.5 rounded font-semibold transition-colors shadow-sm"
                >
                  {editingRuleId ? 'Update Rule' : 'Add Rule'}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Min Vol (cm³)</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Max Vol (cm³)</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Box Size</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fee (₹)</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {rules.map((rule) => (
                <tr key={rule._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">{rule.minVolume}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{rule.maxVolume}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{rule.boxSize}</td>
                  <td className="px-6 py-4 text-sm font-medium text-green-600">₹{rule.productFee}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${rule.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center flex justify-center gap-4">
                    <button 
                      onClick={() => handleEdit(rule)} 
                      className="text-blue-500 hover:text-blue-700 transition-colors" 
                      title="Edit Rule"
                    >
                      <SquarePen className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(rule)} 
                      className={`transition-colors ${rule.isActive ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`} 
                      title={rule.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {rule.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={() => handleDelete(rule._id)} 
                      className="text-red-400 hover:text-red-600 transition-colors" 
                      title="Delete Rule"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No product fee rules configured.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
