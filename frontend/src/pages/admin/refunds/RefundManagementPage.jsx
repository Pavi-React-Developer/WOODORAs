import React, { useState, useEffect } from 'react';
import { Download, Search, ChevronDown, ChevronLeft, ChevronRight, Eye, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { adminService } from '../../../api/adminService';
import { downloadExcelFile } from '../../../utils/exportUtils';

export default function RefundManagementPage() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRefund, setActiveRefund] = useState(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeViewRefund, setActiveViewRefund] = useState(null);

  const [paymentTypeFilter, setPaymentTypeFilter] = useState('All Payment Types');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRefunds = async () => {
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

  const openProcessModal = (refund) => {
    setActiveRefund(refund);
    setIsProcessModalOpen(true);
  };

  const openViewModal = (refund) => {
    setActiveViewRefund(refund);
    setIsViewModalOpen(true);
  };

  const handleConfirmRefund = async () => {
    if (!activeRefund) return;
    try {
      setProcessLoading(true);
      await adminService.approveRefund(activeRefund._id);
      toast.success('Refund Approved');
      setIsProcessModalOpen(false);
      setActiveRefund(null);
      fetchRefunds();
    } catch (e) {
      toast.error(e.message || 'Failed to approve refund');
    } finally {
      setProcessLoading(false);
    }
  };

  // Filtering logic
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
    const matchSearch = r.orderId?.toLowerCase().includes(searchLower) || r.customerName?.toLowerCase().includes(searchLower);

    return matchPayment && matchStatus && matchSearch;
  });

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredRefunds.length / itemsPerPage) || 1;
  const currentRefunds = filteredRefunds.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Derived Stats
  const totalRefunds = refunds.length;
  const totalAmount = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'Pending' || r.status === 'Approval Pending').length;
  const successfulRefunds = refunds.filter(r => r.status === 'Completed' || r.status === 'Approved Refund' || r.status === 'Refund Approved').length;
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
      case 'Approved Refund':
      case 'Refund Approved':
      case 'Completed': return 'bg-emerald-100 text-emerald-700';
      case 'Approval Pending':
      case 'Pending': return 'bg-orange-100 text-orange-700';
      case 'Processing': return 'bg-blue-100 text-blue-700';
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
    <div className="bg-[#FAF8F5] min-h-screen">
      <div className="max-w-7xl mx-auto px-8 py-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#141225] font-serif tracking-tight">Refund Management</h1>
            <p className="text-[#6D625C] mt-1.5 text-sm">Manage pending and processed refunds.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchRefunds} className="admin-secondary-btn">
              <RefreshCw size={16} />
              Refresh
            </button>
            <button className="admin-secondary-btn flex items-center gap-2">
              Last 30 Days
              <ChevronDown size={14} />
            </button>
            <button onClick={exportRefundsExcel} className="admin-export-btn">
              <Download size={16} />
              Export Excel
            </button>
          </div>
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
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0">
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
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by Order ID or Customer..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E9DED3] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#8B5E3C]"
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={paymentTypeFilter}
              onChange={(e) => { setPaymentTypeFilter(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-[#E9DED3] text-[#4A403B] text-sm rounded-lg px-4 py-2 focus:outline-none shadow-sm cursor-pointer"
            >
              <option>All Payment Types</option>
              <option>COD</option>
              <option>Cashfree</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-[#E9DED3] text-[#4A403B] text-sm rounded-lg px-4 py-2 focus:outline-none shadow-sm cursor-pointer"
            >
              <option>All Statuses</option>
              <option value="Approval Pending">Approval Pending</option>
              <option value="Refund Approved">Refund Approved</option>
            </select>
            <select className="bg-white border border-[#E9DED3] text-[#4A403B] text-sm rounded-lg px-4 py-2 focus:outline-none shadow-sm cursor-pointer">
              <option>All Timelines</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-[#E9DED3] rounded-[14px] shadow-sm overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E9DED3]">
                  <th className="px-6 py-4 text-[10px] font-bold text-[#6D625C] uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#6D625C] uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#6D625C] uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#6D625C] uppercase tracking-wider text-center">Payment Type</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#6D625C] uppercase tracking-wider text-center">SLA Timeline</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#6D625C] uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#6D625C] uppercase tracking-wider text-center">Refund</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#6D625C] uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9DED3]">
                {currentRefunds.map((refund, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-[#141225]">{refund.orderId}</td>
                    <td className="px-6 py-4 text-xs text-[#141225]">{refund.customerName}</td>
                    <td className="px-6 py-4 text-xs font-bold text-[#141225]">₹{refund.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${refund.paymentType === 'Cashfree' ? 'text-blue-500 bg-blue-50' : 'text-purple-500 bg-purple-50'}`}>
                        {refund.paymentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] font-bold ${refund.slaTimeline !== '-' ? 'text-orange-400' : 'text-gray-400'}`}>
                        {refund.slaTimeline}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded text-[10px] font-bold ${getStatusStyle(refund.status)}`}>
                        {refund.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          if (refund.status === 'Approval Pending' || refund.status === 'Pending') {
                            openProcessModal(refund);
                          }
                        }}
                        disabled={!(refund.status === 'Approval Pending' || refund.status === 'Pending')}
                        className={`inline-block px-4 py-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-opacity ${refund.status === 'Approval Pending' || refund.status === 'Pending' ? 'cursor-pointer hover:opacity-80' : 'cursor-default opacity-90'} ${getActionStyle(refund.refundActionStatus)}`}
                      >
                        {refund.refundActionStatus}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => openViewModal(refund)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {currentRefunds.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-[#6D625C] text-sm">
                      No refunds found matching the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-[#E9DED3] flex items-center justify-between">
            <span className="text-xs text-[#8A817C] font-medium">
              Showing {filteredRefunds.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRefunds.length)} of {filteredRefunds.length} results
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                if (totalPages > 5 && (pageNum < currentPage - 1 || pageNum > currentPage + 1) && pageNum !== 1 && pageNum !== totalPages) {
                  if (pageNum === currentPage - 2 || pageNum === currentPage + 2) return <span key={idx} className="px-1 text-gray-400">...</span>;
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded font-bold text-xs shadow-sm transition-colors ${currentPage === pageNum
                        ? 'bg-[#8B5E3C] text-white'
                        : 'hover:bg-gray-100 text-[#4A403B]'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Process Refund Modal */}
      {isProcessModalOpen && activeRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#FAF8F5] rounded-2xl shadow-xl w-full max-w-[420px] border border-[#E9DED3] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 pb-4 bg-[#647C5E] text-white">
              <h2 className="text-lg font-bold">Process Refund</h2>
              <button
                onClick={() => setIsProcessModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
                disabled={processLoading}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">

              <div className="mb-5">
                <span className="text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-1 block">Customer Details</span>
                <p className="font-bold text-[#141225] text-base">{activeRefund.customerName}</p>
                <div className="inline-block mt-1 bg-white border border-[#E9DED3] rounded text-[#6D625C] px-2 py-1 text-xs font-semibold">
                  {activeRefund.customerPhone || 'N/A'}
                </div>
                <p className="text-xs text-[#8A817C] mt-1">{activeRefund.customerEmail || 'N/A'}</p>
              </div>

              <div className="mb-6">
                <span className="text-[11px] font-bold text-[#8A817C] uppercase tracking-wider mb-1 block">User's Refund Destination (UPI / Phone)</span>
                <div className="inline-block bg-blue-50 border border-blue-100 rounded text-blue-600 px-3 py-1.5 text-sm font-bold tracking-wide">
                  {activeRefund.refundDestination || activeRefund.customerPhone || 'Not provided'}
                </div>
              </div>

              <div className="flex justify-between items-center bg-[#F4EBE2]/50 rounded-xl p-4 mb-6 border border-[#E9DED3]">
                <span className="text-sm font-bold text-[#6D625C]">Refund Amount</span>
                <span className="text-xl font-black text-[#A7632E]">
                  ₹{activeRefund.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <p className="text-xs text-center text-[#8A817C] mb-5 px-2">
                Please confirm you have manually processed the refund to the customer's highlighted phone number or account.
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsProcessModalOpen(false)}
                  className="flex-1 py-3 bg-white border border-[#E9DED3] text-[#4A403B] rounded-xl font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors"
                  disabled={processLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRefund}
                  disabled={processLoading}
                  className="flex-[1.5] flex justify-center items-center gap-2 py-3 bg-[#647C5E] text-white rounded-xl font-bold text-sm shadow-sm hover:bg-[#52664d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processLoading ? 'Processing...' : (
                    <>
                      Confirm Refund
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* View Refund Details Modal */}
      {isViewModalOpen && activeViewRefund && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#FAF8F5] rounded-2xl shadow-xl w-full max-w-[500px] border border-[#E9DED3] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 pb-4">
              <h2 className="text-lg font-bold text-[#141225]">View Refund Details</h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-[#6D625C] hover:text-[#141225] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 pb-5">

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

              {activeViewRefund.orderRef?.orderItems?.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-center bg-[#F3E7D7]/30 p-3 rounded-xl border border-[#E9DED3]/50 mb-4">
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                    <img src={item.product?.image || '/animal_balance_maze.png'} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-[#141225] line-clamp-1">{item.name}</h4>
                    <p className="text-[11px] text-[#8A817C] mt-1">
                      Qty: {item.qty} &bull; {item.weight || '700g'} &bull; 3month &bull; red
                    </p>
                  </div>
                  <div className="text-sm font-bold text-[#141225]">
                    ₹{(item.price * item.qty).toFixed(2)}
                  </div>
                </div>
              ))}

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
                  <span className="text-red-500 font-bold">Cancellation Fee</span>
                  <span className="text-red-500 font-bold">-₹{(activeViewRefund.cancellationFee || 0).toFixed(2)}</span>
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

              <div className="flex justify-end">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-6 py-2.5 bg-[#647C5E] text-white rounded-lg font-bold text-sm shadow-sm hover:bg-[#52664d] transition-colors"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
