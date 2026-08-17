import React, { useState, useEffect } from 'react';
import { RefreshCw, Info } from 'lucide-react';
import { advancedBookingService } from '../../api/advancedBookingService';
import toast from 'react-hot-toast';

export default function UserAdvancedBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await advancedBookingService.getMyBookings();
      setBookings(data);
    } catch (error) {
      toast.error('Failed to load your advanced bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const getOrderStatusStyle = (status) => {
    switch (status) {
      case 'Placed': return 'bg-blue-50 text-blue-600';
      case 'Packed': return 'bg-orange-50 text-orange-600';
      case 'Shipping': return 'bg-purple-50 text-purple-600';
      case 'Out of Delivery': return 'bg-yellow-50 text-yellow-600';
      case 'Delivered': return 'bg-green-50 text-green-600';
      case 'Cancelled': return 'bg-red-50 text-red-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const getBookingStatusStyle = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold font-serif text-[#141225]">My Advanced Bookings</h2>
        <button onClick={fetchBookings} className="flex items-center gap-2 text-sm text-[#8B5E3C] hover:text-[#724a2d] transition-colors font-semibold">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E9DED3] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF8F5] border-b border-[#E9DED3]">
              <tr>
                <th className="px-4 py-3 font-bold text-[#8A817C] uppercase tracking-wider text-[11px]">Date</th>
                <th className="px-4 py-3 font-bold text-[#8A817C] uppercase tracking-wider text-[11px]">Product</th>
                <th className="px-4 py-3 font-bold text-[#8A817C] uppercase tracking-wider text-[11px] text-center">Qty</th>
                <th className="px-4 py-3 font-bold text-[#8A817C] uppercase tracking-wider text-[11px]">Payment Details</th>
                <th className="px-4 py-3 font-bold text-[#8A817C] uppercase tracking-wider text-[11px] text-center">Expected Date</th>
                <th className="px-4 py-3 font-bold text-[#8A817C] uppercase tracking-wider text-[11px] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE2]">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-12 text-[#8A817C]">Loading bookings...</td></tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <p className="text-[#8A817C] mb-2">You haven't made any advanced bookings yet.</p>
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-[#FDF9F5] transition-colors">
                    <td className="px-4 py-4 align-top text-[#6D625C] whitespace-nowrap">
                      {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-start gap-3 min-w-[200px]">
                        {booking.productImage && typeof booking.productImage === 'string' && (
                          <div className="w-12 h-12 rounded-lg bg-[#F3E7D7] overflow-hidden shrink-0 border border-[#E6DFD4]">
                            <img src={booking.productImage.startsWith('http') ? booking.productImage : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${booking.productImage.startsWith('/') ? '' : '/'}${booking.productImage}`} alt={booking.productName} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-[#141225] line-clamp-2">{booking.productName}</p>
                          {Object.keys(booking.variants || {}).length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {Object.entries(booking.variants).map(([k,v]) => (
                                <span key={k} className="text-[10px] bg-[#FAF8F5] border border-[#E9DED3] text-[#6D625C] px-1.5 py-0.5 rounded">
                                  {k}: {v}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-center font-bold text-[#141225]">
                      {booking.quantity}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="text-sm font-semibold text-[#141225]">Total: ₹{booking.totalAmount}</div>
                      <div className="text-xs text-gray-500 mt-1">Paid: <span className="text-green-600 font-medium">₹{booking.paidAmount || 0}</span></div>
                      <div className="text-xs text-gray-500">Balance: <span className="text-red-600 font-medium">₹{booking.balanceAmount || booking.totalAmount}</span></div>
                    </td>
                    <td className="px-4 py-4 align-top text-center text-[#6D625C] font-medium whitespace-nowrap">
                      {booking.expectedDate ? new Date(booking.expectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending'}
                    </td>
                    <td className="px-4 py-4 align-top text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${getBookingStatusStyle(booking.bookingStatus)}`}>
                          Req: {booking.bookingStatus}
                        </span>
                        {booking.bookingStatus === 'Approved' && (
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${getOrderStatusStyle(booking.orderStatus)}`}>
                            {booking.orderStatus}
                          </span>
                        )}
                      </div>
                      
                      {booking.bookingStatus === 'Rejected' && booking.reason && (
                         <div className="mt-2 text-[10px] bg-red-50 text-red-600 p-1.5 rounded text-left flex items-start gap-1">
                           <Info size={12} className="shrink-0 mt-0.5"/> <span>{booking.reason}</span>
                         </div>
                      )}
                      
                      {booking.orderStatus === 'Shipping' && booking.shippingDetails?.trackingUrl && (
                         <a href={booking.shippingDetails.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[10px] text-blue-500 hover:underline">
                           Track Order
                         </a>
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
