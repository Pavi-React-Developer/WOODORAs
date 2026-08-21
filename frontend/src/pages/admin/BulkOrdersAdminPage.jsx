import React, { useState, useEffect, useRef } from 'react';
import { ActiveBadge, RequestBadge, OrderBadge } from '../../components/admin/CommonComponents';
import { Plus, Eye, X, Filter, FileText, PackageX, User, Building, MapPin, Mail, Phone, Calendar, Download, Search, Clock, RefreshCw, Check, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';
import { bulkOrderService } from '../../api/bulkOrderService';

export default function BulkOrdersAdminPage({ canEdit = true }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);

  const abortRef = useRef(null);

  const fetchOrders = async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const data = await bulkOrderService.getAllBulkOrders();
      if (data.success) {
        const rawOrders = data.data || [];
        const sortedDesc = rawOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(sortedDesc);
      } else {
        toast.error(data.message || 'Failed to load bulk orders');
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        toast.error(err.message || 'Failed to load bulk orders');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, []);

  const handleApprove = async (id) => {
    try {
      const data = await bulkOrderService.updateBulkOrderStatus(id, { status: 'Approved' });
      if (data.success) {
        toast.success('Bulk order approved ✓');
        fetchOrders();
      } else {
        toast.error(data.message || 'Failed to approve order');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to approve order');
    }
  };

  const handleRejectClick = (order) => {
    setRejectingOrder(order);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      const data = await bulkOrderService.updateBulkOrderStatus(rejectingOrder._id, {
        status: 'Rejected',
        rejectionReason,
      });
      if (data.success) {
        toast.success('Bulk order rejected');
        fetchOrders();
        setIsRejectModalOpen(false);
        setRejectingOrder(null);
      } else {
        toast.error(data.message || 'Failed to reject order');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reject order');
    }
  };

  const handleViewClick = (order) => {
    setViewingOrder(order);
    setIsViewModalOpen(true);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected bulk order(s)? This cannot be undone.`)) return;
    try {
      await Promise.all(selectedIds.map(id => bulkOrderService.deleteBulkOrder?.(id) || Promise.resolve()));
      toast.success(`${selectedIds.length} order(s) deleted`);
      setSelectedIds([]);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to delete orders');
    }
  };

  const handleBulkStatus = async (status) => {
    try {
      await Promise.all(selectedIds.map(id => bulkOrderService.updateBulkOrderStatus(id, { status })));
      toast.success(`${selectedIds.length} order(s) set to ${status}`);
      setSelectedIds([]);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to update orders');
    }
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === '' ||
      (order.displayId || '').toLowerCase().includes(searchLower) ||
      (order.product?.name || '').toLowerCase().includes(searchLower) ||
      (order.category?.name || '').toLowerCase().includes(searchLower) ||
      (order.customFields &&
        order.customFields.some(
          cf => cf.value && typeof cf.value === 'string' && cf.value.toLowerCase().includes(searchLower)
        ));
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  const handleSearch = (val) => { setSearchTerm(val); setCurrentPage(1); };
  const handleStatusFilter = (val) => { setStatusFilter(val); setCurrentPage(1); };

  // Checkbox helpers
  const pageIds = paginatedOrders.map(o => o._id);
  const allChecked = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
  const toggleAll = () => {
    if (allChecked) setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    else setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
  };
  const toggleOne = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Pagination page list
  const getPaginationPages = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) pages.push(1, 2, 3, 4, '...', totalPages);
      else if (currentPage >= totalPages - 2) pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const navCls = (disabled) => [
    'w-8 h-8 flex items-center justify-center rounded-md border text-sm font-medium transition-all select-none',
    disabled
      ? 'border-[#E9DED3] text-[#C5B8AD] cursor-not-allowed opacity-50'
      : 'border-[#D6C9BC] text-[#7A5C44] hover:bg-[#F5EDE4] hover:border-[#C4A98B] cursor-pointer',
  ].join(' ');

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <p className="text-[13px] md:text-sm font-serif text-white mb-1">
            Dashboard &rsaquo; Bulk Orders &rsaquo; <span className="font-semibold text-[#8B5E3C]">Bulk Orders</span>
          </p>
          <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Bulk Orders Requests</h1>
        </div>
        <button onClick={fetchOrders} disabled={loading} className="admin-secondary-btn flex items-center gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Search & Filter — outside the card */}
      <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A817C]" />
          <input
            type="text"
            placeholder="Search orders, products, or custom fields..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E9DED3] rounded-[10px] text-sm focus:outline-none focus:border-[#9A6031] focus:ring-1 focus:ring-[#9A6031] transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="bg-white border border-[#E9DED3] rounded-[10px] px-4 py-2.5 text-sm text-[#4A403B] font-semibold outline-none focus:border-[#9A6031]"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Selection bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#F8F4EC] border border-[#E6DFD4] rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[#8B5E3C]">{selectedIds.length} selected</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button onClick={() => handleBulkStatus('Approved')} className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Set Active</button>
            <button onClick={() => handleBulkStatus('Rejected')} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Set Inactive</button>
            <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">Delete Selected</button>
            <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-white transition-colors text-gray-500">Clear</button>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-[#6D625C] flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading bulk orders…
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-[#FAF8F5] rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-[#E9DED3]">
                <Package className="w-8 h-8 text-[#C4B9B0]" />
              </div>
              <h3 className="text-[#141225] font-bold">No requests found</h3>
              <p className="text-[#6D625C] text-sm mt-1">There are no bulk order requests matching your criteria.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF4EF] text-[#8B5E3C] text-[14px] uppercase tracking-widest text-center">
                  <th className="py-4 px-2 font-bold border-b border-[#E6DFD4] w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-[#C4B9B0] accent-[#8B5E3C] cursor-pointer mx-auto block"
                    />
                  </th>
                  <th className="py-4 px-2 font-bold border-b border-[#E6DFD4] whitespace-nowrap text-center">Order ID</th>
                  <th className="py-4 px-2 font-bold border-b border-[#E6DFD4] whitespace-nowrap text-center">Date</th>
                  <th className="py-4 px-2 font-bold border-b border-[#E6DFD4] whitespace-nowrap text-center">Selected Product</th>
                  <th className="py-4 px-2 font-bold border-b border-[#E6DFD4] whitespace-nowrap text-center">Custom Fields Preview</th>
                  <th className="py-4 px-2 font-bold border-b border-[#E6DFD4] whitespace-nowrap text-center">Status</th>
                  <th className="py-4 px-2 font-bold border-b border-[#E6DFD4] whitespace-nowrap text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="bg-white transition-colors"
                  >
                    <td className="text-[16px] p-4 border-b border-[#E6DFD4] text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(order._id)}
                        onChange={() => toggleOne(order._id)}
                        className="w-4 h-4 rounded border-[#C4B9B0] accent-[#8B5E3C] cursor-pointer"
                      />
                    </td>
                    <td className="text-[16px] p-4 border-b border-[#E6DFD4] text-center">
                      <p className="text-[16px] font-bold text-[#141225]">
                        {order.displayId}
                      </p>
                    </td>
                    <td className="text-[16px] p-4 border-b border-[#E6DFD4] text-center">
                      <p className="text-[16px] font-semibold text-[#8B5E3C]">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="text-[16px] p-4 border-b border-[#E6DFD4] text-left">
                      {order.product ? (
                        <>
                          <p className="text-[16px] font-bold text-[#4A3326] max-w-[150px] truncate" title={order.product?.name}>
                            {order.product?.name}
                          </p>
                          <p className="text-sm text-[#8A817C]">{order.category?.name || 'N/A'}</p>
                        </>
                      ) : (
                        <span className="text-sm text-[#8A817C]">Not Specified</span>
                      )}
                    </td>
                    <td className="text-[16px] p-4 border-b border-[#E6DFD4] whitespace-normal min-w-[200px] text-left">
                      <div className="space-y-1">
                        {order.customFields &&
                          order.customFields.slice(0, 2).map((cf, idx) => (
                            <p key={idx} className="text-[14px] font-semibold text-[#6D625C] truncate max-w-[250px]">
                              <span className="font-bold text-[#4A403B]">{cf.label}:</span>{' '}
                              {typeof cf.value === 'boolean' ? (cf.value ? 'Yes' : 'No') : cf.value}
                            </p>
                          ))}
                        {order.customFields && order.customFields.length > 2 && (
                          <p className="text-[10px] text-[#9A6031] font-bold">
                            + {order.customFields.length - 2} more fields
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="text-[16px] p-4 border-b border-[#E6DFD4] text-left">
                      <RequestBadge status={order.status || 'Pending'} size={16} />
                      {order.status === 'Rejected' && order.rejectionReason && (
                        <p className="text-[10px] text-red-600 mt-1 max-w-[150px] truncate" title={order.rejectionReason}>
                          {order.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="text-[16px] p-4 border-b border-[#E6DFD4] text-left">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleViewClick(order)}
                          className="text-emerald-600 hover:text-emerald-700 transition-colors flex items-center justify-center"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {(!order.status || order.status === 'Pending') && canEdit && (
                          <>
                            <button
                              onClick={() => handleApprove(order._id)}
                              className="text-emerald-500 hover:text-emerald-700 transition-colors flex items-center justify-center"
                              title="Approve"
                            >
                              <Check className="stroke-[3]" size={16} />
                            </button>
                            <button
                              onClick={() => handleRejectClick(order)}
                              className="text-red-500 hover:text-red-700 transition-colors flex items-center justify-center"
                              title="Reject"
                            >
                              <X className="stroke-[3]" size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center bg-white">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* ── Reject Modal ───────────────────────────────────────────────── */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 md:px-8 border-b border-[#E6DFD4] flex justify-between items-center bg-[#F8F4EC]">
              <h3 className="font-serif font-bold text-[28px] text-[#141225] tracking-tight">Reject Order Request</h3>
              <button onClick={() => setIsRejectModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 md:px-8 py-8 bg-white">
              <p className="text-sm text-[#4A403B] mb-4">
                Please provide a reason for rejecting the bulk order{' '}
                <strong>{rejectingOrder?.displayId}</strong>.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="E.g., Requested quantity cannot be fulfilled currently..."
                className="w-full px-4 py-3 border border-[#E9DED3] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 text-sm resize-none h-24"
              />
              <div className="mt-8 flex gap-3 justify-end">
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="admin-cancel-btn !rounded-full px-6"
                >CANCEL</button>
                <button
                  onClick={confirmReject}
                  className="px-6 py-2 bg-[#d11010] text-white font-bold text-sm rounded-full hover:bg-red-700 transition-colors"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── View Modal ────────────────────────────────────────────────── */}
      {isViewModalOpen && viewingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-[#E9DED3] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[#E9DED3] flex justify-between items-center bg-[#FAF8F5]">
              <h2 className="font-bold text-[#141225] text-lg">Bulk Order Details</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-red-500 hover:text-red-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E9DED3]">
                    <h3 className="text-xs font-bold text-[#8A817C] uppercase tracking-wider mb-3">Order Status</h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-[#6D625C] w-28 inline-block">Order ID:</span>
                        <span className="font-bold text-[#141225]">
                          {viewingOrder.displayId}
                        </span>
                      </p>
                      <p>
                        <span className="text-[#6D625C] w-28 inline-block">Date:</span>
                        <span className="font-bold text-[#141225]">
                          {new Date(viewingOrder.createdAt).toLocaleString()}
                        </span>
                      </p>
                      <p>
                        <span className="text-[#6D625C] w-28 inline-block">Status:</span>
                        <span className="ml-2">
                          <RequestBadge status={viewingOrder.status || 'Pending'} />
                        </span>
                      </p>
                      {viewingOrder.status === 'Rejected' && viewingOrder.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-xs border border-red-100">
                          <strong>Reason:</strong> {viewingOrder.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div className="space-y-4 bg-white p-4 rounded-xl border border-[#E9DED3] shadow-sm">
                  <h3 className="text-xs font-bold text-[#8A817C] uppercase tracking-wider mb-3">Selected Product</h3>
                  {viewingOrder.product ? (
                    <div className="space-y-3">
                      <div className="w-full aspect-video bg-[#FAF8F5] rounded-lg overflow-hidden border border-[#E9DED3] flex items-center justify-center">
                        {(viewingOrder.product.images && viewingOrder.product.images.length > 0) ||
                          viewingOrder.category?.image ||
                          viewingOrder.subCategory?.image ? (
                          <img
                            src={
                              viewingOrder.product.images && viewingOrder.product.images.length > 0
                                ? viewingOrder.product.images[0]?.url || viewingOrder.product.images[0]
                                : viewingOrder.category?.image?.url || viewingOrder.subCategory?.image?.url
                            }
                            alt={viewingOrder.product.name}
                            className="w-full h-full object-contain"
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <Package className="w-10 h-10 text-[#C4B9B0]" />
                        )}
                      </div>

                      <div className="space-y-1 text-sm">
                        <p className="font-bold text-[#141225] text-lg">{viewingOrder.product.name}</p>
                        {viewingOrder.product.sku && (
                          <p className="text-xs text-[#8A817C] font-mono">SKU: {viewingOrder.product.sku}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[#E9DED3]">
                          <span className="px-2 py-1 bg-[#FAF8F5] text-[#6D625C] rounded text-xs border border-[#E9DED3]">
                            Category: {viewingOrder.category?.name || 'Unknown'}
                          </span>
                          <span className="px-2 py-1 bg-[#FAF8F5] text-[#6D625C] rounded text-xs border border-[#E9DED3]">
                            Sub: {viewingOrder.subCategory?.name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 text-center text-[#8A817C]">
                      <p>No product specified.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Fields */}
              {viewingOrder.customFields && viewingOrder.customFields.length > 0 && (
                <div className="mt-6 bg-[#FAF8F5] p-4 rounded-xl border border-[#E9DED3]">
                  <h3 className="text-xs font-bold text-[#8A817C] uppercase tracking-wider mb-4">Additional Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {viewingOrder.customFields.map((field, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-[#E9DED3]">
                        <p className="text-[10px] font-bold text-[#8A817C] uppercase tracking-wider mb-1">{field.label}</p>
                        <p className="text-sm font-semibold text-[#141225]">
                          {typeof field.value === 'boolean' ? (field.value ? 'Yes' : 'No') : field.value || 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-[#E9DED3] bg-[#FAF8F5] flex justify-end">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="admin-btn"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
