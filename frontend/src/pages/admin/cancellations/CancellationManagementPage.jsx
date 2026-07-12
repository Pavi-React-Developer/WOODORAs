import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Download, Plus, Search, ChevronDown, Check, X, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadExcelFile } from '../../../utils/exportUtils';

import { adminService } from '../../../api/adminService';

export default function CancellationManagementPage() {
  const [activeTab, setActiveTab] = useState('COD');
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    orderStatus: 'Order Placed',
    cancellationFee: '',
    timeLimit: '',
    isAllowed: true,
    refundPercentage: 100
  });

  const fetchRules = async () => {
    try {
      const data = await adminService.getCancellationRules();
      if (Array.isArray(data)) {
        setRules(data);
      } else {
        setRules([]);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load cancellation rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSeed = async () => {
    try {
      await adminService.seedCancellationRules();
      toast.success('Rules seeded');
      fetchRules();
    } catch (e) {
      toast.error(e.message || 'Failed to seed rules');
    }
  };

  const handleSaveRule = async () => {
    try {
      const payload = {
        paymentMethod: activeTab,
        orderStatus: formData.orderStatus,
        cancellationFee: Number(formData.cancellationFee) || 0,
        timeLimit: formData.timeLimit ? (formData.timeLimit.toString().includes('Days') || formData.timeLimit.toString().includes('Hours') || formData.timeLimit === '-' || formData.timeLimit === 'Before Delivery' ? formData.timeLimit : `${formData.timeLimit} Days`) : '-',
        isAllowed: formData.isAllowed,
        refundPercentage: Number(formData.refundPercentage) || 0
      };
      
      if (editingId) {
        await adminService.updateCancellationRule(editingId, payload);
        toast.success('Rule updated successfully');
      } else {
        await adminService.createCancellationRule(payload);
        toast.success('Rule added successfully');
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ orderStatus: 'Order Placed', cancellationFee: '', timeLimit: '', isAllowed: true, refundPercentage: 100 });
      fetchRules();
    } catch (e) {
      toast.error(e.message || 'Failed to save rule');
    }
  };

  const handleEditRule = (rule) => {
    setFormData({
      orderStatus: rule.orderStatus,
      cancellationFee: rule.cancellationFee,
      timeLimit: rule.timeLimit ? rule.timeLimit.replace(' Days', '') : '',
      isAllowed: rule.isAllowed,
      refundPercentage: rule.refundPercentage ?? 100
    });
    setEditingId(rule._id);
    setIsModalOpen(true);
  };

  const handleDeleteRule = async (id) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await adminService.deleteCancellationRule(id);
        toast.success('Rule deleted successfully');
        fetchRules();
      } catch (e) {
        toast.error(e.message || 'Failed to delete rule');
      }
    }
  };

  const handleToggleAllowed = async (rule) => {
    try {
      const payload = {
        paymentMethod: rule.paymentMethod,
        orderStatus: rule.orderStatus,
        cancellationFee: rule.cancellationFee,
        timeLimit: rule.timeLimit,
        isAllowed: !rule.isAllowed,
        refundPercentage: rule.refundPercentage,
        status: rule.status
      };
      await adminService.updateCancellationRule(rule._id, payload);
      toast.success(`Cancellation ${!rule.isAllowed ? 'enabled' : 'disabled'} for ${rule.orderStatus}`);
      fetchRules();
    } catch (e) {
      toast.error(e.message || 'Failed to toggle rule');
    }
  };

  const filteredRules = rules.filter(r => r.paymentMethod === activeTab);

  const exportRulesExcel = () => {
    const header = ['Payment Method', 'Order Status', 'Cancellation Fee', 'Refund Percentage', 'Time Limit', 'Allowed'];
    const rows = filteredRules.map((rule) => ({
      'Payment Method': rule.paymentMethod || '',
      'Order Status': rule.orderStatus || '',
      'Cancellation Fee': rule.cancellationFee ?? '',
      'Refund Percentage': rule.refundPercentage ?? '',
      'Time Limit': rule.timeLimit || '',
      'Allowed': rule.isAllowed ? 'Yes' : 'No',
    }));
    downloadExcelFile('cancellation_rules', header, rows);
  };

  const totalRules = filteredRules.length;
  const allowedRules = filteredRules.filter(r => r.isAllowed).length;
  const restrictedRules = filteredRules.filter(r => !r.isAllowed).length;

  return (
    <div className="bg-[#FAF8F5] min-h-screen">
      <div className="max-w-7xl mx-auto px-8 py-10">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#141225] font-serif">Cancellation Management</h1>
          <p className="text-[#6D625C] mt-2">Configure cancellation rules, fees and refund policies for COD and Online orders.</p>
        </div>

        {/* Tabs & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-[#E9DED3]">
          <div className="flex items-center gap-8">
            <button
              onClick={() => setActiveTab('COD')}
              className={`pb-4 text-sm font-bold transition-colors relative ${
                activeTab === 'COD' ? 'text-[#9A6031]' : 'text-[#6D625C] hover:text-[#9A6031]'
              }`}
            >
              COD Cancellation
              {activeTab === 'COD' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9A6031]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('Online')}
              className={`pb-4 text-sm font-bold transition-colors relative ${
                activeTab === 'Online' ? 'text-[#9A6031]' : 'text-[#6D625C] hover:text-[#9A6031]'
              }`}
            >
              Online (Cashfree) Cancellation
              {activeTab === 'Online' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9A6031]" />
              )}
            </button>
          </div>
          
          <div className="flex items-center gap-3 pb-4">
            <button onClick={fetchRules} className="admin-secondary-btn">
              <RefreshCw size={16} />
              Refresh
            </button>
            <button onClick={exportRulesExcel} className="admin-export-btn">
              <Download size={16} />
              Export Excel
            </button>
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({ orderStatus: 'Order Placed', cancellationFee: '', timeLimit: '', isAllowed: true });
                setIsModalOpen(true);
              }}
              className="admin-btn"
            >
              <Plus size={16} />
              Add Rule
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Main Content Area */}
          <div className="space-y-8">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-[14px] border border-[#E9DED3] p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Check size={20} />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-bold text-[#6D625C]">Total Rules</h3>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#141225]">{(totalRules || 0).toString().padStart(2, '0')}</span>
                  </div>
                  <p className="text-xs text-[#8A817C] mt-1">Active cancellation rules</p>
                </div>
              </div>

              <div className="bg-white rounded-[14px] border border-[#E9DED3] p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                    <Check size={20} />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-bold text-[#6D625C]">Cancellation Allowed</h3>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#141225]">{(allowedRules || 0).toString().padStart(2, '0')}</span>
                  </div>
                  <p className="text-xs text-[#8A817C] mt-1">Active rules allowing cancellation</p>
                </div>
              </div>

              <div className="bg-white rounded-[14px] border border-[#E9DED3] p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                    <AlertCircle size={20} />
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs text-[#6D625C] font-semibold">Last Updated</h3>
                    <p className="text-sm font-bold text-[#141225] mt-1">May 04, 2025</p>
                    <p className="text-[10px] text-[#8A817C]">By elan Admin</p>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-bold text-[#6D625C]">Cancellation Restricted</h3>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#141225]">{(restrictedRules || 0).toString().padStart(2, '0')}</span>
                  </div>
                  <p className="text-xs text-[#8A817C] mt-1">Rules with restrictions</p>
                </div>
              </div>
            </div>

            {/* Rules Table */}
            <div className="bg-white border border-[#E9DED3] rounded-[14px] shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#E9DED3]">
                <h2 className="text-lg font-bold text-[#141225]">Cancellation Rules ({activeTab})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#E9DED3]">
                      <th className="px-6 py-3 text-xs font-bold text-[#6D625C] uppercase tracking-wider">Order Status</th>
                      <th className="px-6 py-3 text-xs font-bold text-[#6D625C] uppercase tracking-wider text-center">Cancellation Fee (₹)</th>
                      <th className="px-6 py-3 text-xs font-bold text-[#6D625C] uppercase tracking-wider text-center">Refund %</th>
                      <th className="px-6 py-3 text-xs font-bold text-[#6D625C] uppercase tracking-wider">Time Limit</th>
                      <th className="px-6 py-3 text-xs font-bold text-[#6D625C] uppercase tracking-wider text-center">Allowed</th>
                      <th className="px-6 py-3 text-xs font-bold text-[#6D625C] uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-xs font-bold text-[#6D625C] uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9DED3]">
                    {filteredRules.map((rule, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#141225]">{rule.orderStatus}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-bold text-[#141225]">{rule.cancellationFee > 0 ? rule.cancellationFee : '-'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-bold text-[#141225]">{rule.refundPercentage > 0 ? `${rule.refundPercentage}%` : '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-[#141225]">{rule.timeLimit}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => rule.status !== 'Locked' && handleToggleAllowed(rule)}
                            disabled={rule.status === 'Locked'}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                              rule.status === 'Locked' ? 'bg-gray-200 cursor-not-allowed opacity-50' :
                              rule.isAllowed ? 'bg-emerald-500' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                rule.isAllowed ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                            rule.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                            rule.status === 'Disabled' ? 'bg-red-100 text-red-700' : 
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {rule.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {rule.status !== 'Locked' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleEditRule(rule)} className="p-1.5 text-[#6D625C] hover:text-[#9A6031] hover:bg-[#F2E3D1] rounded transition-colors border border-[#E9DED3]">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => handleDeleteRule(rule._id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors border border-[#E9DED3]">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[#8A817C] text-xl font-bold pr-4">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredRules.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-6 py-8 text-center text-[#6D625C] text-sm">
                          No rules configured for {activeTab}. Click "Export" &gt; "Seed Rules" or "Add Rule".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-[#E9DED3] bg-[#FAF8F5]">
                <p className="text-xs text-[#8A817C] flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  Rules are applied automatically based on order status and payment method.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-[#E9DED3] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#E9DED3] bg-[#FAF8F5]">
              <div className="flex items-center gap-2 text-[#2D6A4F]">
                <Plus size={20} className="stroke-[3]" />
                <h2 className="text-lg font-bold">{editingId ? 'Edit Cancellation Rule' : 'Add New Cancellation Rule'} ({activeTab})</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[#6D625C] hover:text-[#141225] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 border-2 border-dashed border-[#2D6A4F]/20 m-6 rounded-lg bg-white">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-[#4A403B]">Rule Name (Order Status) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select 
                      value={formData.orderStatus}
                      onChange={(e) => setFormData({ ...formData, orderStatus: e.target.value })}
                      className="w-full appearance-none rounded border border-[#E9DED3] px-3 py-2 text-sm text-[#141225] focus:border-[#9A6031] focus:outline-none focus:ring-1 focus:ring-[#9A6031]"
                    >
                      <option value="Order Placed">Order Placed</option>
                      <option value="Packed">Packed</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-[#8A817C] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-[#4A403B]">Cancellation Fee (₹) <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    placeholder="Enter fee amount"
                    value={formData.cancellationFee}
                    onChange={(e) => {
                      const fee = e.target.value;
                      let newRefund = formData.refundPercentage;
                      if (fee !== '') {
                        const feeValue = Number(fee);
                        newRefund = Math.max(0, Math.min(100, 100 - feeValue));
                      }
                      setFormData({ ...formData, cancellationFee: fee, refundPercentage: newRefund });
                    }}
                    className="w-full rounded border border-[#E9DED3] px-3 py-2 text-sm text-[#141225] placeholder:text-[#A9A09B] focus:border-[#9A6031] focus:outline-none focus:ring-1 focus:ring-[#9A6031]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-[#4A403B]">Refund (%) <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    placeholder="e.g. 100"
                    value={formData.refundPercentage}
                    onChange={(e) => setFormData({ ...formData, refundPercentage: e.target.value })}
                    className="w-full rounded border border-[#E9DED3] px-3 py-2 text-sm text-[#141225] placeholder:text-[#A9A09B] focus:border-[#9A6031] focus:outline-none focus:ring-1 focus:ring-[#9A6031]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-[#4A403B]">SLA (Days) <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    placeholder="Enter SLA in days"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: e.target.value })}
                    className="w-full rounded border border-[#E9DED3] px-3 py-2 text-sm text-[#141225] placeholder:text-[#A9A09B] focus:border-[#9A6031] focus:outline-none focus:ring-1 focus:ring-[#9A6031]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-[#4A403B]">Status</label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status"
                        checked={formData.isAllowed === true}
                        onChange={() => setFormData({ ...formData, isAllowed: true })}
                        className="w-4 h-4 text-[#2D6A4F] focus:ring-[#2D6A4F] accent-[#2D6A4F]" 
                      />
                      <span className="text-sm text-[#4A403B] font-medium">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status"
                        checked={formData.isAllowed === false}
                        onChange={() => setFormData({ ...formData, isAllowed: false })}
                        className="w-4 h-4 text-[#2D6A4F] focus:ring-[#2D6A4F] accent-[#2D6A4F]" 
                      />
                      <span className="text-sm text-[#4A403B] font-medium">Inactive</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-2">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-white border border-[#E9DED3] text-[#6D625C] rounded font-bold hover:bg-gray-50 shadow-sm transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveRule}
                  className="px-6 py-2 bg-[#2D6A4F] text-white rounded font-bold hover:bg-[#1B4332] shadow-sm transition-colors text-sm"
                >
                  Save Rule
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
