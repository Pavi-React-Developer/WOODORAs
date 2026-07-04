import React, { useState, useEffect } from 'react';
import { orderService, ORDER_STATUS_OPTIONS } from '../../api/orderService';
import { Package, Search, Calendar, MapPin, Eye, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

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

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedOrder(null);
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const matchId = order._id?.toLowerCase().includes(searchLower);
    const matchUser = (order.user?.name || '').toLowerCase().includes(searchLower);
    const matchShipping = (order.shippingAddress?.fullName || '').toLowerCase().includes(searchLower);
    
    return matchId || matchUser || matchShipping;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-700';
      case 'Placed': return 'bg-yellow-100 text-yellow-700';
      case 'Shipping': return 'bg-sky-100 text-sky-700';
      case 'Out for delivery': return 'bg-purple-100 text-purple-700';
      case 'Pending': return 'bg-amber-100 text-amber-700';
      case 'Processing': return 'bg-blue-100 text-blue-700';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500">View and manage customer orders</p>
        </div>
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by Order ID or Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 w-full sm:w-64"
          />
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
                    <div className="font-mono text-sm font-bold text-gray-900 mb-1">{order._id.substring(order._id.length - 8)}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{order.shippingAddress?.fullName || order.user?.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {order.shippingAddress?.city}, {order.shippingAddress?.state}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">₹{order.totalPrice.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{order.orderItems.length} items</div>
                  </td>
                  <td className="px-6 py-4">
                    {order.paymentMethod === 'COD' ? (
                      <div className="space-y-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${order.codAdvance > 0 ? 'bg-yellow-100 text-yellow-700' : order.isPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          COD{order.codAdvance > 0 ? ' (Partially Paid)' : ''}
                        </span>
                        {order.codAdvance > 0 && (
                          <div className="text-xs text-gray-500 space-y-0.5">
                            <div>Paid online: ₹{order.codAdvance.toLocaleString()}</div>
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
                        className="appearance-none bg-transparent px-4 py-2 text-sm font-semibold text-gray-900 rounded-full focus:outline-none"
                        value={order.status}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                      >
                        {ORDER_STATUS_OPTIONS.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {statusOption}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none px-3 text-gray-500">▾</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => handleViewOrder(order)}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#E6DFD4] bg-white text-gray-700 hover:bg-[#f9fafb] transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toast('Delete action selected')}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#E6DFD4] bg-white text-gray-700 hover:bg-[#f9fafb] transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6DFD4]">
              <h2 className="text-lg font-bold text-gray-900">Order Details</h2>
              <button onClick={closeViewModal} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Order ID</p>
                  <p className="font-semibold text-gray-900">{selectedOrder._id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Customer</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.shippingAddress?.fullName || selectedOrder.user?.name}</p>
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
                  <p className="mt-2 font-semibold text-gray-900">{selectedOrder.isPaid ? 'Paid' : 'Not paid'}</p>
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
                        {item.weight && <p className="text-sm text-gray-500">Weight: {item.weight}</p>}
                        <p className="text-sm text-gray-500">Subtotal: ₹{(item.price * item.qty).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Unit Price</p>
                        <p className="font-semibold text-gray-900">₹{item.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-3xl bg-[#F8F4EC] p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500">Subtotal</p>
                    <p className="mt-2 font-semibold text-gray-900">₹{selectedOrder.itemsPrice?.toLocaleString() ?? selectedOrder.totalPrice.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500">Paid Amount</p>
                    <p className="mt-2 font-semibold text-gray-900">₹{(selectedOrder.codAdvance || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500">Balance Amount</p>
                    <p className="mt-2 font-semibold text-gray-900">₹{(selectedOrder.balanceAmount || 0).toLocaleString()}</p>
                  </div>
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
                  <p className="mt-2 font-semibold text-gray-900">{selectedOrder.shippingAddress?.fullName || selectedOrder.user?.name}</p>
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
                  <p className="mt-2 font-semibold text-gray-900">{selectedOrder.isPaid ? 'Paid' : 'Pending'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Delivery State</p>
                  <p className="mt-2 font-semibold text-gray-900">{selectedOrder.isDelivered ? 'Delivered' : 'Not delivered'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

