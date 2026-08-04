import React, { useState, useEffect } from 'react';
import { orderService } from '../../api/orderService';
import { Package, Search, Calendar, MapPin, Eye, X, Download, RefreshCw, Gift, SquarePen, Trash, Save } from 'lucide-react';
import { downloadExcelFile } from '../../utils/exportUtils';
import toast from 'react-hot-toast';
import OrderPricingSummary from '../../components/OrderPricingSummary';

export default function OrdersPage({ canView = true, canEdit = true, canDelete = true }) {
  const [orders, setOrders] = useState([]);
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

  useEffect(() => {
    fetchOrders();
    fetchCouriers();
  }, []);

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

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedOrder(null);
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
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedOrder(null);
    setEditFormData({});
    setIsEditingShipping(false);
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


  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const matchId = order._id?.toLowerCase().includes(searchLower);
    const matchUser = (order.user?.name || '').toLowerCase().includes(searchLower);
    const matchShipping = (order.shippingAddress?.fullName || '').toLowerCase().includes(searchLower);
    
    return matchId || matchUser || matchShipping;
  });

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
      case 'Paid': return 'bg-green-100 text-green-700';
      case 'Placed': return 'bg-yellow-100 text-yellow-700';
      case 'Shipping': return 'bg-sky-100 text-sky-700';
      case 'Out for delivery': return 'bg-purple-100 text-purple-700';
      case 'Pending': return 'bg-amber-100 text-amber-700';
      case 'Packed': return 'bg-blue-100 text-blue-700';
      case 'Shipped': return 'bg-violet-100 text-violet-700';
      case 'Delivered': return 'bg-green-100 text-green-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading orders...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {!(showViewModal || showEditModal) && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500">View and manage customer orders</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <button onClick={fetchOrders} className="admin-secondary-btn">
            <RefreshCw size={16} /> Refresh
          </button>
          <div className="relative w-full sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by Order ID or Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 w-full"
            />
          </div>
          <button onClick={exportOrdersExcel} className="admin-export-btn self-start sm:self-auto">
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E6DFD4] text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4">Order ID & Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6DFD4]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No orders found</p>
                  </td>
                </tr>
              ) : filteredOrders.map(order => (
                <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-sm font-bold text-gray-900 mb-1">{(order._id || '').substring((order._id || '').length - 8)}</div>
                    {order.isGiftOrder && (() => {
                      const giftItems = (order.orderItems || []).filter(item => item.isGift);
                      const noWrapperFee = (order.gift_fee || 0) === 0;
                      const allNoWrapper = (giftItems.length > 0 && giftItems.every(item => item.isGiftWrapper === false)) || noWrapperFee;
                      return (
                        <span className="mb-2 inline-flex items-center gap-1 rounded bg-[#FDF0EB] px-2 py-0.5 text-[10px] font-bold text-[#D04E26] uppercase tracking-wider">
                          <Gift className="w-3 h-3" />
                          GIFT & CARD {allNoWrapper ? '(NO WRAPPER)' : ''}
                        </span>
                      );
                    })()}
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{order.user?.name || order.shippingAddress?.fullName}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {order.shippingAddress?.city}, {order.shippingAddress?.state}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">₹{(order.totalPrice || 0).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{(order.orderItems || []).reduce((acc, item) => acc + (item.qty || 0), 0)} items</div>
                  </td>
                  <td className="px-6 py-4">
                    {order.paymentMethod === 'COD' ? (
                      <div className="space-y-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${order.codAdvance > 0 ? 'bg-yellow-100 text-yellow-700' : order.isPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          COD{order.codAdvance > 0 ? ' (Partially Paid)' : ''}
                        </span>
                        {order.codAdvance > 0 && (
                          <div className="text-xs text-gray-500 space-y-0.5">
                            <div>Paid online: ₹{(order.codAdvance || 0).toLocaleString()}</div>
                            <div>Balance due: ₹{(order.balanceAmount ?? 0).toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${order.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {order.paymentMethod} {order.isPaid ? '(Paid)' : '(Unpaid)'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center rounded-full border border-[#E6DFD4] bg-white shadow-sm">
                      <select
                        className={`appearance-none bg-transparent px-4 py-2 text-sm font-semibold text-gray-900 rounded-full focus:outline-none ${!canEdit || normalizeOrderStatus(order.status) === 'Delivered' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        value={normalizeOrderStatus(order.status)}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            handleStatusSelectChange(order, val);
                          }
                        }}
                        disabled={!canEdit || normalizeOrderStatus(order.status) === 'Delivered' || normalizeOrderStatus(order.status) === 'Cancelled'}
                      >
                        {getOrderStatusSelectOptions(order.status).map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {statusOption}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none px-3 text-gray-500">▾</span>
                    </div>
                    {order.courierName && (
                      <div className="mt-2 text-xs font-bold text-[#8B5E3C]">
                        {order.courierName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    {canView && (
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="text-green-600 hover:text-green-700 transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                        title="Edit"
                      >
                        <SquarePen className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteOrder(order._id)}
                        className="text-red-500 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}


      {showViewModal && selectedOrder && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
              <p className="text-sm text-gray-500">View information for order #{(selectedOrder._id || '').substring((selectedOrder._id || '').length - 8)}</p>
            </div>
            <button onClick={closeViewModal} className="flex items-center gap-2 px-3 py-1.5 text-[#6D625C] hover:text-[#9A6031] hover:bg-[#F2E3D1] rounded-lg transition-colors font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Orders
            </button>
          </div>
          <div className="w-full rounded-3xl bg-white shadow-sm border border-[#E6DFD4] overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Order ID</p>
                  <p className="font-semibold text-gray-900">{(selectedOrder._id || '').substring((selectedOrder._id || '').length - 8)}</p>
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
                  <p className="mt-2 font-semibold text-gray-900">{selectedOrder.isPaid ? (selectedOrder.paymentMethod === 'COD' && selectedOrder.balanceAmount > 0 ? 'Partially Paid' : 'Paid') : 'Not paid'}</p>
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
                    {selectedOrder.additionalTracking && selectedOrder.additionalTracking.map((pkg, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-[#E6DFD4] last:border-0 last:pb-0">
                        <div className="md:col-span-2">
                          <p className="text-xs uppercase tracking-widest text-gray-500">Field {idx + 1} - Tracking URL</p>
                          <p className="mt-1 font-semibold text-blue-600 break-all">
                            {pkg.trackingUrl ? <a href={pkg.trackingUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{pkg.trackingUrl}</a> : 'N/A'}
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
              <h1 className="text-2xl font-bold text-gray-900">Edit Order Details</h1>
              <p className="text-sm text-gray-500">Update information for order #{(selectedOrder._id || '').substring((selectedOrder._id || '').length - 8)}</p>
            </div>
            <button onClick={closeEditModal} className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-700 bg-white border border-[#E6DFD4] hover:bg-gray-50 transition-colors font-semibold text-sm">
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
                  <p className="font-semibold text-gray-900">{(selectedOrder._id || '').substring((selectedOrder._id || '').length - 8)}</p>
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
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 rounded-3xl border border-[#E6DFD4] p-4 items-center">
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
                  <select
                    className="w-full px-4 py-2 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 bg-white"
                    value={normalizeOrderStatus(editFormData.status || selectedOrder?.status)}
                    onChange={(e) => {
                      const selectedStatus = e.target.value;
                      if (!canAdvanceToStatus(selectedOrder?.status || editFormData.status, selectedStatus)) {
                        toast.error('Please update the order status step by step.');
                        return;
                      }
                      setEditFormData({ ...editFormData, status: selectedStatus });
                    }}
                    disabled={normalizeOrderStatus(selectedOrder?.status || editFormData.status) === 'Delivered' || normalizeOrderStatus(selectedOrder?.status || editFormData.status) === 'Cancelled'}
                  >
                    {getOrderStatusSelectOptions(selectedOrder?.status || editFormData.status).map((statusOption) => (
                      <option key={statusOption} value={statusOption}>
                        {statusOption}
                      </option>
                    ))}
                  </select>
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
                className="px-6 py-2 rounded-xl font-bold text-gray-700 bg-white border border-[#E6DFD4] hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveOrderDetails} 
                className="px-6 py-2 rounded-xl font-bold text-white bg-[#8B5E3C] hover:bg-[#7a5234] transition-colors flex items-center gap-2"
                disabled={saving}
              >
                {saving ? 'Saving...' : <><Save className="w-4 h-4"/> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShippingModal && shippingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6DFD4]">
              <h2 className="text-lg font-bold text-gray-900">Enter Shipping Details</h2>
              <button onClick={() => setShowShippingModal(false)} className="text-red-500 hover:text-red-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Order ID</p>
                <p className="font-semibold text-gray-900">{shippingModalOrder._id.substring(shippingModalOrder._id.length - 8)}</p>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-500">Courier</label>
                  {!showNewCourierInput && (
                    <button onClick={() => setShowNewCourierInput(true)} className="text-[10px] font-bold text-[#8B5E3C] hover:text-[#7a5234]">
                      + ADD COURIER
                    </button>
                  )}
                </div>
                
                {showNewCourierInput ? (
                  <div className="flex flex-col gap-2 p-3 bg-[#F8F4EC] rounded-xl border border-[#E6DFD4]">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Courier Name (e.g. ST Courier)"
                        className="w-full px-4 py-2 text-sm rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30"
                        value={newCourierName}
                        onChange={(e) => setNewCourierName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="Tracking Base URL (Optional)"
                        className="w-full px-4 py-2 text-sm rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30"
                        value={newCourierTrackingUrl}
                        onChange={(e) => setNewCourierTrackingUrl(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-1">
                      <button onClick={() => { setShowNewCourierInput(false); setNewCourierName(''); setNewCourierTrackingUrl(''); }} className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs font-bold rounded-lg hover:bg-gray-50">
                        Cancel
                      </button>
                      <button onClick={handleAddCourier} className="px-3 py-1.5 bg-[#8B5E3C] text-white text-xs font-bold rounded-lg hover:bg-[#7a5234] flex items-center gap-1">
                        <Save className="w-3 h-3" /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <select
                      className="w-full px-4 py-2 text-sm rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 appearance-none pr-10"
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
                      {couriers.map(c => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    {shippingCourierName && couriers.find(c => c.name === shippingCourierName) && (
                      <button 
                        onClick={(e) => handleDeleteCourier(e, couriers.find(c => c.name === shippingCourierName)._id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete this courier"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Primary Tracking ID</label>
                <input
                  type="text"
                  placeholder="e.g. AWB123456789"
                  className="w-full px-4 py-2 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30"
                  value={shippingTrackingId}
                  onChange={(e) => setShippingTrackingId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Primary Tracking URL</label>
                <input
                  type="url"
                  placeholder="https://tracker.example.com/..."
                  className="w-full px-4 py-2 rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30"
                  value={shippingTrackingUrl}
                  onChange={(e) => setShippingTrackingUrl(e.target.value)}
                />
              </div>

              {shippingAdditionalTracking.map((pkg, idx) => (
                <div key={idx} className="relative mt-2">
                  <input
                    type="url"
                    placeholder="https://tracker.example.com/..."
                    className="w-full pl-4 pr-10 py-2 text-sm rounded-xl border border-[#E6DFD4] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30"
                    value={pkg.trackingUrl}
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Remove Field"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                onClick={() => setShippingAdditionalTracking([...shippingAdditionalTracking, { trackingId: '', trackingUrl: '' }])}
                className="text-xs font-bold text-[#8B5E3C] hover:text-[#7a5234] mt-2 inline-flex items-center gap-1"
              >
                + ADD
              </button>
            </div>
            
            <div className="border-t border-[#E6DFD4] p-6 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setShowShippingModal(false)} 
                className="px-6 py-2 rounded-xl font-bold text-gray-700 bg-white border border-[#E6DFD4] hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={submitShippingDetails} 
                className="px-6 py-2 rounded-xl font-bold text-white bg-[#8B5E3C] hover:bg-[#7a5234] transition-colors flex items-center gap-2"
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

