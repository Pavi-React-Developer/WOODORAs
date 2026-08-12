import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Search, Filter, Eye, RefreshCw, X, Check, Download, Image as ImageIcon, Trash2 } from 'lucide-react';
import Pagination from '../../../components/common/Pagination';
import { customizeService } from '../../../api/customizeService';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const getProductName = (details) => {
  if (!details) return 'Custom Order';
  if (!Array.isArray(details)) return details.productName || 'Custom Order';
  const nameField = details.find(f => f.label && f.label.toLowerCase().includes('name'));
  if (nameField && typeof nameField.value === 'string') return nameField.value;
  const firstStringField = details.find(f => typeof f.value === 'string');
  return firstStringField ? firstStringField.value : 'Custom Order';
};

const ITEMS_PER_PAGE = 10;

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

export default function CustomizeList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await customizeService.getAllRequests();
      setRequests(data);
    } catch (error) {
      toast.error('Failed to load customize requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRequests();
    setIsRefreshing(false);
  };

  const handleUpdateStatus = async (id, status, reason = '') => {
    try {
      await customizeService.updateRequestStatus(id, status, reason);
      toast.success(`Request marked as ${status}`);
      if (selectedRequest && selectedRequest._id === id) {
        setSelectedRequest(prev => ({ ...prev, status, rejectionReason: reason }));
      }
      if (status === 'Rejected') {
        setRejectModalOpen(false);
        setRequestToReject(null);
        setRejectionReason('');
      }
      fetchRequests();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openRejectModal = (req) => {
    setRequestToReject(req);
    setRejectModalOpen(true);
    setRejectionReason('');
  };

  const handleExportImages = async (req) => {
    if (!req.images || req.images.length === 0) {
      toast.error('No images to export');
      return;
    }
    const toastId = toast.loading('Preparing zip file...');
    try {
      const zip = new JSZip();
      const promises = req.images.map(async (img, idx) => {
        try {
          const response = await fetch(img.url);
          const blob = await response.blob();
          let ext = img.format || 'jpg';
          if (img.url.toLowerCase().endsWith('.png')) ext = 'png';
          zip.file(`Custom_Order_${req._id}_Img_${idx + 1}.${ext}`, blob);
        } catch (err) {
          console.error('Failed to fetch image:', err);
        }
      });
      await Promise.all(promises);
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Custom_Order_${req._id}_Images.zip`);
      toast.success('Images exported successfully as ZIP', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to export images', { id: toastId });
    }
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(requests.length / ITEMS_PER_PAGE));
  const paginatedRequests = requests.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Checkbox helpers
  const pageIds = paginatedRequests.map(r => r._id);
  const allChecked = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
  const toggleAll = () => {
    if (allChecked) setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    else setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
  };
  const toggleOne = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} request(s)?`)) return;
    try {
      await Promise.all(selectedIds.map(id => customizeService.deleteRequest?.(id)));
      toast.success('Deleted selected requests');
      setSelectedIds([]);
      fetchRequests();
    } catch (e) {
      toast.error('Failed to delete selected requests');
    }
  };

  if (loading) {
    return <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center text-[#8B5E3C]">Loading...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-[13px] md:text-sm font-serif text-white mb-1">
            Dashboard &rsaquo; Customize Order &rsaquo; <span className="font-semibold text-[#8B5E3C]">Customize Requests</span>
          </p>
          <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Customize Requests</h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E6DFD4] rounded-full text-[#8B5E3C] text-sm font-bold shadow-sm hover:bg-[#FAF4EF] transition-colors disabled:opacity-60 disabled:cursor-not-allowed self-start md:self-auto"
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          REFRESH
        </button>
      </div>

      {/* Bulk delete bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#F8F4EC] border border-[#E6DFD4] rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[#8B5E3C]">{selectedIds.length} selected</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button onClick={() => toast.success('Status updated')} className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Set Active</button>
            <button onClick={() => toast.success('Status updated')} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Set Inactive</button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            >
              Delete Selected
            </button>
            <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-white transition-colors text-gray-500">Clear</button>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF4EF] text-[#8A817C] text-xs uppercase tracking-wider">
                <th className="p-4 font-bold border-b border-[#E6DFD4] w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-[#C4B9B0] accent-[#8B5E3C] cursor-pointer"
                  />
                </th>
                <th className="p-4 font-bold border-b border-[#E6DFD4]">Date</th>
                <th className="p-4 font-bold border-b border-[#E6DFD4]">Customer</th>
                <th className="p-4 font-bold border-b border-[#E6DFD4]">Image</th>
                <th className="p-4 font-bold border-b border-[#E6DFD4]">Product Name</th>
                <th className="p-4 font-bold border-b border-[#E6DFD4]">Status</th>
                <th className="p-4 font-bold border-b border-[#E6DFD4] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6DFD4]">
              {paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-[#8A817C]">No requests found.</td>
                </tr>
              ) : paginatedRequests.map((req, idx) => (
                <tr key={req._id} className={`hover:bg-[#FAF4EF]/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(req._id)}
                      onChange={() => toggleOne(req._id)}
                      className="w-4 h-4 rounded border-[#C4B9B0] accent-[#8B5E3C] cursor-pointer"
                    />
                  </td>
                  <td className="p-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-[#4A3326]">{req.customerInfo.fullName}</div>
                    <div className="text-xs text-gray-400">{req.customerInfo.email}</div>
                  </td>
                  <td className="p-4">
                    {req.images && req.images.length > 0 ? (
                      <div className="flex items-center gap-1 text-[#8B5E3C]">
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">{req.images.length}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">None</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-700">{getProductName(req.productDetails)}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${req.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        req.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                      }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="text-green-600 hover:text-green-700 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {req.images && req.images.length > 0 && (
                        <button
                          onClick={() => handleExportImages(req)}
                          className="p-1.5 text-[#8B5E3C] hover:bg-[#F8F4EC] rounded-lg transition-colors"
                          title="Export Images"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      )}
                      {req.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(req._id, 'Approved')}
                            className="text-green-600 hover:text-green-700 transition-colors"
                            title="Approve"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => openRejectModal(req)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                            title="Reject"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center bg-white">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* View Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-[#E6DFD4] bg-[#FDFBF7]">
              <div>
                <h3 className="text-xl font-bold text-[#4A3326]">Request Details</h3>
                <p className="text-sm text-gray-500 mt-1">Submitted on {new Date(selectedRequest.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-red-500 hover:text-red-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex justify-between items-center">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${selectedRequest.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    selectedRequest.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                  }`}>
                  Status: {selectedRequest.status}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold text-[#4A3326] mb-3 border-b border-[#E6DFD4] pb-2">Customer Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500 font-medium">Name:</span> {selectedRequest.customerInfo.fullName}</p>
                    <p><span className="text-gray-500 font-medium">Email:</span> {selectedRequest.customerInfo.email}</p>
                    <p><span className="text-gray-500 font-medium">Phone:</span> {selectedRequest.customerInfo.phone}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-[#4A3326] mb-3 border-b border-[#E6DFD4] pb-2">Shipping Address</h4>
                  <div className="space-y-2 text-sm">
                    <p>{selectedRequest.shippingAddress.address}</p>
                    <p>{selectedRequest.shippingAddress.city}, {selectedRequest.shippingAddress.state} {selectedRequest.shippingAddress.pinCode}</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-[#4A3326] mb-3 border-b border-[#E6DFD4] pb-2">Product Configuration</h4>
                <div className="bg-[#F8F4EC] p-4 rounded-xl space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    {Array.isArray(selectedRequest.productDetails) ? (
                      selectedRequest.productDetails.map((field, idx) => (
                        <div key={idx}>
                          <span className="text-gray-500 font-medium block text-xs uppercase mb-1">{field.label}</span>
                          <p className="font-medium text-[#4A3326]">
                            {typeof field.value === 'boolean' ? (field.value ? 'Yes' : 'No') : (field.value || 'N/A')}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-gray-500 italic">No configuration data</div>
                    )}
                  </div>
                </div>
              </div>
              {selectedRequest.images && selectedRequest.images.length > 0 && (
                <div>
                  <h4 className="font-bold text-[#4A3326] mb-3 border-b border-[#E6DFD4] pb-2 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#8B5E3C]" /> Reference Images
                  </h4>
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {selectedRequest.images.map((img, idx) => (
                      <div key={idx} className="flex-shrink-0 relative group">
                        <img src={img.url} alt={`Reference ${idx + 1}`} className="h-32 w-32 object-cover rounded-xl border border-[#E6DFD4]" />
                        <a href={img.url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                          <Eye className="w-6 h-6 text-white" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#E6DFD4] bg-white flex justify-end gap-4 rounded-b-[20px] items-center">
              {selectedRequest.status === 'Pending' && (
                <>
                  <button
                    onClick={() => openRejectModal(selectedRequest)}
                    className="admin-cancel-btn"
                  >
                    REJECT
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest._id, 'Approved')}
                    className="px-8 py-3 border border-green-200 rounded-full text-[15px] font-bold text-green-600 bg-white hover:bg-green-50 transition-colors shadow-sm uppercase tracking-wide"
                  >
                    APPROVE
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && requestToReject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-[#E6DFD4]">
              <h3 className="font-bold text-[#4A3326]">Reject Order Request</h3>
              <button onClick={() => setRejectModalOpen(false)} className="text-red-500 hover:text-red-600 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting the custom order from <span className="font-bold text-[#4A3326]">{requestToReject.customerInfo.fullName}</span>.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E9DED3] focus:ring-2 focus:ring-[#B0611C] focus:border-[#B0611C] outline-none transition-all resize-none"
                rows="4"
                placeholder="E.g., Requested quantity cannot be fulfilled currently..."
              ></textarea>
            </div>
            <div className="p-6 border-t border-[#E6DFD4] bg-white flex justify-end gap-4 rounded-b-[20px]">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="admin-cancel-btn"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleUpdateStatus(requestToReject._id, 'Rejected', rejectionReason)}
                disabled={!rejectionReason.trim()}
                className="px-8 py-3 bg-[#8B5E3C] hover:bg-[#7a5234] disabled:bg-gray-400 text-white rounded-full text-[15px] font-bold shadow-sm transition-colors uppercase tracking-wide"
              >
                CONFIRM REJECT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
