import React, { useState, useEffect } from 'react';
import { orderService } from '../api/orderService';
import { ShoppingBag, Loader2, Package, Calendar, MapPin, ExternalLink, Download, Eye, RotateCw, RefreshCw } from 'lucide-react';
import Pagination from '../components/common/Pagination';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { API_ORIGIN } from '../api/apiClient';
import { formatDeliveryDate, getDeliveryDate } from '../utils/deliveryDate';
import OrderPricingSummary from '../components/OrderPricingSummary';

export default function OrderHistoryPage({ onNavigate, user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const paginatedOrders = orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(orders.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-[#F8F4EC] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Desktop Header */}
        <div className="hidden sm:flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#8B5E3C] shadow-sm">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
              <p className="text-sm text-gray-500">Track and manage your previous orders</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('/profile/order-history')}
            className="px-6 py-2.5 bg-white border border-[#E6DFD4] text-[#8B5E3C] rounded-xl font-bold hover:bg-[#FAF8F5] transition-colors shadow-sm"
          >
            Back to Orders
          </button>
        </div>

        {/* Mobile Header */}
        <div className="sm:hidden mb-6">
          <div className="flex items-center justify-between mb-1">
             <h1 className="text-2xl font-black text-[#111]">Order History</h1>
             <button onClick={fetchOrders} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg bg-white shadow-sm text-sm font-bold text-gray-700 active:bg-gray-50">
               <RotateCw className="w-3.5 h-3.5" /> Refresh
             </button>
          </div>
          <p className="text-[#666] text-sm mb-4">View and manage your recent orders.</p>
          <button 
            onClick={() => onNavigate('/profile/order-history')}
            className="w-full py-2.5 bg-white border border-[#E6DFD4] text-[#8B5E3C] rounded-xl font-bold hover:bg-[#FAF8F5] transition-colors shadow-sm"
          >
            Back to Orders
          </button>
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
            {paginatedOrders.map((order) => {
              const firstItem = order.orderItems[0] || {};
              const orderDate = new Date(order.createdAt);
              const formattedDate = `${orderDate.getDate().toString().padStart(2, '0')}/${(orderDate.getMonth() + 1).toString().padStart(2, '0')}/${orderDate.getFullYear()}`;
              const imageSrc = firstItem.image ? (firstItem.image.startsWith('http') || firstItem.image.startsWith('data:') ? firstItem.image : (firstItem.image.startsWith('/uploads') || firstItem.image.startsWith('uploads/')) ? `${API_ORIGIN}${firstItem.image.startsWith('/') ? '' : '/'}${firstItem.image}` : firstItem.image) : '';
              
              return (
              <div key={order._id} className="bg-white rounded-[20px] shadow-sm border border-[#E9E9E9] overflow-hidden mb-4 sm:rounded-3xl sm:border-[#E6DFD4]">
                
                {/* Mobile View */}
                <div className="block sm:hidden p-4">
                  <div className="flex justify-between items-start mb-4 gap-2">
                    <div className="flex gap-3 items-center flex-1">
                       <div className="w-12 h-12 rounded-lg bg-[#F8F4EC] border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                         {imageSrc ? <img src={imageSrc} alt={firstItem.name} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-gray-400" />}
                       </div>
                       <h4 className="font-bold text-[#111] text-[15px] line-clamp-2 leading-snug">
                         {firstItem.name || `Order #${(order.orderId || order._id.slice(-8)).toUpperCase()}`}
                       </h4>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider bg-[#FFF9E6] text-[#B8860B] border border-[#F5E6B3]">
                      {order.status || 'PLACED'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-2 mb-5 text-[13px]">
                     <div className="text-gray-500">Date: <span className="text-[#333] font-medium">{formattedDate}</span></div>
                     <div className="text-gray-500 text-right">Pay: <span className="text-[#333] font-medium">{order.paymentMethod || 'Online'}</span></div>
                     <div className="text-gray-500">Total: <span className="text-[#111] font-bold">₹{order.totalPrice.toLocaleString()}</span></div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => onNavigate('/profile/order-history/details', order)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#8B5E3C] text-white text-[13px] font-bold transition-colors hover:bg-[#7a5234] active:bg-[#7a5234]">
                      <Eye className="w-4 h-4" /> View
                    </button>
                    <button onClick={() => { if (firstItem.product) onNavigate(`/product/${firstItem.product}`); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#8B5E3C] text-white text-[13px] font-bold transition-colors hover:bg-[#7a5234] active:bg-[#7a5234]">
                      <RefreshCw className="w-4 h-4" /> Buy Again
                    </button>
                  </div>
                  
                  {!['Delivered', 'Cancelled'].includes(order.status) && (
                    <button 
                      type="button"
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to cancel this order?')) {
                          try {
                            setLoading(true);
                            await orderService.cancelOrder(order._id);
                            toast.success('Order cancelled successfully');
                            fetchOrders();
                          } catch (error) {
                            toast.error(error.message || 'Failed to cancel order');
                            setLoading(false);
                          }
                        }
                      }}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-bold transition-colors hover:bg-red-100 disabled:opacity-50"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>

                {/* Desktop View */}
                <div className="hidden sm:block">
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
                        <MapPin className="w-4 h-4" /> {user?.name?.split(' ')[0] || order.shippingAddress.fullName.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <div className="flex gap-4 items-center">
                        {!['Delivered', 'Cancelled'].includes(order.status) && (
                          <button 
                            type="button"
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to cancel this order?')) {
                                try {
                                  setLoading(true);
                                  await orderService.cancelOrder(order._id);
                                  toast.success('Order cancelled successfully');
                                  fetchOrders();
                                } catch (error) {
                                  toast.error(error.message || 'Failed to cancel order');
                                  setLoading(false);
                                }
                              }
                            }}
                            className="text-sm font-bold text-red-500 hover:text-red-700 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                        {order.isPaid && (
                          <button 
                            onClick={() => handleDownloadInvoice(order._id)}
                            disabled={downloadingInvoice === order._id}
                            className="text-sm font-bold text-[#6D625C] hover:text-[#4A403B] flex items-center gap-1 disabled:opacity-50"
                          >
                            {downloadingInvoice === order._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Invoice
                          </button>
                        )}
                        <button 
                          onClick={() => onNavigate('/profile/order-history/details', order)}
                          className="text-sm font-bold text-[#8B5E3C] hover:text-[#7a5234] flex items-center gap-1"
                        >
                          View Details <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
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
                          <img src={item.image.startsWith('http') || item.image.startsWith('data:') ? item.image : (item.image.startsWith('/uploads') || item.image.startsWith('uploads/')) ? `${API_ORIGIN}${item.image.startsWith('/') ? '' : '/'}${item.image}` : item.image} alt={item.name} className="w-full h-full object-cover" />
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
                            <p className="font-semibold text-gray-900 text-sm">
                               {formatDeliveryDate(getDeliveryDate(order))}
                             </p>
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
                <div className="px-5 sm:px-8 pb-5 border-t border-[#E6DFD4]/50 pt-4">
                  <OrderPricingSummary order={order} />
                </div>
                </div>
              </div>
            );})}
          </div>
        )}
        
        {totalPages > 1 && orders.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-8 pb-4 gap-4">
            <span className="text-sm font-bold text-[#7C7370] text-center sm:text-left">
              Page {currentPage} of {totalPages}
            </span>
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
              className="flex items-center justify-center gap-2 flex-wrap"
            />
          </div>
        )}
      </div>
    </div>
  );
}
