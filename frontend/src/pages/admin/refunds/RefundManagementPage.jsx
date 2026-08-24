import { ActiveBadge, RequestBadge, OrderBadge } from '../../../components/admin/CommonComponents';
import React, { useState, useEffect } from 'react';
import { Download, Search, ChevronDown, ChevronLeft, ChevronRight, Eye, X, CheckCircle2, RefreshCw } from 'lucide-react';
import Pagination from '../../../components/common/Pagination';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { adminService } from '../../../api/adminService';
import { downloadExcelFile } from '../../../utils/exportUtils';
import { useConfigStore } from '../../../store/useConfigStore';

export default function RefundManagementPage({ canEdit = true, canDelete = true }) {
  const [refunds, setRefunds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? filteredRefunds.map(item => item._id) : []);
  };

  const toggleSelectOne = (id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const handleBulkStatus = async (status) => {
    if (!selectedIds.length) return;
    try {
      setLoading(true);
      await Promise.all(
        selectedIds.map(async (id) => {
          await adminService.updateRefundStatus(id, status);
        })
      );
      toast.success(`Successfully updated ${selectedIds.length} refunds`);
      setSelectedIds([]);
      fetchRefunds();
    } catch (e) {
      toast.error('Failed to update refunds');
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} refunds?`)) {
      try {
        setLoading(true);
        await Promise.all(selectedIds.map(id => adminService.deleteRefund(id)));
        toast.success(`Successfully deleted ${selectedIds.length} refunds`);
        setSelectedIds([]);
        fetchRefunds();
      } catch (e) {
        toast.error('Failed to delete refunds');
        setLoading(false);
      }
    }
  };

  const [loading, setLoading] = useState(true);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeViewRefund, setActiveViewRefund] = useState(null);

  // Global Wallet Toggle State
  const { walletEnabled, updateWalletConfig } = useConfigStore();
  const [isTogglingWallet, setIsTogglingWallet] = useState(false);

  const handleToggleWallet = async (e) => {
    const newValue = e.target.checked;
    setIsTogglingWallet(true);
    try {
      await updateWalletConfig(newValue);
      toast.success(`Wallet feature ${newValue ? 'enabled' : 'disabled'} globally.`);
    } catch (error) {
      toast.error('Failed to update wallet configuration.');
    } finally {
      setIsTogglingWallet(false);
    }
  };

  // Step 2: Approve modal
  const [approveRefund, setApproveRefund] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);

  // Step 3: Process Refund modal (wallet/UPI/bank)
  const [processRefund, setProcessRefund] = useState(null);
  const [processLoading, setProcessLoading] = useState(false);
  const [refundMethod, setRefundMethod] = useState('Wallet');

  const [paymentTypeFilter, setPaymentTypeFilter] = useState('All Payment Types');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('30'); // '30', '7', 'all'
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const dateOptions = [
    { value: '30', label: 'Last 30 Days' },
    { value: '7', label: 'Last 7 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const data = await adminService.getRefunds();
      if (Array.isArray(data)) {
        setRefunds(data);
      } else {
        setRefunds([]);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load refunds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleSeed = async () => {
    try {
      await adminService.seedRefunds();
      toast.success('Refunds seeded');
      fetchRefunds();
    } catch (e) {
      toast.error(e.message || 'Failed to seed refunds');
    }
  };

  const openViewModal = (refund) => {
    setActiveViewRefund(refund);
    setIsViewModalOpen(true);
  };

  // Step 2: Admin approves the cancellation
  const handleApprove = async () => {
    if (!approveRefund) return;
    try {
      setApproveLoading(true);
      await adminService.approveRefund(approveRefund._id);
      toast.success('Refund request approved! User will see "Refund Accepted" status.');
      setApproveRefund(null);
      fetchRefunds();
    } catch (e) {
      toast.error(e.message || 'Failed to approve refund');
    } finally {
      setApproveLoading(false);
    }
  };

  // Step 3: Admin processes the actual refund payment
  const handleProcessRefund = async () => {
    if (!processRefund) return;
    try {
      setProcessLoading(true);
      await adminService.processRefund(processRefund._id, refundMethod);
      toast.success(`Refund processed via ${refundMethod}! Stock has been restored.`);
      setProcessRefund(null);
      setRefundMethod(walletEnabled ? 'Wallet' : 'UPI');
      fetchRefunds();
    } catch (e) {
      toast.error(e.message || 'Failed to process refund');
    } finally {
      setProcessLoading(false);
    }
  };

  const filteredRefunds = refunds.filter((r) => {
    const matchPayment = paymentTypeFilter === 'All Payment Types' || r.paymentType === paymentTypeFilter;
    let matchStatus = true;
    if (statusFilter === 'Pending' || statusFilter === 'Approval Pending') {
      matchStatus = r.status === 'Pending' || r.status === 'Approval Pending';
    } else if (statusFilter === 'Completed' || statusFilter === 'Refund Approved') {
      matchStatus = r.status === 'Completed' || r.status === 'Approved Refund' || r.status === 'Refund Approved';
    } else if (statusFilter !== 'All Statuses') {
      matchStatus = r.status === statusFilter;
    }
    const searchLower = searchQuery.toLowerCase();
    const actualOrderId = r.orderRef?.orderId || r.orderId || '';
    const matchSearch = actualOrderId.toLowerCase().includes(searchLower) || r.customerName?.toLowerCase().includes(searchLower);

    let matchDate = true;
    if (dateFilter !== 'all') {
      const days = parseInt(dateFilter, 10);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const refundDate = r.createdAt ? new Date(r.createdAt) : new Date(0);
      matchDate = refundDate >= cutoffDate;
    }

    return matchPayment && matchStatus && matchSearch && matchDate;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredRefunds.length / itemsPerPage) || 1;
  const currentRefunds = filteredRefunds.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Derived Stats
  const totalRefunds = refunds.length;
  const totalAmount = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'Pending' || r.status === 'Approval Pending').length;
  const approvedRefunds = refunds.filter(r => r.status === 'Refund Approved').length;
  const successfulRefunds = refunds.filter(r => r.status === 'Refunded' || r.status === 'Completed' || r.status === 'Approved Refund').length;
  const processingRefunds = refunds.filter(r => r.status === 'Processing').length;
  const failedRefunds = refunds.filter(r => r.status === 'Failed').length;

  // Chart Data
  const pieData = [
    { name: 'Approved', value: successfulRefunds, color: '#22c55e' }, // green
    { name: 'Pending', value: pendingRefunds, color: '#ef4444' }, // red
    { name: 'Processing', value: processingRefunds, color: '#fb923c' },
    { name: 'Failed', value: failedRefunds, color: '#f87171' },
  ].filter(d => d.value > 0);

  const codCount = refunds.filter(r => r.paymentType === 'COD').length;
  const cashfreeCount = refunds.filter(r => r.paymentType === 'Cashfree').length;

  const barData = [
    { name: 'COD', value: codCount, fill: '#ec4899' },
    { name: 'Cashfree', value: cashfreeCount, fill: '#3b82f6' },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Refunded':
      case 'Approved Refund':
      case 'Completed': return 'bg-emerald-100 text-emerald-700';
      case 'Refund Approved': return 'bg-blue-100 text-blue-700';
      case 'Approval Pending':
      case 'Pending': return 'bg-orange-100 text-orange-700';
      case 'Processing': return 'bg-yellow-100 text-yellow-700';
      case 'Failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionStyle = (action) => {
    switch (action) {
      case 'Refunded': return 'bg-emerald-500 text-white';
      case 'Refund': return 'bg-[#8B5E3C] text-white';
      case 'Processing': return 'bg-blue-100 text-blue-700';
      case 'Failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const exportRefundsExcel = () => {
    const header = ['Refund ID', 'Order ID', 'Customer', 'Payment Type', 'Status', 'Amount', 'Requested At'];
    const rows = filteredRefunds.map((refund) => ({
      'Refund ID': refund._id,
      'Order ID': refund.orderId || '',
      'Customer': refund.customerName || refund.customerEmail || '',
      'Payment Type': refund.paymentType || '',
      'Status': refund.status || '',
      'Amount': refund.amount || 0,
      'Requested At': refund.createdAt ? new Date(refund.createdAt).toLocaleString('en-IN') : '',
    }));
    downloadExcelFile('refunds', header, rows);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[13px] md:text-sm font-serif text-white mb-1">
              Dashboard &rsaquo; <span className="font-semibold text-[#8B5E3C]">Refund Management</span>
            </p>
            <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Refund Management</h1>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={fetchRefunds} className="admin-secondary-btn">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <div className="relative">
              <button
                onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                className="bg-white border border-[#E9DED3] text-[#4A403B] text-sm rounded-full h-[40px] px-4 py-2 focus:outline-none shadow-sm cursor-pointer flex items-center justify-between min-w-[140px] hover:border-[#C8B9A5] transition-colors"
              >
                {dateOptions.find(opt => opt.value === dateFilter)?.label || 'Last 30 Days'}
                <ChevronDown size={16} className={`ml-2 transition-transform ${isDateDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDateDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-full min-w-[150px] bg-white border border-[#E9DED3] rounded-xl shadow-lg z-50 overflow-hidden py-1">
                    {dateOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => { setDateFilter(option.value); setCurrentPage(1); setIsDateDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${dateFilter === option.value ? 'bg-[#FDF9F1] text-[#8B5E3C] font-semibold' : 'text-[#4A403B] hover:bg-[#FDF9F1] hover:text-[#8B5E3C]'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={exportRefundsExcel} className="admin-export-btn">
              <Download size={16} />
              Export Excel
            </button>
          </div>
        </div>

        {/* Global Wallet Toggle */}
        <div className="bg-white rounded-[14px] border border-[#E9DED3] p-5 shadow-sm mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#141225]">Wallet</h2>
            <p className="text-sm text-[#6D625C]">Enable or Disable Wallet functionality across the entire application.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={walletEnabled}
              onChange={handleToggleWallet}
              disabled={isTogglingWallet}
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#8B5E3C]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#8B5E3C]"></div>
            <span className="ml-3 text-sm font-medium text-gray-900">{walletEnabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-[14px] border border-[#E9DED3] p-5 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" /></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-[#6D625C]">Total Refunds</p>
              <h3 className="text-2xl font-bold text-[#141225] mt-0.5">{totalRefunds}</h3>
              <p className="text-[10px] text-[#8A817C] mt-1">All time total refunds</p>
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-[#E9DED3] p-5 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-[#6D625C]">Total Refunded Amount</p>
              <h3 className="text-2xl font-bold text-[#141225] mt-0.5">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
              <p className="text-[10px] text-[#8A817C] mt-1">All time refunded amount</p>
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-[#E9DED3] p-5 shadow-sm flex items-start gap-4">
            <div className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-[#6D625C]">Pending Refunds</p>
              <h3 className="text-2xl font-bold text-[#141225] mt-0.5">{pendingRefunds}</h3>
              <p className="text-[10px] text-[#8A817C] mt-1">Refunds in progress</p>
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-[#E9DED3] p-5 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-[#6D625C]">Successful Refunds</p>
              <h3 className="text-2xl font-bold text-[#141225] mt-0.5">{successfulRefunds}</h3>
              <p className="text-[10px] text-[#8A817C] mt-1">Completed refunds</p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          <div className="bg-white rounded-[14px] border border-[#E9DED3] p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#141225] mb-6">Refunds by Status</h3>
            <div className="flex items-center">
              <div className="w-1/2 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-3 pl-6">
                {pieData.map((d, i) => {
                  const perc = totalRefunds ? Math.round((d.value / totalRefunds) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                        <span className="text-[#6D625C]">{d.name}</span>
                      </div>
                      <div className="text-[#141225]">{d.value} <span className="text-[#8A817C]">({perc}%)</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-[#E9DED3] p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#141225] mb-6">Refunds by Payment Type</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8A817C' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8A817C' }} />
                  <Tooltip cursor={{ fill: '#f3f4f6' }} />
                  <Bar dataKey="value" barSize={80} radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Data Table Controls */}
        <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A817C]" />
            <input
              type="text"
              placeholder="Search by Order ID or Customer..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E9DED3] rounded-[10px] text-sm focus:outline-none focus:border-[#9A6031] focus:ring-1 focus:ring-[#9A6031] transition-all"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <select
              value={paymentTypeFilter}
              onChange={(e) => { setPaymentTypeFilter(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-[#E9DED3] rounded-[10px] px-4 py-2.5 text-sm text-[#4A403B] font-semibold outline-none focus:border-[#9A6031]"
            >
              <option>All Payment Types</option>
              <option>COD</option>
              <option>Cashfree</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-[#E9DED3] rounded-[10px] px-4 py-2.5 text-sm text-[#4A403B] font-semibold outline-none focus:border-[#9A6031]"
            >
              <option>All Statuses</option>
              <option value="Approval Pending">Approval Pending</option>
              <option value="Refund Approved">Refund Approved</option>
            </select>
            <select className="bg-white border border-[#E9DED3] rounded-[10px] px-4 py-2.5 text-sm text-[#4A403B] font-semibold outline-none focus:border-[#9A6031]">
              <option>All Timelines</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#F8F4EC] border border-[#E9DED3] rounded-[14px] transition-all duration-300 ${selectedIds.length > 0 ? 'opacity-100 p-4 mb-4' : 'opacity-0 h-0 p-0 overflow-hidden border-0 mb-0'}`}>
          <div className="flex items-center">
            <span className="text-[15px] font-bold text-[#8B5E3C]">
              {selectedIds.length} selected
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => handleBulkStatus('Active')} className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Set Active</button>
            <button onClick={() => handleBulkStatus('Inactive')} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Set Inactive</button>
            <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">Delete Selected</button>
            <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-white transition-colors text-gray-500 bg-white">Clear</button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-[#FAF4EF] text-[#8A817C] text-xs font-bold tracking-widest uppercase border-b border-[#E6DFD4]">
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredRefunds.length > 0 && selectedIds.length === filteredRefunds.length}
                      onChange={e => toggleSelectAll(e.target.checked)}
                      className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Order ID</th>
                  <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Customer</th>
                  <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Amount</th>
                  <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Payment Type</th>
                  <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">SLA Timeline</th>
                  <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Status</th>
                  <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Refund</th>
                  <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9DED3] text-sm text-brand-dark">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-[#8A817C] text-[16px]">
                      <div className="w-8 h-8 border-4 border-[#8B5E3C] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      Loading refunds...
                    </td>
                  </tr>
                ) : currentRefunds.map((refund, idx) => (
                  <tr key={idx} className={`border-b border-[#F0EAE2] transition-colors hover:bg-[#FDF9F5] ${idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}>
                    <td className="text-[16px] px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(refund._id)}
                        onChange={e => toggleSelectOne(refund._id, e.target.checked)}
                        className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4 text-center text-[16px] font-bold text-[#141225]">{refund.orderRef?.orderId || refund.orderId}</td>
                    <td className="px-4 py-4 text-center text-[16px] font-bold text-[#141225]">{refund.customerName}</td>
                    <td className="px-4 py-4 text-center text-[16px] font-semibold text-[#141225]">₹{refund.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="text-[16px] px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[14px] font-bold tracking-wide ${refund.paymentType === 'Cashfree' ? 'text-blue-500 bg-blue-50' : 'text-purple-500 bg-purple-50'}`}>
                        {refund.paymentType}
                      </span>
                    </td>
                    <td className="text-[16px] px-4 py-4 text-center">
                      <span className="text-[16px] font-bold text-[#8B5E3C]">
                        {refund.slaTimeline}
                      </span>
                    </td>
                    <td className="text-[14px] px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[14px] font-bold whitespace-nowrap ${getStatusStyle(refund.status)}`}>
                        {refund.status}
                      </span>
                    </td>
                    <td className="text-[16px] px-4 py-4 text-center">
                      {/* Step 2: Approve button (only for Approval Pending) */}
                      {(refund.status === 'Approval Pending' || refund.status === 'Pending') && canEdit && (
                        <button
                          onClick={() => setApproveRefund(refund)}
                          className="inline-block px-4 py-1.5 rounded-lg text-[16px] font-bold shadow-sm bg-[#8B5E3C] text-white cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          Approve
                        </button>
                      )}
                      {/* Step 3: Refund button (only for Refund Approved) */}
                      {refund.status === 'Refund Approved' && canEdit && (
                        <button
                          onClick={() => { setProcessRefund(refund); setRefundMethod(walletEnabled ? 'Wallet' : 'UPI'); }}
                          className="inline-block px-4 py-1.5 rounded-lg text-[16px] font-bold shadow-sm bg-[#155DFC] text-white cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          Refund
                        </button>
                      )}
                      {/* Final state: Refunded */}
                      {(refund.status === 'Refunded' || refund.status === 'Completed' || refund.status === 'Approved Refund') && (
                        <span className="inline-block px-4 py-1.5 rounded-lg text-[16px] font-bold bg-emerald-500 text-white opacity-90">
                          Refunded
                        </span>
                      )}
                    </td>
                    <td className="text-[16px] px-4 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openViewModal(refund)} className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors">
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && currentRefunds.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-[#6D625C] text-[16px]">
                      No refunds found matching the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-6 border-t border-[#E6DFD4] flex flex-col sm:flex-row sm:items-center justify-center bg-white gap-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

      </div>

      {/* STEP 2: Approve Cancellation Request Modal */}
      {approveRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[500px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 md:px-8 bg-[#8B5E3C] text-white">
              <h2 className="text-2xl font-serif font-bold tracking-tight">Approve Refund Request</h2>
              <button onClick={() => setApproveRefund(null)} className="p-2 text-gray-400 hover:text-red-300 transition-colors" disabled={approveLoading}>
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <div className="mb-4">
                <p className="text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-1">Order</p>
                <p className="font-bold text-[#141225] text-base">{approveRefund.orderId}</p>
              </div>
              <div className="mb-4">
                <p className="text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-1">Customer</p>
                <p className="font-bold text-[#141225]">{approveRefund.customerName}</p>
                <p className="text-xs text-[#8A817C]">{approveRefund.customerEmail || approveRefund.customerPhone || 'N/A'}</p>
              </div>
              <div className="flex justify-between items-center bg-[#F4EBE2]/50 rounded-xl p-4 mb-4 border border-[#E9DED3]">
                <span className="text-sm font-bold text-[#A7632E]">Refund Amount</span>
                <span className="text-xl font-black text-[#A7632E]">₹{approveRefund.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="text-xs text-center text-[#8A817C] mb-5 px-2">
                Approving this request will notify the user that their cancellation has been accepted. You will then process the actual refund payment separately.
              </p>
              <div className="pt-2 mt-2 flex items-center justify-center gap-4">
                <button onClick={() => setApproveRefund(null)} disabled={approveLoading}
                  className="admin-cancel-btn bg-white">CANCEL</button>
                <button onClick={handleApprove} disabled={approveLoading}
                  className="inline-flex items-center justify-center text-[15px] font-bold shadow-sm transition-colors uppercase tracking-wide px-8 py-3 rounded-full bg-[#8B5E3C] hover:bg-[#7a5235] text-white border-0">
                  {approveLoading ? 'Approving...' : 'Approve Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Process Refund Payment Modal */}
      {processRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[500px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 md:px-8 bg-[#DBEAFE] text-blue-900">
              <h2 className="text-2xl font-serif font-bold tracking-tight">Process Refund Payment</h2>
              <button onClick={() => setProcessRefund(null)} className="p-2 text-gray-500 hover:text-red-600 transition-colors" disabled={processLoading}>
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <div className="mb-4">
                <p className="text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-1">Customer</p>
                <p className="font-bold text-[#141225]">{processRefund.customerName}</p>
                <p className="text-xs text-[#8A817C]">{processRefund.customerEmail || processRefund.customerPhone || 'N/A'}</p>
              </div>
              {processRefund.refundDestination && (
                <div className="mb-4">
                  <p className="text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-1">Customer UPI / Phone</p>
                  <div className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors">
                    {processRefund.refundDestination}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center bg-[#DBEAFE] rounded-xl p-4 mb-5">
                <span className="text-sm font-bold text-[#155DFC]">Refund Amount</span>
                <span className="text-xl font-black text-[#155DFC]">₹{processRefund.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="mb-5">
                <p className="text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-2">Select Refund Method</p>
                <div className="flex flex-wrap gap-3">
                  {['Wallet', 'UPI', 'Bank Transfer']
                    .filter(method => walletEnabled || method !== 'Wallet')
                    .map((method) => (
                      <button key={method}
                        onClick={() => setRefundMethod(method)}
                        className={`px-8 py-3 border rounded-full text-[15px] font-bold transition-colors shadow-sm uppercase tracking-wide ${refundMethod === method
                          ? 'bg-[#DBEAFE] border-[#DBEAFE] text-blue-900'
                          : 'border-[#DBEAFE] bg-white text-[#155DFC] hover:bg-blue-50'
                          }`}>
                        {method}
                      </button>
                    ))}
                </div>
              </div>
              <p className="text-xs text-center text-[#8A817C] mb-5 px-2">
                After clicking Refund, the stock will be automatically restored to inventory and the customer status will update to <strong>Refunded</strong>.
              </p>
              <div className="pt-2 mt-2 flex items-center justify-center gap-4">
                <button onClick={() => setProcessRefund(null)} disabled={processLoading}
                  className="admin-cancel-btn bg-white">CANCEL</button>
                <button onClick={handleProcessRefund} disabled={processLoading}
                  className="inline-flex items-center justify-center text-[15px] font-bold shadow-sm transition-colors uppercase tracking-wide px-8 py-3 rounded-full bg-[#155DFC] hover:bg-blue-700 text-white border-0">
                  {processLoading ? 'Processing...' : `Refund via ${refundMethod}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Refund Details Modal */}
      {isViewModalOpen && activeViewRefund && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 md:px-8 border-b border-[#E6DFD4] bg-[#F8F4EC]">
              <h2 className="text-2xl font-serif font-bold tracking-tight text-[#141225]">View Refund Details</h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 text-gray-400 hover:text-red-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar">

              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs text-[#8A817C] mb-1">Order ID</p>
                  <p className="text-base font-bold text-[#141225]">{activeViewRefund.orderId}</p>
                  <span className={`inline-block px-2 py-0.5 mt-2 text-[10px] font-bold rounded ${activeViewRefund.status === 'Refund Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    Status: {activeViewRefund.status === 'Refund Approved' ? 'Successfully' : (activeViewRefund.originalStatus || 'Placed')}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#8A817C] mb-1">Customer</p>
                  <p className="text-sm font-bold text-[#141225]">{activeViewRefund.customerName}</p>
                </div>
              </div>

              {activeViewRefund.orderRef?.orderItems?.map((item, idx) => {
                const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                const rawImage = item.image || '';
                const imageUrl = rawImage.startsWith('http')
                  ? rawImage
                  : rawImage
                    ? `${API_BASE}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`
                    : null;

                return (
                  <div key={idx} className="flex gap-4 items-center bg-[#F3E7D7]/30 p-3 rounded-xl border border-[#E9DED3]/50 mb-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-[#F3E7D7] flex items-center justify-center">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div className="w-full h-full items-center justify-center text-[10px] text-[#8A817C] font-bold" style={{ display: imageUrl ? 'none' : 'flex' }}>
                        IMG
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-[#141225] line-clamp-1">{item.name}</h4>
                      <p className="text-[11px] text-[#8A817C] mt-1">
                        Qty: {item.qty}{item.weight ? ` • ${item.weight}` : ''}
                      </p>
                    </div>
                    <div className="text-sm font-bold text-[#141225]">
                      ₹{(item.price * item.qty).toFixed(2)}
                    </div>
                  </div>
                );
              })}

              <div className="bg-[#F4EBE2]/50 rounded-xl p-4 border border-[#E9DED3] mb-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-[#6D625C] font-semibold">Total Order Amount</span>
                  <span className="text-[#141225] font-bold">₹{(activeViewRefund.orderRef?.totalPrice || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-[#E9DED3]/50 pb-3">
                  <span className="text-[#6D625C] font-semibold">Payment Method</span>
                  <span className="text-[#141225] font-bold">{activeViewRefund.paymentType}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#6D625C] font-semibold">Amount Paid</span>
                  <span className="text-[#141225] font-bold">₹{(activeViewRefund.amountPaid || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">Cancellation Fee</span>
                  <span className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">-₹{(activeViewRefund.cancellationFee || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-dashed border-[#E9DED3]">
                  <span className="text-[#141225] font-bold">Estimated Refund</span>
                  <span className="text-[#A7632E] font-bold">₹{activeViewRefund.amount.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-center text-[#8A817C] mt-2 italic">
                  (Fee applicable for '{activeViewRefund.originalStatus || 'Placed'}' status on {activeViewRefund.paymentType} orders)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl p-3 border border-[#E9DED3]">
                  <p className="text-[10px] text-[#8A817C] mb-1">Order Date</p>
                  <p className="text-xs font-bold text-[#141225]">
                    {activeViewRefund.orderRef?.createdAt ? new Date(activeViewRefund.orderRef.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-[#E9DED3]">
                  <p className="text-[10px] text-[#8A817C] mb-1">Cancellation Date</p>
                  <p className="text-xs font-bold text-[#141225]">
                    {new Date(activeViewRefund.createdAt).toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
