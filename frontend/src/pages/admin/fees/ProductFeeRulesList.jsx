import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { adminService } from '../../../api/adminService';
import toast from 'react-hot-toast';
import EditProductFeeRulePage from './EditProductFeeRulePage';

export default function ProductFeeRulesList({ onBack, canCreate = true, canEdit = true, canDelete = true }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [formData, setFormData] = useState({
    minVolume: '',
    maxVolume: '',
    sizeName: 'XS',
    fee: '',
    isActive: true
  });

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await adminService.getProductFeeRules();
      setRules(data || []);
    } catch (error) {
      toast.error('Failed to load product fee rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? Number(value) : '') : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.minVolume === '' || formData.maxVolume === '' || formData.fee === '') {
      toast.error('Please fill all required numeric fields properly');
      return;
    }

    try {
      await adminService.createProductFeeRule(formData);
      toast.success('Rule created successfully!');
      setFormData({ minVolume: '', maxVolume: '', sizeName: 'XS', fee: '', isActive: true });
      fetchRules();
    } catch (error) {
      toast.error(error.message || 'Failed to save rule');
    }
  };

  const handleEdit = (rule) => {
    setEditingRuleId(rule._id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    try {
      await adminService.deleteProductFeeRule(id);
      toast.success('Rule deleted');
      fetchRules();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const toggleStatus = async (rule) => {
    try {
      await adminService.updateProductFeeRule(rule._id, { isActive: !rule.isActive });
      toast.success(`Rule ${!rule.isActive ? 'activated' : 'deactivated'}`);
      fetchRules();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (editingRuleId) {
    return (
      <EditProductFeeRulePage 
        ruleId={editingRuleId} 
        onBack={() => {
          setEditingRuleId(null);
          fetchRules();
        }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-[#E6DFD4] rounded-full transition-colors text-[#4A3326]">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-[#4A3326] font-serif">Product Fees</h2>
          <p className="text-[#8A817C] mt-1">Manage volume-based product fee rules</p>
        </div>
      </div>

      <div className="bg-white rounded border border-[#E6DFD4] p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Dynamic Product Fee Rules</h3>
        <p className="text-sm text-gray-500 mb-6">
          Configure dynamic product fees based on Min Volume and Max Volume (cm³).
        </p>

        {canCreate && (
        <div className="bg-white p-5 rounded-lg border border-[#E6DFD4] mb-8">
          <h3 className="text-[15px] font-bold text-[#4A3326] mb-4">Add New Rule</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Min Volume (cm³)</label>
                <input type="number" name="minVolume" value={formData.minVolume} onChange={handleChange} required className="w-full p-2 border rounded text-sm focus:ring-[#B0611C]" placeholder="e.g. 0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Volume (cm³)</label>
                <input type="number" name="maxVolume" value={formData.maxVolume} onChange={handleChange} required className="w-full p-2 border rounded text-sm focus:ring-[#B0611C]" placeholder="e.g. 500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Size Name</label>
                <input type="text" name="sizeName" value={formData.sizeName} onChange={handleChange} required className="w-full p-2 border rounded text-sm focus:ring-[#B0611C]" placeholder="e.g. XS" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fee (₹)</label>
                <input type="number" name="fee" value={formData.fee} onChange={handleChange} required className="w-full p-2 border rounded text-sm focus:ring-[#B0611C]" placeholder="e.g. 50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select name="isActive" value={formData.isActive} onChange={(e) => setFormData(prev => ({...prev, isActive: e.target.value === 'true'}))} className="w-full p-2 border rounded text-sm focus:ring-[#B0611C]">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div>
                <button type="submit" className="w-full bg-[#B0611C] text-white p-2.5 rounded font-bold hover:bg-[#8B5E3C] transition-colors shadow-sm">
                  Add Rule
                </button>
              </div>
            </div>
          </form>
        </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-[#E6DFD4] rounded overflow-hidden">
            <thead className="bg-[#F8F4EC]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Vol (cm³)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Vol (cm³)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee (₹)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : rules.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">No product fee rules defined.</td></tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{rule.minVolume}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{rule.maxVolume}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">{rule.sizeName}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">₹{rule.fee}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center flex justify-center gap-3">
                      {canEdit && (
                        <>
                          <button onClick={() => handleEdit(rule)} className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors" title="Edit Rule">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleStatus(rule)} className={`transition-colors ${rule.isActive ? 'text-green-500 hover:text-green-600' : 'text-gray-400 hover:text-gray-500'}`} title={rule.isActive ? 'Deactivate' : 'Activate'}>
                            {rule.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </>
                      )}
                      {canDelete && (
                      <button onClick={() => handleDelete(rule._id)} className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Rule">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
