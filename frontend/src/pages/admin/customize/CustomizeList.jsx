import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Eye, CheckCircle, XCircle, X, Download, Image as ImageIcon } from 'lucide-react';
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

export default function CustomizeList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

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

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[#8B5E3C]">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E6DFD4] p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#4A3326]">Customize Requests</h2>
        <p className="text-sm text-gray-500 mt-1">Manage user custom order requests</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-[#F8F4EC]">
            <tr>
              <th className="px-6 py-3 rounded-tl-xl">Date</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Image</th>
              <th className="px-6 py-3">Product Name</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 rounded-tr-xl text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req._id} className="border-b border-[#E6DFD4] hover:bg-[#FDFBF7] transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {new Date(req.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 font-medium text-[#4A3326]">
                  {req.customerInfo.fullName}
                  <div className="text-xs text-gray-400 font-normal">{req.customerInfo.email}</div>
                </td>
                <td className="px-6 py-4">
                  {req.images && req.images.length > 0 ? (
                    <div className="flex items-center gap-1 text-[#8B5E3C]">
                      <ImageIcon className="w-4 h-4" />
                      <span className="text-xs font-medium">{req.images.length}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">None</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-700">{getProductName(req.productDetails)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    req.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    req.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openRejectModal(req)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex justify-between items-center">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  selectedRequest.status === 'Approved' ? 'bg-green-100 text-green-800' :
                  selectedRequest.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  Status: {selectedRequest.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Customer Information */}
                <div>
                  <h4 className="font-bold text-[#4A3326] mb-3 border-b border-[#E6DFD4] pb-2">Customer Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500 font-medium">Name:</span> {selectedRequest.customerInfo.fullName}</p>
                    <p><span className="text-gray-500 font-medium">Email:</span> {selectedRequest.customerInfo.email}</p>
                    <p><span className="text-gray-500 font-medium">Phone:</span> {selectedRequest.customerInfo.phone}</p>
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <h4 className="font-bold text-[#4A3326] mb-3 border-b border-[#E6DFD4] pb-2">Shipping Address</h4>
                  <div className="space-y-2 text-sm">
                    <p>{selectedRequest.shippingAddress.address}</p>
                    <p>{selectedRequest.shippingAddress.city}, {selectedRequest.shippingAddress.state} {selectedRequest.shippingAddress.pinCode}</p>
                  </div>
                </div>
              </div>

              {/* Product Details */}
              <div>
                <h4 className="font-bold text-[#4A3326] mb-3 border-b border-[#E6DFD4] pb-2">Product Configuration</h4>
                <div className="bg-[#F8F4EC] p-4 rounded-xl space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    {Array.isArray(selectedRequest.productDetails) ? (
                      selectedRequest.productDetails.map((field, idx) => (
                        <div key={idx}>
                          <span className="text-gray-500 font-medium block text-xs uppercase mb-1">{field.label}</span>
                          <p className="font-medium text-[#4A3326]">
                            {typeof field.value === 'boolean' 
                              ? (field.value ? 'Yes' : 'No') 
                              : (field.value || 'N/A')}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-gray-500 italic">No configuration data</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Reference Images */}
              {selectedRequest.images && selectedRequest.images.length > 0 && (
                <div>
                  <h4 className="font-bold text-[#4A3326] mb-3 border-b border-[#E6DFD4] pb-2 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#8B5E3C]" /> Reference Images
                  </h4>
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {selectedRequest.images.map((img, idx) => (
                      <div key={idx} className="flex-shrink-0 relative group">
                        <img 
                          src={img.url} 
                          alt={`Reference ${idx + 1}`} 
                          className="h-32 w-32 object-cover rounded-xl border border-[#E6DFD4]" 
                        />
                        <a 
                          href={img.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                        >
                          <Eye className="w-6 h-6 text-white" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#E6DFD4] bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              {selectedRequest.status === 'Pending' && (
                <>
                  <button
                    onClick={() => openRejectModal(selectedRequest)}
                    className="px-6 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest._id, 'Approved')}
                    className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-xl font-medium transition-colors"
                  >
                    Approve
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors ml-auto"
              >
                Close
              </button>
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
              <button onClick={() => setRejectModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
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
            <div className="p-4 border-t border-[#E6DFD4] bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(requestToReject._id, 'Rejected', rejectionReason)}
                disabled={!rejectionReason.trim()}
                className="px-5 py-2 bg-[#E30000] text-white hover:bg-[#CC0000] disabled:bg-red-400 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
