import React, { useState, useEffect } from 'react';
import { Package, Search, CheckCircle2, XCircle, Clock, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BulkOrdersAdminPage({ canEdit = true }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/bulk-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (err) {
      toast.error('Failed to load bulk orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/bulk-orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Approved' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Bulk order approved');
        fetchOrders();
      }
    } catch (err) {
      toast.error('Failed to approve order');
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
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/bulk-orders/${rejectingOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Rejected', rejectionReason })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Bulk order rejected');
        fetchOrders();
        setIsRejectModalOpen(false);
        setRejectingOrder(null);
      }
    } catch (err) {
      toast.error('Failed to reject order');
    }
  };

  const handleViewClick = (order) => {
    setViewingOrder(order);
    setIsViewModalOpen(true);
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || (order.customFields && order.customFields.some(cf => 
      cf.value && typeof cf.value === 'string' && cf.value.toLowerCase().includes(searchLower)
    ));
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 overflow-auto bg-[#FAF8F5]">
      <div className="px-8 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#141225]">Bulk Orders Requests</h1>
            <p className="mt-1 text-sm text-[#6D625C]">Review and manage corporate and wholesale orders.</p>
          </div>
        </div>

        <div className="rounded-[20px] bg-white border border-[#E9DED3] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col sm:flex-row gap-4 p-5 border-b border-[#E9DED3]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A817C]" />
              <input
                type="text"
                placeholder="Search custom fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#FAF8F5] border border-[#E9DED3] rounded-[10px] text-sm focus:outline-none focus:border-[#9A6031] focus:ring-1 focus:ring-[#9A6031] transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#FAF8F5] border border-[#E9DED3] rounded-[10px] px-4 py-2 text-sm text-[#4A403B] font-semibold outline-none focus:border-[#9A6031]"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-[#6D625C]">Loading...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-[#FAF8F5] rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-[#E9DED3]">
                  <Package className="w-8 h-8 text-[#C4B9B0]" />
                </div>
                <h3 className="text-[#141225] font-bold">No requests found</h3>
                <p className="text-[#6D625C] text-sm mt-1">There are no bulk order requests matching your criteria.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#FAF8F5] text-xs font-bold uppercase tracking-wider text-[#6D625C] border-b border-[#E9DED3]">
                  <tr>
                    <th className="px-6 py-4">Date & ID</th>
                    <th className="px-6 py-4">Selected Product</th>
                    <th className="px-6 py-4">Custom Fields Preview</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9DED3]">
                  {filteredOrders.map(order => (
                    <tr key={order._id} className="hover:bg-[#FAF8F5]/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#141225]">Order #{order._id.substring(order._id.length - 6).toUpperCase()}</p>
                        <p className="text-xs text-[#6D625C] mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        {order.product ? (
                          <>
                            <p className="font-bold text-[#4A3326] max-w-[150px] truncate" title={order.product?.name}>{order.product?.name}</p>
                            <p className="text-xs text-[#8A817C]">{order.category?.name || 'N/A'}</p>
                          </>
                        ) : (
                          <span className="text-xs text-[#8A817C]">Not Specified</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-normal min-w-[200px]">
                        <div className="space-y-1">
                          {order.customFields && order.customFields.slice(0, 2).map((cf, idx) => (
                            <p key={idx} className="text-xs text-[#6D625C] truncate max-w-[250px]">
                              <span className="font-semibold">{cf.label}:</span> {typeof cf.value === 'boolean' ? (cf.value ? 'Yes' : 'No') : cf.value}
                            </p>
                          ))}
                          {order.customFields && order.customFields.length > 2 && (
                            <p className="text-[10px] text-[#9A6031] font-bold">+ {order.customFields.length - 2} more fields</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {order.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                          {order.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                          {order.status === 'Pending' && <Clock className="w-3 h-3" />}
                          {order.status || 'Pending'}
                        </span>
                        {order.status === 'Rejected' && order.rejectionReason && (
                          <p className="text-[10px] text-red-600 mt-1 max-w-[150px] mx-auto truncate" title={order.rejectionReason}>{order.rejectionReason}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewClick(order)}
                            className="p-1.5 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(!order.status || order.status === 'Pending') && canEdit && (
                            <>
                              <button
                                onClick={() => handleApprove(order._id)}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 rounded font-bold text-xs transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectClick(order)}
                                className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded font-bold text-xs transition-colors"
                              >
                                Reject
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
        </div>
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] border border-[#E9DED3] overflow-hidden">
            <div className="p-5 border-b border-[#E9DED3] flex justify-between items-center bg-[#FAF8F5]">
              <h2 className="font-bold text-[#141225]">Reject Order Request</h2>
              <button onClick={() => setIsRejectModalOpen(false)} className="text-[#8A817C] hover:text-[#141225]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-[#4A403B] mb-4">Please provide a reason for rejecting the bulk order <strong>#{rejectingOrder?._id.substring(rejectingOrder._id.length - 6).toUpperCase()}</strong>.</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="E.g., Requested quantity cannot be fulfilled currently..."
                className="w-full px-4 py-3 border border-[#E9DED3] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 text-sm resize-none h-24"
              />
              <div className="mt-5 flex gap-3 justify-end">
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 border border-[#E9DED3] text-[#6D625C] font-bold text-sm rounded-lg hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  className="px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-lg hover:bg-red-700"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && viewingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-[#E9DED3] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[#E9DED3] flex justify-between items-center bg-[#FAF8F5]">
              <h2 className="font-bold text-[#141225] text-lg">Bulk Order Details</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-[#8A817C] hover:text-[#141225]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E9DED3]">
                    <h3 className="text-xs font-bold text-[#8A817C] uppercase tracking-wider mb-3">Order Status</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-[#6D625C] w-28 inline-block">Order ID:</span> <span className="font-bold text-[#141225]">#{viewingOrder._id.substring(viewingOrder._id.length - 6).toUpperCase()}</span></p>
                      <p><span className="text-[#6D625C] w-28 inline-block">Date:</span> <span className="font-bold text-[#141225]">{new Date(viewingOrder.createdAt).toLocaleString()}</span></p>
                      <p><span className="text-[#6D625C] w-28 inline-block">Status:</span> 
                        <span className={`ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          viewingOrder.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                          viewingOrder.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {viewingOrder.status || 'Pending'}
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
                        {(viewingOrder.product.images && viewingOrder.product.images.length > 0) || viewingOrder.category?.image || viewingOrder.subCategory?.image ? (
                          <img 
                            src={
                              (viewingOrder.product.images && viewingOrder.product.images.length > 0)
                                ? (viewingOrder.product.images[0]?.url || viewingOrder.product.images[0])
                                : (viewingOrder.category?.image?.url || viewingOrder.subCategory?.image?.url)
                            } 
                            alt={viewingOrder.product.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Package className="w-10 h-10 text-[#C4B9B0]" />
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <p className="font-bold text-[#141225] text-lg">{viewingOrder.product.name}</p>
                        {viewingOrder.product.sku && <p className="text-xs text-[#8A817C] font-mono">SKU: {viewingOrder.product.sku}</p>}
                        
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
              {/* Removed Customization Details */}

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
                className="px-6 py-2 bg-white border border-[#E9DED3] text-[#141225] font-bold text-sm rounded-lg hover:bg-gray-50 transition-colors"
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
