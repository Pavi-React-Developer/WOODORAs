import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Eye, X } from 'lucide-react';
import { advancedBookingService } from '../../../api/advancedBookingService';
import toast from 'react-hot-toast';
import BulkActions from '../../../components/admin/BulkActions';

export default function AdvancedBookingManagement() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [viewBooking, setViewBooking] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await advancedBookingService.getAllBookings();
      setBookings(data);
    } catch (error) {
      toast.error('Failed to load advanced bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await advancedBookingService.updateBookingStatus(id, newStatus);
      toast.success('Status updated successfully');
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: newStatus } : b));
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedBookings.length} booking(s)?`)) return;
    try {
      await Promise.all(selectedBookings.map(id => advancedBookingService.deleteBooking(id)));
      toast.success('Bookings deleted successfully');
      setBookings(prev => prev.filter(b => !selectedBookings.includes(b._id)));
      setSelectedBookings([]);
    } catch (error) {
      toast.error('Failed to delete some bookings');
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch =
      b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.phoneNo.includes(searchTerm) ||
      b.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = ['Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Placed': return 'bg-blue-50 text-blue-600';
      case 'Packed': return 'bg-orange-50 text-orange-600';
      case 'Shipped': return 'bg-purple-50 text-purple-600';
      case 'Out for Delivery': return 'bg-yellow-50 text-yellow-600';
      case 'Delivered': return 'bg-green-50 text-green-600';
      case 'Cancelled': return 'bg-red-50 text-red-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const getCustomerBookingCount = (customerName, phoneNo) => {
    return bookings.filter(b => b.customerName === customerName && b.phoneNo === phoneNo).length;
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-[13px] md:text-sm font-serif text-white mb-1">
            Dashboard &rsaquo; <span className="font-semibold text-[#8B5E3C]">Advanced Bookings</span>
          </p>
          <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Advanced Bookings</h1>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-2 rounded-[20px] shadow-sm border border-[#E6DFD4] mb-6 flex flex-col sm:flex-row gap-2 justify-between items-center">
        <div className="relative w-full flex-1">
          <input
            type="text"
            placeholder="Search by name, phone or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2 bg-transparent focus:outline-none text-sm text-[#141225] placeholder-gray-400"
          />
          <Search className="absolute left-5 top-2.5 text-gray-400" size={16} />
        </div>
        <div className="flex items-center gap-3 pr-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-[#E9DED3] rounded-full px-5 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#8B5E3C] cursor-pointer"
          >
            <option value="All">All Statuses</option>
            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <button
            onClick={fetchBookings}
            className="p-2.5 bg-white border border-[#E6DFD4] rounded-full hover:bg-gray-50 transition-colors text-gray-600 shadow-sm"
            title="Refresh Bookings"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      <BulkActions
        selectedIds={selectedBookings}
        onBulkDelete={handleBulkDelete}
        onBulkStatusChange={(isActive) => toast.error('Advanced bookings do not support active/inactive status.')}
        onClear={() => setSelectedBookings([])}
      />

      {/* Table */}
      <div className="bg-white rounded-[20px] border border-[#E6DFD4] shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F4EC] border-b border-[#E6DFD4]">
              <tr>
                <th className="px-5 py-4 text-left w-12">
                  <input
                    type="checkbox"
                    checked={filteredBookings.length > 0 && selectedBookings.length === filteredBookings.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedBookings(filteredBookings.map(b => b._id));
                      else setSelectedBookings([]);
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-[#8B5E3C] focus:ring-[#8B5E3C] cursor-pointer"
                  />
                </th>
                <th className="px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Date</th>
                <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Customer Info</th>
                <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Product Details</th>
                <th className="px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Qty</th>
                <th className="px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Status</th>
                <th className="px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9DED3] text-sm text-[#141225]">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-12 text-[#8A817C]">Loading bookings...</td></tr>
              ) : filteredBookings.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-12 text-[#8A817C]">No advanced bookings found.</td></tr>
              ) : (
                filteredBookings.map((booking, idx) => {
                  const requestCount = getCustomerBookingCount(booking.customerName, booking.phoneNo);
                  return (
                    <tr key={booking._id} className="transition-colors hover:bg-[#FDF9F5] bg-white">
                      <td className="px-5 py-5 text-left align-middle">
                        <input
                          type="checkbox"
                          checked={selectedBookings.includes(booking._id)}
                          onChange={() => {
                            setSelectedBookings(prev =>
                              prev.includes(booking._id) ? prev.filter(id => id !== booking._id) : [...prev, booking._id]
                            );
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-[#8B5E3C] focus:ring-[#8B5E3C] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-5 text-center text-[13px] font-semibold text-gray-600 align-middle whitespace-nowrap">
                        {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-5 text-left align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#8B5E3C] flex items-center justify-center text-white font-serif text-[16px] font-bold shrink-0">
                            {booking.customerName ? booking.customerName.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div className="font-bold text-[14px] text-[#141225]">{booking.customerName}</div>
                            <div className="text-[12px] text-gray-500 mb-1">{booking.phoneNo}</div>
                            {requestCount > 1 && (
                              <span className="inline-flex items-center justify-center bg-[#8B5E3C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {requestCount} Requests
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-left align-middle">
                        <div className="flex items-center gap-4">
                          {booking.productImage && typeof booking.productImage === 'string' && (
                            <img
                              src={booking.productImage.startsWith('http') ? booking.productImage : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${booking.productImage.startsWith('/') ? '' : '/'}${booking.productImage}`}
                              alt={booking.productName}
                              className="w-[45px] h-[45px] object-cover rounded-[8px] border border-[#E6DFD4] shrink-0"
                            />
                          )}
                          <div>
                            <div className="font-bold text-[14px] text-[#141225] mb-1.5">{booking.productName}</div>
                            {Object.keys(booking.variants || {}).length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(booking.variants).map(([k, v]) => (
                                  <span key={k} className="bg-[#F8F4EC] text-[#8A817C] px-2 py-1 rounded-[6px] text-[13px] font-medium border border-[#E9DED3]">
                                    {k}: {v}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 font-bold text-[15px] text-center align-middle">{booking.quantity}</td>
                      <td className="px-4 py-5 text-center align-middle">
                        <span className={`inline-block px-3 py-1 rounded text-[10px] font-bold ${getStatusStyle(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-center align-middle">
                        <div className="flex items-center justify-center gap-3">
                          <div className="relative inline-flex items-center rounded-full border border-[#E6DFD4] bg-white shadow-sm">
                            <select
                              value={booking.status}
                              onChange={(e) => handleStatusChange(booking._id, e.target.value)}
                              className="appearance-none bg-transparent pl-4 pr-8 py-2 text-xs font-semibold text-[#141225] rounded-full focus:outline-none w-full cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                              {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <span className="pointer-events-none absolute right-3 text-gray-500 text-[10px]">▾</span>
                          </div>
                          <button
                            onClick={() => setViewBooking(booking)}
                            className="text-[#25D366] hover:text-[#1da851] transition-colors p-2 hover:bg-[#E8F8EE] rounded-full shrink-0"
                            title="View Details"
                          >
                            <Eye size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Booking Modal (Styled exactly like 3rd image) */}
      {viewBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#FAF8F5] rounded-[24px] shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 bg-white border-b border-[#E6DFD4] shrink-0">
              <h2 className="text-[22px] font-serif font-bold text-[#141225]">Booking Details</h2>
              <button onClick={() => setViewBooking(null)} className="p-1 transition-colors text-gray-500 hover:text-red-900">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 bg-[#FAF8F5] overflow-y-auto flex-1">
              {/* Customer Info Box */}
              <div className="bg-white border border-[#E6DFD4] rounded-2xl p-6">
                <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-5">CUSTOMER INFORMATION</h3>
                <div className="grid grid-cols-2 gap-8 text-[15px]">
                  <div>
                    <p className="text-gray-500 mb-1">Name</p>
                    <p className="font-bold text-[#141225]">{viewBooking.customerName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Phone Number</p>
                    <p className="font-bold text-[#141225]">{viewBooking.phoneNo}</p>
                  </div>
                </div>
              </div>

              {/* Product Details Box */}
              <div className="bg-white border border-[#E6DFD4] rounded-2xl p-6">
                <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-5">PRODUCT DETAILS</h3>
                <div className="flex gap-6 mb-6">
                  {viewBooking.productImage && typeof viewBooking.productImage === 'string' && (
                    <img
                      src={viewBooking.productImage.startsWith('http') ? viewBooking.productImage : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${viewBooking.productImage.startsWith('/') ? '' : '/'}${viewBooking.productImage}`}
                      alt={viewBooking.productName}
                      className="w-[90px] h-[90px] object-cover rounded-[12px] border border-[#E6DFD4] shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-[16px] text-[#141225] mb-3">{viewBooking.productName}</p>
                    <div className="flex items-center gap-8 text-[15px]">
                      <div>
                        <span className="text-gray-500 mr-1">Category:</span> <span className="font-medium text-[#141225]">{viewBooking.category}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 mr-1">Quantity:</span> <span className="font-medium text-[#141225]">{viewBooking.quantity}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-[15px]">
                      <span className="text-gray-500 mr-1">Price:</span> <span className="font-medium text-[#141225]">₹{viewBooking.price}</span>
                    </div>
                  </div>
                </div>

                {Object.keys(viewBooking.variants || {}).length > 0 && (
                  <div className="pt-6 border-t border-[#E6DFD4]">
                    <p className="text-[13px] text-gray-500 mb-3">Selected Variants:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(viewBooking.variants).map(([k, v]) => (
                        <div key={k} className="bg-[#F8F4EC] px-4 py-2 rounded-xl border border-[#E9DED3] text-[14px]">
                          <span className="font-semibold text-gray-500 mr-1">{k}:</span>
                          <span className="font-bold text-[#141225]">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-[#FAF8F5] flex justify-end shrink-0">
              <button
                onClick={() => setViewBooking(null)}
                className="px-8 py-3 border border-red-200 rounded-full text-[15px] font-bold text-red-600 bg-white hover:bg-red-50 transition-colors shadow-sm uppercase tracking-wide"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
