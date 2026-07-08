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
  AlertCircle,
  X,
  ExternalLink,
  Truck,
  Check,
  CreditCard
} from 'lucide-react';
import { authService } from '../api/authService';
import { orderService } from '../api/orderService';
import { uploadAPI } from '../api/catalogAdminService';
import { reviewService } from '../api/reviewService';
import useCartStore from '../store/useCartStore';
import WriteReviewModal from '../components/WriteReviewModal';

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
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelOrderTarget, setCancelOrderTarget] = useState(null);
  const [cancellationPreviewData, setCancellationPreviewData] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showRefundDestinationModal, setShowRefundDestinationModal] = useState(false);
  const [refundDestinationInput, setRefundDestinationInput] = useState('');
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  const [productRatings, setProductRatings] = useState({}); // { productId: avgRating }
  const [userReviews, setUserReviews] = useState({});       // { productId: userRating | null }
  
  useEffect(() => {
    try {
      const recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      setRecentlyViewed(recent);
    } catch (e) {
      console.error('Failed to parse recently viewed', e);
    }
  }, [activeModule]);

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

        // Collect all unique product IDs from delivered orders
        const deliveredProductIds = [...new Set(
          (data || [])
            .filter(o => o.status === 'Delivered')
            .flatMap(o => o.orderItems?.map(item => item.product).filter(Boolean) || [])
        )];

        if (deliveredProductIds.length > 0) {
          // Fetch product avg ratings AND user's own reviews in parallel
          const [avgEntries, userEntries] = await Promise.all([
            Promise.all(
              deliveredProductIds.map(async (productId) => {
                try {
                  const res = await fetch(`http://localhost:5000/api/reviews/${productId}/stats`);
                  const stats = await res.json();
                  return [productId, stats?.avg ?? 0];
                } catch { return [productId, 0]; }
              })
            ),
            Promise.all(
              deliveredProductIds.map(async (productId) => {
                try {
                  const review = await reviewService.getMyReview(productId);
                  return [productId, review?.rating ?? null];
                } catch { return [productId, null]; }
              })
            ),
          ]);

          setProductRatings(Object.fromEntries(avgEntries));
          setUserReviews(Object.fromEntries(userEntries));
        }
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

  const executeCancelOrder = async () => {
    if (!cancelOrderTarget) return;
    try {
      setCancelLoading(true);
      await orderService.cancelOrder(cancelOrderTarget._id, { refundDestination: refundDestinationInput });
      toast.success('Cancellation requested, refund pending');
      setOrders(orders.map(o => o._id === cancelOrderTarget._id ? { ...o, status: 'Cancelled' } : o));
      setIsCancelModalOpen(false);
      setShowRefundDestinationModal(false);
      setCancelOrderTarget(null);
      setCancellationPreviewData(null);
    } catch (e) {
      toast.error(e.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
    }
  };

  const confirmCancelOrder = () => {
    if (cancellationPreviewData?.estimatedRefund > 0) {
      // Show refund destination modal
      const defaultPhone = cancelOrderTarget?.shippingAddress?.phone || profile?.phone || '';
      setRefundDestinationInput(defaultPhone);
      setShowRefundDestinationModal(true);
    } else {
      executeCancelOrder();
    }
  };

  const renderOrders = () => (
    <section className="px-5 py-7 lg:px-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#141225]">Order History</h2>
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
                <th className="p-4 whitespace-nowrap">Total</th>
                <th className="p-4 whitespace-nowrap">Paid</th>
                <th className="p-4 whitespace-nowrap">Balance</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Payment</th>
                <th className="p-4 text-center">Rating</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9DED3]">
              {orders.map((order) => {
                const firstItem = order.orderItems?.[0] || {};
                const extraItemsCount = (order.orderItems?.length || 1) - 1;
                const imageSrc = firstItem.image ? (firstItem.image.startsWith('http') || firstItem.image.startsWith('data:') ? firstItem.image : (firstItem.image.startsWith('/uploads') || firstItem.image.startsWith('uploads/')) ? `http://localhost:5000${firstItem.image.startsWith('/') ? '' : '/'}${firstItem.image}` : firstItem.image) : '/animal_balance_maze.png';

                const paidAmount = order.paymentMethod === 'COD' ? (order.codAdvance || 200) : order.totalPrice;
                const balanceAmount = order.paymentMethod === 'COD' ? (order.balanceAmount || Math.max(0, order.totalPrice - paidAmount)) : 0;

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
                    <td className="p-4 whitespace-nowrap font-medium text-[#6D625C]">{formatDate(order.createdAt)}</td>
                    <td className="p-4 whitespace-nowrap font-black text-[#141225]">Rs. {Number(order.totalPrice || 0).toLocaleString()}</td>
                    <td className="p-4 whitespace-nowrap font-bold text-emerald-600">Rs. {Number(paidAmount).toLocaleString()}</td>
                    <td className="p-4 whitespace-nowrap font-bold text-red-500">Rs. {Number(balanceAmount).toLocaleString()}</td>
                    <td className="p-4 whitespace-nowrap text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : order.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-[#F2E3D1] text-[#8B5E3C]'}`}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap font-medium text-center text-[#6D625C]">{order.paymentMethod || 'Online'}</td>
                    <td className="p-4 text-center">
                      {order.status === 'Delivered' ? (() => {
                        const productId = firstItem?.product;
                        const myRating = productId ? userReviews[productId] : undefined;
                        const hasReviewed = myRating != null && myRating > 0;
                        const avg = productRatings[productId] ?? 0;
                        const displayRating = hasReviewed ? myRating : Math.round(avg * 2) / 2;

                        const StarDisplay = ({ rating, clickable }) => (
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(i => {
                              const filled = rating >= i;
                              const half = !filled && rating >= i - 0.5;
                              return (
                                <span key={i} className="relative inline-block h-4 w-4">
                                  <Star className="absolute inset-0 h-4 w-4 text-gray-200 fill-gray-200" />
                                  {(filled || half) && (
                                    <span
                                      className="absolute inset-0 overflow-hidden"
                                      style={{ width: filled ? '100%' : '50%' }}
                                    >
                                      <Star className={`h-4 w-4 fill-amber-400 ${clickable ? 'text-amber-400 group-hover:text-amber-500 group-hover:fill-amber-500 transition-colors' : 'text-amber-400'}`} />
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        );

                        if (hasReviewed) {
                          // Already reviewed — static, non-clickable
                          return (
                            <div className="flex flex-col items-center gap-0.5" title="You have already reviewed this product">
                              <StarDisplay rating={myRating} clickable={false} />
                              <span className="text-[10px] font-bold text-emerald-600">Reviewed ✓</span>
                            </div>
                          );
                        }

                        // Not reviewed yet — clickable
                        return (
                          <button
                            onClick={() => setReviewModalProduct(productId)}
                            className="flex flex-col items-center justify-center gap-0.5 group"
                            title="Write a Review"
                          >
                            <StarDisplay rating={displayRating} clickable={true} />
                            <span className="text-[10px] font-semibold text-[#9A6031]">Rate</span>
                          </button>
                        );
                      })() : (
                        <span className="text-[#C4B9B0]">—</span>
                      )}
                    </td>

                    <td className="p-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!['Delivered', 'Cancelled'].includes(order.status) && (
                          <button 
                            type="button"
                            className="rounded border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
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

  const renderTrackingTimeline = (order) => {
    if (order.status === 'Cancelled') {
      return (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> Order Cancelled
        </div>
      );
    }

    const steps = [
      { id: 'ordered', label: 'Ordered', statuses: ['Placed', 'Pending', 'Packed', 'Shipping', 'Shipped', 'Out for delivery', 'Delivered'] },
      { id: 'packed', label: 'Packed', statuses: ['Packed', 'Shipping', 'Shipped', 'Out for delivery', 'Delivered'] },
      { id: 'shipped', label: 'Shipped', statuses: ['Shipping', 'Shipped', 'Out for delivery', 'Delivered'] },
      { id: 'out_for_delivery', label: 'Out for Delivery', statuses: ['Out for delivery', 'Delivered'] },
      { id: 'delivery', label: 'Delivery', statuses: ['Delivered'] }
    ];

    const currentStatusIndex = steps.map(s => s.statuses.includes(order.status)).lastIndexOf(true);
    
    const orderDate = new Date(order.createdAt);
    const deliveryDate = new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const getStepDate = (idx) => {
      if (idx === 0) return formatDate(order.createdAt);
      if (idx === steps.length - 1 && order.deliveredAt) return formatDate(order.deliveredAt);
      if (idx === steps.length - 1 && currentStatusIndex >= 1) return formatDate(deliveryDate);
      return '';
    };

    return (
      <div className="py-2 mb-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#141225]">Order {order.status === 'Delivered' ? 'Delivered' : 'Placed'}</h3>
            {order.status !== 'Delivered' && (
              <p className="text-[#6D625C] text-sm mt-0.5">Estimated Delivery by {formatDate(deliveryDate)}</p>
            )}
          </div>
        </div>

        <div className="relative flex items-start justify-between w-full mx-auto px-4 sm:px-8">
          {/* Progress bar track */}
          <div className="absolute top-4 left-10 right-10 h-1 bg-gray-200 rounded-full">
            {/* Active progress bar */}
            <div 
              className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(currentStatusIndex / (steps.length - 1)) * 100}%` }}
            />
          </div>

          {steps.map((step, idx) => {
            const isCompleted = currentStatusIndex >= idx;
            const isCurrent = currentStatusIndex === idx;
            
            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                {isCurrent && idx === 0 && (
                  <div className="absolute -top-10 bg-gray-800 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Shipping Soon!
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45" />
                  </div>
                )}
                
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-sm transition-colors duration-300 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300 text-transparent'}`}>
                  {isCompleted ? <Check className="w-4 h-4" /> : <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />}
                </div>

                {isCurrent && idx === 1 && (
                  <div className="absolute top-1 -right-4 sm:-right-6 text-[#9A6031] bg-white p-0.5 rounded-full z-20 shadow-sm border border-[#E9DED3]">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  </div>
                )}
                {isCurrent && (idx === 2 || idx === 3) && (
                  <div className="absolute top-1 -right-4 sm:-right-6 text-blue-500 bg-white p-0.5 rounded-full z-20 shadow-sm border border-blue-100">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  </div>
                )}

                <div className="text-center mt-2 w-16 sm:w-20">
                  <p className={`text-[10px] sm:text-xs font-bold ${isCompleted ? 'text-[#141225]' : 'text-gray-400'}`}>{step.label}</p>
                  <p className={`text-[9px] sm:text-[10px] mt-0.5 ${isCompleted ? 'text-[#6D625C]' : 'text-transparent'}`}>{getStepDate(idx)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
          <div className="rounded-[14px] border border-[#E9DED3] bg-white p-5 sm:p-7">
            {renderTrackingTimeline(activeOrder)}
          </div>

          <div className="rounded-[14px] border border-[#E9DED3] bg-white p-5">
            <h3 className="font-bold text-[#141225] mb-4">Products</h3>
            <div className="divide-y divide-[#E9DED3]">
              {activeOrder.orderItems?.map((item, idx) => {
                const imageSrc = item.image ? (item.image.startsWith('http') || item.image.startsWith('data:') ? item.image : (item.image.startsWith('/uploads') || item.image.startsWith('uploads/')) ? `http://localhost:5000${item.image.startsWith('/') ? '' : '/'}${item.image}` : item.image) : '/animal_balance_maze.png';
                return (
                  <div key={idx} className="py-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[8px] bg-[#F8F3EF]">
                      <img src={imageSrc} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#141225]">{item.name}</p>
                      <p className="text-sm text-[#6D625C] mt-1">
                        Qty: {item.qty} | Rs. {Number(item.price).toLocaleString()}
                        {(item.weight && item.weight !== '0' && item.weight !== 0) ? ` | Weight: ${item.weight}` : ''}
                      </p>
                    </div>
                    <div>
                      <button 
                        onClick={() => onNavigate('product-detail', { _id: item.product })}
                        className="rounded-[8px] bg-[#9A6031] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#7E4B25] w-full sm:w-auto mt-2 sm:mt-0 shadow-sm"
                      >
                        Buy Again
                      </button>
                      {activeOrder.status === 'Delivered' && (
                        <button 
                          onClick={() => setReviewModalProduct(item.product)}
                          className="sm:ml-2 rounded-[8px] border border-[#9A6031] text-[#9A6031] px-5 py-2.5 text-xs font-bold transition hover:bg-[#FAF8F5] w-full sm:w-auto mt-2 sm:mt-0 shadow-sm"
                        >
                          Write Review
                        </button>
                      )}
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
            {activeOrder.trackingId && (
              <div className="mt-4 pt-4 border-t border-[#E9DED3] flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-bold text-[#6D625C]">Tracking ID:</p>
                  <p className="text-sm font-semibold text-[#141225]">{activeOrder.trackingId}</p>
                </div>
                {activeOrder.trackingUrl && (
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-[#6D625C]">Tracking Link:</p>
                    <a href={activeOrder.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
                      Track Order <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-[14px] border border-[#E9DED3] bg-white p-5">
            <h3 className="font-bold text-[#141225] mb-4">Payment Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6D625C]">Items Total</span>
                <span className="font-semibold text-[#141225]">Rs. {Number(activeOrder.itemsPrice || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6D625C]">Shipping</span>
                <span className="font-semibold text-[#141225]">{Number(activeOrder.shippingPrice) === 0 ? 'Free' : `Rs. ${Number(activeOrder.shippingPrice).toLocaleString()}`}</span>
              </div>
              {activeOrder.taxPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6D625C]">Tax</span>
                  <span className="font-semibold text-[#141225]">Rs. {Number(activeOrder.taxPrice).toLocaleString()}</span>
                </div>
              )}
              {activeOrder.fees?.map((fee, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-[#6D625C]">{fee.name}</span>
                  <span className="font-semibold text-[#141225]">Rs. {Number(fee.amount).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-[#E9DED3] pt-3 mt-2 flex justify-between text-[15px]">
                <span className="font-bold text-[#141225]">Total Amount</span>
                <span className="font-black text-[#9A6031]">Rs. {Number(activeOrder.totalPrice || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[15px]">
                <span className="font-bold text-emerald-600">Paid ({activeOrder.paymentMethod})</span>
                <span className="font-bold text-emerald-600">Rs. {Number(activeOrder.paymentMethod === 'COD' ? (activeOrder.codAdvance || 200) : activeOrder.totalPrice).toLocaleString()}</span>
              </div>
              {activeOrder.paymentMethod === 'COD' && (
                <div className="flex justify-between border-t border-[#E9DED3] pt-3 mt-1 text-[15px]">
                  <span className="font-bold text-red-500">Balance to Pay (at delivery)</span>
                  <span className="font-black text-red-500">Rs. {Number(activeOrder.balanceAmount || Math.max(0, activeOrder.totalPrice - (activeOrder.codAdvance || 200))).toLocaleString()}</span>
                </div>
              )}
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
            {recentlyViewed && recentlyViewed.length > 0 ? (
               <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                 {recentlyViewed.slice(0, 3).map((item, i) => {
                   const imgUrl = typeof item.image === 'string' ? item.image : (item.image?.url || '');
                   const imageSrc = imgUrl ? (imgUrl.startsWith('http') || imgUrl.startsWith('data:') ? imgUrl : (imgUrl.startsWith('/uploads') || imgUrl.startsWith('uploads/')) ? `http://localhost:5000${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}` : imgUrl) : '/animal_balance_maze.png';
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
                {item.image ? <img src={item.image.startsWith('http') || item.image.startsWith('data:') ? item.image : (item.image.startsWith('/uploads') || item.image.startsWith('uploads/')) ? `http://localhost:5000${item.image.startsWith('/') ? '' : '/'}${item.image}` : item.image} alt={item.name} className="h-full w-full object-cover" /> : null}
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
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-[#4A403B] mb-2">Profile Image</label>
                <div className="flex items-center gap-4">
                  {form.profileImage ? (
                    <img src={form.profileImage} alt="Profile preview" className="w-16 h-16 rounded-full object-cover border border-[#E9DED3]" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#FAF4EF] text-[#8B5E3C]">
                      <User size={32} />
                    </div>
                  )}
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/jpeg, image/png, image/webp" 
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        try {
                          toast.loading('Uploading image...', { id: 'upload-image' });
                          const response = await uploadAPI.uploadImages([file]);
                          if (response?.data?.success && response.data.data.urls?.length > 0) {
                            setForm(current => ({ ...current, profileImage: response.data.data.urls[0] }));
                            toast.success('Image uploaded successfully!', { id: 'upload-image' });
                          } else {
                             toast.error('Upload failed or no URL returned', { id: 'upload-image' });
                          }
                        } catch (err) {
                          console.error(err);
                          toast.error('Failed to upload image', { id: 'upload-image' });
                        }
                      }}
                      className="w-full text-sm text-[#6D625C] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#FAF4EF] file:text-[#8B5E3C] hover:file:bg-[#F1E8E0] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
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
      {isCancelModalOpen && cancelOrderTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#FAF8F5] rounded-2xl shadow-xl w-full max-w-[400px] border border-[#E9DED3] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                  <X size={16} className="stroke-[3]" />
                </div>
                <h2 className="text-base font-bold text-[#141225]">Cancel Order</h2>
              </div>
              <button 
                onClick={() => { setIsCancelModalOpen(false); setCancelOrderTarget(null); setCancellationPreviewData(null); }}
                className="text-[#6D625C] hover:text-[#141225] transition-colors"
                disabled={cancelLoading}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 pb-5">
              <p className="text-sm font-semibold text-[#4A403B] mb-4">
                Are you sure you want to cancel the order for <span className="font-bold text-[#141225]">{cancelOrderTarget.orderItems[0]?.name}</span>?
              </p>

              {/* Product Info */}
              <div className="flex gap-4 items-center mb-5">
                <div className="w-14 h-14 rounded-lg bg-[#F3E7D7] overflow-hidden border border-[#E9DED3] shrink-0">
                  <img 
                    src={cancelOrderTarget.orderItems[0]?.image ? (cancelOrderTarget.orderItems[0].image.startsWith('http') || cancelOrderTarget.orderItems[0].image.startsWith('data:') ? cancelOrderTarget.orderItems[0].image : (cancelOrderTarget.orderItems[0].image.startsWith('/uploads') || cancelOrderTarget.orderItems[0].image.startsWith('uploads/')) ? `http://localhost:5000${cancelOrderTarget.orderItems[0].image.startsWith('/') ? '' : '/'}${cancelOrderTarget.orderItems[0].image}` : cancelOrderTarget.orderItems[0].image) : '/animal_balance_maze.png'} 
                    alt={cancelOrderTarget.orderItems[0]?.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-[#141225] line-clamp-1">{cancelOrderTarget.orderItems[0]?.name}</h4>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[11px] text-[#8A817C]">Qty: {cancelOrderTarget.orderItems.reduce((acc, item) => acc + item.qty, 0)}</p>
                    <p className="text-sm font-bold text-[#141225]">₹{cancelOrderTarget.itemsPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-2 border-t border-[#E9DED3] pt-4 mb-4">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6D625C] font-semibold">Base Shipping</span>
                  <span className="text-[#141225] font-bold">+₹{(cancelOrderTarget.shippingPrice || 0).toFixed(2)}</span>
                </div>
                {cancelOrderTarget.fees && cancelOrderTarget.fees.map((fee, index) => (
                  <div key={index} className="flex justify-between text-[13px]">
                    <span className="text-[#6D625C] font-semibold">{fee.name}</span>
                    <span className="text-[#141225] font-bold">+₹{(fee.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6D625C] font-semibold">Total Order Amount</span>
                  <span className="text-[#141225] font-bold">₹{cancelOrderTarget.totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6D625C] font-semibold">Payment Method</span>
                  <span className="text-[#141225] font-bold">{cancelOrderTarget.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6D625C] font-semibold">Amount Paid</span>
                  {cancellationPreviewData ? (
                    <span className="text-[#141225] font-bold">₹{cancellationPreviewData.amountPaid.toFixed(2)}</span>
                  ) : (
                    <span className="text-[#8A817C] text-[11px] italic">Calculating...</span>
                  )}
                </div>
                <div className="flex justify-between text-[13px] pt-1">
                  <span className="text-red-500 font-bold">Cancellation Fee</span>
                  {cancellationPreviewData ? (
                    <span className="text-red-500 font-bold">-₹{cancellationPreviewData.cancellationFee.toFixed(2)}</span>
                  ) : (
                    <span className="text-[#8A817C] text-[11px] italic">Calculating...</span>
                  )}
                </div>
                <div className="flex justify-between text-[15px] pt-2 border-t border-dashed border-[#E9DED3]">
                  <span className="text-[#141225] font-bold">Estimated Refund</span>
                  {cancellationPreviewData ? (
                    <span className="text-emerald-600 font-bold">₹{cancellationPreviewData.estimatedRefund.toFixed(2)}</span>
                  ) : (
                    <span className="text-[#8A817C] text-[11px] italic mt-1">Calculating...</span>
                  )}
                </div>
              </div>
              
              {cancellationPreviewData?.notAllowedReason && (
                 <p className="text-xs text-red-500 font-bold text-center mb-4">{cancellationPreviewData.notAllowedReason}</p>
              )}
              {cancellationPreviewData && !cancellationPreviewData.notAllowedReason && (
                <div className="text-[10px] text-center text-[#8A817C] mb-4">
                  <p>Refund will be processed in 1 working day.</p>
                  <p className="mt-1 font-semibold text-[#6D625C]">
                    (Allowed within {cancellationPreviewData.timeLimit || '-'} for '{cancellationPreviewData.ruleStatus || '-'}' status)
                  </p>
                  {cancellationPreviewData.cancellationFee > 0 && (
                    <p className="mt-0.5 text-red-400">
                      *Cancellation Fee of ₹{cancellationPreviewData.cancellationFee.toFixed(2)} applied for {cancellationPreviewData.ruleMethod} orders.
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={() => { setIsCancelModalOpen(false); setCancelOrderTarget(null); setCancellationPreviewData(null); }}
                  className="flex-1 py-2.5 bg-white border border-[#E9DED3] text-[#4A403B] rounded-[8px] font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors"
                  disabled={cancelLoading}
                >
                  No, Keep Order
                </button>
                <button 
                  onClick={confirmCancelOrder}
                  disabled={cancelLoading || (cancellationPreviewData && !cancellationPreviewData.isAllowed)}
                  className="flex-1 py-2.5 bg-[#C94A4A] text-white rounded-[8px] font-bold text-sm shadow-sm hover:bg-[#B33E3E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Order'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {showRefundDestinationModal && cancelOrderTarget && cancellationPreviewData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#FAF8F5] rounded-2xl shadow-xl w-full max-w-[400px] border border-[#E9DED3] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <CreditCard size={16} className="stroke-[2.5]" />
                </div>
                <h2 className="text-base font-bold text-[#141225]">Refund Destination</h2>
              </div>
              <button 
                onClick={() => setShowRefundDestinationModal(false)}
                className="text-[#6D625C] hover:text-[#141225] transition-colors"
                disabled={cancelLoading}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 pb-5">
              <p className="text-sm text-[#4A403B] mb-5">
                Please provide the Phone Number or UPI ID where you would like to receive your refund of <span className="font-bold text-[#141225]">₹{cancellationPreviewData.estimatedRefund.toFixed(2)}</span>.
              </p>

              <label className="block mb-6">
                <span className="text-xs font-bold text-[#6D625C] uppercase tracking-wider mb-2 block">Phone Number / UPI ID</span>
                <input
                  type="text"
                  value={refundDestinationInput}
                  onChange={(e) => setRefundDestinationInput(e.target.value)}
                  placeholder="e.g. 9080773897 or name@upi"
                  className="w-full rounded-[10px] border border-[#E6D9CE] px-4 py-3 outline-none focus:border-[#9A6031] bg-white text-[#141225] font-medium"
                />
              </label>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRefundDestinationModal(false)}
                  className="flex-1 py-2.5 bg-white border border-[#E9DED3] text-[#4A403B] rounded-[8px] font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors"
                  disabled={cancelLoading}
                >
                  Cancel
                </button>
                <button 
                  onClick={executeCancelOrder}
                  disabled={cancelLoading || !refundDestinationInput.trim()}
                  className="flex-[1.5] flex justify-center items-center gap-2 py-2.5 bg-[#647C5E] text-white rounded-[8px] font-bold text-sm shadow-sm hover:bg-[#52664d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelLoading ? 'Processing...' : (
                    <>
                      <CheckCircle2 size={16} /> Confirm Refund Details
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
      {reviewModalProduct && (
        <WriteReviewModal
          productId={reviewModalProduct}
          user={user}
          onClose={() => setReviewModalProduct(null)}
          onSuccess={() => setReviewModalProduct(null)}
        />
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
