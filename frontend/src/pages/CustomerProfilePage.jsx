import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bell,
  CalendarDays,
  Edit3,
  Heart,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  ShoppingBag,
  Star,
  Trash2,
  Upload,
  User,
  Users,
  Bookmark,
  Gift,
  ShieldCheck,
  Eye,
  EyeOff,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { authService } from '../api/authService';
import { orderService } from '../api/orderService';
import useCartStore from '../store/useCartStore';

const modules = [
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'orders', label: 'Order History', icon: Package },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'cart', label: 'Cart', icon: ShoppingBag },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'saved', label: 'Saved Products', icon: Bookmark },
  { id: 'rewards', label: 'Loyalty Rewards', icon: Star },
  { id: 'password', label: 'Change Password', icon: LockKeyhole },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const formatDate = (value, fallback = 'Not added') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const emptyAddress = {
  label: 'Home',
  fullName: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pinCode: '',
  landmark: '',
  isDefault: true,
};

export default function CustomerProfilePage({
  user,
  profileData,
  profileLoading,
  profileError,
  onNavigate,
  onLogout,
  onProfileUpdated,
  wishlistItems = [],
  onRemoveFromWishlist,
  onMoveToCart,
  savedItems = [],
}) {
  const profile = profileData?.user || user || {};
  const { cartItems, updateQuantity, removeFromCart, getSubtotal } = useCartStore();
  const [activeModule, setActiveModule] = useState('profile');
  const [activeOrder, setActiveOrder] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // State for password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [form, setForm] = useState({
    name: profile.name || '',
    phone: profile.phone || '',
    dateOfBirth: toInputDate(profile.dateOfBirth),
    gender: profile.gender || '',
    profileImage: profile.profileImage || '',
    preferredAgeGroup: profile.preferences?.preferredAgeGroup || 'All Ages',
    emailNotifications: profile.preferences?.emailNotifications !== false,
    addresses: profile.addresses?.length ? profile.addresses : [{ ...emptyAddress, fullName: profile.name || '', phone: profile.phone || '' }],
  });

  useEffect(() => {
    setForm({
      name: profile.name || '',
      phone: profile.phone || '',
      dateOfBirth: toInputDate(profile.dateOfBirth),
      gender: profile.gender || '',
      profileImage: profile.profileImage || '',
      preferredAgeGroup: profile.preferences?.preferredAgeGroup || 'All Ages',
      emailNotifications: profile.preferences?.emailNotifications !== false,
      addresses: profile.addresses?.length ? profile.addresses : [{ ...emptyAddress, fullName: profile.name || '', phone: profile.phone || '' }],
    });
  }, [profile._id, profile.name, profile.phone, profile.dateOfBirth, profile.gender, profile.profileImage, profile.addresses, profile.preferences]);

  useEffect(() => {
    if (activeModule !== 'orders') return;

    const loadOrders = async () => {
      try {
        setOrdersLoading(true);
        const data = await orderService.getMyOrders();
        setOrders(data || []);
      } catch (error) {
        toast.error(error.message || 'Failed to load orders');
      } finally {
        setOrdersLoading(false);
      }
    };

    loadOrders();
  }, [activeModule]);

  const stats = useMemo(() => ({
    orders: orders.length,
    cart: cartItems.reduce((sum, item) => sum + item.qty, 0),
    rewards: profile.loyalty?.points || 0,
  }), [orders.length, cartItems, profile.loyalty?.points]);

  const displayName = profile.name || 'Customer';
  const displayEmail = profile.email || user?.email || '';
  const displayPhone = profile.phone || 'Not added';
  const profileImage = form.profileImage || profile.profileImage || '/animal_balance_maze.png';

  const updateAddress = (index, field, value) => {
    setForm((current) => ({
      ...current,
      addresses: current.addresses.map((address, addressIndex) => (
        addressIndex === index ? { ...address, [field]: value } : address
      )),
    }));
  };

  const addAddress = () => {
    setForm((current) => ({
      ...current,
      addresses: [...current.addresses, { ...emptyAddress, fullName: current.name, phone: current.phone, isDefault: current.addresses.length === 0 }],
    }));
  };

  const removeAddress = (index) => {
    setForm((current) => ({
      ...current,
      addresses: current.addresses.filter((_, addressIndex) => addressIndex !== index),
    }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender,
        profileImage: form.profileImage.trim(),
        addresses: form.addresses,
        preferences: {
          preferredAgeGroup: form.preferredAgeGroup,
          emailNotifications: form.emailNotifications,
        },
      };
      const response = await authService.updateProfile(payload);
      onProfileUpdated?.(response.user);
      setIsEditing(false);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    // Mocking an API call
    setSaving(true);
    setTimeout(() => {
      toast.success('Password successfully updated!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSaving(false);
    }, 1500);
  };

  const renderProfile = () => (
    <>
      <div className="grid gap-8 px-5 py-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)] lg:px-7">
        <section>
          <h2 className="text-lg font-bold text-[#141225]">Personal Information</h2>
          <div className="mt-5 divide-y divide-[#EFE6DD]">
            {[
              { label: 'Full Name', value: displayName, icon: User },
              { label: 'Email Address', value: displayEmail, icon: Mail },
              { label: 'Phone Number', value: displayPhone, icon: Phone },
              { label: 'Date of Birth', value: formatDate(profile.dateOfBirth), icon: CalendarDays },
              { label: 'Gender', value: profile.gender || 'Not added', icon: User },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#F8F3EF] text-[#A7632E]">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#5E5A68]">{label}</p>
                  <p className="mt-1 text-base text-[#221F2B]">{value}</p>
                </div>
              </div>
            ))}
          </div>


        </section>

        <aside className="border-t border-[#E9DED3] pt-7 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <h2 className="text-lg font-bold text-[#141225]">Profile Picture</h2>
          <div className="mt-7 flex justify-center">
            <div className="h-40 w-40 overflow-hidden rounded-[18px] bg-[#F1DFC9]">
              <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
            </div>
          </div>

          <button type="button" onClick={() => setIsEditing(true)} className="mt-8 flex w-full flex-col items-center justify-center rounded-[12px] border border-dashed border-[#C9AA91] px-6 py-5 text-[#9A6031] transition hover:bg-[#FFF8F2]">
            <span className="flex items-center gap-3 text-sm font-bold">
              <Upload className="h-5 w-5" strokeWidth={1.8} />
              Update Photo URL
            </span>
            <span className="mt-2 text-sm text-[#6D625C]">Saved to backend profile</span>
          </button>

          <div className="mt-8 flex items-center gap-4 rounded-[12px] border border-[#E9DED3] bg-white px-4 py-5 shadow-[0_10px_25px_rgba(62,39,35,0.05)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#F8F3EF] text-[#A7632E]">
              <CalendarDays className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#5E5A68]">Account Member Since</p>
              <p className="mt-1 font-bold text-[#141225]">{formatDate(profile.createdAt, 'June 2024')}</p>
              <p className="mt-1 text-sm text-[#6D625C]">{profile.loyalty?.tier || 'Premium Member'}</p>
            </div>
          </div>
        </aside>
      </div>

      <section className="border-t border-[#E9DED3] px-5 py-7 lg:px-7">
        <h2 className="text-lg font-bold text-[#141225]">Preferences</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <InfoCard label="Preferred Age Group" value={profile.preferences?.preferredAgeGroup || 'All Ages'} icon={Users} />
          <InfoCard label="Email Notifications" value={profile.preferences?.emailNotifications === false ? 'Off' : 'On'} icon={Mail} />
          <InfoCard label="Reward Points" value={`${profile.loyalty?.points || 0} points`} icon={Star} />
        </div>
      </section>
    </>
  );

  const renderOrders = () => (
    <section className="px-5 py-7 lg:px-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#141225]">Order History</h2>
          <p className="mt-1 text-sm text-[#6D625C]">Orders are loaded from your backend account.</p>
        </div>
        <button type="button" onClick={() => onNavigate('order-history')} className="rounded-[8px] bg-[#9A6031] px-4 py-2 text-sm font-bold text-white">Open Full Page</button>
      </div>

      {ordersLoading ? (
        <p className="mt-8 text-sm text-[#6D625C]">Loading orders...</p>
      ) : orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" text="Your placed orders will appear here after checkout." action="Start Shopping" onAction={() => onNavigate('home')} />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[14px] border border-[#E9DED3] bg-white">
          <table className="w-full text-left text-sm text-[#4A403B]">
            <thead className="border-b border-[#E9DED3] bg-[#FAF8F5] text-xs font-bold uppercase tracking-wider text-[#6D625C]">
              <tr>
                <th className="p-4">Product Details</th>
                <th className="p-4">Date</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Payment Type</th>
                <th className="p-4 text-center">Rating</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9DED3]">
              {orders.map((order) => {
                const firstItem = order.orderItems?.[0] || {};
                const extraItemsCount = (order.orderItems?.length || 1) - 1;
                const imageSrc = firstItem.image ? (firstItem.image.startsWith('http') ? firstItem.image : `http://localhost:5000${firstItem.image}`) : '/animal_balance_maze.png';

                return (
                  <tr key={order._id} className="transition-colors hover:bg-[#FAF8F5]/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[8px] bg-[#F8F3EF]">
                          <img src={imageSrc} alt={firstItem.name || 'Product'} className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-[#141225] line-clamp-1">{firstItem.name || `Order #${order._id.slice(-8).toUpperCase()}`}</p>
                          {extraItemsCount > 0 && <p className="text-xs font-semibold text-[#9A6031]">+{extraItemsCount} more item(s)</p>}
                          <p className="text-xs text-[#6D625C] mt-0.5">#{order._id.slice(-8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap font-medium">{formatDate(order.createdAt)}</td>
                    <td className="p-4 whitespace-nowrap font-black text-[#141225]">Rs. {Number(order.totalPrice || 0).toLocaleString()}</td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : order.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-[#F2E3D1] text-[#8B5E3C]'}`}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap font-medium">{order.paymentMethod || 'Online'}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-0.5 text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        {order.status !== 'Cancelled' && order.status !== 'Delivered' && (
                          <button 
                            type="button"
                            className="rounded border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
                            onClick={() => toast.error('Cancellation disabled for demo')}
                          >
                            Cancel
                          </button>
                        )}
                        <button 
                          type="button" 
                          onClick={() => { setActiveOrder(order); setActiveModule('order-details'); }}
                          className="flex items-center gap-1 rounded bg-[#9A6031] px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#7E4B25]"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderOrderDetails = () => {
    if (!activeOrder) return null;
    return (
      <section className="px-5 py-7 lg:px-7">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#141225]">Order Details</h2>
            <p className="mt-1 text-sm text-[#6D625C]">Order #{activeOrder._id.slice(-8).toUpperCase()}</p>
          </div>
          <button type="button" onClick={() => { setActiveModule('orders'); setActiveOrder(null); }} className="rounded-[8px] border border-[#E9DED3] px-4 py-2 text-sm font-bold text-[#141225] hover:bg-gray-50">Back to Orders</button>
        </div>

        <div className="space-y-6">
          <div className="rounded-[14px] border border-[#E9DED3] bg-white p-5">
            <h3 className="font-bold text-[#141225] mb-4">Products</h3>
            <div className="divide-y divide-[#E9DED3]">
              {activeOrder.orderItems?.map((item, idx) => {
                const imageSrc = item.image ? (item.image.startsWith('http') ? item.image : `http://localhost:5000${item.image}`) : '/animal_balance_maze.png';
                return (
                  <div key={idx} className="py-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[8px] bg-[#F8F3EF]">
                      <img src={imageSrc} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#141225]">{item.name}</p>
                      <p className="text-sm text-[#6D625C] mt-1">Qty: {item.qty} | Rs. {Number(item.price).toLocaleString()}</p>
                    </div>
                    <div>
                      <button 
                        onClick={() => onNavigate('product-detail', { _id: item.product })}
                        className="rounded-[8px] bg-[#9A6031] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#7E4B25] w-full sm:w-auto mt-2 sm:mt-0 shadow-sm"
                      >
                        Buy Again
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-[#E9DED3] flex justify-between items-center">
              <p className="text-sm font-bold text-[#6D625C]">Order Status:</p>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${activeOrder.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : activeOrder.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-[#F2E3D1] text-[#8B5E3C]'}`}>
                {activeOrder.status || 'Pending'}
              </span>
            </div>
          </div>

          <div className="rounded-[14px] border border-[#E9DED3] bg-white p-5">
            <h3 className="font-bold text-[#141225] mb-3">Shipping Address</h3>
            {activeOrder.shippingAddress ? (
              <div className="text-sm text-[#6D625C] space-y-1.5">
                <p className="font-bold text-[#141225] text-base">{activeOrder.shippingAddress.fullName}</p>
                <p>{activeOrder.shippingAddress.address}</p>
                <p>{activeOrder.shippingAddress.city}, {activeOrder.shippingAddress.state} - {activeOrder.shippingAddress.pinCode}</p>
                <p className="pt-2 flex items-center gap-2"><Phone className="w-4 h-4" /> {activeOrder.shippingAddress.phone}</p>
              </div>
            ) : (
              <p className="text-sm text-[#6D625C]">No address provided.</p>
            )}
          </div>
          
          <div className="pt-4">
            <h3 className="font-bold text-[#141225] mb-4">Recently Viewed Products</h3>
            {savedItems && savedItems.length > 0 ? (
               <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                 {savedItems.slice(0, 3).map((item, i) => {
                   const imageSrc = item.image ? (item.image.startsWith('http') ? item.image : `http://localhost:5000${item.image}`) : '/animal_balance_maze.png';
                   return (
                     <div key={i} className="group relative overflow-hidden rounded-[12px] border border-[#E9DED3] bg-white p-3 cursor-pointer shadow-sm hover:shadow-md transition-shadow" onClick={() => onNavigate('product-detail', { _id: item.id || item._id })}>
                       <div className="aspect-square bg-[#F8F3EF] mb-3 rounded-lg overflow-hidden">
                         <img src={imageSrc} alt={item.name} className="h-full w-full object-contain mix-blend-multiply transition duration-300 group-hover:scale-110" />
                       </div>
                       <p className="font-bold text-[#141225] text-sm line-clamp-1">{item.name}</p>
                       <p className="font-bold text-[#8B5E3C] text-sm mt-1">Rs. {Number(item.price).toLocaleString()}</p>
                     </div>
                   );
                 })}
               </div>
            ) : (
               <div className="rounded-[12px] border border-[#E9DED3] bg-white p-6 text-center">
                 <p className="text-sm text-[#6D625C]">No recently viewed products found.</p>
                 <button onClick={() => onNavigate('home')} className="mt-3 text-[#9A6031] font-bold text-sm hover:underline">Start browsing toys</button>
               </div>
            )}
          </div>
        </div>
      </section>
    );
  };

  const renderCart = () => (
    <section className="px-5 py-7 lg:px-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#141225]">Cart</h2>
          <p className="mt-1 text-sm text-[#6D625C]">Synced with backend for logged-in customers.</p>
        </div>
        <button type="button" onClick={() => onNavigate('cart')} className="rounded-[8px] bg-[#9A6031] px-4 py-2 text-sm font-bold text-white">Open Cart</button>
      </div>

      {cartItems.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Your cart is empty" text="Add toys to your cart and they will stay with your account." action="Continue Shopping" onAction={() => onNavigate('home')} />
      ) : (
        <div className="mt-6 divide-y divide-[#EFE6DD] rounded-[14px] border border-[#E9DED3] bg-white">
          {cartItems.map((item) => (
            <div key={`${item.product}-${item.variant || 'default'}`} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="h-20 w-20 overflow-hidden rounded-[12px] bg-[#F8F3EF]">
                {item.image ? <img src={item.image.startsWith('http') ? item.image : `http://localhost:5000${item.image}`} alt={item.name} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#141225]">{item.name}</p>
                {item.variantOptions && <p className="mt-1 text-sm text-[#6D625C]">{item.variantOptions}</p>}
                <p className="mt-1 text-sm font-semibold text-[#8B5E3C]">Rs. {Number(item.price || 0).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" disabled={item.qty <= 1} onClick={() => updateQuantity(item.product, item.qty - 1, item.variant)} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E9DED3] disabled:opacity-40">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center font-bold">{item.qty}</span>
                <button type="button" onClick={() => updateQuantity(item.product, item.qty + 1, item.variant)} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E9DED3]">
                  <Plus className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => removeFromCart(item.product, item.variant)} className="ml-2 text-red-500">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between p-5">
            <span className="font-bold text-[#141225]">Subtotal</span>
            <span className="text-xl font-black text-[#8B5E3C]">Rs. {getSubtotal().toLocaleString()}</span>
          </div>
        </div>
      )}
    </section>
  );

  const renderAddresses = () => (
    <section className="px-5 py-7 lg:px-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#141225]">Addresses</h2>
          <p className="mt-1 text-sm text-[#6D625C]">Saved to your customer backend profile.</p>
        </div>
        <button type="button" onClick={() => setIsEditing(true)} className="rounded-[8px] bg-[#9A6031] px-4 py-2 text-sm font-bold text-white">Manage</button>
      </div>
      {profile.addresses?.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {profile.addresses.map((address, index) => (
            <div key={address._id || index} className="rounded-[14px] border border-[#E9DED3] bg-white p-5">
              <p className="font-bold text-[#141225]">{address.label || 'Address'} {address.isDefault ? '(Default)' : ''}</p>
              <p className="mt-3 text-sm text-[#6D625C]">{address.fullName} | {address.phone}</p>
              <p className="mt-1 text-sm text-[#6D625C]">{address.address}</p>
              <p className="mt-1 text-sm text-[#6D625C]">{address.city}, {address.state} - {address.pinCode}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={MapPin} title="No saved address" text="Add a shipping address from Edit Profile." action="Add Address" onAction={() => setIsEditing(true)} />
      )}
    </section>
  );

  const renderWishlist = () => {
    return (
      <section className="px-5 py-7 lg:px-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#141225]">My Wishlist</h2>
            <p className="mt-1 text-sm text-[#6D625C]">Items you've loved and saved for later.</p>
          </div>
          <span className="rounded-full bg-[#F2E3D1] px-3 py-1 text-xs font-bold text-[#8B5E3C]">{wishlistItems.length} Items</span>
        </div>

        {wishlistItems.length === 0 ? (
          <EmptyState icon={Heart} title="Your wishlist is empty" text="Start adding toys you love." action="Explore Toys" onAction={() => onNavigate('home')} />
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {wishlistItems.map((item, index) => {
              const effectiveImages = item.selectedVariant?.images?.length ? item.selectedVariant.images : (item.images?.length ? item.images : [item.image || '/animal_balance_maze.png']);
              const image = typeof effectiveImages[0] === 'string' ? effectiveImages[0] : (effectiveImages[0]?.url || '/animal_balance_maze.png');
              const price = item.selectedVariant ? (item.selectedVariant.basePrice ?? item.selectedVariant.price) : (item.price ?? 0);

              return (
                <div key={index} className="group relative overflow-hidden rounded-[16px] border border-[#E9DED3] bg-white transition hover:shadow-[0_12px_25px_rgba(62,39,35,0.06)]">
                  <button onClick={() => onRemoveFromWishlist(index)} className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-500 shadow hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="aspect-square bg-[#F8F3EF] p-4">
                    <img src={image} alt={item.name} className="h-full w-full object-contain mix-blend-multiply transition duration-300 group-hover:scale-110" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-[#141225] line-clamp-1">{item.name}</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-lg font-black text-[#8B5E3C]">Rs. {price}</p>
                      <span className="text-xs font-semibold text-emerald-600">In Stock</span>
                    </div>
                    <button 
                      onClick={() => onMoveToCart(item, index)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#9A6031] py-2 text-sm font-bold text-white transition hover:bg-[#7E4B25]"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Move to Cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const renderSavedProducts = () => {
    return (
      <section className="px-5 py-7 lg:px-7">
        <div className="flex items-center justify-between gap-4 border-b border-[#E9DED3] pb-5">
          <div>
            <h2 className="text-lg font-bold text-[#141225]">Saved Products</h2>
            <p className="mt-1 text-sm text-[#6D625C]">Products you saved while browsing.</p>
          </div>
        </div>

        {savedItems.length === 0 ? (
          <EmptyState icon={Bookmark} title="No saved products" text="You haven't saved any products yet." action="Browse Toys" onAction={() => onNavigate('home')} />
        ) : (
          <div className="mt-6 space-y-4">
            {savedItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-4 rounded-[14px] border border-[#E9DED3] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#F4EBE2] text-[#A7632E]">
                    <Bookmark className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#141225]">{item.name}</h3>
                    <p className="text-sm text-[#6D625C]">Saved Recently</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-black text-[#8B5E3C]">Rs. {item.price}</p>
                  <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E9DED3] text-[#141225] transition hover:bg-[#F4EBE2]">
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderRewards = () => {
    const points = profile.loyalty?.points || 450;
    const tier = profile.loyalty?.tier || 'Gold';
    const nextTierPoints = 1000;
    const progress = (points / nextTierPoints) * 100;

    return (
      <section className="px-5 py-7 lg:px-7">
        <div className="rounded-[18px] bg-gradient-to-br from-[#9A6031] to-[#6E421E] p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Available Points</p>
              <h2 className="mt-1 flex items-baseline gap-2 text-4xl font-black">
                {points}
                <span className="text-base font-semibold text-[#D9B382]">pts</span>
              </h2>
            </div>
            <div className="flex items-center gap-3 rounded-[12px] bg-white/10 p-3 backdrop-blur-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D9B382] text-white">
                <Star className="h-5 w-5" fill="currentColor" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/80">Current Tier</p>
                <p className="font-bold">{tier} Member</p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex justify-between text-sm font-semibold">
              <span>{points} pts</span>
              <span className="text-white/70">{nextTierPoints} pts (Platinum)</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-[#D9B382] transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-white/70">Earn {nextTierPoints - points} more points to reach Platinum tier!</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-bold text-[#141225]">Recent History</h3>
          <div className="mt-4 divide-y divide-[#EFE6DD] rounded-[14px] border border-[#E9DED3] bg-white">
            {[
              { id: 1, action: 'Order #ORD-1029', date: 'Oct 12, 2024', points: '+150' },
              { id: 2, action: 'Sign Up Bonus', date: 'Sep 05, 2024', points: '+300' }
            ].map(history => (
              <div key={history.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4EBE2] text-[#A7632E]">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-[#141225]">{history.action}</p>
                    <p className="text-xs text-[#6D625C]">{history.date}</p>
                  </div>
                </div>
                <span className="font-bold text-emerald-600">{history.points}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderChangePassword = () => (
    <section className="px-5 py-7 lg:px-7">
      <div className="max-w-xl">
        <div>
          <h2 className="text-lg font-bold text-[#141225]">Change Password</h2>
          <p className="mt-1 text-sm text-[#6D625C]">Ensure your account is using a long, random password to stay secure.</p>
        </div>

        <form onSubmit={handlePasswordChange} className="mt-8 space-y-5">
          <div className="space-y-4">
            <PasswordField 
              label="Current Password" 
              value={passwordForm.currentPassword} 
              onChange={(val) => setPasswordForm(p => ({...p, currentPassword: val}))} 
              show={showPassword.current} 
              toggleShow={() => setShowPassword(s => ({...s, current: !s.current}))} 
            />
            <PasswordField 
              label="New Password" 
              value={passwordForm.newPassword} 
              onChange={(val) => setPasswordForm(p => ({...p, newPassword: val}))} 
              show={showPassword.new} 
              toggleShow={() => setShowPassword(s => ({...s, new: !s.new}))} 
            />
            <PasswordField 
              label="Confirm New Password" 
              value={passwordForm.confirmPassword} 
              onChange={(val) => setPasswordForm(p => ({...p, confirmPassword: val}))} 
              show={showPassword.confirm} 
              toggleShow={() => setShowPassword(s => ({...s, confirm: !s.confirm}))} 
            />
          </div>

          <div className="flex items-center gap-2 rounded-[8px] bg-[#FFF8E6] p-4 text-[#8A6A1C]">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <p className="text-xs font-medium">Your password must be at least 6 characters long and shouldn't be easy to guess.</p>
          </div>

          <button 
            type="submit" 
            disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
            className="mt-6 w-full rounded-[8px] bg-[#141225] py-3.5 text-sm font-bold text-white transition hover:bg-[#2A2640] disabled:opacity-50 sm:w-auto sm:px-8"
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </section>
  );

  const renderNotifications = () => {
    const notifications = [];
    
    // Dynamically generate notifications based on user state
    if (orders && orders.length > 0) {
      notifications.push({ 
        id: 'order', 
        type: 'order', 
        title: 'Order Processing', 
        message: `Your latest order #${orders[0]._id?.slice(-8).toUpperCase()} is being processed.`, 
        time: formatDate(orders[0].createdAt), 
        unread: true 
      });
    }

    if (profile.loyalty?.points > 0) {
      notifications.push({
        id: 'points',
        type: 'promo',
        title: 'You have points!',
        message: `You have ${profile.loyalty.points} points. Redeem them on your next purchase.`,
        time: 'Recently',
        unread: true
      });
    }

    notifications.push({ 
      id: 'system', 
      type: 'system', 
      title: 'Welcome to WoodenToys', 
      message: 'Thank you for creating an account with us!', 
      time: formatDate(profile.createdAt, 'Just now'), 
      unread: false 
    });

    return (
      <section className="px-5 py-7 lg:px-7">
        <div className="flex items-center justify-between gap-4 border-b border-[#E9DED3] pb-5">
          <div>
            <h2 className="text-lg font-bold text-[#141225]">Notifications</h2>
            <p className="mt-1 text-sm text-[#6D625C]">Stay updated with your orders and exclusive offers.</p>
          </div>
          <button className="text-sm font-bold text-[#9A6031] hover:underline">Mark all as read</button>
        </div>

        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications yet" text="We'll let you know when there's an update." />
        ) : (
          <div className="mt-6 space-y-3">
            {notifications.map((note) => (
              <div key={note.id} className={`flex gap-4 rounded-[14px] border border-[#E9DED3] p-5 transition hover:bg-[#FAF8F5] ${note.unread ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)]' : 'bg-gray-50 opacity-70'}`}>
                <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${note.type === 'order' ? 'bg-[#E3F2FD] text-[#1976D2]' : note.type === 'promo' ? 'bg-[#FFF3E0] text-[#F57C00]' : 'bg-[#E8F5E9] text-[#388E3C]'}`}>
                  {note.type === 'order' ? <Package className="h-5 w-5" /> : note.type === 'promo' ? <Gift className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm ${note.unread ? 'font-bold text-[#141225]' : 'font-medium text-[#4A403B]'}`}>{note.title}</h3>
                    <span className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-[#6D625C]">
                      <Clock className="h-3 w-3" />
                      {note.time}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#6D625C]">{note.message}</p>
                </div>
                {note.unread && (
                  <div className="flex h-full items-center pl-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#9A6031]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <section className="min-h-screen bg-[#FAF8F5] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto grid max-w-[1440px] gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[18px] border border-[#E9DED3] bg-white/90 p-3 shadow-[0_18px_60px_rgba(62,39,35,0.08)] lg:sticky lg:top-28 lg:h-fit lg:p-5">
          <div className="flex items-center gap-4 border-b border-[#EFE6DD] px-2 pb-6 pt-3">
            <div className="h-20 w-20 overflow-hidden rounded-[22px] bg-[#F3E7D7] shadow-inner">
              <img src={profileImage} alt="Customer profile" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-[#221914]">{displayName}</h2>
              <p className="truncate text-sm text-[#6D625C]">{displayEmail}</p>
              <span className="mt-2 inline-flex rounded-full bg-[#F2E3D1] px-3 py-1 text-xs font-bold text-[#8B5E3C]">
                {profile.loyalty?.tier || 'Premium Member'}
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 px-2">
            <MiniStat label="Orders" value={stats.orders} />
            <MiniStat label="Cart" value={stats.cart} />
            <MiniStat label="Points" value={stats.rewards} />
          </div>

          <nav className="mt-5 space-y-2">
            {modules.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveModule(id)}
                className={`flex w-full items-center gap-4 rounded-[10px] px-4 py-4 text-left text-sm font-semibold transition ${
                  activeModule === id
                    ? 'bg-[#F4EBE2] text-[#2E2E2E]'
                    : 'text-[#3E3A37] hover:bg-[#FAF4EF] hover:text-[#8B5E3C]'
                }`}
              >
                <Icon className="h-5 w-5 text-[#A7632E]" strokeWidth={1.8} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-6 border-t border-[#EFE6DD] pt-4">
            <button type="button" onClick={onLogout} className="flex w-full items-center gap-4 rounded-[10px] px-4 py-4 text-left text-sm font-bold text-red-600 transition hover:bg-red-50">
              <LogOut className="h-5 w-5" strokeWidth={1.8} />
              Sign Out
            </button>
          </div>
        </aside>

        <div className="overflow-hidden rounded-[18px] border border-[#E9DED3] bg-white shadow-[0_18px_70px_rgba(62,39,35,0.07)]">
          <header className="flex flex-col gap-5 border-b border-[#E9DED3] px-5 py-7 sm:flex-row sm:items-center sm:justify-between lg:px-7">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4EBE2] text-[#A7632E]">
                <User className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#141225]">{modules.find((item) => item.id === activeModule)?.label || 'My Profile'}</h1>
                <p className="mt-1 text-sm text-[#6D625C]">Customer panel connected with backend profile, orders, and cart.</p>
              </div>
            </div>
            <button type="button" onClick={() => setIsEditing(true)} className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#9A6031] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_25px_rgba(139,94,60,0.2)] transition hover:bg-[#7E4B25]">
              <Edit3 className="h-4 w-4" strokeWidth={1.8} />
              Edit Profile
            </button>
          </header>

          {activeModule === 'profile' && renderProfile()}
          {activeModule === 'orders' && renderOrders()}
          {activeModule === 'order-details' && renderOrderDetails()}
          {activeModule === 'addresses' && renderAddresses()}
          {activeModule === 'cart' && renderCart()}
          {activeModule === 'wishlist' && renderWishlist()}
          {activeModule === 'saved' && renderSavedProducts()}
          {activeModule === 'rewards' && renderRewards()}
          {activeModule === 'password' && renderChangePassword()}
          {activeModule === 'notifications' && renderNotifications()}
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm">
          <form onSubmit={handleSaveProfile} className="mx-auto max-w-4xl rounded-[18px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#EFE6DD] pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#141225]">Edit Customer Details</h2>
                <p className="mt-1 text-sm text-[#6D625C]">Saved directly to `/api/auth/profile`.</p>
              </div>
              <button type="button" onClick={() => setIsEditing(false)} className="rounded-[8px] border border-[#E9DED3] px-4 py-2 text-sm font-bold text-[#6D625C]">Cancel</button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Full Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
              <Field label="Phone Number" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
              <Field label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(value) => setForm((current) => ({ ...current, dateOfBirth: value }))} />
              <label className="block">
                <span className="text-sm font-bold text-[#4A403B]">Gender</span>
                <select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))} className="mt-2 w-full rounded-[10px] border border-[#E6D9CE] px-4 py-3 outline-none focus:border-[#9A6031]">
                  <option value="">Select gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </label>
              <Field className="md:col-span-2" label="Profile Image URL" value={form.profileImage} onChange={(value) => setForm((current) => ({ ...current, profileImage: value }))} placeholder="/animal_balance_maze.png or https://..." />
              <Field label="Preferred Age Group" value={form.preferredAgeGroup} onChange={(value) => setForm((current) => ({ ...current, preferredAgeGroup: value }))} />
              <label className="flex items-center gap-3 pt-7">
                <input type="checkbox" checked={form.emailNotifications} onChange={(event) => setForm((current) => ({ ...current, emailNotifications: event.target.checked }))} className="h-4 w-4 accent-[#9A6031]" />
                <span className="text-sm font-bold text-[#4A403B]">Receive email notifications</span>
              </label>
            </div>

            <div className="mt-8 border-t border-[#EFE6DD] pt-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-[#141225]">Shipping Addresses</h3>
                <button type="button" onClick={addAddress} className="rounded-[8px] border border-[#D9B382] px-4 py-2 text-sm font-bold text-[#8B5E3C]">Add Address</button>
              </div>
              <div className="mt-4 space-y-4">
                {form.addresses.map((address, index) => (
                  <div key={index} className="rounded-[14px] border border-[#E9DED3] p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="font-bold text-[#141225]">Address {index + 1}</p>
                      {form.addresses.length > 1 && (
                        <button type="button" onClick={() => removeAddress(index)} className="text-sm font-bold text-red-600">Remove</button>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Label" value={address.label || ''} onChange={(value) => updateAddress(index, 'label', value)} />
                      <Field label="Full Name" value={address.fullName || ''} onChange={(value) => updateAddress(index, 'fullName', value)} />
                      <Field label="Phone" value={address.phone || ''} onChange={(value) => updateAddress(index, 'phone', value)} />
                      <Field label="Pincode" value={address.pinCode || ''} onChange={(value) => updateAddress(index, 'pinCode', value)} />
                      <Field className="md:col-span-2" label="Address" value={address.address || ''} onChange={(value) => updateAddress(index, 'address', value)} />
                      <Field label="City" value={address.city || ''} onChange={(value) => updateAddress(index, 'city', value)} />
                      <Field label="State" value={address.state || ''} onChange={(value) => updateAddress(index, 'state', value)} />
                      <Field className="md:col-span-2" label="Landmark" value={address.landmark || ''} onChange={(value) => updateAddress(index, 'landmark', value)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-[#EFE6DD] pt-5">
              <button type="button" onClick={() => setIsEditing(false)} className="rounded-[8px] border border-[#E9DED3] px-5 py-3 text-sm font-bold text-[#6D625C]">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-[8px] bg-[#9A6031] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '', className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-bold text-[#4A403B]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[10px] border border-[#E6D9CE] px-4 py-3 outline-none focus:border-[#9A6031]"
      />
    </label>
  );
}

function InfoCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[12px] border border-[#E9DED3] bg-white p-4">
      <Icon className="h-5 w-5 text-[#A7632E]" strokeWidth={1.8} />
      <p className="mt-3 text-sm font-semibold text-[#5E5A68]">{label}</p>
      <p className="mt-1 font-bold text-[#141225]">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-[10px] bg-[#FAF4EF] px-2 py-3 text-center">
      <p className="text-sm font-black text-[#8B5E3C]">{value}</p>
      <p className="mt-1 text-[11px] font-bold text-[#6D625C]">{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, action, onAction }) {
  return (
    <div className="mt-6 rounded-[14px] border border-[#E9DED3] bg-[#FFFCFA] p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F4EBE2] text-[#A7632E]">
        <Icon className="h-7 w-7" strokeWidth={1.8} />
      </div>
      <h3 className="mt-4 text-lg font-bold text-[#141225]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#6D625C]">{text}</p>
      {action && (
        <button type="button" onClick={onAction} className="mt-5 rounded-[8px] bg-[#9A6031] px-5 py-3 text-sm font-bold text-white">
          {action}
        </button>
      )}
    </div>
  );
}

function PasswordField({ label, value, onChange, show, toggleShow }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#4A403B]">{label}</span>
      <div className="relative mt-2">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          className="w-full rounded-[10px] border border-[#E6D9CE] py-3 pl-4 pr-12 outline-none focus:border-[#9A6031]"
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6D625C] hover:text-[#141225]"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </label>
  );
}
