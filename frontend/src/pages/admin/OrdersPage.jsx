import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { orderService } from '../../api/orderService';
import { Package, Search, Calendar, MapPin, Eye, X, Download, RefreshCw, Gift, SquarePen, Trash2, Save, Printer, FileText } from 'lucide-react';
import Pagination from '../../components/common/Pagination';
import { useReactToPrint } from 'react-to-print';
import { PackingSlip } from '../../components/admin/PackingSlip';
import { downloadExcelFile } from '../../utils/exportUtils';
import toast from 'react-hot-toast';
import OrderPricingSummary from '../../components/OrderPricingSummary';
import CustomDropdown from '../../components/admin/CustomDropdown';
import { OrderBadge } from '../../components/admin/CommonComponents';
import { saveAs } from 'file-saver';
import { formatOrderId, formatPaymentMethod } from '../../utils/formatters';
import { getOrderPricing } from '../../utils/orderPricing';

export default function OrdersPage({ canView = true, canEdit = true, canDelete = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState(false);

  const [couriers, setCouriers] = useState([]);
  const [showNewCourierInput, setShowNewCourierInput] = useState(false);
  const [newCourierName, setNewCourierName] = useState('');

  const [newCourierTrackingUrl, setNewCourierTrackingUrl] = useState('');

  // Shipping Modal State
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [shippingModalOrder, setShippingModalOrder] = useState(null);
  const [shippingTrackingId, setShippingTrackingId] = useState('');
  const [shippingTrackingUrl, setShippingTrackingUrl] = useState('');
  const [shippingAdditionalTracking, setShippingAdditionalTracking] = useState([]);
  const [shippingCourierName, setShippingCourierName] = useState('');

  const [downloadingInvoice, setDownloadingInvoice] = useState(null);

  const handleDownloadInvoice = async (orderId) => {
    try {
      setDownloadingInvoice(orderId);
      const blob = await orderService.downloadInvoice(orderId);
      saveAs(blob, `invoice-${orderId}.pdf`);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to download invoice');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  // Packing Slip State
  const [showPackingSlipModal, setShowPackingSlipModal] = useState(false);
  const packingSlipRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: packingSlipRef,
    documentTitle: 'Packing_Slips',
    pageStyle: `
      @page { size: A4 portrait; margin: 0mm; }
      @media print {
        html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .packing-slip-container { margin: 0 !important; padding: 0 !important; background: white !important; }
      }
    `
  });

  useEffect(() => {
    fetchOrders();
    fetchCouriers();
  }, []);

  // Route-based deep linking: re-open modal on refresh
  useEffect(() => {
    const path = location.pathname;
    if (orders.length === 0) return; // wait until orders are loaded
    if (path.startsWith('/admin/orders/view/')) {
      const id = path.split('/').pop();
      const order = orders.find(o => o._id === id);
      if (order && !showViewModal) {
        setSelectedOrder(order);
        setShowViewModal(true);
      }
    } else if (path.startsWith('/admin/orders/edit/')) {
      const id = path.split('/').pop();
      const order = orders.find(o => o._id === id);
      if (order && !showEditModal) {
        setSelectedOrder(order);
        setEditFormData({
          status: order.status,
          paymentMethod: order.paymentMethod || '',
          isPaid: order.isPaid || false,
          trackingId: order.trackingId || '',
          trackingUrl: order.trackingUrl || '',
          additionalTracking: order.additionalTracking || [],
          shippingAddress: { ...order.shippingAddress }
        });
        setShowEditModal(true);
      }
    }
  }, [location.pathname, orders]);

  const fetchCouriers = async () => {
    try {
      const { courierService } = await import('../../api/courierService');
      const data = await courierService.getCouriers();
      setCouriers(data);
    } catch (error) {
      console.error('Failed to fetch couriers:', error);
    }
  };

  const handleAddCourier = async () => {
    if (!newCourierName.trim()) return;
    try {
      const { courierService } = await import('../../api/courierService');
      const newCourier = await courierService.createCourier(newCourierName, newCourierTrackingUrl);
      setCouriers([...couriers, newCourier]);
      setShippingCourierName(newCourier.name);
      if (editFormData.status === 'Shipping') {
        setEditFormData({ ...editFormData, courierName: newCourier.name });
      }
      setNewCourierName('');
      setNewCourierTrackingUrl('');
      setShowNewCourierInput(false);
      toast.success('Courier added');
    } catch (error) {
      toast.error(error.message || 'Failed to add courier');
    }
  };

  const handleDeleteCourier = async (e, id) => {
    e.stopPropagation();
    try {
      const { courierService } = await import('../../api/courierService');
      await courierService.deleteCourier(id);
      setCouriers(couriers.filter(c => c._id !== id));
      toast.success('Courier deleted');
    } catch (error) {
      toast.error(error.message || 'Failed to delete courier');
    }
  };



  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getAllOrders();
      setOrders(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDelivered = async (orderId) => {
    try {
      await orderService.updateOrderToDelivered(orderId);
      toast.success('Order marked as delivered');
      fetchOrders();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      await orderService.updateOrderStatus(orderId, { status });
      toast.success('Order status updated');
      fetchOrders();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleStatusSelectChange = (order, status) => {
    const normalizedStatus = normalizeOrderStatus(status);
    if (!canAdvanceToStatus(order.status, normalizedStatus)) {
      toast.error('Please update the order status step by step.');
      return;
    }

    if (normalizedStatus === 'Shipping') {
      setShippingModalOrder(order);
      setShippingTrackingId(order.trackingId || '');
      setShippingTrackingUrl(order.trackingUrl || '');
      setShippingAdditionalTracking(order.additionalTracking || []);
      setShippingCourierName(order.courierName || '');
      setShowShippingModal(true);
    } else {
      handleStatusChange(order._id, normalizedStatus);
    }
  };

  const submitShippingDetails = async () => {
    if (!shippingTrackingId || !shippingTrackingUrl || !shippingCourierName) {
      toast.error('Please provide courier, tracking ID, and URL');
      return;
    }
    try {
      setSaving(true);
      await orderService.updateOrderDetails(shippingModalOrder._id, {
        status: 'Shipping',
        trackingId: shippingTrackingId,
        trackingUrl: shippingTrackingUrl,
        additionalTracking: shippingAdditionalTracking,
        courierName: shippingCourierName
      });
      toast.success('Order status updated to Shipping');
      setShowShippingModal(false);
      setShippingModalOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error(error.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowViewModal(true);
    navigate(`/admin/orders/view/${order._id}`);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedOrder(null);
    navigate('/admin/orders');
  };

  const exportOrdersExcel = () => {
    const header = ['Order ID', 'Customer', 'Status', 'Payment Method', 'Total', 'Shipping Name', 'Created At'];
    const rows = orders.map(order => ({
      'Order ID': order._id,
      'Customer': order.user?.name || order.shippingAddress?.fullName || '',
      'Status': order.status || '',
      'Payment Method': order.paymentMethod || '',
      'Total': order.totalPrice != null ? order.totalPrice : '',
      'Shipping Name': order.shippingAddress?.fullName || '',
      'Created At': order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : '',
    }));
    downloadExcelFile('orders', header, rows);
  };

  const handleEditOrder = (order) => {
    setSelectedOrder(order);
    setEditFormData({
      status: order.status,
      paymentMethod: order.paymentMethod || '',
      isPaid: order.isPaid || false,
      trackingId: order.trackingId || '',
      trackingUrl: order.trackingUrl || '',
      additionalTracking: order.additionalTracking || [],
      shippingAddress: { ...order.shippingAddress }
    });
    setShowEditModal(true);
    navigate(`/admin/orders/edit/${order._id}`);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedOrder(null);
    setEditFormData({});
    setIsEditingShipping(false);
    navigate('/admin/orders');
  };

  const handleSaveOrderDetails = async () => {
    try {
      setSaving(true);
      await orderService.updateOrderDetails(selectedOrder._id, editFormData);
      toast.success('Order details updated');
      fetchOrders();
      closeEditModal();
    } catch (error) {
      toast.error(error.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      try {
        await orderService.deleteOrder(orderId);
        toast.success('Order deleted successfully');
        fetchOrders();
      } catch (error) {
        toast.error(error.message || 'Failed to delete order');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected order(s)? This cannot be undone.`)) return;
    try {
      await Promise.all(selectedIds.map(id => orderService.deleteOrder(id)));
      toast.success(`${selectedIds.length} order(s) deleted`);
      setSelectedIds([]);
      fetchOrders();
    } catch (error) {
      toast.error(error.message || 'Failed to delete orders');
    }
  };

  const handleBulkStatus = async (status) => {
    try {
      await Promise.all(selectedIds.map(id => orderService.updateOrderStatus(id, { status })));
      toast.success(`${selectedIds.length} order(s) updated to ${status}`);
      setSelectedIds([]);
      fetchOrders();
    } catch (error) {
      toast.error(error.message || 'Failed to update order status');
    }
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const matchId = (order._id || '').toLowerCase().includes(searchLower);
    const displayId = formatOrderId(order).toLowerCase();
    const matchOrderId = displayId.includes(searchLower) || (order.orderId || '').toLowerCase().includes(searchLower);
    const matchUser = (order.user?.name || '').toLowerCase().includes(searchLower);
    const matchShipping = (order.shippingAddress?.fullName || '').toLowerCase().includes(searchLower);
    const matchPhone = (order.shippingAddress?.phone || order.shippingAddress?.phoneNumber || '').toLowerCase().includes(searchLower);
    const matchEmail = (order.user?.email || '').toLowerCase().includes(searchLower);

    return matchId || matchOrderId || matchUser || matchShipping || matchPhone || matchEmail;
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when search changes
  React.useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const getPaginationPages = (current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? filteredOrders.map(item => item._id) : []);
  };

  const toggleSelectOne = (id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const normalizeOrderStatus = (status) => {
    if (!status) return 'Pending';
    const canonical = String(status).trim();
    const aliases = {
      'Order Placed': 'Placed',
      'Order placed': 'Placed',
      'Out for Delivery': 'Out for delivery',
      'Out for Delivery ': 'Out for delivery',
      'Out For Delivery': 'Out for delivery',
      'out for delivery': 'Out for delivery',
      'Shipped': 'Shipping',
      'Shipped ': 'Shipping',
      'Pending': 'Pending',
      'Delivered': 'Delivered',
      'Cancelled': 'Cancelled',
    };
    return aliases[canonical] || canonical;
  };

  const STATUS_SEQUENCE = ['Pending', 'Placed', 'Packed', 'Shipping', 'Out for delivery', 'Delivered'];

  const getImmediateNextStatus = (currentStatus) => {
    const normalizedCurrentStatus = normalizeOrderStatus(currentStatus);
    const idx = STATUS_SEQUENCE.indexOf(normalizedCurrentStatus);
    if (idx === -1) return null;
    return STATUS_SEQUENCE[idx + 1] || null;
  };

  const canAdvanceToStatus = (currentStatus, targetStatus) => {
    const normalizedCurrentStatus = normalizeOrderStatus(currentStatus);
    const normalizedTargetStatus = normalizeOrderStatus(targetStatus);
    if (!normalizedTargetStatus) return false;
    if (normalizedCurrentStatus === normalizedTargetStatus) return true;
    if (normalizedTargetStatus === 'Cancelled') {
      return normalizedCurrentStatus !== 'Delivered' && normalizedCurrentStatus !== 'Cancelled';
    }
    if (normalizedCurrentStatus === 'Delivered' || normalizedCurrentStatus === 'Cancelled') return false;
    const currentIndex = STATUS_SEQUENCE.indexOf(normalizedCurrentStatus);
    const targetIndex = STATUS_SEQUENCE.indexOf(normalizedTargetStatus);
    if (currentIndex === -1 || targetIndex === -1) return false;
    return targetIndex === currentIndex + 1;
  };

  const getOrderStatusSelectOptions = (currentStatus) => {
    const normalized = normalizeOrderStatus(currentStatus);
    const options = [normalized];
    const nextStatus = getImmediateNextStatus(currentStatus);
    if (nextStatus && normalized !== 'Cancelled' && normalized !== 'Delivered') {
      options.push(nextStatus);
    }
    return options;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return '  text-sm font-semibold text-gray-800';
      case 'Placed': return '  text-sm font-semibold text-gray-800';
      case 'Shipping': return '  text-sm font-semibold text-gray-800';
      case 'Out for delivery': return '  text-sm font-semibold text-gray-800';
      case 'Pending': return '  text-sm font-semibold text-gray-800';
      case 'Packed': return '  text-sm font-semibold text-gray-800';
      case 'Shipped': return '  text-sm font-semibold text-gray-800';
      case 'Delivered': return '  text-sm font-semibold text-gray-800';
      case 'Cancelled': return '  text-sm font-semibold text-gray-800';
      default: return '  text-sm font-semibold text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading orders...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {!(showViewModal || showEditModal) && (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[13px] md:text-sm font-serif text-white mb-1">
                Dashboard &rsaquo; Order Management &rsaquo; <span className="font-semibold text-[#8B5E3C]">Orders</span>
              </p>
              <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Orders Management</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchOrders} className="admin-secondary-btn">
                <RefreshCw size={16} /> Refresh
              </button>
              <button onClick={exportOrdersExcel} className="admin-export-btn">
                <Download size={16} /> Export Excel
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Order ID, Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPackingSlipModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#F8F4EC] text-[#8B5E3C] border border-[#E6DFD4] rounded-xl text-sm font-bold hover:bg-[#F0EAE2] transition-colors"
              >
                <FileText size={16} /> Packing Slip
              </button>
              <button
                onClick={() => {
                  // Slight delay to ensure React commits the hidden ref before printing
                  setTimeout(() => handlePrint(), 100);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#8B5E3C] text-white border border-[#8B5E3C] rounded-xl text-sm font-bold hover:bg-[#7a5234] transition-colors shadow-sm"
              >
                <Printer size={16} /> Print
              </button>
            </div>
          </div>

          <div style={{ display: 'none' }}>
            <PackingSlip
              ref={packingSlipRef}
              orders={selectedIds.length > 0 ? orders.filter(o => selectedIds.includes(o._id)) : filteredOrders}
            />
          </div>

          {/* Selection bar */}
          {selectedIds.length > 0 && (
            <div className="bg-[#F8F4EC] border border-[#E6DFD4] rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-[#8B5E3C]">{selectedIds.length} selected</span>
              <div className="flex gap-2 ml-auto flex-wrap">
                {canEdit && (
                  <>
                    <button onClick={() => handleBulkStatus('Active')} className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Set Active</button>
                    <button onClick={() => handleBulkStatus('Inactive')} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Set Inactive</button>
                  </>
                )}
                {canDelete && (
                  <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">Delete Selected</button>
                )}
                <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-white transition-colors text-gray-500">Clear</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD4] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#F8F4EC] border-b border-[#E6DFD4]">
                  <tr>
                    <th className="px-6 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={filteredOrders.length > 0 && selectedIds.length === filteredOrders.length}
                        onChange={e => toggleSelectAll(e.target.checked)}
                        className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Order ID</th>
                    <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Date</th>
                    <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Customer</th>
                    <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Total</th>
                    <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Payment</th>
                    <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Order Status</th>
                    <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Status</th>
                    <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DFD4]">
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center text-[16px]">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-[#8B5E3C] font-medium">No orders found</p>
                      </td>
                    </tr>
                  ) : paginatedOrders.map((order, idx) => {
                    const pricing = getOrderPricing(order);
                    return (
                      <tr key={order._id} className={`border-b border-[#F0EAE2] transition-colors hover:bg-[#FDF9F5] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(order._id)}
                            onChange={e => toggleSelectOne(order._id, e.target.checked)}
                            className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                          <div className="font-bold text-[16px] text-gray-800 mb-1">{formatOrderId(order)}</div>
                          {order.isGiftOrder && (() => {
                            const giftItems = (order.orderItems || []).filter(item => item.isGift);
                            const noWrapperFee = (order.gift_fee || 0) === 0;
                            const allNoWrapper = (giftItems.length > 0 && giftItems.every(item => item.isGiftWrapper === false)) || noWrapperFee;
                            return (
                              <span className="inline-flex items-center justify-center gap-1.5 px-2 py-1 mt-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#FFF2ED] text-[#D04E26] border border-[#FADCD0] mx-auto">
                                <Gift className="w-3 h-3" />
                                GIFT &amp; CARD {allNoWrapper ? '(NO WRAP)' : ''}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                          <div className="text-[16px] font-semibold text-[#8B5E3C] flex items-center justify-center gap-1 mt-0.5">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                          <div className="font-bold text-[16px] text-gray-800">{order.user?.name || order.shippingAddress?.fullName}</div>
                          <div className="text-[16px] font-semibold text-gray-600 flex items-center justify-center gap-1 mt-1">
                            <MapPin className="w-4 h-4" />
                            {order.shippingAddress?.city}, {order.shippingAddress?.state}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                          <div className="text-[16px] font-bold text-gray-800">₹{pricing.total.toLocaleString()}</div>
                          <div className="text-[16px] font-semibold text-gray-600">{(order.orderItems || []).reduce((acc, item) => acc + (item.qty || 0), 0)} items</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                          {order.paymentMethod === 'COD' ? (
                            <div className="space-y-1">
                              <span className={`px-2.5 py-1 rounded-full text-[14px] font-bold ${normalizeOrderStatus(order.status) === 'Delivered' || order.isPaid ? 'bg-green-100 text-green-700' : order.codAdvance > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                                COD{normalizeOrderStatus(order.status) === 'Delivered' || order.isPaid ? ' (Paid)' : order.codAdvance > 0 ? ' (Partially Paid)' : ' (Unpaid)'}
                              </span>
                              {(order.codAdvance > 0 && normalizeOrderStatus(order.status) !== 'Delivered' && !order.isPaid) && (
                                <div className="text-[16px] font-semibold text-gray-600 space-y-0.5 mt-1">
                                  <div>Paid online: ₹{pricing.advancePayment.toLocaleString()}</div>
                                  <div>Balance due: ₹{pricing.balanceAmount.toLocaleString()}</div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-[14px] font-bold ${order.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {formatPaymentMethod(order.paymentMethod)} {order.isPaid ? '(Paid)' : '(Unpaid)'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                          <OrderBadge status={normalizeOrderStatus(order.status)} size={16} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                          <CustomDropdown
                            disabled={!canEdit || normalizeOrderStatus(order.status) === 'Delivered'}
                            buttonClassName={`px-4 py-1.5 text-sm font-semibold rounded-full border border-[#E6DFD4] ${!canEdit || normalizeOrderStatus(order.status) === 'Delivered' ? 'cursor-not-allowed opacity-50 bg-gray-50' : 'bg-white shadow-sm'}`}
                            dropdownClassName="min-w-[140px] text-left"
                            options={getOrderStatusSelectOptions(order.status).map(status => ({ label: status, value: status }))}
                            value={normalizeOrderStatus(order.status)}
                            onChange={(val) => {
                              if (val) {
                                handleStatusSelectChange(order, val);
                              }
                            }}
                          />
                          {order.courierName && (
                            <div className="mt-2 text-sm font-bold text-[#8B5E3C]">
                              {order.courierName}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                          <div className="flex gap-2 justify-center items-center">
                            {canView && (
                              <button
                                onClick={() => handleViewOrder(order)}
                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                title="View"
                              >
                                <Eye size={16} />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => handleEditOrder(order)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Edit"
                              >
                                <SquarePen size={16} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteOrder(order._id)}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
        </>
      )}

      {showPackingSlipModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#E6DFD4] bg-[#F8F4EC]">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#1C1F2A]">Packing Slip Preview</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedIds.length > 0 ? selectedIds.length : filteredOrders.length} order(s) will be printed
                </p>
              </div>
              <button onClick={() => setShowPackingSlipModal(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 flex flex-col items-center gap-6">
              {/* Render a visual preview of what will be printed */}
              <div className="bg-white shadow-sm border border-gray-200 pointer-events-none origin-top my-10">
                <PackingSlip
                  orders={selectedIds.length > 0 ? orders.filter(o => selectedIds.includes(o._id)) : filteredOrders}
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E6DFD4] bg-white flex justify-end gap-3">
              <button onClick={() => setShowPackingSlipModal(false)} className="px-6 py-2.5 border border-[#E6DFD4] text-[#6D625C] font-bold text-sm rounded-full hover:bg-gray-50 transition-colors">
                Close
              </button>
              <button
                onClick={() => {
                  setShowPackingSlipModal(false);
                  setTimeout(() => handlePrint(), 300);
                }}
                className="px-6 py-2.5 bg-[#8B5E3C] text-white font-bold text-sm rounded-full hover:bg-[#7a5234] transition-colors flex items-center gap-2"
              >
                <Printer size={16} /> Print Now
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedOrder && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[13px] md:text-sm font-serif text-white mb-1">
                Dashboard &rsaquo; Order Management &rsaquo; <span className="font-semibold text-[#8B5E3C]">Details</span>
              </p>
              <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Order Details</h1>
              <p className="text-sm text-gray-500 mt-1">View information for order #{formatOrderId(selectedOrder)}</p>
            </div>
            <button onClick={closeViewModal} className="admin-btn flex items-center gap-2 text-[#6D625C] hover:text-gray-900 transition-colors text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Orders
            </button>
          </div>
          <div className="w-full rounded-3xl bg-white shadow-sm border border-[#E6DFD4] overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Order ID</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.orderId || (selectedOrder._id || '').substring((selectedOrder._id || '').length - 8)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Customer</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.user?.name || selectedOrder.shippingAddress?.fullName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Status</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.status}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-3xl bg-[#F8F4EC] p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Payment Method</p>
                  <p className="mt-2 font-semibold text-gray-900">{selectedOrder.paymentMethod}</p>
                </div>
                <div className="rounded-3xl bg-[#F8F4EC] p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Payment Status</p>
                  <p className="mt-2 font-semibold text-gray-900">{selectedOrder.isPaid ? (selectedOrder.paymentMethod === 'COD' && getOrderPricing(selectedOrder).balanceAmount > 0 ? 'Partially Paid' : 'Paid') : 'Not paid'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Order Items</p>
                <div className="space-y-4">
                  {selectedOrder.orderItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 rounded-3xl border border-[#E6DFD4] p-4 items-center">
                      <div className="h-20 w-20 rounded-3xl overflow-hidden bg-gray-100 flex items-center justify-center">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="text-xs text-gray-400">No Image</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">Qty: {item.qty}</p>
                        {(item.weight && item.weight !== '0' && item.weight !== 0) ? <p className="text-sm text-gray-500">Weight: {item.weight}</p> : null}
                        <p className="text-sm text-gray-500">Subtotal: ₹{((item.price || 0) * (item.qty || 0)).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Unit Price</p>
                        <p className="font-semibold text-gray-900">₹{(item.price || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-3xl bg-[#F8F4EC] p-6">
                  <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Payment Summary</h4>
                  <OrderPricingSummary order={selectedOrder} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-3xl bg-[#F8F4EC] p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-500">From (Seller)</p>
                  <p className="mt-2 font-semibold text-gray-900">Wooden Toys Warehouse</p>
                  <p className="text-sm text-gray-500">12 Craft Street, Coimbatore, Tamil Nadu 641035</p>
                </div>
                <div className="rounded-3xl bg-[#F8F4EC] p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-500">To (Customer)</p>
                  <p className="mt-2 font-semibold text-gray-900">{selectedOrder.user?.name || selectedOrder.shippingAddress?.fullName}</p>
                  <p className="text-sm text-gray-500">
                    {selectedOrder.shippingAddress?.address}<br />
                    {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.pinCode}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-[#F8F4EC] p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Order Status</p>
                  <p className="mt-2 font-semibold text-gray-900">{selectedOrder.status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Payment State</p>
                  <p className="mt-2 font-semibold text-gray-900">{selectedOrder.isPaid ? (selectedOrder.paymentMethod === 'COD' && selectedOrder.balanceAmount > 0 ? 'Partially Paid' : 'Paid') : 'Pending'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Delivery State</p>
                  <p className="mt-2 font-semibold text-gray-900">{selectedOrder.isDelivered ? 'Delivered' : 'Not delivered'}</p>
                </div>
              </div>

              {(selectedOrder.trackingId || selectedOrder.trackingUrl) && (
                <div className="rounded-3xl bg-[#F8F4EC] p-4">
                  <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Tracking Information</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-[#E6DFD4] last:border-0 last:pb-0">
                      {selectedOrder.courierName && (
                        <div>
                          <p className="text-xs uppercase tracking-widest text-gray-500">Courier</p>
                          <p className="mt-1 font-semibold text-gray-900">{selectedOrder.courierName}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs uppercase tracking-widest text-gray-500">Primary Tracking ID</p>
                        <p className="mt-1 font-semibold text-gray-900">{selectedOrder.trackingId || 'N/A'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-widest text-gray-500">Primary Tracking URL</p>
                        <p className="mt-1 font-semibold text-blue-600 break-all">
                          {selectedOrder.trackingUrl ? <a href={selectedOrder.trackingUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{selectedOrder.trackingUrl}</a> : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {selectedOrder.additionalTracking && selectedOrder.additionalTracking.map((pkg, idx) => pkg.trackingUrl && (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-[#E6DFD4] last:border-0 last:pb-0">
                        <div></div>
                        <div className="md:col-span-2">
                          <p className="text-xs uppercase tracking-widest text-gray-500">Additional Details {idx + 1}</p>
                          <p className="mt-1 font-semibold break-all">
                            {pkg.trackingUrl.startsWith('http') ? (
                              <a href={pkg.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{pkg.trackingUrl}</a>
                            ) : (
                              <span className="text-gray-900">{pkg.trackingUrl}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedOrder.isGiftOrder && (
                <div className="rounded-3xl border border-[#D04E26] bg-[#FDF0EB] p-4 mt-6">
                  <h4 className="text-sm font-bold text-[#D04E26] mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Gift size={16} /> Gift & Card Details {(() => {
                      const giftItems = (selectedOrder.orderItems || []).filter(item => item.isGift);
                      const allNoWrapper = giftItems.length > 0 && giftItems.every(item => item.isGiftWrapper === false);
                      return allNoWrapper ? '(NO WRAPPER)' : '';
                    })()}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-500">Message</p>
                      <p className="font-semibold text-gray-900">{selectedOrder.giftMessage || 'No message'}</p>
                      {selectedOrder.giftMessageStyle && <p className="text-xs text-gray-500 mt-1">Style: {selectedOrder.giftMessageStyle}</p>}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-500">Scheduled Date</p>
                      <p className="font-semibold text-gray-900">{selectedOrder.scheduledDeliveryDate ? new Date(selectedOrder.scheduledDeliveryDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    {selectedOrder.giftWrapping?.enabled && (
                      <div className="col-span-1 md:col-span-2 mt-2 pt-2 border-t border-[#F2CBBF]">
                        <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Gift Box Info</p>
                        <div className="flex gap-4">
                          <p className="text-sm text-gray-700">Volume: <span className="font-semibold">{selectedOrder.giftWrapping.volume} cm³</span></p>
                          <p className="text-sm text-gray-700">Size: <span className="font-semibold">{selectedOrder.giftWrapping.boxSize}</span></p>
                          <p className="text-sm text-gray-700">Fee: <span className="font-semibold text-green-600">₹{selectedOrder.giftWrapping.giftFee}</span></p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedOrder && (
        <div className="flex flex-col min-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div>
              <p className="text-[13px] md:text-sm font-serif text-white mb-1">
                Dashboard &rsaquo; Order Management &rsaquo; <span className="font-semibold text-[#8B5E3C]">Edit</span>
              </p>
              <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Edit Order Details</h1>
              <p className="text-sm text-gray-500 mt-1">Update information for order #{formatOrderId(selectedOrder)}</p>
            </div>
            <button onClick={closeEditModal} className="admin-btn flex items-center gap-2 text-[#6D625C] hover:text-gray-900 transition-colors text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Orders
            </button>
          </div>
          <div className="w-full rounded-3xl bg-white shadow-sm border border-[#E6DFD4] overflow-hidden flex flex-col flex-1">

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Top Read-Only Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Order ID</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.orderId || (selectedOrder._id || '').substring((selectedOrder._id || '').length - 8)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Customer</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.user?.name || selectedOrder.shippingAddress?.fullName}</p>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="rounded-3xl bg-[#F8F4EC] p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Shipping To</p>
                  <button
                    onClick={() => setIsEditingShipping(!isEditingShipping)}
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                    title={isEditingShipping ? 'Cancel Edit' : 'Edit Shipping Address'}
                  >
                    <SquarePen className="w-4 h-4" />
                  </button>
                </div>
                {isEditingShipping ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Full Name"
                      className="w-full px-3 py-2 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 text-sm"
                      value={editFormData.shippingAddress?.fullName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, shippingAddress: { ...editFormData.shippingAddress, fullName: e.target.value } })}
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      className="w-full px-3 py-2 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 text-sm"
                      value={editFormData.shippingAddress?.phone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, shippingAddress: { ...editFormData.shippingAddress, phone: e.target.value } })}
                    />
                    <textarea
                      placeholder="Address"
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 text-sm resize-none"
                      value={editFormData.shippingAddress?.address || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, shippingAddress: { ...editFormData.shippingAddress, address: e.target.value } })}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="City"
                        className="w-full px-3 py-2 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 text-sm"
                        value={editFormData.shippingAddress?.city || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, shippingAddress: { ...editFormData.shippingAddress, city: e.target.value } })}
                      />
                      <input
                        type="text"
                        placeholder="State"
                        className="w-full px-3 py-2 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 text-sm"
                        value={editFormData.shippingAddress?.state || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, shippingAddress: { ...editFormData.shippingAddress, state: e.target.value } })}
                      />
                      <input
                        type="text"
                        placeholder="PIN"
                        className="w-full px-3 py-2 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 text-sm"
                        value={editFormData.shippingAddress?.pinCode || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, shippingAddress: { ...editFormData.shippingAddress, pinCode: e.target.value } })}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold text-gray-900">{editFormData.shippingAddress?.fullName || selectedOrder.user?.name}</p>
                    {editFormData.shippingAddress?.phone && <p className="text-sm text-gray-500">{editFormData.shippingAddress.phone}</p>}
                    <p className="text-sm text-gray-500 mt-1">
                      {editFormData.shippingAddress?.address}<br />
                      {editFormData.shippingAddress?.city}, {editFormData.shippingAddress?.state} {editFormData.shippingAddress?.pinCode}
                    </p>
                  </>
                )}
              </div>

              {/* Order Items (Read Only) */}
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Order Items</p>
                <div className="space-y-4">
                  {(selectedOrder.orderItems || []).map((item, index) => (
                    <div key={index} className="rounded-3xl border border-[#E6DFD4] overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 p-4 items-center bg-white">
                        <div className="h-16 w-16 rounded-3xl overflow-hidden bg-gray-100 flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="text-xs text-gray-400">No Image</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.qty} {(item.weight && item.weight !== '0') && `| Weight: ${item.weight}`}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Unit Price</p>
                          <p className="font-semibold text-gray-900">₹{(item.price || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      {item.isGift && (
                        <div className="bg-[#FAF4EF] p-4 border-t border-[#E6DFD4]">
                          <h4 className="text-[11px] font-bold text-[#141225] uppercase tracking-widest mb-3">GIFT PREFERENCES</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <p className="text-[16px]"><span className="font-bold text-[#6D625C]">Order Date:</span> {selectedOrder?.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString() : 'N/A'}</p>
                              <p className="text-[16px]"><span className="font-bold text-[#6D625C]">Delivery Date:</span> {(item.deliveryDate || selectedOrder?.deliveryDate) ? new Date(item.deliveryDate || selectedOrder.deliveryDate).toLocaleDateString() : 'Standard'}</p>
                              <p className="text-[16px]"><span className="font-bold text-[#6D625C]">Style:</span> {item.giftMessageStyle || 'Classic'}</p>
                              <p className="text-[16px]"><span className="font-bold text-[#6D625C]">Wrapper:</span> {item.isGiftWrapper ? 'Premium Wrapping' : 'No Wrapper'}</p>
                            </div>
                            <div>
                              <p className="text-[16px] font-bold text-[#6D625C] mb-1">Message:</p>
                              <div className={`w-full bg-white border border-[#E9DED3] p-3 rounded-sm min-h-[60px] text-gray-700 ${item.giftMessageStyle === 'Classic' ? 'font-serif text-[16px]' : item.giftMessageStyle === 'Elegant' ? 'font-script italic text-base' : 'font-sans tracking-wide text-[16px]'}`}>
                                {item.giftMessage || 'No message provided'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Totals Summary */}
              <div className="mt-4 rounded-3xl bg-[#F8F4EC] p-4">
                <OrderPricingSummary order={selectedOrder} />
              </div>

              <hr className="border-[#E6DFD4]" />

              {/* Editable Fields Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Update Order Status</h3>
                  <CustomDropdown
                    disabled={normalizeOrderStatus(selectedOrder?.status || editFormData.status) === 'Delivered' || normalizeOrderStatus(selectedOrder?.status || editFormData.status) === 'Cancelled'}
                    buttonClassName="w-full px-4 py-2.5 rounded-xl border border-[#E6DFD4] bg-white text-left text-[16px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30"
                    dropdownClassName="w-full mt-1 text-left"
                    value={normalizeOrderStatus(editFormData.status || selectedOrder?.status)}
                    options={getOrderStatusSelectOptions(selectedOrder?.status || editFormData.status).map(statusOption => ({ label: statusOption, value: statusOption }))}
                    onChange={(val) => {
                      if (!val) return;
                      if (!canAdvanceToStatus(selectedOrder?.status || editFormData.status, val)) {
                        toast.error('Please update the order status step by step.');
                        return;
                      }
                      setEditFormData({ ...editFormData, status: val });
                    }}
                  />
                </div>

                {editFormData.status === 'Shipping' && (
                  <div className="mt-4 p-4 bg-[#F8F4EC] rounded-2xl border border-[#E6DFD4] space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Primary Tracking ID</label>
                        <input
                          type="text"
                          placeholder="e.g. AWB123456789"
                          className="w-full px-4 py-2 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30"
                          value={editFormData.trackingId}
                          onChange={(e) => setEditFormData({ ...editFormData, trackingId: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Primary Tracking URL</label>
                        <input
                          type="url"
                          placeholder="https://tracker.example.com/..."
                          className="w-full px-4 py-2 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30"
                          value={editFormData.trackingUrl || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, trackingUrl: e.target.value })}
                        />
                      </div>
                    </div>

                    {editFormData.additionalTracking && editFormData.additionalTracking.map((pkg, idx) => (
                      <div key={idx} className="relative mt-2">
                        <input
                          type="url"
                          placeholder="https://tracker.example.com/..."
                          className="w-full pl-4 pr-10 py-2 text-sm rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30"
                          value={pkg.trackingUrl}
                          onChange={(e) => {
                            const newArr = [...editFormData.additionalTracking];
                            newArr[idx].trackingUrl = e.target.value;
                            setEditFormData({ ...editFormData, additionalTracking: newArr });
                          }}
                        />
                        <button
                          onClick={() => {
                            const newArr = [...editFormData.additionalTracking];
                            newArr.splice(idx, 1);
                            setEditFormData({ ...editFormData, additionalTracking: newArr });
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Remove Field"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => setEditFormData({
                        ...editFormData,
                        additionalTracking: [...(editFormData.additionalTracking || []), { trackingId: '', trackingUrl: '' }]
                      })}
                      className="text-xs font-bold text-[#8B5E3C] hover:text-[#7a5234] inline-flex items-center gap-1 mt-2"
                    >
                      + ADD
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[#E6DFD4] p-6 flex justify-end gap-3 bg-gray-50 shrink-0">
              <button
                onClick={closeEditModal}
                className="admin-cancel-btn"
                disabled={saving}
              >CANCEL</button>
              <button
                onClick={() => handleDownloadInvoice(selectedOrder._id)}
                className="admin-btn flex items-center gap-2 px-4 py-2 bg-[#F8F4EC] text-[#8B5E3C] border border-[#E6DFD4]"
                disabled={downloadingInvoice === selectedOrder._id}
              >
                <Download className="w-4 h-4" />
                {downloadingInvoice === selectedOrder._id ? 'Downloading...' : 'Invoice'}
              </button>
              <button
                onClick={handleSaveOrderDetails}
                className="admin-btn"
                disabled={saving}
              >
                {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShippingModal && shippingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#E6DFD4] bg-[#F8F4EC] shrink-0">
              <h2 className="text-2xl font-serif font-bold text-[#141225]">Enter Shipping Details</h2>
              <button onClick={() => setShowShippingModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] custom-scrollbar bg-white">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1 font-bold">Order ID</p>
                <p className="font-serif font-bold text-lg text-[#141225]">{shippingModalOrder.orderId || shippingModalOrder._id.substring(shippingModalOrder._id.length - 8)}</p>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-bold text-gray-600">Courier</label>
                  {!showNewCourierInput && (
                    <button onClick={() => setShowNewCourierInput(true)} className="text-[11px] font-bold text-[#8B5E3C] hover:text-[#7a5234] uppercase">
                      + ADD COURIER
                    </button>
                  )}
                </div>

                {showNewCourierInput ? (
                  <div className="flex flex-col gap-3 p-4 bg-[#FDF9F5] rounded-2xl border border-[#E9DED3]">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Courier Name (e.g. ST Courier)"
                        className="w-full px-4 py-3 text-sm rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 bg-white shadow-sm"
                        value={newCourierName}
                        onChange={(e) => setNewCourierName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="Tracking Base URL (Optional)"
                        className="w-full px-4 py-3 text-sm rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 bg-white shadow-sm"
                        value={newCourierTrackingUrl}
                        onChange={(e) => setNewCourierTrackingUrl(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-center gap-3 mt-2">
                      <button
                        onClick={() => { setShowNewCourierInput(false); setNewCourierName(''); setNewCourierTrackingUrl(''); }}
                        className="px-6 py-2.5 border border-red-200 rounded-full text-[13px] font-bold text-red-600 bg-white hover:bg-red-50 transition-colors shadow-sm uppercase tracking-wide"
                      >
                        CANCEL
                      </button>
                      <button
                        onClick={handleAddCourier}
                        className="px-6 py-2.5 rounded-full bg-[#8B5E3C] hover:bg-[#724C30] text-white text-[13px] font-bold uppercase tracking-wide transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <Save className="w-4 h-4" /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <select
                      className="w-full px-4 py-3 text-sm rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 appearance-none pr-10 bg-gray-50 hover:bg-white transition-colors"
                      value={shippingCourierName}
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        setShippingCourierName(selectedName);
                        const selectedCourier = couriers.find(c => c.name === selectedName);
                        if (selectedCourier && selectedCourier.trackingUrl) {
                          setShippingTrackingUrl(selectedCourier.trackingUrl);
                        }
                      }}
                    >
                      <option value="">Select Courier</option>
                      {shippingModalOrder?.courierName && !couriers.find(c => c.name === shippingModalOrder.courierName) && (
                        <option value={shippingModalOrder.courierName}>{shippingModalOrder.courierName}</option>
                      )}
                      {couriers.map(c => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    {shippingCourierName && couriers.find(c => c.name === shippingCourierName) && (
                      <button
                        onClick={(e) => handleDeleteCourier(e, couriers.find(c => c.name === shippingCourierName)._id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete this courier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Primary Tracking ID</label>
                <input
                  type="text"
                  placeholder="e.g. AWB123456789"
                  className="w-full px-4 py-3 text-sm rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 bg-white"
                  value={shippingTrackingId}
                  onChange={(e) => setShippingTrackingId(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">
                  PRIMARY TRACKING URL
                </label>
                <div className="space-y-3">
                  <input
                    type="url"
                    placeholder="https://tracker.example.com/..."
                    className="w-full px-4 py-3 text-sm rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 bg-white"
                    value={shippingTrackingUrl}
                    onChange={(e) => setShippingTrackingUrl(e.target.value)}
                  />
                  {shippingAdditionalTracking.map((pkg, idx) => (
                    <div key={idx} className="relative group">
                      <input
                        type="text"
                        placeholder="AWB Number, URL, or Description"
                        className="w-full px-4 py-3 pr-10 text-sm rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 bg-white"
                        value={pkg.trackingUrl || ''}
                        onChange={(e) => {
                          const newArr = [...shippingAdditionalTracking];
                          newArr[idx].trackingUrl = e.target.value;
                          setShippingAdditionalTracking(newArr);
                        }}
                      />
                      <button
                        onClick={() => {
                          const newArr = [...shippingAdditionalTracking];
                          newArr.splice(idx, 1);
                          setShippingAdditionalTracking(newArr);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove URL"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShippingAdditionalTracking([...shippingAdditionalTracking, { trackingUrl: '' }])}
                  className="text-xs font-bold text-[#8B5E3C] hover:text-[#7a5234] mt-3 inline-flex items-center gap-1 uppercase"
                >
                  <span className="text-lg leading-none">+</span> ADD
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#E6DFD4] p-6 flex justify-center gap-4 bg-[#FAFAFA] shrink-0">
              <button
                onClick={() => setShowShippingModal(false)}
                className="px-8 py-3 border border-red-200 rounded-full text-[15px] font-bold text-red-600 bg-white hover:bg-red-50 transition-colors shadow-sm uppercase tracking-wide"
                disabled={saving}
              >
                CANCEL
              </button>
              <button
                onClick={submitShippingDetails}
                className="px-8 py-3 rounded-full bg-[#8B5E3C] hover:bg-[#724C30] text-white text-[15px] font-bold uppercase tracking-wide transition-colors shadow-sm flex items-center justify-center gap-2"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save & Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

