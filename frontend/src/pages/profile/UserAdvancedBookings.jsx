import React, { useState, useEffect } from 'react';
import { RefreshCw, Info, CalendarDays, Truck, Package, Tag, Eye, X, Search } from 'lucide-react';
import { advancedBookingService } from '../../api/advancedBookingService';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const parseScreenshots = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  try {
    return JSON.parse(data);
  } catch {
    return [data];
  }
};

export default function UserAdvancedBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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
    
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const filteredBookings = bookings.filter((b) => 
    b.productName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (b.bookingStatus && b.bookingStatus.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const itemsPerPage = isMobile ? 5 : 10;
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;
  const paginatedBookings = filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (selectedBooking) {
    return (
      <section className="animate-fade-in px-5 py-7 lg:px-7">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#141225]">Advanced Booking Details</h2>
            <p className="mt-1 text-sm text-[#6D625C]">{selectedBooking.productName}</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setSelectedBooking(null)}
              className="flex-1 sm:flex-none rounded-[8px] border border-[#E9DED3] px-4 py-2 text-sm font-bold text-[#141225] hover:bg-gray-50 transition-colors"
            >
              Back to Bookings
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6 md:block md:space-y-6">
          <div className="order-1 rounded-[14px] border border-[#E9DED3] bg-white p-5">
            <h3 className="font-bold text-[#141225] mb-4">Product Details</h3>
            <div className="divide-y divide-[#E9DED3]">
              <div className="py-4 flex flex-col gap-2 border-b border-[#E9DED3] last:border-0">
                <div className="flex flex-row gap-4 items-center">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[8px] bg-[#F8F3EF]">
                    {selectedBooking.productImage ? (
                      <img src={selectedBooking.productImage.startsWith('http') ? selectedBooking.productImage : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${selectedBooking.productImage.startsWith('/') ? '' : '/'}${selectedBooking.productImage}`} alt={selectedBooking.productName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center"><Package className="w-8 h-8 text-gray-400" /></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#141225]">{selectedBooking.productName}</p>
                    <p className="text-sm text-[#6D625C] mt-1">
                      Qty: {selectedBooking.quantity} | Total: ₹{selectedBooking.totalAmount}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${getBookingStatusStyle(selectedBooking.bookingStatus)}`}>
                        Req: {selectedBooking.bookingStatus}
                      </span>
                      {selectedBooking.bookingStatus === 'Approved' && (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${getOrderStatusStyle(selectedBooking.orderStatus)}`}>
                          {selectedBooking.orderStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {Object.keys(selectedBooking.variants || {}).length > 0 && (
                  <div className="w-full mt-2 bg-[#FAF4EF] p-4 rounded-sm border border-[#E9DED3]">
                    <h4 className="text-[11px] font-bold text-[#141225] uppercase tracking-widest mb-3">SELECTED VARIANTS</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        {Object.entries(selectedBooking.variants).map(([k, v]) => (
                          <p key={k} className="text-sm"><span className="font-bold text-[#6D625C]">{k}:</span> {v}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="order-2 rounded-[14px] border border-[#E9DED3] bg-white p-5">
            <h3 className="font-bold text-[#141225] mb-4">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-semibold text-gray-900">₹{Number(selectedBooking.totalAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              
              {selectedBooking.paidAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Paid Amount</span>
                  <span>-₹{Number(selectedBooking.paidAmount).toLocaleString('en-IN')}</span>
                </div>
              )}
              
              {selectedBooking.balanceAmount > 0 && (
                <div className="flex justify-between border-t pt-3 mt-1 font-bold text-red-600">
                  <span>Balance Due</span>
                  <span>₹{Number(selectedBooking.balanceAmount).toLocaleString('en-IN')}</span>
                </div>
              )}
              
              {selectedBooking.balanceAmount === 0 && selectedBooking.paidAmount > 0 && (
                <div className="flex justify-between border-t pt-3 mt-1 font-bold text-emerald-700">
                  <span>Status</span>
                  <span>Fully Paid ✓</span>
                </div>
              )}
            </div>
            
            {selectedBooking.paymentScreenshot && parseScreenshots(selectedBooking.paymentScreenshot).length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#E9DED3]">
                <p className="text-sm font-bold text-[#6D625C] mb-3">Payment Screenshots</p>
                <div className="flex flex-wrap gap-4">
                  {parseScreenshots(selectedBooking.paymentScreenshot).map((url, idx) => (
                    <a key={idx} href={url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${url.startsWith('/') ? '' : '/'}${url}`} target="_blank" rel="noreferrer" className="block border border-[#E9DED3] rounded-[8px] overflow-hidden bg-[#F8F3EF] hover:opacity-90 transition-opacity">
                      <img src={url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${url.startsWith('/') ? '' : '/'}${url}`} alt="Payment Screenshot" className="h-24 w-auto object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="order-3 rounded-[14px] border border-[#E9DED3] bg-white p-5">
            <h3 className="font-bold text-[#141225] mb-3">Timeline & Tracking</h3>
            <div className="text-sm text-[#6D625C] space-y-3">
               <div className="flex justify-between items-center pb-2 border-b border-[#E9DED3]">
                  <p className="font-bold text-[#6D625C]">Booking Date:</p>
                  <p className="font-semibold text-[#141225]">{new Date(selectedBooking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
               </div>
               <div className="flex justify-between items-center">
                  <p className="font-bold text-[#6D625C]">Expected Delivery:</p>
                  <p className="font-semibold text-[#141225]">{selectedBooking.expectedDate ? new Date(selectedBooking.expectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending'}</p>
               </div>

               {selectedBooking.shippingDetails?.trackingUrl && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#E9DED3]">
                    <p className="font-bold text-[#6D625C]">Tracking Link:</p>
                    <a href={selectedBooking.shippingDetails.trackingUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#D04E26] hover:underline flex items-center gap-1">
                      Track Shipment <Truck className="w-3.5 h-3.5" />
                    </a>
                  </div>
               )}
            </div>
          </div>
          
          {selectedBooking.reason && (
            <div className="order-4 rounded-[14px] border border-red-200 bg-red-50 p-5">
              <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2"><Info className="w-5 h-5" /> Rejection Reason</h3>
              <p className="text-sm text-red-600">{selectedBooking.reason}</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {!loading && bookings.length > 0 && (
          <div className="flex justify-end mb-4">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search by Product or Status..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-4 pr-10 py-2 rounded-md border border-[#E9DED3] bg-white text-sm focus:outline-none focus:border-[#8B5E3C] shadow-sm"
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-[#8A817C]">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E9DED3] text-center py-12 shadow-sm">
            <p className="text-[#8A817C]">You haven't made any advanced bookings yet.</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">No matching bookings found.</div>
        ) : (
          <>
            <div className="hidden sm:flex flex-col gap-4">
              {paginatedBookings.map((booking) => {
              const imageSrc = booking.productImage ? (booking.productImage.startsWith('http') ? booking.productImage : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${booking.productImage.startsWith('/') ? '' : '/'}${booking.productImage}`) : '';
              const date = new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
              const expectedDate = booking.expectedDate ? new Date(booking.expectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending';

              return (
                <div key={booking._id} className="bg-white rounded-[16px] shadow-sm border border-[#E9DED3] overflow-hidden p-5 lg:p-6 mb-2 transition-shadow hover:shadow-md">
                  <div className="flex flex-row gap-4 lg:gap-8 w-full items-start">
                    <div className="w-32 h-32 lg:w-40 lg:h-40 shrink-0 rounded-lg overflow-hidden bg-[#F8F3EF]">
                      {imageSrc ? <img src={imageSrc} alt={booking.productName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-gray-400" /></div>}
                    </div>

                    {/* Details Grid - Desktop Only Columns */}
                    <div className="hidden lg:grid flex-1 grid-cols-4 gap-6 lg:gap-8 items-start py-1">

                      {/* Column 1: Order ID & Product */}
                      <div className="flex flex-col gap-3 h-full">
                        <h3 className="font-serif font-bold text-[#141225] text-[17px]">#{booking.orderId || formatBookingId(booking._id)}</h3>
                        <div className="p-3 bg-[#FAF8F5] rounded-md border border-[#E9DED3] flex-1">
                          <p className="text-sm font-bold text-[#141225] line-clamp-2 mb-1.5">{booking.productName}</p>
                          {Object.keys(booking.variants || {}).length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              {Object.entries(booking.variants).map(([k, v]) => (
                                <p key={k} className="text-[11px] text-[#6D625C] font-semibold">{k}: <span className="text-[#141225]">{v}</span></p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 mt-1">No variants selected</p>
                          )}
                        </div>
                        <div className="mt-auto pt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getBookingStatusStyle(booking.bookingStatus)}`}>
                            Req: {booking.bookingStatus}
                          </span>
                          {booking.bookingStatus === 'Approved' && (
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getOrderStatusStyle(booking.orderStatus)}`}>
                              {booking.orderStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Column 2: Dates */}
                      <div className="flex flex-col gap-5 lg:border-l border-[#E9DED3] lg:pl-6 h-full justify-center">
                        <div className="flex items-start gap-3">
                          <CalendarDays className="w-5 h-5 text-[#8B5E3C] shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Booking Date</p>
                            <p className="text-sm font-bold text-[#141225]">{date}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Truck className="w-5 h-5 text-[#8B5E3C] shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Expected Delivery</p>
                            <p className="text-sm font-bold text-[#141225]">{expectedDate}</p>
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Items & Amount */}
                      <div className="flex flex-col gap-5 lg:border-l border-[#E9DED3] lg:pl-6 h-full justify-center">
                        <div className="flex items-start gap-3">
                          <Package className="w-5 h-5 text-[#8B5E3C] shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Quantity</p>
                            <p className="text-sm font-bold text-[#141225]">{booking.quantity} Unit{booking.quantity > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Tag className="w-5 h-5 text-[#8B5E3C] shrink-0 mt-0.5" />
                          <div className="w-full">
                            <p className="text-xs text-gray-500 mb-0.5">Total Amount</p>
                            <p className="text-sm font-bold text-[#141225]">₹ {Number(booking.totalAmount || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-green-600 font-bold mt-1">Paid: ₹{booking.paidAmount || 0}</p>
                            <p className="text-[10px] text-red-600 font-bold">Balance: ₹{booking.balanceAmount || booking.totalAmount}</p>
                          </div>
                        </div>
                      </div>

                      {/* Column 4: Actions & Info */}
                      <div className="flex flex-col gap-3 lg:border-l border-[#E9DED3] lg:pl-6 h-full justify-center">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="w-full py-2.5 rounded-md border border-[#8B5E3C] text-[#8B5E3C] text-[13px] font-bold hover:bg-[#FAF8F5] transition text-center flex items-center justify-center gap-1.5"
                        >
                          View Details
                        </button>

                        {booking.bookingStatus === 'Rejected' && booking.reason && (
                          <div className="w-full text-[10px] bg-red-50 text-red-600 p-2 rounded text-left flex items-start gap-1 border border-red-100">
                            <Info size={12} className="shrink-0 mt-0.5" /> <span>{booking.reason}</span>
                          </div>
                        )}
                        {booking.orderStatus === 'Shipping' && booking.shippingDetails?.trackingUrl && (
                          <a href={booking.shippingDetails.trackingUrl} target="_blank" rel="noreferrer" className="w-full py-2.5 rounded-md border border-[#8B5E3C] text-[#8B5E3C] text-[13px] font-bold hover:bg-[#FAF8F5] transition text-center flex items-center justify-center gap-1.5">
                            Track Order
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Tablet Grid - sm to lg */}
                    <div className="hidden sm:flex lg:hidden flex-1 flex-col justify-between py-1">
                      <div className="w-full">
                        <h3 className="font-serif font-bold text-[#141225] text-[16px] leading-tight">#{booking.orderId || formatBookingId(booking._id)}</h3>
                        <p className="text-sm font-bold text-[#141225] mt-2 line-clamp-1">{booking.productName}</p>
                        <p className="text-xs text-gray-500 mt-1">{date}</p>
                      </div>
                      <div className="flex justify-between items-end mt-auto">
                        <div>
                          <p className="text-xs text-gray-500">Qty: {booking.quantity}</p>
                          <p className="text-sm font-bold text-[#141225] mt-0.5">₹ {Number(booking.totalAmount || 0).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getBookingStatusStyle(booking.bookingStatus)}`}>Req: {booking.bookingStatus}</span>
                          {booking.bookingStatus === 'Approved' && (
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getOrderStatusStyle(booking.orderStatus)}`}>{booking.orderStatus}</span>
                          )}
                        </div>
                      </div>
                      {(booking.shippingDetails?.trackingUrl || booking.reason) && (
                        <div className="flex gap-2 mt-4">
                          {booking.orderStatus === 'Shipping' && booking.shippingDetails?.trackingUrl && (
                            <a href={booking.shippingDetails.trackingUrl} target="_blank" rel="noreferrer" className="flex-1 py-2 rounded border border-[#8B5E3C] text-[#8B5E3C] text-xs font-bold transition hover:bg-[#FAF8F5] flex items-center justify-center text-center">Track</a>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => setSelectedBooking(booking)} className="flex-1 py-2 rounded border border-[#8B5E3C] text-[#8B5E3C] text-xs font-bold transition hover:bg-[#FAF8F5] flex items-center justify-center gap-1.5">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>

            <div className="flex sm:hidden flex-col gap-4">
              {paginatedBookings.map((booking) => {
              const imageSrc = booking.productImage ? (booking.productImage.startsWith('http') ? booking.productImage : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${booking.productImage.startsWith('/') ? '' : '/'}${booking.productImage}`) : '';
              const date = new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
              const variantKey = booking.variants && Object.keys(booking.variants).length > 0 ? Object.keys(booking.variants)[0] : 'Variant';
              const variantValue = booking.variants && Object.keys(booking.variants).length > 0 ? booking.variants[variantKey] : 'N/A';
              
              return (
                <div key={booking._id} className="bg-white rounded-[16px] border border-[#E9DED3] p-4 shadow-sm">
                  {/* Header Row: Image, Order ID, Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-[#F8F3EF] shrink-0 overflow-hidden">
                        {imageSrc ? <img src={imageSrc} alt={booking.productName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>}
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-[#141225] text-[16px] leading-tight mb-1">#{booking.orderId || formatBookingId(booking._id)}</h4>
                        <p className="text-[13px] font-medium text-gray-500 line-clamp-1">{booking.productName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${getBookingStatusStyle(booking.bookingStatus)}`}>{booking.bookingStatus}</span>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="mt-3">
                    <p className="text-[#8A817C] text-xs mt-1">Requested on {date}</p>
                  </div>

                  {/* Details Box */}
                  <div className="mt-4 bg-[#FAF8F5] rounded-[12px] p-4">
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                      <div>
                        <p className="text-[11px] text-[#8A817C] mb-1">{variantKey}</p>
                        <p className="text-xs font-bold text-[#141225]">{variantValue}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#8A817C] mb-1">Contact Name</p>
                        <p className="text-xs font-bold text-[#141225] truncate">{booking.customerName}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#8A817C] mb-1">Request Date</p>
                        <p className="text-xs font-bold text-[#141225]">{date}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#8A817C] mb-1">Phone Number</p>
                        <p className="text-xs font-bold text-[#141225]">{booking.phoneNo || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="mt-5">
                      <button onClick={() => setSelectedBooking(booking)} className="w-full py-2.5 rounded-lg border border-[#8B5E3C] text-[#8B5E3C] text-xs font-bold transition hover:bg-[#F0EAE1] flex items-center justify-center gap-1.5">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>

            <div className="mt-6">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </>
        )}
      </div>

    </div>
  );
}
