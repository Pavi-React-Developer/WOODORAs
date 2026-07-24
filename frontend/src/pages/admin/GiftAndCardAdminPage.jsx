import React, { useState, useEffect } from 'react';
import { adminService } from '../../api/adminService';
import { toast } from 'react-hot-toast';
import CustomCalendar from '../../components/CustomCalendar';
import { Eye, X, Edit2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { getImageSrc } from '../../utils/imageUtils';
import EditGiftBoxRulePage from './fees/EditGiftBoxRulePage';

export default function GiftAndCardAdminPage({ activeSubTab = 'rules', canCreate = true, canEdit = true, canDelete = true }) {
  const [activeTab, setActiveTab] = useState(activeSubTab);

  useEffect(() => {
    setActiveTab(activeSubTab);
  }, [activeSubTab]);
  const [config, setConfig] = useState({
    disabledNextDays: 3,
    availableDaysWindow: 3,
    giftWrapFee: 50,
    specificBlockedDates: [],
    specificAvailableDates: []
  });
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [giftBoxRules, setGiftBoxRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [formData, setFormData] = useState({
    minVolume: '',
    maxVolume: '',
    boxSize: 'XS',
    fee: '',
    isActive: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const conf = await adminService.getGiftCardConfig();
      if (conf) setConfig(conf);

      const ords = await adminService.getAdminGiftOrders();
      setOrders(ords || []);

      const msgs = await adminService.getAdminMessages();
      setMessages(msgs || []);

      const rules = await adminService.getGiftBoxRules();
      setGiftBoxRules(rules || []);
    } catch (err) {
      toast.error('Failed to load Gift & Card data');
    }
    setLoading(false);
  };

  const fetchGiftBoxRules = async () => {
    try {
      const rules = await adminService.getGiftBoxRules();
      setGiftBoxRules(rules || []);
    } catch (error) {
      toast.error('Failed to refresh gift box rules');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await adminService.updateGiftCardConfig(config);
      toast.success('Configuration saved successfully');
    } catch (err) {
      toast.error('Failed to save configuration');
    }
  };

  const handleToggleAdminDate = async (dateStr, currentStatus) => {
    let newBlocked = [...(config.specificBlockedDates || [])];
    let newAvailable = [...(config.specificAvailableDates || [])];

    // Remove from both lists first to reset
    newBlocked = newBlocked.filter(d => d !== dateStr);
    newAvailable = newAvailable.filter(d => d !== dateStr);

    if (currentStatus === 'blocked-manual') {
      // It was manually blocked, now revert to baseline
      // (already removed above)
    } else if (currentStatus === 'available-manual') {
      // It was manually available, now revert to baseline
      // (already removed above)
    } else if (currentStatus === 'available-baseline') {
      // It was auto available, user wants to manually block it
      newBlocked.push(dateStr);
    } else if (currentStatus === 'blocked-baseline') {
      // It was auto blocked, user wants to manually available it
      newAvailable.push(dateStr);
    }

    const updatedConfig = {
      ...config,
      specificBlockedDates: newBlocked,
      specificAvailableDates: newAvailable
    };

    setConfig(updatedConfig);

    // Auto-save the calendar click
    try {
      await adminService.updateGiftCardConfig(updatedConfig);
      toast.success('Calendar date updated');
    } catch (err) {
      toast.error('Failed to update calendar');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#4A403B]">Gift & Card Management</h1>
      </div>



      {activeTab === 'rules' && (
        <div className="max-w-2xl bg-white p-6 shadow rounded-md">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Calendar Availability</h2>
          <CustomCalendar
            config={config}
            isAdminMode={true}
            canEdit={canEdit}
            onToggleAdminDate={handleToggleAdminDate}
          />
        </div>
      )}

      {activeTab === 'gift-fee' && (
        <div className="bg-white p-6 shadow rounded-md max-w-5xl">
          {editingRuleId ? (
            <EditGiftBoxRulePage 
              ruleId={editingRuleId} 
              onBack={() => {
                setEditingRuleId(null);
                fetchGiftBoxRules();
              }} 
            />
          ) : (
            <>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Dynamic Gift Box Rules</h2>
              <p className="text-sm text-gray-500 mb-6">Configure dynamic volume ranges (Min Volume and Max Volume in cm³) to determine Box Size and Fee.</p>
              
              {canCreate && (
              <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Add New Rule</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (formData.minVolume === '' || formData.maxVolume === '' || formData.fee === '') {
                toast.error('Please fill all required numeric fields properly');
                return;
              }
              try {
                if (editingRuleId) {
                  await adminService.updateGiftBoxRule(editingRuleId, formData);
                  toast.success(`Rule updated successfully!`);
                } else {
                  await adminService.createGiftBoxRule(formData);
                  toast.success(`Rule added successfully!`);
                }
                setFormData({ minVolume: '', maxVolume: '', boxSize: 'XS', fee: '', isActive: true });
                fetchGiftBoxRules();
              } catch (error) {
                toast.error(error.message || 'Failed to save rule');
              }
            }}>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min Volume (cm³)</label>
                  <input type="number" name="minVolume" value={formData.minVolume} onChange={(e) => setFormData({...formData, minVolume: e.target.value ? Number(e.target.value) : ''})} required className="w-full p-2 border rounded text-sm focus:ring-[#B0611C]" placeholder="e.g. 0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Volume (cm³)</label>
                  <input type="number" name="maxVolume" value={formData.maxVolume} onChange={(e) => setFormData({...formData, maxVolume: e.target.value ? Number(e.target.value) : ''})} required className="w-full p-2 border rounded text-sm focus:ring-[#B0611C]" placeholder="e.g. 500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Box Size</label>
                  <select name="boxSize" value={formData.boxSize} onChange={(e) => setFormData({...formData, boxSize: e.target.value})} className="w-full p-2 border rounded text-sm focus:ring-[#B0611C]">
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fee (₹)</label>
                  <input type="number" name="fee" value={formData.fee} onChange={(e) => setFormData({...formData, fee: e.target.value ? Number(e.target.value) : ''})} required className="w-full p-2 border rounded text-sm focus:ring-[#B0611C]" placeholder="e.g. 30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select name="isActive" value={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})} className="w-full p-2 border rounded text-sm focus:ring-[#B0611C]">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div>
                  <button type="submit" className="w-full bg-[#B0611C] text-white p-2 rounded text-sm font-medium hover:bg-[#8B5E3C] transition-colors">
                    Add Rule
                  </button>
                </div>
              </div>
            </form>
          </div>
          )}

          <table className="min-w-full divide-y divide-gray-200 border rounded overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Vol (cm³)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Vol (cm³)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Box Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee (₹)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {giftBoxRules.map((rule, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{rule.minVolume}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{rule.maxVolume}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{rule.boxSize}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">₹{rule.fee}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center flex justify-center gap-3">
                    {canEdit && (
                      <>
                        <button onClick={() => {
                          setEditingRuleId(rule._id);
                          setFormData({
                            minVolume: rule.minVolume,
                            maxVolume: rule.maxVolume,
                            boxSize: rule.boxSize,
                            fee: rule.fee,
                            isActive: rule.isActive
                          });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors" title="Edit Rule">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={async () => {
                          try {
                            await adminService.updateGiftBoxRule(rule._id, { isActive: !rule.isActive });
                            toast.success(`Rule ${rule.isActive ? 'deactivated' : 'activated'}`);
                            fetchGiftBoxRules();
                          } catch (e) {
                            toast.error('Failed to update status');
                          }
                        }} className={`transition-colors ${rule.isActive ? 'text-green-500 hover:text-green-600' : 'text-gray-400 hover:text-gray-500'}`} title={rule.isActive ? 'Deactivate' : 'Activate'}>
                          {rule.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                      </>
                    )}
                    {canDelete && (
                    <button onClick={async () => {
                      if (!window.confirm('Are you sure you want to delete this rule?')) return;
                      try {
                        await adminService.deleteGiftBoxRule(rule._id);
                        toast.success('Rule deleted');
                        fetchGiftBoxRules();
                      } catch (error) {
                        toast.error('Failed to delete rule');
                      }
                    }} className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Rule">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    )}
                  </td>
                </tr>
              ))}
              {giftBoxRules.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">No box rules configured.</td>
                </tr>
              )}
            </tbody>
          </table>
          </>
          )}
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="bg-white shadow rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Style</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {messages.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">No messages found.</td></tr>
              ) : (
                messages.map(msg => (
                  <tr key={msg._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{msg._id.substring(0, 8)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{msg.user?.name || msg.user?.fullName || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 italic max-w-xs truncate">{msg.message}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{msg.style || 'Classic'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white shadow rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID & Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No gift orders found.</td></tr>
              ) : (
                orders.map(order => (
                  <tr key={order._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order._id.substring(0, 8)}<br />
                      <span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.user?.name || order.user?.fullName || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#B0611C]">
                      {order.scheduledDeliveryDate ? new Date(order.scheduledDeliveryDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button onClick={() => setSelectedOrder(order)} className="text-[#8B5E3C] hover:text-[#7A5234]">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* View Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Gift Order Details</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">

              {/* User Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">Customer Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                  <p><span className="font-medium text-gray-800">Name:</span> {selectedOrder.user?.name || selectedOrder.user?.fullName || selectedOrder.shippingAddress?.fullName || 'N/A'}</p>
                  <p><span className="font-medium text-gray-800">Email:</span> {selectedOrder.user?.email || 'N/A'}</p>
                  <p><span className="font-medium text-gray-800">Phone:</span> {selectedOrder.shippingAddress?.phone || 'N/A'}</p>
                </div>
                <div className="text-sm text-gray-600 pt-3 border-t border-gray-200">
                  <p className="font-medium text-gray-800 mb-1">Shipping Address:</p>
                  {selectedOrder.shippingAddress ? (
                    <p>
                      {selectedOrder.shippingAddress.address}, {selectedOrder.shippingAddress.city}, <br />
                      {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.pinCode || selectedOrder.shippingAddress.postalCode}
                    </p>
                  ) : (
                    <p>N/A</p>
                  )}
                </div>
              </div>

              {/* Product Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.orderItems?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 border border-gray-100 p-3 rounded-lg">
                      <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                        {item.image ? (
                          <img src={getImageSrc(item.image)} alt={item.name} className="w-full h-full object-cover rounded" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-500">Qty: {item.qty} | Price: ₹{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gift Details */}
              <div className="bg-[#FAF4EF] p-4 rounded-lg border border-[#E6DFD4]">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">Gift Preferences</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium text-gray-800">Delivery Date:</span> {selectedOrder.scheduledDeliveryDate ? new Date(selectedOrder.scheduledDeliveryDate).toLocaleDateString() : 'N/A'}</p>
                  <p><span className="font-medium text-gray-800">Style:</span> {selectedOrder.giftMessageStyle || 'Classic'}</p>
                  <div className="mt-2">
                    <span className="font-medium text-gray-800 block mb-1">Message:</span>
                    <p className="italic bg-white p-3 rounded border border-gray-200">
                      {selectedOrder.giftMessage || "No message provided."}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
