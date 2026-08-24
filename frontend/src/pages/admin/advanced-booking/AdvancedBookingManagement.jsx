import { ActiveBadge, RequestBadge, OrderBadge, Avatar } from '../../../components/admin/CommonComponents';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, Search, Eye, X, Check, XCircle, Edit, Bell, FileText, Upload, Loader, Plus, Printer } from 'lucide-react';
import { advancedBookingService } from '../../../api/advancedBookingService';
import { uploadAPI } from '../../../api/catalogAdminService';
import { courierService } from '../../../api/courierService';
import toast from 'react-hot-toast';
import BulkActions from '../../../components/admin/BulkActions';
import { PackingSlip } from '../../../components/admin/PackingSlip';
import { useReactToPrint } from 'react-to-print';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import Pagination from '../../../components/common/Pagination';

export default function AdvancedBookingManagement({ canCreate = true, canEdit = true, canDelete = true }) {
  const [bookings, setBookings] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const parseScreenshots = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      return data.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  // Modal States
  const [viewBooking, setViewBooking] = useState(null);
  const [approveBookingData, setApproveBookingData] = useState(null);
  const [rejectBookingData, setRejectBookingData] = useState(null);
  const [editBookingData, setEditBookingData] = useState(null);
  const [shippingModalData, setShippingModalData] = useState(null);
  const [additionalTracking, setAdditionalTracking] = useState([]);
  const [selectedCourierName, setSelectedCourierName] = useState('');
  const [showCourierDropdown, setShowCourierDropdown] = useState(false);

  const [couriers, setCouriers] = useState([]);
  const [showAddCourierModal, setShowAddCourierModal] = useState(false);

  const [screenshotUrls, setScreenshotUrls] = useState([]);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);

  const [balanceInput, setBalanceInput] = useState(0);
  const [selectedNextStatus, setSelectedNextStatus] = useState('');

  const [showNotifications, setShowNotifications] = useState(false);
  const [showPackingSlipModal, setShowPackingSlipModal] = useState(false);

  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Advanced_Booking_Packing_Slips',
    pageStyle: `
      @page { size: A4 portrait; margin: 0mm; }
      @media print {
        html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .packing-slip-container { margin: 0 !important; padding: 0 !important; background: white !important; }
      }
    `
  });

  const fetchBookingsAndMetrics = async () => {
    setLoading(true);
    try {
      const [bookingsData, metricsData, couriersData] = await Promise.all([
        advancedBookingService.getAllBookings(),
        advancedBookingService.getDashboardMetrics(),
        courierService.getCouriers().catch(() => [])
      ]);
      setBookings(bookingsData);
      setMetrics(metricsData);
      setCouriers(couriersData);
    } catch (error) {
      toast.error('Failed to load advanced bookings data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingsAndMetrics();
  }, []);

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedBookings.length} booking(s)?`)) return;
    try {
      await Promise.all(selectedBookings.map(id => advancedBookingService.deleteBooking(id)));
      toast.success('Bookings deleted successfully');
      setBookings(prev => prev.filter(b => !selectedBookings.includes(b._id)));
      setSelectedBookings([]);
      fetchBookingsAndMetrics();
    } catch (error) {
      toast.error('Failed to delete some bookings');
    }
  };

  // Derived Notifications
  const notifications = useMemo(() => {
    const notifs = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    bookings.forEach(b => {
      if (b.expectedDate) {
        const expDate = new Date(b.expectedDate);
        expDate.setHours(0, 0, 0, 0);
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          notifs.push({ type: 'warning', text: `Delivery Due Today: ${b.customerName} (Order: ${b._id.slice(-6).toUpperCase()})` });
        } else if (diffDays > 0 && diffDays <= 3) {
          notifs.push({ type: 'info', text: `Upcoming Delivery in ${diffDays} days: ${b.customerName} (Order: ${b._id.slice(-6).toUpperCase()})` });
        }
      }
    });
    return notifs;
  }, [bookings]);

  const handleBulkStatus = async (isActive) => {
    const status = isActive ? 'Approved' : 'Rejected';
    if (!selectedBookings.length) return;
    try {
      setLoading(true);
      await Promise.all(
        selectedBookings.map(id => advancedBookingService.updateBookingStatus(id, status))
      );
      toast.success(`Successfully updated ${selectedBookings.length} bookings`);
      setSelectedBookings([]);
      fetchBookingsAndMetrics();
    } catch (e) {
      toast.error('Failed to update bookings');
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch =
      b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.phoneNo.includes(searchTerm) ||
      b.productName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' ? true :
        ['Pending', 'Approved', 'Rejected'].includes(statusFilter) ? b.bookingStatus === statusFilter :
          b.orderStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = filteredBookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

  // Modals Submit Handlers
  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    try {
      await advancedBookingService.approveBooking(approveBookingData._id, {
        reason: e.target.reason.value,
        expectedDate: e.target.expectedDate.value,
        paymentScreenshot: screenshotUrls,
        paidAmount: e.target.paidAmount.value
      });
      toast.success('Booking Approved');
      setApproveBookingData(null);
      fetchBookingsAndMetrics();
    } catch (error) {
      toast.error(error.message || 'Failed to approve');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    try {
      await advancedBookingService.rejectBooking(rejectBookingData._id, {
        reason: e.target.reason.value
      });
      toast.success('Booking Rejected');
      setRejectBookingData(null);
      fetchBookingsAndMetrics();
    } catch (error) {
      toast.error('Failed to reject');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        paymentMethod: e.target.paymentMethod.value,
        orderStatus: e.target.orderStatus.value,
        paymentScreenshot: screenshotUrls,
        paidAmount: (editBookingData.paidAmount || 0) + Number(balanceInput), // The new paid amount is original + what they enter as balance collected
      };

      // Override if paymentType is selected
      if (e.target.paymentType) {
        data.paymentType = e.target.paymentType.value;
      }

      if (e.target.orderStatus.value === 'Shipping') {
        data.shippingDetails = {
          courierName: e.target.courierName?.value,
          trackingId: e.target.trackingId?.value,
          trackingUrl: e.target.trackingUrl?.value,
          additionalTracking: additionalTracking.filter(Boolean)
        };
      }

      await advancedBookingService.updateOrderDetails(editBookingData._id, data);
      toast.success('Order details updated');
      setEditBookingData(null);
      fetchBookingsAndMetrics();
    } catch (error) {
      toast.error(error.message || 'Failed to update');
    }
  };



  const handleAddCourierSubmit = async (e) => {
    e.preventDefault();
    try {
      const newCourierName = e.target.courierName.value.trim();
      if (!newCourierName) return;

      // Prevent unnecessary 400 Bad Request console errors by checking frontend first
      const alreadyExists = couriers.some(c => c.name.toLowerCase() === newCourierName.toLowerCase());
      if (alreadyExists) {
        // It already exists, just select it and close the modal without error!
        setSelectedCourierName(couriers.find(c => c.name.toLowerCase() === newCourierName.toLowerCase()).name);
        setShowAddCourierModal(false);
        return;
      }

      await courierService.createCourier(newCourierName, '');
      toast.success('Courier added successfully');
      setShowAddCourierModal(false);

      // Refresh couriers
      const couriersData = await courierService.getCouriers();
      setCouriers(couriersData);
      setSelectedCourierName(newCourierName);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add courier');
    }
  };

  // Not used anymore as we use balanceInput
  // const [editTempPaid, setEditTempPaid] = useState(0);

  const handleScreenshotUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsUploadingScreenshot(true);
    try {
      const res = await uploadAPI.uploadImages(files, 'misc');
      if (res.data.success) {
        setScreenshotUrls(prev => [...prev, ...res.data.data.map(img => img.url)]);
        toast.success('Screenshots uploaded successfully');
      } else {
        toast.error(res.data.message || 'Upload failed');
      }
    } catch (err) {
      toast.error('Image upload failed');
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header & Notifications */}
      <div className="flex justify-between items-center mb-8 relative">
        <div>
          <p className="text-[13px] md:text-sm font-serif text-white mb-1">
            Dashboard &rsaquo; <span className="font-semibold text-[#8B5E3C]">Advanced Bookings</span>
          </p>
          <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Advanced Bookings</h1>
        </div>
        <div className="relative">
          <button onClick={() => setShowNotifications(!showNotifications)} className="p-3 bg-white rounded-full shadow-sm border border-[#E6DFD4] relative">
            <Bell size={20} className="text-[#8B5E3C]" />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[#E6DFD4] z-50 overflow-hidden">
              <div className="p-4 border-b border-[#E6DFD4] bg-[#F8F4EC]">
                <h3 className="font-bold text-[#141225]">Reminders ({notifications.length})</h3>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500 text-center">No upcoming reminders</p>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} className={`p-4 border-b border-[#E6DFD4] text-sm ${n.type === 'warning' ? 'bg-red-50 text-red-800' : 'text-[#141225]'}`}>
                      {n.text}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Dashboard */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-[20px] shadow-sm border border-[#E6DFD4]">
            <p className="text-sm text-gray-500 mb-2">Total Revenue</p>
            <p className="text-2xl font-bold text-[#141225]">₹{metrics.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-[20px] shadow-sm border border-[#E6DFD4]">
            <p className="text-sm text-gray-500 mb-2">Total Orders</p>
            <p className="text-2xl font-bold text-[#141225]">{metrics.totalOrders}</p>
          </div>
          <div className="bg-white p-6 rounded-[20px] shadow-sm border border-[#E6DFD4]">
            <p className="text-sm text-gray-500 mb-2">Total Customers</p>
            <p className="text-2xl font-bold text-[#141225]">{metrics.totalCustomers}</p>
          </div>
          <div className="bg-white p-6 rounded-[20px] shadow-sm border border-[#E6DFD4]">
            <p className="text-sm text-gray-500 mb-2">Total Products</p>
            <p className="text-2xl font-bold text-[#141225]">{metrics.totalProducts}</p>
          </div>
        </div>
      )}

      {/* Charts */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E6DFD4] h-[350px] flex flex-col">
            <div className="mb-6">
              <h3 className="text-[22px] font-serif font-bold text-[#141225]">Revenue Analytics (30 Days)</h3>
              <p className="text-[15px] font-serif text-gray-500 mt-1">Daily revenue over the last 30 days</p>
            </div>
            <div className="flex-1 w-full h-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.dailyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5E3C" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5E3C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8A817C' }} tickMargin={10} axisLine={false} tickLine={false} minTickGap={20} />
                  <YAxis tick={{ fontSize: 10, fill: '#8A817C' }} axisLine={false} tickLine={false} tickFormatter={val => `₹${val}`} />
                  <RechartsTooltip
                    formatter={(value) => [`₹${value}`, 'Revenue']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    labelStyle={{ color: '#8A817C', fontSize: '12px', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#8B5E3C" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E6DFD4] h-[350px] flex flex-col">
            <div className="mb-6">
              <h3 className="text-[22px] font-serif font-bold text-[#141225]">Order Volume</h3>
              <p className="text-[15px] font-serif text-gray-500 mt-1">Orders by day of week</p>
            </div>
            <div className="flex-1 w-full h-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.ordersDayOfWeek} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8A817C' }} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#8A817C' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip
                    formatter={(value) => [value, 'Orders']}
                    cursor={{ fill: '#F8F4EC' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="orders" fill="#141225" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white p-3 rounded-[20px] shadow-sm border border-[#E6DFD4] mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-1/2 flex-1">
          <input
            type="text"
            placeholder="Search by name, phone or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 rounded-full focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/20 border border-transparent focus:border-[#8B5E3C] text-sm text-[#141225] placeholder-gray-400 transition-all"
          />
          <Search className="absolute left-5 top-3 text-gray-400" size={18} />
        </div>
        <div className="flex items-center gap-3 pr-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-[#E9DED3] rounded-full px-5 py-2.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/20 cursor-pointer shadow-sm hover:border-[#8B5E3C] transition-colors"
          >
            <option value="All">All Statuses</option>
            <optgroup label="Booking Status">
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </optgroup>
            <optgroup label="Order Status">
              <option value="Placed">Placed</option>
              <option value="Packed">Packed</option>
              <option value="Shipping">Shipping</option>
              <option value="Out of Delivery">Out of Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </optgroup>
          </select>
          <button
            onClick={() => {
              if (selectedBookings.length === 0 && filteredBookings.length === 0) {
                toast.error("No bookings to print");
                return;
              }
              setShowPackingSlipModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F8F4EC] text-[#8B5E3C] border border-[#E6DFD4] rounded-xl text-sm font-bold hover:bg-[#F0EAE2] transition-colors"
          >
            <FileText size={16} /> Packing Slip
          </button>
          <button
            onClick={() => {
              if (selectedBookings.length === 0 && filteredBookings.length === 0) {
                toast.error("No bookings to print");
                return;
              }
              setTimeout(() => handlePrint(), 100);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#8B5E3C] text-white border border-[#8B5E3C] rounded-xl text-sm font-bold hover:bg-[#7a5234] transition-colors shadow-sm"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={fetchBookingsAndMetrics}
            className="p-3 bg-white border border-[#E6DFD4] rounded-full hover:bg-[#F8F4EC] transition-colors text-gray-600 shadow-sm"
            title="Refresh Bookings"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {canDelete && (
        <BulkActions
          selectedIds={selectedBookings}
          onBulkDelete={handleBulkDelete}
          onBulkStatusChange={handleBulkStatus}
          onClear={() => setSelectedBookings([])}
        />
      )}

      {/* Table */}
      <div className="bg-white rounded-[20px] border border-[#E6DFD4] shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F8F4EC] border-b border-[#E6DFD4]">
              <tr>
                {canDelete && <th className="px-5 py-4 w-12"><input type="checkbox" checked={filteredBookings.length > 0 && selectedBookings.length === filteredBookings.length} onChange={(e) => setSelectedBookings(e.target.checked ? filteredBookings.map(b => b._id) : [])} className="w-4 h-4 text-[#8B5E3C] rounded cursor-pointer border-gray-300" /></th>}
                <th className="px-4 py-4 text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Date</th>
                <th className="px-4 py-4 text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap min-w-[200px]">Customer Info</th>
                <th className="px-4 py-4 text-left text-[14px] font-bold text-[#8B5E3C] uppercase tracking-wider min-w-[250px]">Product Details</th>
                <th className="px-4 py-4 text-center text-[14px] font-bold text-[#8B5E3C] uppercase tracking-wider whitespace-nowrap">Qty</th>
                <th className="px-4 py-4 text-left text-[14px] font-bold text-[#8B5E3C] uppercase tracking-wider whitespace-nowrap">Product Amount</th>
                <th className="px-4 py-4 text-left text-[14px] font-bold text-[#8B5E3C] uppercase tracking-wider whitespace-nowrap min-w-[150px]">Paid Amount</th>
                <th className="px-4 py-4 text-center text-[14px] font-bold text-[#8B5E3C] uppercase tracking-wider whitespace-nowrap">Expected Date</th>
                <th className="px-4 py-4 text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap text-center">Status</th>
                <th className="px-4 py-4 text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap text-center">Order Status</th>
                <th className="px-4 py-4 text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9DED3]">
              {loading ? (
                <tr><td colSpan="10" className="text-[16px] text-center py-12 text-[#8A817C]">Loading...</td></tr>
              ) : paginatedBookings.length === 0 ? (
                <tr><td colSpan="10" className="text-[16px] text-center py-12 text-[#8A817C]">No bookings found.</td></tr>
              ) : (
                paginatedBookings.map((booking, idx) => {
                  const displayTotal = booking.totalAmount || ((booking.price || 0) * (booking.quantity || 1));
                  const displayBal = displayTotal - (booking.paidAmount || 0);

                  return (
                    <tr key={booking._id} className={`transition-colors hover:bg-[#FDF9F5] group ${idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}>
                      {canDelete && <td className="text-[16px] px-5 py-4"><input type="checkbox" checked={selectedBookings.includes(booking._id)} onChange={() => setSelectedBookings(prev => prev.includes(booking._id) ? prev.filter(id => id !== booking._id) : [...prev, booking._id])} className="w-4 h-4 text-[#8B5E3C] rounded cursor-pointer border-gray-300" /></td>}
                      <td className="text-[16px] px-4 py-4 whitespace-nowrap font-medium text-[#8B5E3C]">{new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="text-[16px] px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={booking.customerName} size={38} />
                          <div>
                            <div className="font-bold text-[#141225] text-[16px]">{booking.customerName}</div>
                            <div className="text-[14px] text-gray-500">{booking.phoneNo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-[16px] px-4 py-4">
                        <div className="flex items-center gap-3">
                          {booking.productImage && <img src={booking.productImage.startsWith('http') ? booking.productImage : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${booking.productImage.startsWith('/') ? '' : '/'}${booking.productImage}`} alt="" className="w-12 h-12 rounded-lg object-cover border border-[#E6DFD4] flex-shrink-0" />}
                          <div>
                            <div className="font-bold text-[#141225] text-[16px]">{booking.productName}</div>
                            <div className="text-[14px] font-medium text-gray-500 mt-0.5">
                              {booking.variants && Object.keys(booking.variants).length > 0
                                ? Object.entries(booking.variants).map(([k, v]) => `${k}: ${v}`).join(', ')
                                : 'Standard'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-[16px] px-4 py-4 text-center font-bold text-gray-700">{booking.quantity}</td>

                      <td className="px-4 py-4 text-[16px] font-bold text-gray-800">
                        ₹{displayTotal}
                      </td>

                      <td className="px-4 py-4 text-[16px] whitespace-nowrap">
                        {displayBal <= 0 && booking.paidAmount > 0 && <span className="text-green-600 font-semibold">Fully Paid</span>}
                        {displayBal > 0 && booking.paidAmount > 0 && <span className="text-orange-600 font-semibold">Partially Paid</span>}
                        {(!booking.paidAmount || booking.paidAmount === 0) && <span className="text-red-600 font-semibold">Unpaid</span>}
                        <div className="mt-1 text-gray-500">Paid: ₹{booking.paidAmount || 0} | Bal: ₹{displayBal > 0 ? displayBal : 0}</div>
                      </td>
                      <td className="text-[16px] px-4 py-4 text-center whitespace-nowrap text-[#8B5E3C] font-medium">
                        {booking.expectedDate ? new Date(booking.expectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="text-[16px] px-4 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-[14px] font-bold uppercase tracking-wide ${getBookingStatusStyle(booking.bookingStatus)}`}>{booking.bookingStatus}</span>
                      </td>
                      <td className="text-[16px] px-4 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-[14px] font-bold uppercase tracking-wide ${getOrderStatusStyle(booking.orderStatus)}`}>{booking.orderStatus}</span>
                      </td>
                      <td className="text-[16px] px-4 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => setViewBooking(booking)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="View"><Eye size={16} /></button>
                          {canEdit && booking.bookingStatus === 'Pending' && (
                            <>
                              <button onClick={() => { setApproveBookingData(booking); setScreenshotUrls([]); }} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Approve"><Check size={16} /></button>
                              <button onClick={() => setRejectBookingData(booking)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Reject"><X size={16} strokeWidth={3} /></button>
                            </>
                          )}
                          {canEdit && (
                            <button onClick={() => {
                              setEditBookingData(booking);
                              setBalanceInput(0);
                              setSelectedNextStatus(booking.orderStatus);
                              setSelectedCourierName(booking.shippingDetails?.courierName || '');
                              setScreenshotUrls(parseScreenshots(booking.paymentScreenshot));
                            }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Status"><Edit size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center bg-white rounded-b-[20px]">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* View Booking Modal */}
      {viewBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-[#E6DFD4]">
            <div className="flex items-center justify-between p-6 border-b border-[#E6DFD4] bg-[#F8F4EC]">
              <h2 className="text-xl font-serif font-bold text-[#141225]">Booking Details</h2>
              <button onClick={() => setViewBooking(null)} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Customer</p>
                  <p className="font-semibold">{viewBooking.customerName} ({viewBooking.phoneNo})</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Product</p>
                  <p className="font-semibold">{viewBooking.productName} (x{viewBooking.quantity})</p>
                </div>
              </div>

              {viewBooking.address && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Shipping Address</p>
                  <p className="font-semibold text-sm">{viewBooking.address}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Booking Status</p>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getBookingStatusStyle(viewBooking.bookingStatus)}`}>{viewBooking.bookingStatus}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Order Status</p>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getOrderStatusStyle(viewBooking.orderStatus)}`}>{viewBooking.orderStatus}</span>
                </div>
              </div>

              {viewBooking.shippingDetails && (viewBooking.shippingDetails.courierName || viewBooking.shippingDetails.trackingId) && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-2">Shipping Details</p>
                  <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm border border-gray-200">
                    {viewBooking.shippingDetails.courierName && <p><span className="text-gray-500">Courier:</span> <span className="font-bold">{viewBooking.shippingDetails.courierName}</span></p>}
                    {viewBooking.shippingDetails.trackingId && <p><span className="text-gray-500">Tracking ID:</span> <span className="font-bold">{viewBooking.shippingDetails.trackingId}</span></p>}
                    {viewBooking.shippingDetails.trackingUrl && <p><span className="text-gray-500">Tracking URL:</span> <a href={viewBooking.shippingDetails.trackingUrl} target="_blank" rel="noreferrer" className="text-[#8B5E3C] hover:underline break-all">{viewBooking.shippingDetails.trackingUrl}</a></p>}

                    {viewBooking.shippingDetails.additionalTracking?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <span className="text-gray-500">Additional Tracking:</span>
                        <ul className="list-disc list-inside text-gray-700 mt-1 space-y-1">
                          {viewBooking.shippingDetails.additionalTracking.map((t, i) => (
                            <li key={i}>{t.startsWith('http') ? <a href={t} target="_blank" rel="noreferrer" className="text-[#8B5E3C] hover:underline break-all">{t}</a> : t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-6 bg-[#FDF9F5] p-4 rounded-xl border border-[#E9DED3]">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Total</p>
                  <p className="font-bold text-[#8B5E3C]">₹{viewBooking.totalAmount || (viewBooking.price * viewBooking.quantity)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Paid</p>
                  <p className="font-bold text-green-600">₹{viewBooking.paidAmount || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Balance</p>
                  <p className="font-bold text-red-600">₹{(viewBooking.totalAmount || (viewBooking.price * viewBooking.quantity)) - (viewBooking.paidAmount || 0)}</p>
                </div>
              </div>
              {viewBooking.paymentScreenshot && parseScreenshots(viewBooking.paymentScreenshot).length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 uppercase mb-2 font-bold">Payment Screenshots</p>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {parseScreenshots(viewBooking.paymentScreenshot).map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="shrink-0">
                        <img src={url} alt="Payment Screenshot" className="h-24 w-auto rounded-xl border border-gray-200" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {viewBooking.reason && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Reason (Approve/Reject)</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">{viewBooking.reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveBookingData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form onSubmit={handleApproveSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#E6DFD4] bg-[#F8F4EC] shrink-0">
              <h2 className="text-xl font-serif font-bold text-green-800">Approve Booking</h2>
              <button type="button" onClick={() => setApproveBookingData(null)} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Note</label>
                <textarea name="reason" required className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-[#8B5E3C]" rows="2"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Date</label>
                <input type="date" name="expectedDate" required className="w-full border border-gray-300 rounded-xl p-3 text-sm" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (Fixed)</label>
                  <input type="number" value={approveBookingData.totalAmount || (approveBookingData.price * approveBookingData.quantity)} readOnly className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm text-gray-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
                  <input type="number" name="paidAmount" defaultValue={approveBookingData.paidAmount || 0} min="0" max={approveBookingData.totalAmount || (approveBookingData.price * approveBookingData.quantity)} required className="w-full border border-gray-300 rounded-xl p-3 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Screenshot</label>

                <label className={`w-full border-2 border-dashed border-[#E9DED3] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#FDF9F5] transition-colors ${isUploadingScreenshot ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="w-12 h-12 bg-[#F8F4EC] rounded-full flex items-center justify-center mb-1">
                    {isUploadingScreenshot ? <Loader size={24} className="animate-spin text-[#8B5E3C]" /> : <Upload size={24} className="text-[#8B5E3C]" />}
                  </div>
                  <div className="text-lg font-bold text-[#141225]">
                    Drag and drop images, or <span className="text-[#8B5E3C]">browse</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Supports PNG, JPG, JPEG, WEBP up to 5MB (Max 4 images)
                  </div>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleScreenshotUpload} />
                </label>

                {screenshotUrls.length > 0 && (
                  <div className="flex gap-4 mt-5 overflow-x-auto pb-2">
                    {screenshotUrls.map((url, idx) => (
                      <div key={idx} className="relative group shrink-0 w-24 h-24 rounded-xl border-[3px] border-[#F2A25C] overflow-visible bg-white">
                        <div className="w-full h-full rounded-lg overflow-hidden relative">
                          <img src={url} alt="Screenshot" className="w-full h-full object-cover" />
                        </div>
                        <button type="button" onClick={() => setScreenshotUrls(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-white text-red-500 border border-gray-200 rounded-full p-0.5 shadow-sm hover:bg-red-50 z-10 transition-colors">
                          <X size={14} strokeWidth={2.5} />
                        </button>
                        {idx === 0 && (
                          <div className="absolute top-1 left-1 bg-[#D97706] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] flex items-center gap-1 z-10 shadow-sm">
                            <span>★</span> Main
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setApproveBookingData(null)} className="px-8 py-3 border border-red-200 rounded-full text-[15px] font-bold text-red-600 bg-white hover:bg-red-50 transition-colors shadow-sm uppercase tracking-wide">Cancel</button>
              <button type="submit" className="px-8 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white text-[15px] font-bold transition-colors shadow-sm">Approve Booking</button>
            </div>
          </form>
        </div>
      )}

      {/* Reject Modal */}
      {rejectBookingData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form onSubmit={handleRejectSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#E6DFD4] bg-red-50">
              <h2 className="text-xl font-serif font-bold text-red-800">Reject Booking</h2>
              <button type="button" onClick={() => setRejectBookingData(null)} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection</label>
              <textarea name="reason" required className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-red-500" rows="4"></textarea>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={() => setRejectBookingData(null)} className="px-8 py-3 border border-red-200 rounded-full text-[15px] font-bold text-red-600 bg-white hover:bg-red-50 transition-colors shadow-sm uppercase tracking-wide">Cancel</button>
              <button type="submit" className="px-8 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-[15px] font-bold transition-colors shadow-sm">Save & Update Status</button>
            </div>
          </form>
        </div>
      )}



      {/* Edit Status & Payment Modal */}
      {editBookingData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#E6DFD4] bg-[#F8F4EC] shrink-0">
              <h2 className="text-xl font-serif font-bold text-[#8B5E3C]">Update Order Details</h2>
              <button type="button" onClick={() => setEditBookingData(null)} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {editBookingData.address && (
                <div className="bg-[#FDF9F5] border border-[#E9DED3] p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Shipping Address</p>
                  <p className="font-semibold text-sm">{editBookingData.address}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select name="paymentMethod" defaultValue={editBookingData.paymentMethod === 'Not Selected' ? 'Cashfree' : (editBookingData.paymentMethod || 'Cashfree')} className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-white focus:ring-[#8B5E3C]">
                    <option value="Cashfree">Cashfree</option>
                    <option value="COD">COD</option>
                    <option value="Not Selected">Not Selected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                  <select name="paymentType" defaultValue={editBookingData.paymentType || 'Partially Paid'} className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-white focus:ring-[#8B5E3C]">
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Fully Paid">Fully Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Order Status</label>
                  <select
                    name="orderStatus"
                    value={selectedNextStatus}
                    onChange={(e) => setSelectedNextStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-white focus:ring-[#8B5E3C]"
                  >
                    {editBookingData.orderStatus === 'Placed' && (
                      <>
                        <option value="Placed">Placed</option>
                        <option value="Packed" disabled={Number(balanceInput) !== ((editBookingData.totalAmount || (editBookingData.price * editBookingData.quantity)) - (editBookingData.paidAmount || 0))}>Packed (Requires Exact Balance Input)</option>
                        <option value="Cancelled">Cancelled</option>
                      </>
                    )}
                    {editBookingData.orderStatus === 'Packed' && (
                      <>
                        <option value="Packed">Packed</option>
                        <option value="Shipping">Shipping</option>
                        <option value="Cancelled">Cancelled</option>
                      </>
                    )}
                    {editBookingData.orderStatus === 'Shipping' && (
                      <>
                        <option value="Shipping">Shipping</option>
                        <option value="Out of Delivery">Out of Delivery</option>
                        <option value="Cancelled">Cancelled</option>
                      </>
                    )}
                    {editBookingData.orderStatus === 'Out of Delivery' && (
                      <>
                        <option value="Out of Delivery">Out of Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </>
                    )}
                    {editBookingData.orderStatus === 'Delivered' && (
                      <option value="Delivered">Delivered</option>
                    )}
                    {editBookingData.orderStatus === 'Cancelled' && (
                      <option value="Cancelled">Cancelled</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-sm mb-3">Financials</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Total Amount</label>
                    <input type="number" value={editBookingData.totalAmount || (editBookingData.price * editBookingData.quantity)} readOnly className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2 text-sm text-gray-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Paid Amount (Past)</label>
                    <input type="text" value={editBookingData.paidAmount || 0} readOnly disabled className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2 text-sm text-gray-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Balance Amount (Received Now)</label>
                    <input
                      type="text"
                      name="balanceInput"
                      value={balanceInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setBalanceInput(val);
                      }}
                      placeholder="0"
                      className={`w-full border ${balanceInput && Number(balanceInput) !== ((editBookingData.totalAmount || (editBookingData.price * editBookingData.quantity)) - (editBookingData.paidAmount || 0)) ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#8B5E3C]'} rounded-lg p-2 text-sm`}
                    />
                    {balanceInput && Number(balanceInput) !== ((editBookingData.totalAmount || (editBookingData.price * editBookingData.quantity)) - (editBookingData.paidAmount || 0)) && (
                      <p className="text-[10px] text-red-500 mt-1 font-medium">Amount must be exactly ₹{((editBookingData.totalAmount || (editBookingData.price * editBookingData.quantity)) - (editBookingData.paidAmount || 0))} to proceed.</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-medium">Calculated Target Balance to receive:</span>
                  <span className="font-bold text-red-600 text-base">₹{(editBookingData.totalAmount || (editBookingData.price * editBookingData.quantity)) - (editBookingData.paidAmount || 0)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Screenshot</label>

                <label className={`w-full border-2 border-dashed border-[#E9DED3] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#FDF9F5] transition-colors ${isUploadingScreenshot ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="w-12 h-12 bg-[#F8F4EC] rounded-full flex items-center justify-center mb-1">
                    {isUploadingScreenshot ? <Loader size={24} className="animate-spin text-[#8B5E3C]" /> : <Upload size={24} className="text-[#8B5E3C]" />}
                  </div>
                  <div className="text-lg font-bold text-[#141225]">
                    Drag and drop images, or <span className="text-[#8B5E3C]">browse</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Supports PNG, JPG, JPEG, WEBP up to 5MB (Max 4 images)
                  </div>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleScreenshotUpload} />
                </label>

                {screenshotUrls.length > 0 && (
                  <div className="flex gap-4 mt-5 overflow-x-auto pb-2">
                    {screenshotUrls.map((url, idx) => (
                      <div key={idx} className="relative group shrink-0 w-24 h-24 rounded-xl border-[3px] border-[#F2A25C] overflow-visible bg-white">
                        <div className="w-full h-full rounded-lg overflow-hidden relative">
                          <img src={url} alt="Screenshot" className="w-full h-full object-cover" />
                        </div>
                        <button type="button" onClick={() => setScreenshotUrls(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-white text-red-500 border border-gray-200 rounded-full p-0.5 shadow-sm hover:bg-red-50 z-10 transition-colors">
                          <X size={14} strokeWidth={2.5} />
                        </button>
                        {idx === 0 && (
                          <div className="absolute top-1 left-1 bg-[#D97706] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] flex items-center gap-1 z-10 shadow-sm">
                            <span>★</span> Main
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedNextStatus === 'Shipping' && (
                <div className="p-6 bg-white rounded-xl border border-[#E9DED3] shadow-sm space-y-4 relative">
                  <div className="flex justify-between items-center pb-3 border-b border-[#E9DED3]">
                    <h4 className="font-serif font-bold text-lg text-[#141225]">Enter Shipping Details</h4>
                    <button type="button" onClick={() => setShowAddCourierModal(true)} className="text-xs font-bold text-[#8B5E3C] hover:underline">+ ADD COURIER</button>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-bold text-gray-500 mb-1">Courier</label>
                    <input
                      type="text"
                      name="courierName"
                      placeholder="Select Courier or type name..."
                      value={selectedCourierName}
                      onChange={(e) => {
                        setSelectedCourierName(e.target.value);
                        setShowCourierDropdown(true);
                      }}
                      onFocus={() => setShowCourierDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCourierDropdown(false), 200)}
                      required
                      className="w-full border border-gray-300 rounded-xl p-3 focus:ring-[#8B5E3C] focus:border-[#8B5E3C] outline-none bg-gray-50"
                    />
                    {showCourierDropdown && couriers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                        {couriers.filter(c => c.name.toLowerCase().includes(selectedCourierName.toLowerCase())).map((c) => (
                          <div
                            key={c._id}
                            className="px-4 py-3 hover:bg-[#FDF9F5] cursor-pointer text-sm font-medium text-gray-700 transition-colors border-b last:border-b-0 border-gray-100"
                            onClick={() => {
                              setSelectedCourierName(c.name);
                              setShowCourierDropdown(false);
                            }}
                          >
                            {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-500 mb-1">Primary Tracking ID</label>
                    <input type="text" name="trackingId" placeholder="e.g. AWB123456789" defaultValue={editBookingData.shippingDetails?.trackingId || ''} required className="w-full border border-gray-300 rounded-xl p-3 focus:ring-[#8B5E3C] focus:border-[#8B5E3C] outline-none bg-gray-50" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-500 mb-1">PRIMARY TRACKING URL</label>
                    <input type="url" name="trackingUrl" placeholder="https://tracker.example.com/..." defaultValue={editBookingData.shippingDetails?.trackingUrl || ''} required className="w-full border border-gray-300 rounded-xl p-3 focus:ring-[#8B5E3C] focus:border-[#8B5E3C] outline-none bg-gray-50" />
                  </div>

                  <div className="space-y-3 mt-2">
                    {additionalTracking.map((trackValue, index) => (
                      <div key={index} className="relative group">
                        <input type="text" value={trackValue} onChange={(e) => {
                          const newArr = [...additionalTracking];
                          newArr[index] = e.target.value;
                          setAdditionalTracking(newArr);
                        }} placeholder="AWB Number, URL, or Description" className="w-full border border-gray-300 rounded-xl p-3 pr-10 focus:ring-[#8B5E3C] focus:border-[#8B5E3C] outline-none bg-gray-50" />
                        <button type="button" onClick={() => setAdditionalTracking(prev => prev.filter((_, i) => i !== index))} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={() => setAdditionalTracking(prev => [...prev, ''])} className="flex items-center gap-1 border-2 border-[#8B5E3C] text-[#8B5E3C] font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-[#8B5E3C] hover:text-white transition-colors">
                    <span className="text-lg leading-none">+</span> ADD
                  </button>
                </div>
              )}
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0 gap-3">
              <button type="button" onClick={() => setEditBookingData(null)} className="px-8 py-3 border border-red-200 rounded-full text-[15px] font-bold text-red-600 bg-white hover:bg-red-50 transition-colors shadow-sm uppercase tracking-wide">Cancel</button>
              <button type="submit" className="px-8 py-3 bg-[#8B5E3C] hover:bg-[#7A5234] text-white rounded-full text-[15px] font-bold transition-colors shadow-sm">Save Changes</button>
            </div>
          </form>
        </div>
      )}
      {showAddCourierModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form onSubmit={handleAddCourierSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Add New Courier</h3>
              <button type="button" onClick={() => setShowAddCourierModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Courier Name</label>
                <input type="text" name="courierName" required className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-[#8B5E3C] outline-none" placeholder="e.g. BlueDart" />
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddCourierModal(false)} className="px-4 py-2 text-sm text-gray-600 font-medium">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm bg-[#8B5E3C] text-white rounded-lg font-bold">Add Courier</button>
            </div>
          </form>
        </div>
      )}
      {/* Packing Slip Modal */}
      {showPackingSlipModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#E6DFD4] bg-[#F8F4EC]">
              <h2 className="text-xl font-serif font-bold text-[#8B5E3C]">Print Packing Slips</h2>
              <button onClick={() => setShowPackingSlipModal(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
              <div className="bg-white mx-auto shadow-sm" style={{ width: '100%', maxWidth: '800px' }}>
                <PackingSlip
                  orders={selectedBookings.length > 0 ? filteredBookings.filter(b => selectedBookings.includes(b._id)) : filteredBookings}
                />
              </div>
            </div>

            <div className="p-6 border-t border-[#E6DFD4] bg-white flex justify-end gap-3">
              <button onClick={() => setShowPackingSlipModal(false)} className="px-6 py-2.5 border border-[#E6DFD4] text-[#6D625C] font-bold text-sm rounded-full hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  handlePrint();
                  setShowPackingSlipModal(false);
                }}
                className="px-6 py-2.5 bg-[#8B5E3C] text-white font-bold text-sm rounded-full hover:bg-[#7A5234] transition-colors"
              >
                Print Slips
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          <PackingSlip orders={selectedBookings.length > 0 ? filteredBookings.filter(b => selectedBookings.includes(b._id)) : filteredBookings} />
        </div>
      </div>
    </div>
  );
}
