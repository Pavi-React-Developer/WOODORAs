const fs = require('fs');
const file = 'd:/Marakathai/frontend/src/pages/CustomerProfilePage.jsx';
let content = fs.readFileSync(file, 'utf8');

const target =               {/* Mobile Orders List */}
              <div className="sm:hidden flex flex-col gap-4">
                {paginatedOrders.map((order) => {
                  const firstItem = order.orderItems?.[0] || {};
              <Pagination
                currentPage={ordersPage}
                totalPages={totalPages}
                onPageChange={setOrdersPage}
                className="mt-6 flex items-center justify-center gap-2 flex-wrap"
              />;

const replacement =               {/* Mobile Orders List */}
              <div className="sm:hidden flex flex-col gap-4">
                {paginatedOrders.map((order) => {
                  const firstItem = order.orderItems?.[0] || {};
                  const orderDate = new Date(order.createdAt);
                  const formattedDate = \\/\/\\;
                  const imageSrc = firstItem.image ? (firstItem.image.startsWith('http') || firstItem.image.startsWith('data:') ? firstItem.image : (firstItem.image.startsWith('/uploads') || firstItem.image.startsWith('uploads/')) ? \\\\\ : firstItem.image) : '';

                  return (
                    <div key={order._id} className="bg-white rounded-[20px] shadow-sm border border-[#E9E9E9] overflow-hidden p-4">
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <div className="flex gap-3 items-center flex-1">
                          <div className="w-12 h-12 rounded-lg bg-[#F8F4EC] border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                            {imageSrc ? <img src={imageSrc} alt={firstItem.name} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-gray-400" />}
                          </div>
                          <h4 className="font-bold text-[#111] text-[15px] line-clamp-2 leading-snug">
                            {firstItem.name || \Order #\\}
                          </h4>
                        </div>
                        <span className="shrink-0 px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider bg-[#FFF9E6] text-[#B8860B] border border-[#F5E6B3]">
                          {order.status || 'PLACED'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 mb-5 text-[13px]">
                        <div className="text-gray-500">Date: <span className="text-[#333] font-medium">{formattedDate}</span></div>
                        <div className="text-gray-500 text-right">Pay: <span className="text-[#333] font-medium">{formatPaymentMethod(order.paymentMethod)}</span></div>
                        <div className="text-gray-500">Total: <span className="text-[#111] font-bold">?{order.totalPrice.toLocaleString()}</span></div>
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => { setActiveOrder(order); setActiveModule('order-details'); navigate('/profile/order-history/details'); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#8B5E3C] text-white text-[13px] font-bold transition-colors hover:bg-[#7a5234] active:bg-[#7a5234]">
                          View
                        </button>
                        <button onClick={() => { if (firstItem.product) onNavigate(\/product/\\); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#8B5E3C] text-white text-[13px] font-bold transition-colors hover:bg-[#7a5234] active:bg-[#7a5234]">
                          <RefreshCw className="w-4 h-4" /> Buy Again
                        </button>
                      </div>

                      {!['Delivered', 'Cancelled'].includes(order.status) && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setCancelOrderTarget(order);
                              setIsCancelModalOpen(true);
                              setCancelLoading(true);
                              const preview = await orderService.getCancellationPreview(order._id);
                              setCancellationPreviewData(preview);
                            } catch (e) {
                              toast.error('Failed to load cancellation details');
                              setIsCancelModalOpen(false);
                            } finally {
                              setCancelLoading(false);
                            }
                          }}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-bold transition-colors hover:bg-red-100 disabled:opacity-50"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={ordersPage}
                totalPages={totalPages}
                onPageChange={setOrdersPage}
                className="mt-6 flex items-center justify-center gap-2 flex-wrap"
              />;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Successfully restored Mobile Orders List!');
} else {
    console.log('Target block not found. Checking if it matches...');
    console.log(content.indexOf('              {/* Mobile Orders List */}'));
}
