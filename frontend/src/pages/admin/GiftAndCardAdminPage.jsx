import React, { useState, useEffect } from 'react';
import { adminService } from '../../api/adminService';
import { toast } from 'react-hot-toast';
import CustomCalendar from '../../components/CustomCalendar';
import { Eye, EyeOff, X, Edit2, ToggleLeft, ToggleRight, Trash2, SquarePen, Trash, RefreshCw } from 'lucide-react';
import { getImageSrc } from '../../utils/imageUtils';
import { ActiveBadge, RequestBadge, OrderBadge, StatusBadge } from '../../components/admin/CommonComponents';
import { formatDeliveryDate, getDeliveryDate } from '../../utils/deliveryDate';
import EditGiftBoxRulePage from './fees/EditGiftBoxRulePage';
import Pagination from '../../components/common/Pagination';
import OrderPricingSummary from '../../components/OrderPricingSummary';

const formatDate = formatDeliveryDate;
import { formatOrderId } from '../../utils/formatters';
import ConfirmDialog from '../../components/admin/ConfirmDialog';

export default function GiftAndCardAdminPage({ activeSubTab = 'rules', canCreate = true, canEdit = true, canDelete = true }) {
  const [deleteId, setDeleteId] = useState(null);
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await adminService.deleteGiftBoxRule(deleteId);
      toast.success('Rule deleted');
      fetchGiftBoxRules();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
    setDeleteId(null);
  };
  const [activeTab, setActiveTab] = useState(activeSubTab);
  useEffect(() => {
    setActiveTab(activeSubTab);
  }, [activeSubTab]);
  const [config, setConfig] = useState({
    disabledNextDays: 3,
    availableDaysWindow: 3,
    giftWrapFee: 50,
    specificBlockedDates: [],
    specificAvailableDates: []
  });
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [giftBoxRules, setGiftBoxRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Pagination state
  const ITEMS_PER_PAGE = 10;
  const [ordersPage, setOrdersPage] = useState(1);
  const [messagesPage, setMessagesPage] = useState(1);
  const [rulesPage, setRulesPage] = useState(1);

  // Multi-select for orders tab
  const [selectedIds, setSelectedIds] = useState([]);
  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? paginatedOrders.map(item => item._id) : []);
  };
  const toggleSelectOne = (id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  // Multi-select for messages tab
  const [selectedMsgIds, setSelectedMsgIds] = useState([]);
  const toggleMsgSelectAll = (checked) => {
    setSelectedMsgIds(checked ? paginatedMessages.map(m => m._id) : []);
  };
  const toggleMsgSelectOne = (id, checked) => {
    setSelectedMsgIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  // Pagination helper
  const getPaginationPages = (currentPage, totalPages) => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const [editingRuleId, setEditingRuleId] = useState(null);
  const [formData, setFormData] = useState({
    minVolume: '',
    maxVolume: '',
    boxSize: 'XS',
    fee: '',
    isActive: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    try {
      const conf = await adminService.getGiftCardConfig();
      if (conf) setConfig(conf);
    } catch (err) {
      console.error('Failed to load GiftCardConfig:', err);
    }

    try {
      const ords = await adminService.getAdminGiftOrders();
      setOrders(ords || []);
    } catch (err) {
      console.error('Failed to load Gift Orders:', err);
    }

    try {
      const msgs = await adminService.getAdminMessages();
      setMessages(msgs || []);
    } catch (err) {
      console.error('Failed to load Admin Messages:', err);
    }

    try {
      const rules = await adminService.getGiftBoxRules();
      setGiftBoxRules(rules || []);
    } catch (err) {
      console.error('Failed to load Gift Box Rules:', err);
    }

    setLoading(false);
  };

  const fetchGiftBoxRules = async () => {
    try {
      const rules = await adminService.getGiftBoxRules();
      setGiftBoxRules(rules || []);
    } catch (error) {
      toast.error('Failed to refresh gift box rules');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await adminService.updateGiftCardConfig(config);
      toast.success('Configuration saved successfully');
    } catch (err) {
      toast.error('Failed to save configuration');
    }
  };

  const handleToggleAdminDate = async (dateStr, currentStatus) => {
    let newBlocked = [...(config.specificBlockedDates || [])];
    let newAvailable = [...(config.specificAvailableDates || [])];

    // Remove from both lists first to reset
    newBlocked = newBlocked.filter(d => d !== dateStr);
    newAvailable = newAvailable.filter(d => d !== dateStr);

    if (currentStatus === 'blocked-manual') {
      // It was manually blocked, now revert to baseline
      // (already removed above)
    } else if (currentStatus === 'available-manual') {
      // It was manually available, now revert to baseline
      // (already removed above)
    } else if (currentStatus === 'available-baseline') {
      // It was auto available, user wants to manually block it
      newBlocked.push(dateStr);
    } else if (currentStatus === 'blocked-baseline') {
      // It was auto blocked, user wants to manually available it
      newAvailable.push(dateStr);
    }

    const updatedConfig = {
      ...config,
      specificBlockedDates: newBlocked,
      specificAvailableDates: newAvailable
    };

    setConfig(updatedConfig);

    // Auto-save the calendar click
    try {
      await adminService.updateGiftCardConfig(updatedConfig);
      toast.success('Calendar date updated');
    } catch (err) {
      toast.error('Failed to update calendar');
    }
  };

  // Paginated slices
  const paginatedOrders = orders.slice((ordersPage - 1) * ITEMS_PER_PAGE, ordersPage * ITEMS_PER_PAGE);
  const totalOrderPages = Math.max(1, Math.ceil(orders.length / ITEMS_PER_PAGE));
  const paginatedMessages = messages.slice((messagesPage - 1) * ITEMS_PER_PAGE, messagesPage * ITEMS_PER_PAGE);
  const totalMessagePages = Math.max(1, Math.ceil(messages.length / ITEMS_PER_PAGE));
  const paginatedRules = giftBoxRules.slice((rulesPage - 1) * ITEMS_PER_PAGE, rulesPage * ITEMS_PER_PAGE);
  const totalRulesPages = Math.max(1, Math.ceil(giftBoxRules.length / ITEMS_PER_PAGE));

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  const tabTitles = {
    rules: 'Delivery Rules',
    'gift-fee': 'Gift Fee',
    orders: 'Gift Orders',
  };
  const pageTitle = tabTitles[activeTab] || 'Gift & Card Management';

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div>
          <p className="text-[13px] md:text-sm font-serif text-white mb-1">
            Dashboard &rsaquo; Gift &amp; Card &rsaquo; <span className="font-semibold text-[#8B5E3C]">{pageTitle}</span>
          </p>
          <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">{pageTitle}</h1>
        </div>
        <button
          onClick={async () => {
            setIsRefreshing(true);
            await fetchData();
            setIsRefreshing(false);
          }}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E6DFD4] rounded-full text-[#8B5E3C] text-sm font-bold shadow-sm hover:bg-[#FAF4EF] transition-colors disabled:opacity-60 disabled:cursor-not-allowed self-start md:self-auto"
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          REFRESH
        </button>
      </div>



      {activeTab === 'rules' && (
        <div className="max-w-2xl bg-white p-6 shadow rounded-md">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Calendar Availability</h2>
          <CustomCalendar
            config={config}
            isAdminMode={true}
            canEdit={canEdit}
            onToggleAdminDate={handleToggleAdminDate}
          />
        </div>
      )}

      {activeTab === 'gift-fee' && (
        <div className="max-w-5xl">
          {editingRuleId ? (
            <EditGiftBoxRulePage
              ruleId={editingRuleId}
              onBack={() => {
                setEditingRuleId(null);
                fetchGiftBoxRules();
              }}
            />
          ) : (
            <>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Dynamic Gift Box Rules</h2>

              {canCreate && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6DFD4] mb-8">
                  <h3 className="text-xl font-serif font-bold text-gray-900 mb-6">Add New Rule</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (formData.minVolume === '' || formData.maxVolume === '' || formData.fee === '') {
                      toast.error('Please fill all required numeric fields properly');
                      return;
                    }
                    try {
                      if (editingRuleId) {
                        await adminService.updateGiftBoxRule(editingRuleId, formData);
                        toast.success(`Rule updated successfully!`);
                      } else {
                        await adminService.createGiftBoxRule(formData);
                        toast.success(`Rule added successfully!`);
                      }
                      setFormData({ minVolume: '', maxVolume: '', boxSize: 'XS', fee: '', isActive: true });
                      fetchGiftBoxRules();
                    } catch (error) {
                      toast.error(error.message || 'Failed to save rule');
                    }
                  }}>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                      <div>
                        <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Min Volume (cm³)</label>
                        <input type="text" inputMode="numeric" name="minVolume" value={formData.minVolume} onChange={(e) => setFormData({ ...formData, minVolume: e.target.value ? Number(e.target.value) : '' })} required className="w-full px-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-colors" placeholder="e.g. 0" />
                      </div>
                      <div>
                        <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Max Volume (cm³)</label>
                        <input type="text" inputMode="numeric" name="maxVolume" value={formData.maxVolume} onChange={(e) => setFormData({ ...formData, maxVolume: e.target.value ? Number(e.target.value) : '' })} required className="w-full px-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-colors" placeholder="e.g. 500" />
                      </div>
                      <div>
                        <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Box Size</label>
                        <input type="text" name="boxSize" value={formData.boxSize} onChange={(e) => setFormData({ ...formData, boxSize: e.target.value })} required className="w-full px-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-colors" placeholder="e.g. XS" />
                      </div>
                      <div>
                        <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Fee (₹)</label>
                        <input type="text" inputMode="numeric" name="fee" value={formData.fee} onChange={(e) => setFormData({ ...formData, fee: e.target.value ? Number(e.target.value) : '' })} required className="w-full px-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-colors" placeholder="e.g. 30" />
                      </div>
                      <div>
                        <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Status</label>
                        <select name="isActive" value={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })} className="w-full px-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-colors">
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>
                      <div>
                        <button type="submit" className="flex items-center gap-2 bg-[#8B5E3C] hover:bg-[#7a5234] disabled:opacity-60 text-white px-8 py-3 rounded-full text-[15px] font-bold transition-colors shadow-sm uppercase tracking-wide">
                          ADD RULE
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {selectedIds.length > 0 && (
                <div className="bg-[#F8F4EC] border border-[#E6DFD4] rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-[#8B5E3C]">{selectedIds.length} selected</span>
                  <div className="flex gap-2 ml-auto flex-wrap">
                    {canEdit && (
                      <>
                        <button onClick={() => toast.success('Status updated')} className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Set Active</button>
                        <button onClick={() => toast.success('Status updated')} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Set Inactive</button>
                      </>
                    )}
                    {canDelete && (
                      <button onClick={() => { toast.success('Rules deleted'); setSelectedIds([]); }} className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">Delete Selected</button>
                    )}
                    <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-white transition-colors text-gray-500">Clear</button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD4] overflow-hidden">
                <table className="w-full text-[16px]">
                  <thead className="sticky top-0 bg-[#F8F4EC] border-b border-[#E6DFD4]">
                    <tr>
                      <th className="py-4 px-2 font-bold w-10 text-center text-[14px] uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={paginatedRules.length > 0 && paginatedRules.every(r => selectedIds.includes(r._id))}
                          onChange={e => setSelectedIds(e.target.checked ? [...new Set([...selectedIds, ...paginatedRules.map(r => r._id)])] : selectedIds.filter(id => !paginatedRules.map(r => r._id).includes(id)))}
                          className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer mx-auto block"
                        />
                      </th>
                      <th className="py-4 px-2 font-bold text-[14px] uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Min Vol (cm³)</th>
                      <th className="py-4 px-2 font-bold text-[14px] uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Max Vol (cm³)</th>
                      <th className="py-4 px-2 font-bold text-[14px] uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Box Size</th>
                      <th className="py-4 px-2 font-bold text-[14px] uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Fee (₹)</th>
                      <th className="py-4 px-2 font-bold text-[14px] uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Status</th>
                      <th className="py-4 px-2 font-bold text-[14px] uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedRules.map((rule, idx) => (
                      <tr key={rule._id || idx} className={`border-b border-[#F0EAE2] transition-colors hover:bg-[#FDF9F5] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                        <td className="text-[16px] p-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(rule._id)}
                            onChange={e => setSelectedIds(e.target.checked ? [...selectedIds, rule._id] : selectedIds.filter(id => id !== rule._id))}
                            className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer mx-auto block"
                          />
                        </td>
                        <td className="p-4 text-center whitespace-nowrap text-[16px] font-bold text-gray-900">{rule.minVolume}</td>
                        <td className="p-4 text-center whitespace-nowrap text-[16px] font-bold text-gray-900">{rule.maxVolume}</td>
                        <td className="p-4 text-center whitespace-nowrap text-[16px] font-semibold text-gray-900">{rule.boxSize}</td>
                        <td className="p-4 text-center whitespace-nowrap text-[16px] font-bold text-green-600">₹{rule.fee}</td>
                        <td className="text-[16px] p-4 text-center">
                          <StatusBadge status={rule.isActive ? 'Active' : 'Inactive'} />
                        </td>
                        <td className="text-[16px] p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {canEdit && (
                              <>
                                <button onClick={() => {
                                  setEditingRuleId(rule._id);
                                  setFormData({
                                    minVolume: rule.minVolume,
                                    maxVolume: rule.maxVolume,
                                    boxSize: rule.boxSize,
                                    fee: rule.fee,
                                    isActive: rule.isActive
                                  });
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Edit Rule">
                                  <SquarePen size={16} />
                                </button>
                                <button onClick={async () => {
                                  try {
                                    await adminService.updateGiftBoxRule(rule._id, { isActive: !rule.isActive });
                                    toast.success(`Rule ${rule.isActive ? 'deactivated' : 'activated'}`);
                                    fetchGiftBoxRules();
                                  } catch (e) {
                                    toast.error('Failed to update status');
                                  }
                                }} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors" title={rule.isActive ? 'Deactivate' : 'Activate'}>
                                  {rule.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </>
                            )}
                            {canDelete && (
                              <button onClick={() => setDeleteId(rule._id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Delete Rule">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginatedRules.length === 0 && !loading && (
                      <tr>
                        <td colSpan="7" className="text-[16px] px-4 py-8 text-center text-gray-500">No box rules configured.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {/* Rules Pagination */}
                {totalRulesPages > 1 && (
                  <div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center bg-white">
                    <Pagination currentPage={rulesPage} totalPages={totalRulesPages} onPageChange={setRulesPage} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}


      {activeTab === 'orders' && (
        <>
          {selectedIds.length > 0 && (
            <div className="bg-[#F8F4EC] border border-[#E6DFD4] rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-[#8B5E3C]">{selectedIds.length} selected</span>
              <div className="flex gap-2 ml-auto flex-wrap">
                {canEdit && (
                  <>
                    <button onClick={() => toast.success('Status updated')} className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Set Active</button>
                    <button onClick={() => toast.success('Status updated')} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Set Inactive</button>
                  </>
                )}
                {canDelete && (
                  <button onClick={() => { toast.success('Orders deleted'); setSelectedIds([]); }} className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">Delete Selected</button>
                )}
                <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-white transition-colors text-gray-500">Clear</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD4] overflow-hidden">
            <table className="w-full text-[16px]">
              <thead className="sticky top-0 bg-[#F8F4EC] border-b border-[#E6DFD4]">
                <tr>
                  <th className="py-4 px-2 font-bold w-10 text-center text-[14px] uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={paginatedOrders.length > 0 && paginatedOrders.every(o => selectedIds.includes(o._id))}
                      onChange={e => toggleSelectAll(e.target.checked)}
                      className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer mx-auto block"
                    />
                  </th>
                  <th className="py-4 px-2 font-bold text-[14px] uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Order ID</th>
                  <th className="py-4 px-2 font-bold text-[14px] uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Customer</th>
                  <th className="py-4 px-2 font-bold text-[14px] uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Order Date</th>
                  <th className="py-4 px-2 font-bold text-[14px] uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Delivery Date</th>
                  <th className="py-4 px-2 font-bold text-[14px] uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Status</th>
                  <th className="py-4 px-2 font-bold text-[14px] uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-3.5 text-center text-[16px] text-gray-500">No gift orders found.</td></tr>
                ) : (
                  paginatedOrders.map((order, idx) => (
                    <tr key={order._id} className={`border-b border-[#F0EAE2] transition-colors hover:bg-[#FDF9F5] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                      <td className="text-[16px] p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(order._id)}
                          onChange={e => toggleSelectOne(order._id, e.target.checked)}
                          className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer mx-auto block"
                        />
                      </td>
                      <td className="p-4 text-left whitespace-nowrap text-[16px] font-bold text-gray-900">
                        {formatOrderId(order)}
                      </td>
                      <td className="text-[16px] p-4 text-left whitespace-nowrap">
                        {order.user ? (
                          <div className="flex flex-col">
                            <span className="text-[16px] font-semibold text-gray-900">
                              {order.user.name || order.user.fullName}
                            </span>
                            <span className="text-[16px] font-semibold text-[#D88F5B]">{order.user.email}</span>
                          </div>
                        ) : order.shippingAddress ? (
                          <div className="flex flex-col">
                            <span className="text-[14px] font-semibold text-gray-900 flex items-center gap-2">
                              {order.shippingAddress.fullName}
                              <span className="text-[16px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">Guest</span>
                            </span>
                            <span className="text-[16px] font-semibold text-[#D88F5B]">{order.shippingAddress.phone}</span>
                          </div>
                        ) : (
                          <span className="text-[16px] text-gray-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="p-4 text-left whitespace-nowrap text-[16px] font-semibold text-[#8B5E3C]">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="p-4 text-left whitespace-nowrap text-[16px] font-medium text-[#8B5E3C]">
                        {formatDeliveryDate(getDeliveryDate(order))}
                      </td>
                      <td className="text-[16px] p-4 text-center whitespace-nowrap">
                        <OrderBadge status={order.status} size={16} />
                      </td>
                      <td className="text-[16px] p-4 text-center">
                        <div className="flex items-center justify-center">
                          <button onClick={() => setSelectedOrder(order)} className="text-green-600 hover:text-green-700 transition-colors">
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {/* Orders Pagination */}
            {totalOrderPages > 1 && (
              <div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center bg-white">
                <Pagination currentPage={ordersPage} totalPages={totalOrderPages} onPageChange={setOrdersPage} />
              </div>
            )}
          </div>
        </>
      )}

      {/* View Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 md:px-8 border-b border-[#E6DFD4] flex justify-between items-center bg-[#F8F4EC]">
              <h3 className="font-serif font-bold text-[28px] text-[#141225] tracking-tight">
                Gift Order Details
              </h3>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto">

              {/* User Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">Customer Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                  <p><span className="font-medium text-gray-800">Name:</span> {selectedOrder.user?.name || selectedOrder.user?.fullName || selectedOrder.shippingAddress?.fullName || 'N/A'}</p>
                  <p><span className="font-medium text-gray-800">Email:</span> {selectedOrder.user?.email || 'N/A'}</p>
                  <p><span className="font-medium text-gray-800">Phone:</span> {selectedOrder.shippingAddress?.phone || 'N/A'}</p>
                </div>
                <div className="text-sm text-gray-600 pt-3 border-t border-gray-200">
                  <p className="font-medium text-gray-800 mb-1">Shipping Address:</p>
                  {selectedOrder.shippingAddress ? (
                    <p>
                      {selectedOrder.shippingAddress.address}, {selectedOrder.shippingAddress.city}, <br />
                      {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.pinCode || selectedOrder.shippingAddress.postalCode}
                    </p>
                  ) : (
                    <p>N/A</p>
                  )}
                </div>
              </div>

              {/* Product Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.orderItems?.map((item, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-4 p-3 bg-white">
                        <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                          {item.image ? (
                            <img src={getImageSrc(item.image)} alt={item.name} className="w-full h-full object-cover rounded" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{item.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.qty} | Price: ₹{item.price}</p>
                        </div>
                      </div>

                      {item.isGift && (
                        <div className="bg-[#FAF4EF] p-4 border-t border-gray-100">
                          <h4 className="text-[11px] font-bold text-[#141225] uppercase tracking-widest mb-3">GIFT PREFERENCES</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <p className="text-sm"><span className="font-bold text-[#6D625C]">Order Date:</span> {formatDate(selectedOrder.createdAt)}</p>
                              <p className="text-sm"><span className="font-bold text-[#6D625C]">Delivery Date:</span> {formatDeliveryDate(item.deliveryDate || getDeliveryDate(selectedOrder))}</p>
                              <p className="text-sm"><span className="font-bold text-[#6D625C]">Style:</span> {item.giftMessageStyle || 'Classic'}</p>
                              <p className="text-sm"><span className="font-bold text-[#6D625C]">Wrapper:</span> {item.isGiftWrapper ? 'Premium Wrapping' : 'No Wrapper'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#6D625C] mb-1">Message:</p>
                              <div className={`w-full bg-white border border-[#E9DED3] p-3 rounded-sm min-h-[60px] text-gray-700 ${item.giftMessageStyle === 'Classic' ? 'font-serif text-sm' : item.giftMessageStyle === 'Elegant' ? 'font-script italic text-base' : 'font-sans tracking-wide text-sm'}`}>
                                {item.giftMessage || 'No message provided'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Summary */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Payment Summary</h3>
                <div className="bg-gray-50 p-4 rounded-lg"><OrderPricingSummary order={selectedOrder} /></div>
              </div>

              {/* Gift Details (Fallback for old global orders) */}
              {(!selectedOrder.orderItems || !selectedOrder.orderItems.some(i => i.isGift)) && (
                <div className="bg-[#FAF4EF] p-4 rounded-lg border border-[#E6DFD4]">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">Global Gift Preferences</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium text-gray-800">Order Date:</span> {formatDate(selectedOrder.createdAt)}</p>
                    <p><span className="font-medium text-gray-800">Delivery Date:</span> {formatDeliveryDate(getDeliveryDate(selectedOrder))}</p>
                    <p><span className="font-medium text-gray-800">Style:</span> {selectedOrder.giftMessageStyle || 'Classic'}</p>
                    {selectedOrder.giftMessage && (
                      <div className="mt-2">
                        <span className="font-medium text-gray-800 block mb-1">Message:</span>
                        <p className="italic bg-white p-3 rounded border border-gray-200">
                          {selectedOrder.giftMessage}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    
      

      
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
            handleDeleteConfirm();
        }}
        title="Delete Item"
        message="This action cannot be undone. Are you sure?"
      />
      

</div>
  );
}
