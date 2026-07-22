import React, { useState, useEffect } from 'react';
import { orderService } from '../api/orderService';
import { ShoppingBag, Loader2, Package, Calendar, MapPin, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrderHistoryPage({ onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getMyOrders();
      setOrders(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayStatus = (order) => (order.isPaid ? 'Paid' : order.status);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Packed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Shipped': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EC] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#8B5E3C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4EC] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#8B5E3C] shadow-sm">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
            <p className="text-sm text-gray-500">Track and manage your previous orders</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD4] p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-6">Looks like you haven't placed any orders yet.</p>
            <button
              onClick={() => onNavigate('/')}
              className="px-6 py-3 bg-[#8B5E3C] text-white rounded-xl font-bold hover:bg-[#7a5234] transition-colors"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-3xl shadow-sm border border-[#E6DFD4] overflow-hidden">
                {/* Order Header */}
                <div className="bg-gray-50/80 p-5 sm:px-8 border-b border-[#E6DFD4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Order Placed</p>
                      <p className="font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#8B5E3C]" />
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Total</p>
                      <p className="font-black text-gray-900">₹{order.totalPrice.toLocaleString()}</p>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Ship To</p>
                      <p className="font-bold text-[#8B5E3C] flex items-center gap-1 cursor-help" title={order.shippingAddress.address}>
                        <MapPin className="w-4 h-4" /> {order.shippingAddress.fullName.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <button 
                        onClick={() => onNavigate(`/order-success/${order._id}`)}
                        className="text-sm font-bold text-[#8B5E3C] hover:text-[#7a5234] flex items-center gap-1"
                      >
                        View Details <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                    {order.trackingId && (
                      <div className="text-right mt-1">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Tracking ID: <span className="text-gray-900 font-bold">{order.trackingId}</span></p>
                        {order.trackingUrl && (
                          <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 justify-end">
                            Track <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-5 sm:px-8 divide-y divide-[#E6DFD4]/50">
                  {order.orderItems.map((item, index) => (
                    <div key={index} className="py-4 flex gap-4 sm:gap-6 items-center">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#F8F4EC] rounded-2xl overflow-hidden shrink-0">
                        {item.image ? (
                          <img src={item.image.startsWith('http') || item.image.startsWith('data:') ? item.image : (item.image.startsWith('/uploads') || item.image.startsWith('uploads/')) ? `http://localhost:5000${item.image.startsWith('/') ? '' : '/'}${item.image}` : item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200"></div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-gray-800 line-clamp-2">{item.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">Qty: <span className="font-semibold text-gray-700">{item.qty}</span></p>
                          {(item.weight && item.weight !== '0' && item.weight !== 0) ? <p className="text-sm text-gray-500 mt-0.5">Weight: <span className="font-semibold text-gray-700">{item.weight}</span></p> : null}
                        </div>
                        <div className="font-bold text-gray-900 mt-auto sm:mt-0">
                          ₹{item.price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}

                  {order.isGiftOrder && (
                    <div className="py-4 mt-2">
                      <div className="rounded-2xl border border-[#D04E26]/20 bg-[#FDF0EB] p-4">
                        <h4 className="text-sm font-bold text-[#D04E26] mb-3 uppercase tracking-wider flex items-center gap-2">
                           Gift & Card Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest">Message</p>
                            <p className="font-semibold text-gray-900 text-sm">{order.giftMessage || 'No message'}</p>
                            {order.giftMessageStyle && <p className="text-xs text-gray-500 mt-0.5">Style: {order.giftMessageStyle}</p>}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest">Scheduled Delivery</p>
                            <p className="font-semibold text-gray-900 text-sm">{order.scheduledDeliveryDate ? new Date(order.scheduledDeliveryDate).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          {order.giftWrapping?.enabled && (
                            <div className="sm:col-span-2 pt-3 mt-1 border-t border-[#F2CBBF]/50">
                              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Gift Box Selected</p>
                              <div className="flex flex-wrap gap-x-6 gap-y-2">
                                <p className="text-sm text-gray-700">Volume: <span className="font-semibold text-gray-900">{order.giftWrapping.volume} cm³</span></p>
                                <p className="text-sm text-gray-700">Box Size: <span className="font-semibold text-gray-900">{order.giftWrapping.boxSize}</span></p>
                                <p className="text-sm text-gray-700">Fee: <span className="font-bold text-[#D04E26]">₹{order.giftWrapping.giftFee}</span></p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

