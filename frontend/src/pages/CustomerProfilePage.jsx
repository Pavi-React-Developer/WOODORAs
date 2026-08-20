import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Landmark,
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
  CreditCard,
  Settings,
  Loader2,
  RotateCw,
  RefreshCw,
  Download,
  Search,
  Filter,
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  FileText,
  Hourglass,
  IndianRupee,
  Calendar,
  Wallet,
  Leaf,
  RotateCcw
} from 'lucide-react';
import { saveAs } from 'file-saver';
import UserAdvancedBookings from './profile/UserAdvancedBookings';
import { authService } from '../api/authService';
import Pagination from '../components/common/Pagination';
import { orderService } from '../api/orderService';
import { generateDisplayId, formatOrderId, formatPaymentMethod } from '../utils/formatters';
import { uploadAPI } from '../api/catalogAdminService';
import { reviewService } from '../api/reviewService';
import { walletService } from '../api/walletService';
import { refundService } from '../api/refundService';
import { customizeService } from '../api/customizeService';
import { bulkOrderService } from '../api/bulkOrderService';
import { API_ORIGIN } from '../api/apiClient';
import { formatDeliveryDate, getDeliveryDate } from '../utils/deliveryDate';
import useCartStore from '../store/useCartStore';
import useAddressStore from '../store/useAddressStore';
import WriteReviewModal from '../components/WriteReviewModal';
import CustomerAddressManager from '../components/CustomerAddressManager';
import OrderPricingSummary from '../components/OrderPricingSummary';
import ProductCard from '../components/ProductCard';
import { productV2API } from '../api/catalogV2Service';

const getProductName = (details) => {
  if (!details) return 'Custom Order';
  if (!Array.isArray(details)) return details.productName || 'Custom Order';
  const nameField = details.find(f => f.label && f.label.toLowerCase().includes('name'));
  if (nameField && typeof nameField.value === 'string') return nameField.value;
  const firstStringField = details.find(f => typeof f.value === 'string');
  return firstStringField ? firstStringField.value : 'Custom Order';
};

const getWoodType = (details) => {
  if (!details) return 'N/A';
  if (!Array.isArray(details)) return details.woodType || 'N/A';
  const woodField = details.find(f => f.label && f.label.toLowerCase().includes('wood'));
  return woodField && typeof woodField.value === 'string' ? woodField.value : 'N/A';
};

const modules = [
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'orders', label: 'Order History', icon: Package },
  { id: 'bulk-orders', label: 'Bulk Orders', icon: Package },
  { id: 'customize-orders', label: 'Customize Orders', icon: Settings },
  { id: 'reviews', label: 'Reviews & Ratings', icon: Star },
  { id: 'cart', label: 'Cart', icon: ShoppingBag },
  { id: 'wallet', label: 'Wallet', icon: CreditCard },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'refunds', label: 'Refunds', icon: ExternalLink },
  { id: 'gift-card', label: 'Gift & Card', icon: Gift },
  { id: 'advanced-booking', label: 'Advanced Booking', icon: Package },
];

const profileModulePaths = {
  profile: '/profile',
  orders: '/profile/order-history',
  'bulk-orders': '/profile/bulk-orders',
  'bulk-order-details': '/profile/bulk-orders/details',
  'customize-orders': '/profile/customize-orders',
  'customize-order-details': '/profile/customize-orders/details',
  reviews: '/profile/reviews',
  addresses: '/profile/addresses',
  cart: '/profile/cart',
  wallet: '/profile/wallet',
  refunds: '/profile/refunds',
  wishlist: '/profile/wishlist',
  rewards: '/profile/loyalty-rewards',
  password: '/profile/change-password',
  notifications: '/profile/notifications',
  'gift-card': '/profile/gift-card',
  'advanced-booking': '/profile/advanced-booking',
};

const profilePathModules = Object.fromEntries(
  Object.entries(profileModulePaths).map(([moduleId, path]) => [path, moduleId])
);
profilePathModules['/profile/edit'] = 'profile';
profilePathModules['/profile/order-history/details'] = 'order-details';
profilePathModules['/profile/bulk-orders/details'] = 'bulk-order-details';
profilePathModules['/profile/customize-orders/details'] = 'customize-order-details';
profilePathModules['/profile/gift-card/details'] = 'gift-card-details';

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

  const isWalletRefundDestination = (destination) => {
    return String(destination || '').trim().toUpperCase() === 'WALLET';
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

  import { useConfigStore } from '../store/useConfigStore';

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
    const location = useLocation();
    const navigate = useNavigate();
    const profile = profileData?.user || user || {};
    const { cartItems, updateQuantity, removeFromCart, getSubtotal } = useCartStore();
    const { walletEnabled } = useConfigStore();
    const [activeModule, setActiveModule] = useState('profile');
    const [activeOrder, setActiveOrder] = useState(null);
    const [activeBulkOrder, setActiveBulkOrder] = useState(null);
    const [activeCustomizeOrder, setActiveCustomizeOrder] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const visibleModules = modules.filter(m => walletEnabled ? true : m.id !== 'wallet');
    const [saving, setSaving] = useState(false);
    const { addresses: storeAddresses, loading: addressLoading, fetchAddresses, addAddress: addStoreAddress, updateAddress: updateStoreAddress, deleteAddress: deleteStoreAddress } = useAddressStore();
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState(null);
    const [addressForm, setAddressForm] = useState({
      label: '', fullName: '', phone: '', pinCode: '', address: '', city: '', state: '', landmark: '', isDefault: false
    });
    
    useEffect(() => {
      fetchAddresses();
    }, [fetchAddresses]);
    
    // Drag-to-scroll ref and state
    const navRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
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
    const [ordersPage, setOrdersPage] = useState(1);
    const [ordersSearchTerm, setOrdersSearchTerm] = useState('');
    const [ordersFilterStatus, setOrdersFilterStatus] = useState('All');
    const [giftOrdersPage, setGiftOrdersPage] = useState(1);
    const [giftSearchTerm, setGiftSearchTerm] = useState('');
    const [giftFilterStatus, setGiftFilterStatus] = useState('All');
    const [bulkOrdersPage, setBulkOrdersPage] = useState(1);
    const [bulkSearchTerm, setBulkSearchTerm] = useState('');
    const [bulkFilterStatus, setBulkFilterStatus] = useState('All');
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);

    useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 640);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [bulkOrders, setBulkOrders] = useState([]);
    const [bulkOrdersLoading, setBulkOrdersLoading] = useState(false);
    const [customizeOrders, setCustomizeOrders] = useState([]);
    const [customizeOrdersLoading, setCustomizeOrdersLoading] = useState(false);
    const [customizeOrdersPage, setCustomizeOrdersPage] = useState(1);
    const [customizeSearchTerm, setCustomizeSearchTerm] = useState('');
    const [customizeFilterStatus, setCustomizeFilterStatus] = useState('All');
  const [expandedCustomizeOrders, setExpandedCustomizeOrders] = useState({});
  const toggleCustomizeOrderExpand = (id) => {
    setExpandedCustomizeOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const [refunds, setRefunds] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundsPage, setRefundsPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
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



  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelOrderTarget, setCancelOrderTarget] = useState(null);
  const [cancellationPreviewData, setCancellationPreviewData] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showRefundDestinationModal, setShowRefundDestinationModal] = useState(false);
  const [refundDestinationInput, setRefundDestinationInput] = useState('');
  const [refundMethod, setRefundMethod] = useState('upi'); // 'upi' or 'wallet'
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  const [productRatings, setProductRatings] = useState({}); // { productId: avgRating }
  const [userReviews, setUserReviews] = useState({});       // { "orderId:orderItemId": userRating | null }
  const [walletSummary, setWalletSummary] = useState({ balance: 0, currency: 'INR', status: 'active', transactions: [] });
  const [walletLoading, setWalletLoading] = useState(false);

  const openProfileModule = (moduleId) => {
    setActiveModule(moduleId);
    setActiveOrder(null);
    setActiveBulkOrder(null);
    setActiveCustomizeOrder(null);
    navigate(profileModulePaths[moduleId] || '/profile');
  };

  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/+$/, '') || '/profile';
    const nextModule = profilePathModules[normalizedPath] || 'profile';
    setActiveModule(nextModule);
    setIsEditing(normalizedPath === '/profile/edit');
    if (nextModule === 'order-details' && location.state?.data) {
      setActiveOrder(location.state.data);
      // Fetch fresh order details so if admin changed status, it updates on refresh
      if (location.state.data._id) {
        orderService.getOrderById(location.state.data._id).then(freshOrder => {
          setActiveOrder(freshOrder);
        }).catch(err => console.error('Failed to fetch fresh order details:', err));
      }
    } else if (nextModule !== 'order-details') {
      setActiveOrder(null);
    }
    if (nextModule !== 'bulk-order-details') {
      setActiveBulkOrder(null);
    }
  }, [location.pathname, location.state]);
  
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        setRecentlyViewed(recent);
        
        const top3 = recent.slice(0, 3);
        if (top3.length > 0) {
          const freshData = await Promise.all(
            top3.map(item => productV2API.getById(item.id || item._id).catch(() => null))
          );
          
          const updatedRecent = recent.map((item, index) => {
            if (index < 3 && freshData[index]) {
              const fresh = freshData[index];
              const p = fresh?.product || fresh?.data || fresh;
              if (p && (p._id === item.id || p._id === item._id || p.id === item.id || p.id === item._id)) {
                 return {
                   ...item,
                   basePrice: p.compareAtPrice || p.basePrice || p.price || item.price,
                   salePrice: p.price || p.salePrice || p.discountPrice || item.price,
                   discountPrice: p.discountPrice || p.price,
                   hasVariants: p.hasVariants,
                   variants: p.variants,
                   averageRating: p.averageRating || 0,
                   reviewCount: p.reviewCount || 0
                 };
              }
            }
            return item;
          });
          setRecentlyViewed(updatedRecent);
        }
      } catch (e) {
        console.error('Failed to parse recently viewed', e);
      }
    };
    fetchRecent();
  }, [activeModule]);

  const [form, setForm] = useState({
    name: profile.name || '',
    phone: profile.phone || '',
    dateOfBirth: toInputDate(profile.dateOfBirth),
    gender: profile.gender || '',
    profileImage: profile.profileImage || '',
    preferredAgeGroup: profile.preferences?.preferredAgeGroup || 'All Ages',
    emailNotifications: profile.preferences?.emailNotifications !== false,
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
  }, [
    profile._id, 
    profile.name, 
    profile.phone, 
    profile.dateOfBirth, 
    profile.gender, 
    profile.profileImage, 
    JSON.stringify(profile.addresses), 
    JSON.stringify(profile.preferences)
  ]);

  useEffect(() => {
    if (activeModule === 'wallet') {
      const loadWallet = async () => {
        try {
          setWalletLoading(true);
          const data = await walletService.getSummary();
          setWalletSummary(data?.data || { balance: 0, currency: 'INR', status: 'active', transactions: [] });
        } catch (error) {
          toast.error(error.message || 'Failed to load wallet');
        } finally {
          setWalletLoading(false);
        }
      };
      loadWallet();
    }
  }, [activeModule]);

  useEffect(() => {
    if (activeModule === 'refunds') {
      fetchMyRefunds();
    }
  }, [activeModule]);

  useEffect(() => {
    if (activeModule === 'bulk-orders') {
      const fetchBulkOrders = async () => {
        try {
          setBulkOrdersLoading(true);
          // Uses bulkOrderService → apiClient → VITE_API_BASE_URL (no hardcoded localhost)
          const data = await bulkOrderService.getMyBulkOrders();
          if (data.success) {
            setBulkOrders(data.data || []);
          } else {
            toast.error(data.message || 'Failed to load bulk orders');
          }
        } catch (err) {
          toast.error(err.message || 'Failed to load bulk orders');
        } finally {
          setBulkOrdersLoading(false);
        }
      };
      fetchBulkOrders();
    }
  }, [activeModule]);

  useEffect(() => {
    if (activeModule === 'customize-orders') {
      const fetchCustomizeOrders = async () => {
        try {
          setCustomizeOrdersLoading(true);
          const data = await customizeService.getMyRequests();
          if (data) {
            setCustomizeOrders(data);
          }
        } catch (err) {
          toast.error('Failed to load customize orders');
        } finally {
          setCustomizeOrdersLoading(false);
        }
      };
      fetchCustomizeOrders();
    }
  }, [activeModule]);

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const data = await orderService.getMyOrders();
      setOrders(data || []);

      // Collect product IDs for avg ratings and order-item IDs for the user's own reviews.
      const deliveredProductIds = [...new Set(
        (data || [])
          .filter(o => o.status === 'Delivered')
          .flatMap(o => o.orderItems?.map(item => item.product).filter(Boolean) || [])
      )];
      const deliveredReviewTargets = (data || [])
        .filter(o => o.status === 'Delivered')
        .flatMap(o => (o.orderItems || [])
          .filter(item => item.product && item._id)
          .map(item => ({
            key: `${o._id}:${item._id}`,
            orderId: o._id,
            orderItemId: item._id,
          }))
        );

      if (deliveredProductIds.length > 0 || deliveredReviewTargets.length > 0) {
        const [avgEntries, userEntries] = await Promise.all([
          Promise.all(
            deliveredProductIds.map(async (productId) => {
              try {
                // Use reviewService (which uses apiClient + VITE_API_BASE_URL)
                const stats = await reviewService.getReviews(productId, { limit: 1 }).catch(() => null)
                  || await fetch(`${API_ORIGIN}/api/reviews/${productId}/stats`).then(r => r.json()).catch(() => ({}));
                return [productId, stats?.avg ?? stats?.stats?.avg ?? 0];
              } catch { return [productId, 0]; }
            })
          ),
          Promise.all(
            deliveredReviewTargets.map(async ({ key, orderId, orderItemId }) => {
              try {
                const review = await reviewService.getMyOrderItemReview(orderId, orderItemId);
                return [key, review?.rating ?? null];
              } catch { return [key, null]; }
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

  useEffect(() => {
    if (!['orders', 'reviews', 'gift-card'].includes(activeModule)) return;
    fetchOrders();
  }, [activeModule]);

  const stats = useMemo(() => ({
    orders: orders.length,
    cart: cartItems.reduce((sum, item) => sum + item.qty, 0),
    rewards: profile.loyalty?.points || 0,
  }), [orders.length, cartItems, profile.loyalty?.points]);

  const displayName = profile.name || 'Customer';
  const displayEmail = profile.email || user?.email || '';
  const displayPhone = profile.phone || storeAddresses.find(a => a.isDefault)?.phone || storeAddresses[0]?.phone || 'Not added';
  const resolveImage = (img) => {
    if (!img) return null;
    if (typeof img === 'string' && img !== '[object Object]') return img;
    if (typeof img === 'object' && img.url) return img.url;
    return null;
  };

  const profileImage = resolveImage(form.profileImage) || resolveImage(profile.profileImage) || profile.avatar || '';

  const getImageUrl = (image) => {
    if (!image) return '';
    if (typeof image !== 'string') return '';
    if (image.startsWith('http') || image.startsWith('data:')) return image;
    if (image.startsWith('/uploads') || image.startsWith('uploads/')) {
      // Use API_ORIGIN from apiClient (reads VITE_API_BASE_URL) — no hardcoded localhost
      return `${API_ORIGIN}${image.startsWith('/') ? '' : '/'}${image}`;
    }
    return image;
  };

  const reviewTargets = useMemo(() => {
    return (orders || []).flatMap((order) =>
      (order.orderItems || []).filter((item) => item?.product && item?._id).map((item) => {
        const reviewKey = `${order._id}:${item._id}`;
        const myRating = reviewKey ? userReviews[reviewKey] : undefined;
        const hasReviewed = myRating != null && myRating > 0;
        return {
          key: reviewKey,
          order,
          item,
          productId: item.product,
          orderId: order._id,
          orderItemId: item._id,
          hasReviewed,
          myRating,
          orderStatus: order.status || 'Pending',
        };
      })
    );
  }, [orders, userReviews]);

  const renderRefunds = () => (
    <section className="px-5 py-7 lg:px-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#141225]">Refunds</h2>
          <p className="mt-1 text-sm text-[#6D625C]">Your refund requests and statuses.</p>
        </div>
        <span className="rounded-full bg-[#F2E3D1] px-3 py-1 text-xs font-bold text-[#8B5E3C]">{refunds.length} Items</span>
      </div>

      {refundsLoading ? (
        <p className="mt-8 text-sm text-[#6D625C]">Loading refunds...</p>
      ) : refunds.length === 0 ? (
        <EmptyState icon={ExternalLink} title="No refunds yet" text="Any approved refunds will appear here." />
      ) : (
        <div className="mt-6 space-y-4">
          {(() => {
            const itemsPerPage = 5;
            const totalPages = Math.ceil(refunds.length / itemsPerPage);
            const paginatedRefunds = refunds.slice((refundsPage - 1) * itemsPerPage, refundsPage * itemsPerPage);
            
            return (
              <>
                {paginatedRefunds.map((refund) => {
                  const status = refund.status || 'Pending';
                  
                  let currentStepIndex = 0;
                  if (status === 'Refund Approved' || status === 'Approved Refund' || status === 'Approved') {
                    currentStepIndex = 1;
                  } else if (status === 'Refunded' || status === 'Completed') {
                    currentStepIndex = 2;
                  }
                  
                  const isWallet = isWalletRefundDestination(refund.refundDestination);

                  return (
                    <div key={refund._id} className="rounded-[20px] border border-[#FDF0E5]/50 bg-white p-5 sm:p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] w-full mx-auto relative overflow-hidden">
                      
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF5F0] text-[#D97736]">
                            <Package className="h-6 w-6" />
                            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#D97736] shadow-sm">
                              <RotateCcw className="h-3 w-3" />
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-400">Order</p>
                            <p className="text-base font-bold text-[#141225]">#{refund.orderId?.slice(-8).toUpperCase() || refund.orderId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-md bg-[#FFF3E9] px-3 py-1.5 text-xs font-bold text-[#D97736]">
                          <Hourglass className="h-3.5 w-3.5" />
                          {status === 'Pending' ? 'Approval Pending' : status}
                        </div>
                      </div>

                      {/* 2x2 Grid */}
                      <div className="grid grid-cols-2 rounded-[16px] bg-[#FAF8F5] p-1 mb-6 relative z-10">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b border-r border-[#E9DED3]/40 p-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FCECDA] text-[#D97736]">
                            <IndianRupee className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-gray-400">Refund Amount</p>
                            <p className="text-sm font-bold text-[#141225]">₹{(refund.amount || 0).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b border-[#E9DED3]/40 p-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FCECDA] text-[#D97736]">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-gray-400">Payment Method</p>
                            <p className="text-sm font-bold text-[#141225]">{isWallet ? 'Wallet' : 'UPI / Phone'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 border-r border-[#E9DED3]/40 p-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FCECDA] text-[#D97736]">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-gray-400">Requested On</p>
                            <p className="text-sm font-bold text-[#141225]">{new Date(refund.createdAt).toLocaleDateString()}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{new Date(refund.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FCECDA] text-[#D97736]">
                            <Gift className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-gray-400">Items</p>
                            <p className="text-sm font-bold text-[#141225]">{refund.items?.length || 1} {refund.items?.length > 1 ? 'Items' : 'Item'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="relative mx-auto mt-8 mb-6 w-full max-w-[90%] sm:max-w-sm">
                        {/* Connecting Line */}
                        <div className="absolute top-[19px] left-[16.66%] right-[16.66%] h-[2px]">
                          <div className="absolute inset-0 border-t-2 border-solid border-[#E9DED3]" />
                          <div 
                            className="absolute top-0 left-0 h-full bg-[#D97736] transition-all duration-500" 
                            style={{ width: currentStepIndex === 0 ? '0%' : currentStepIndex === 1 ? '50%' : '100%' }}
                          />
                        </div>
                        
                        <div className="relative z-10 flex w-full">
                          {/* Step 1: Requested */}
                          <div className="flex flex-1 flex-col items-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${currentStepIndex >= 0 ? 'bg-[#D97736] text-white ring-4 ring-[#FFF3E9]' : 'bg-[#E5E7EB] text-gray-400'}`}>
                                <Clock className="h-4 w-4" />
                              </div>
                            </div>
                            <p className={`mt-2 text-xs font-bold ${currentStepIndex >= 0 ? 'text-[#141225]' : 'text-gray-400'}`}>Requested</p>
                            {currentStepIndex >= 0 && (
                              <p className="text-[9px] text-gray-500 mt-0.5">{new Date(refund.createdAt).toLocaleDateString()}</p>
                            )}
                          </div>
                          
                          {/* Step 2: Approved */}
                          <div className="flex flex-1 flex-col items-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${currentStepIndex >= 1 ? 'bg-[#D97736] text-white ring-4 ring-[#FFF3E9]' : 'bg-[#E5E7EB] text-white'}`}>
                                <Check className="h-4 w-4" strokeWidth={3} />
                              </div>
                            </div>
                            <p className={`mt-2 text-xs font-bold ${currentStepIndex >= 1 ? 'text-[#141225]' : 'text-gray-400'}`}>Approved</p>
                          </div>
                          
                          {/* Step 3: Refunded */}
                          <div className="flex flex-1 flex-col items-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${currentStepIndex >= 2 ? 'bg-[#D97736] text-white ring-4 ring-[#FFF3E9]' : 'bg-[#E5E7EB] text-gray-400'}`}>
                                <Wallet className="h-4 w-4" />
                              </div>
                            </div>
                            <p className={`mt-2 text-xs font-bold ${currentStepIndex >= 2 ? 'text-[#141225]' : 'text-gray-400'}`}>Refunded</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer Message */}
                      <div className={`relative z-10 flex items-center gap-3 rounded-[12px] px-4 py-3 text-sm font-semibold ${
                        currentStepIndex === 2 ? 'bg-emerald-50/80 text-emerald-700' :
                        currentStepIndex === 1 ? 'bg-blue-50/80 text-blue-700' :
                        'bg-[#E6F4EA]/60 text-[#2F6B42]'
                      }`}>
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          currentStepIndex === 2 ? 'bg-emerald-200' :
                          currentStepIndex === 1 ? 'bg-blue-200' :
                          'bg-[#C2E3CD]'
                        }`}>
                          <Leaf className="h-3.5 w-3.5" />
                        </div>
                        {currentStepIndex === 2 ? "Your refund has been processed successfully." :
                         currentStepIndex === 1 ? "Your refund is approved and will be credited soon." :
                         "We'll notify you once your refund is approved."}
                         
                         {/* Leaf decoration in corner */}
                         <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none">
                            <Leaf className="h-16 w-16" />
                         </div>
                      </div>

                    </div>
                  );
                })}
                
                <Pagination currentPage={refundsPage} totalPages={totalPages} onPageChange={setRefundsPage} />
              </>
            );
          })()}
        </div>
      )}
    </section>
  );

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

    // --- Full Name ---
    if (!form.name.trim()) {
      toast.error('Full name is required.');
      return;
    }
    if (form.name.trim().length < 2) {
      toast.error('Full name must be at least 2 characters.');
      return;
    }

    // --- Phone Number ---
    if (form.phone && form.phone.trim()) {
      const phoneDigits = form.phone.replace(/\D/g, '');
      if (phoneDigits.length < 6 || phoneDigits.length > 15) {
        toast.error('Phone number must be between 6 and 15 digits.');
        return;
      }
    }

    // --- Date of Birth ---
    if (form.dateOfBirth) {
      const dob = new Date(form.dateOfBirth);
      const today = new Date();
      const minAge = new Date();
      minAge.setFullYear(today.getFullYear() - 120);
      if (isNaN(dob.getTime())) {
        toast.error('Please enter a valid date of birth.');
        return;
      }
      if (dob >= today) {
        toast.error('Date of birth cannot be in the future.');
        return;
      }
      if (dob < minAge) {
        toast.error('Please enter a valid date of birth.');
        return;
      }
    }

    // --- Shipping Addresses ---
    for (let i = 0; i < form.addresses.length; i++) {
      const addr = form.addresses[i];
      if (addr.fullName && !addr.fullName.trim()) {
        toast.error(`Address ${i + 1}: Full name cannot be blank.`);
        return;
      }
      if (addr.phone && addr.phone.trim()) {
        const addrPhone = addr.phone.replace(/\D/g, '');
        if (addrPhone.length < 6 || addrPhone.length > 15) {
          toast.error(`Address ${i + 1}: Phone number must be between 6 and 15 digits.`);
          return;
        }
      }
      if (addr.pinCode && addr.pinCode.trim()) {
        const pinDigits = addr.pinCode.replace(/\D/g, '');
        if (pinDigits.length < 5 || pinDigits.length > 10) {
          toast.error(`Address ${i + 1}: PIN code must be between 5 and 10 digits.`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender,
        profileImage: typeof form.profileImage === 'string' 
          ? (form.profileImage.includes('[object Object]') ? undefined : { url: form.profileImage.trim(), public_id: 'legacy' }) 
          : form.profileImage,
        addresses: form.addresses,
        preferences: {
          preferredAgeGroup: form.preferredAgeGroup,
          emailNotifications: form.emailNotifications,
        },
      };
      const response = await authService.updateProfile(payload);
      onProfileUpdated?.(response.user);
      navigate('/profile');
      toast.success('Profile updated successfully!');
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

          <button type="button" onClick={() => navigate('/profile/edit')} className="mt-8 flex w-full flex-col items-center justify-center rounded-[12px] border border-dashed border-[#C9AA91] px-6 py-5 text-[#9A6031] transition hover:bg-[#FFF8F2]">
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
      const dest = refundMethod === 'wallet' ? 'WALLET' : refundDestinationInput;
      await orderService.cancelOrder(cancelOrderTarget._id, { refundDestination: dest });
      toast.success('Cancellation requested, refund pending');
      setOrders(orders.map(o => o._id === cancelOrderTarget._id ? { ...o, status: 'Cancelled' } : o));
      setIsCancelModalOpen(false);
      setShowRefundDestinationModal(false);
      setCancelOrderTarget(null);
      setCancellationPreviewData(null);
      // Refresh refunds list if user is viewing refunds
      if (activeModule === 'refunds') fetchMyRefunds();
    } catch (e) {
      toast.error(e.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
    }
  };

  const fetchMyRefunds = async () => {
    try {
      setRefundsLoading(true);
      const data = await refundService.getMyRefunds();
      setRefunds(data);
    } catch (err) {
      console.error('Failed to fetch refunds', err);
    } finally {
      setRefundsLoading(false);
    }
  };

  // Background poll to detect refund approvals and redirect user accordingly
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const APPROVED_STATUSES = ['Refund Approved', 'Completed', 'Approved Refund'];
    const seenApproved = new Set();
    let intervalId = null;

    const poll = async () => {
      try {
        const latest = await refundService.getMyRefunds();
        if (!mounted) return;
        for (const r of latest || []) {
          if (APPROVED_STATUSES.includes(r.status) && !seenApproved.has(r._id)) {
            seenApproved.add(r._id);
            if (isWalletRefundDestination(r.refundDestination)) {
              toast.success('Your refund was approved and credited to your wallet');
              navigate('/profile/wallet');
            } else {
              toast.success('Your refund was approved');
              navigate('/profile/refunds');
            }
          }
        }
      } catch (e) {
        // ignore polling errors
      }
    };

    (async () => {
      try {
        const initial = await refundService.getMyRefunds();
        (initial || []).forEach(r => {
          if (APPROVED_STATUSES.includes(r.status)) seenApproved.add(r._id);
        });
      } catch (e) {}
      // immediate poll then periodic
      await poll();
      intervalId = setInterval(poll, 10000);
    })();

    return () => { mounted = false; if (intervalId) clearInterval(intervalId); };
  }, [user, navigate]);

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

  const renderReviews = () => (
    <section className="px-5 py-7 lg:px-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#141225]">Reviews & Ratings</h2>
          <p className="mt-1 text-sm text-[#6D625C]">Your delivered purchases are listed here so you can add or update a review anytime.</p>
        </div>
        <span className="rounded-full bg-[#F2E3D1] px-3 py-1 text-xs font-bold text-[#8B5E3C]">{reviewTargets.length} Items</span>
      </div>

      {ordersLoading ? (
        <p className="mt-8 text-sm text-[#6D625C]">Loading review items...</p>
      ) : reviewTargets.length === 0 ? (
        <EmptyState icon={Star} title="No review items yet" text="Once your order is delivered, the products will appear here for review." action="Shop Now" onAction={() => onNavigate('/')} />
      ) : (
        <div className="mt-6 space-y-4">
          {(() => {
            const itemsPerPage = 5;
            const totalPages = Math.ceil(reviewTargets.length / itemsPerPage);
            const paginatedReviews = reviewTargets.slice((reviewsPage - 1) * itemsPerPage, reviewsPage * itemsPerPage);
            
            return (
              <>
                {paginatedReviews.map(({ key, order, item, productId, orderId, orderItemId, hasReviewed, myRating, orderStatus }) => {
                  const imageSrc = getImageUrl(item.image);
                  return (
                    <div key={key} className="rounded-[14px] border border-[#E9DED3] bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-1 items-center gap-4">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[10px] bg-[#F8F3EF]">
                            <img src={imageSrc} alt={item.name} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[#141225]">{item.name}</p>
                            <p className="mt-1 text-sm text-[#6D625C]">Qty: {item.qty} • Rs. {Number(item.price || 0).toLocaleString()}</p>
                            <p className="mt-1 text-sm text-[#6D625C]">Order #{formatOrderId(order)} • Status: <span className={`font-semibold ${orderStatus === 'Delivered' ? 'text-emerald-600' : 'text-[#8B5E3C]'}`}>{orderStatus}</span></p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          {orderStatus === 'Delivered' ? (
                            hasReviewed ? (
                              <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-2 text-center">
                                <p className="text-sm font-bold text-emerald-700">Reviewed ✓</p>
                                <p className="text-xs text-emerald-600">Your rating: {myRating}/5</p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setReviewModalProduct({ productId, orderId, orderItemId, reviewKey: key })}
                                    className="transition hover:scale-110"
                                    title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                  >
                                    <Star className="h-5 w-5 text-[#C4B9B0]" fill="none" />
                                  </button>
                                ))}
                              </div>
                            )
                          ) : (
                            <div className="rounded-[10px] border border-[#E9DED3] bg-[#FAF8F5] px-4 py-2 text-sm font-semibold text-[#6D625C]">
                              Review after delivery
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => { setActiveOrder(order); setActiveModule('order-details'); navigate('/profile/order-history/details'); }}
                            className="rounded-[8px] border border-[#E9DED3] px-4 py-2.5 text-sm font-bold text-[#141225] transition hover:bg-[#FAF8F5]"
                          >
                            View Order
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <Pagination currentPage={reviewsPage} totalPages={totalPages} onPageChange={setReviewsPage} />
              </>
            );
          })()}
        </div>
      )}
    </section>
  );

  const renderOrders = () => {
    let filteredOrders = orders;

    // Apply search
    if (ordersSearchTerm) {
      const term = ordersSearchTerm.toLowerCase();
      filteredOrders = filteredOrders.filter(order => {
        const firstItemName = (order.orderItems?.[0]?.name || '').toLowerCase();
        const orderId = (order.orderId || order._id || '').toLowerCase();
        return firstItemName.includes(term) || orderId.includes(term);
      });
    }

    // Apply filter
    if (ordersFilterStatus !== 'All') {
      filteredOrders = filteredOrders.filter(order => order.status === ordersFilterStatus);
    }

    const itemsPerPage = isMobile ? 5 : 10;
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
    const paginatedOrders = filteredOrders.slice((ordersPage - 1) * itemsPerPage, ordersPage * itemsPerPage);

    return (
    <section className="px-5 py-7 lg:px-7">
      {/* Mobile Header */}
      <div className="sm:hidden mb-6">
        <div className="flex items-center justify-between mb-1">
           <h1 className="text-2xl font-black text-[#111]">Order History</h1>
           <button onClick={() => { fetchOrders(); setOrdersPage(1); }} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg bg-white shadow-sm text-sm font-bold text-gray-700 active:bg-gray-50">
             <RotateCw className="w-3.5 h-3.5" /> Refresh
           </button>
        </div>
        <p className="text-[#666] text-sm">View and manage your recent orders.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-end items-center gap-3 mb-6 w-full">
        <div className="relative w-full sm:w-64">
          <input 
            type="text" 
            placeholder="Search by Company or Name..." 
            value={ordersSearchTerm}
            onChange={(e) => {
              setOrdersSearchTerm(e.target.value);
              setOrdersPage(1);
            }}
            className="w-full pl-4 pr-10 py-2 rounded-md border border-[#E9DED3] bg-white text-sm focus:outline-none focus:border-[#8B5E3C] shadow-sm"
          />
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
        </div>
        <div className="relative w-full sm:w-auto">
          <select
            value={ordersFilterStatus}
            onChange={(e) => {
              setOrdersFilterStatus(e.target.value);
              setOrdersPage(1);
            }}
            className="appearance-none flex w-full sm:w-auto items-center gap-2 pl-9 pr-8 py-2 rounded-md bg-[#FAF8F5] border border-[#E9DED3] text-[#141225] text-sm font-semibold hover:bg-[#F0EAE1] transition shadow-sm outline-none cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <Filter className="w-4 h-4 text-[#141225] absolute left-3 top-2.5 pointer-events-none" />
          <ChevronDown className="w-4 h-4 text-[#141225] absolute right-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      {ordersLoading ? (
        <p className="mt-8 text-sm text-[#6D625C]">Loading orders...</p>
      ) : orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" text="Your placed orders will appear here after checkout." action="Start Shopping" onAction={() => onNavigate('/')} />
      ) : filteredOrders.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">No matching orders found.</div>
      ) : (
        <>
        <div className="mt-6">
          {/* Desktop Table Container */}
          <div className="hidden sm:block overflow-x-auto rounded-[14px] border border-[#E9DED3] bg-white">
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
                {paginatedOrders.map((order) => {
                  const firstItem = order.orderItems?.[0] || {};
                  const extraItemsCount = (order.orderItems?.length || 1) - 1;
                  const imageSrc = firstItem.image ? (firstItem.image.startsWith('http') || firstItem.image.startsWith('data:') ? firstItem.image : (firstItem.image.startsWith('/uploads') || firstItem.image.startsWith('uploads/')) ? `http://localhost:5000${firstItem.image.startsWith('/') ? '' : '/'}${firstItem.image}` : firstItem.image) : '';
  
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
                            <p className="font-bold text-[#141225] line-clamp-1">{firstItem.name || `Order #${formatOrderId(order)}`}</p>
                            {order.isGiftOrder && (
                              <span className="mt-1 mb-1 inline-flex w-max items-center gap-1 rounded bg-[#FDF0EB] px-2 py-0.5 text-[10px] font-bold text-[#D04E26] uppercase tracking-wider">
                                <Gift size={10} />
                                Gift & Card
                              </span>
                            )}
                            {extraItemsCount > 0 && <p className="text-xs font-semibold text-[#9A6031]">+{extraItemsCount} more item(s)</p>}
                            <p className="text-xs text-[#6D625C] mt-0.5">#{formatOrderId(order)}</p>
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
                      <td className="p-4 whitespace-nowrap font-medium text-center text-[#6D625C]">{formatPaymentMethod(order.paymentMethod)}</td>
                      <td className="p-4 text-center">
                        {order.status === 'Delivered' ? (() => {
                          const productId = firstItem?.product;
                          const reviewKey = firstItem?._id ? `${order._id}:${firstItem._id}` : '';
                          const myRating = reviewKey ? userReviews[reviewKey] : undefined;
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
                            return (
                              <div className="flex flex-col items-center gap-0.5" title="You have already reviewed this product">
                                <StarDisplay rating={myRating} clickable={false} />
                                <span className="text-[10px] font-bold text-emerald-600">Reviewed ✓</span>
                              </div>
                            );
                          }
  
                          return (
                            <button
                              onClick={() => setReviewModalProduct({
                                productId,
                                orderId: order._id,
                                orderItemId: firstItem._id,
                                reviewKey,
                              })}
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
                            onClick={() => { setActiveOrder(order); setActiveModule('order-details'); navigate('/profile/order-history/details'); }}
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

          {/* Mobile Orders List */}
          <div className="sm:hidden flex flex-col gap-4">
            {paginatedOrders.map((order) => {
              const firstItem = order.orderItems?.[0] || {};
              const orderDate = new Date(order.createdAt);
              const formattedDate = `${orderDate.getDate().toString().padStart(2, '0')}/${(orderDate.getMonth() + 1).toString().padStart(2, '0')}/${orderDate.getFullYear()}`;
              const imageSrc = firstItem.image ? (firstItem.image.startsWith('http') || firstItem.image.startsWith('data:') ? firstItem.image : (firstItem.image.startsWith('/uploads') || firstItem.image.startsWith('uploads/')) ? `${API_ORIGIN}${firstItem.image.startsWith('/') ? '' : '/'}${firstItem.image}` : firstItem.image) : '';
              
              return (
                <div key={order._id} className="bg-white rounded-[20px] shadow-sm border border-[#E9E9E9] overflow-hidden p-4">
                  <div className="flex justify-between items-start mb-4 gap-2">
                    <div className="flex gap-3 items-center flex-1">
                       <div className="w-12 h-12 rounded-lg bg-[#F8F4EC] border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                         {imageSrc ? <img src={imageSrc} alt={firstItem.name} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-gray-400" />}
                       </div>
                       <h4 className="font-bold text-[#111] text-[15px] line-clamp-2 leading-snug">
                         {firstItem.name || `Order #${formatOrderId(order)}`}
                       </h4>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider bg-[#FFF9E6] text-[#B8860B] border border-[#F5E6B3]">
                      {order.status || 'PLACED'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-2 mb-5 text-[13px]">
                     <div className="text-gray-500">Date: <span className="text-[#333] font-medium">{formattedDate}</span></div>
                     <div className="text-gray-500 text-right">Pay: <span className="text-[#333] font-medium">{formatPaymentMethod(order.paymentMethod)}</span></div>
                     <div className="text-gray-500">Total: <span className="text-[#111] font-bold">₹{order.totalPrice.toLocaleString()}</span></div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => { setActiveOrder(order); setActiveModule('order-details'); navigate('/profile/order-history/details'); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#8B5E3C] text-white text-[13px] font-bold transition-colors hover:bg-[#7a5234] active:bg-[#7a5234]">
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
          />
        </div>
        </>
      )}
    </section>
    );
  };

  const renderCustomizeOrders = () => {
    let filteredOrders = customizeOrders;

    // Apply search
    if (customizeSearchTerm) {
      const term = customizeSearchTerm.toLowerCase();
      filteredOrders = filteredOrders.filter(o => {
        const idMatch = (o.orderId || o._id.slice(-8)).toLowerCase().includes(term);
        const nameMatch = (o.customerInfo?.fullName || '').toLowerCase().includes(term);
        const productMatch = getProductName(o.productDetails).toLowerCase().includes(term);
        return idMatch || nameMatch || productMatch;
      });
    }

    if (customizeFilterStatus !== 'All') {
       filteredOrders = filteredOrders.filter(o => o.status === customizeFilterStatus);
    }

    const itemsPerPage = isMobile ? 5 : 10;
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
    const paginatedOrders = filteredOrders.slice((customizeOrdersPage - 1) * itemsPerPage, customizeOrdersPage * itemsPerPage);

    return (
      <section className="px-5 py-7 lg:px-7 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
             <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4EBE2] text-[#A7632E] shrink-0">
                <User className="h-5 w-5" strokeWidth={2} />
             </div>
             <div>
                <h2 className="text-2xl font-serif font-bold text-[#141225]">Customize Orders</h2>
                <p className="text-sm text-[#6D625C] mt-0.5">Track the status of your customized order requests.</p>
             </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <input 
                type="text" 
                placeholder="Search by Order ID or Name..." 
                value={customizeSearchTerm}
                onChange={(e) => {
                  setCustomizeSearchTerm(e.target.value);
                  setCustomizeOrdersPage(1);
                }}
                className="w-full pl-4 pr-10 py-2 rounded-md border border-[#E9DED3] bg-white text-sm focus:outline-none focus:border-[#8B5E3C] shadow-sm"
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
            </div>
            <div className="relative w-full sm:w-auto">
              <select
                value={customizeFilterStatus}
                onChange={(e) => {
                  setCustomizeFilterStatus(e.target.value);
                  setCustomizeOrdersPage(1);
                }}
                className="appearance-none flex w-full sm:w-auto items-center gap-2 pl-9 pr-8 py-2 rounded-md bg-[#FAF8F5] border border-[#E9DED3] text-[#141225] text-sm font-semibold hover:bg-[#F0EAE1] transition shadow-sm outline-none cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <Filter className="w-4 h-4 text-[#141225] absolute left-3 top-2.5 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-[#141225] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {customizeOrdersLoading ? (
          <p className="mt-8 text-sm text-[#6D625C]">Loading customize orders...</p>
        ) : customizeOrders.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-[14px] border border-dashed border-[#E9DED3] bg-[#FAF8F5] py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#C4B9B0] shadow-sm">
              <Settings className="h-8 w-8" strokeWidth={1.5} />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#141225]">No Customize Orders Yet</h3>
            <p className="mt-2 max-w-sm text-sm text-[#6D625C]">You haven't placed any custom order requests.</p>
            <button type="button" onClick={() => onNavigate('/customize')} className="mt-6 rounded-[8px] bg-[#9A6031] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#7E4B25]">
              Request Customize Order
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">No matching orders found.</div>
        ) : (
          <div className="space-y-4">
            {paginatedOrders.map((order) => {
              const reqId = `#CO${(order.orderId || order._id.slice(-4)).toUpperCase()}`;
              const contactName = order.customerInfo?.fullName || 'N/A';
              const productName = getProductName(order.productDetails);
              const woodType = getWoodType(order.productDetails) || 'N/A';
              const date = formatDate(order.createdAt);
              const expectedDelivery = order.expectedDelivery ? formatDate(order.expectedDelivery) : 'Pending';
              const status = (order.status || 'PENDING').toUpperCase();

              let statusClasses = 'bg-gray-100 text-gray-600';
              if (status === 'APPROVED') statusClasses = 'bg-emerald-100 text-emerald-700';
              if (status === 'IN PROGRESS') statusClasses = 'bg-orange-100 text-orange-700';
              if (status === 'PENDING') statusClasses = 'bg-blue-100 text-blue-700';
              if (status === 'REJECTED') statusClasses = 'bg-red-100 text-red-700';
              const imgObj = order.images?.[0];
              let imageStr = '';
              if (imgObj) {
                 imageStr = typeof imgObj === 'string' ? imgObj : imgObj.url;
              }
              const imageUrl = imageStr ? (imageStr.startsWith('http') || imageStr.startsWith('data:') ? imageStr : `http://localhost:5000${imageStr.startsWith('/') ? '' : '/'}${imageStr}`) : 'https://placehold.co/150x150/F4EBE2/A7632E?text=Custom';

              const isExpanded = !!expandedCustomizeOrders[order._id];
              return (
                <div key={order._id} className="rounded-[12px] border border-[#E9DED3] bg-white p-4 shadow-sm">
                  {isMobile ? (
                    <div className="flex flex-col">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 rounded-lg bg-[#FAF8F5] shrink-0 overflow-hidden">
                          <img src={imageUrl} alt={productName} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between min-h-[5rem]">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-bold text-[#141225]">{reqId}</span>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusClasses}`}>
                                {status}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#141225] truncate">{productName}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">Requested on {date}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 bg-[#FAF5F0] rounded-[12px] p-4">
                        <div className="flex">
                          {/* Col 1 */}
                          <div className="flex-1 space-y-4 pr-4 border-r border-[#E9DED3]/60">
                            <div>
                              <p className="text-[11px] text-gray-500 mb-0.5">Wood Type</p>
                              <p className="text-sm font-bold text-[#141225] truncate">{woodType}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-gray-500 mb-0.5">Request Date</p>
                              <p className="text-sm font-bold text-[#141225] truncate">{date}</p>
                            </div>
                          </div>
                          {/* Col 2 */}
                          <div className="flex-1 space-y-4 pl-4">
                            <div>
                              <p className="text-[11px] text-gray-500 mb-0.5">Contact Name</p>
                              <p className="text-sm font-bold text-[#141225] truncate">{contactName}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-gray-500 mb-0.5">Email</p>
                              <p className="text-sm font-bold text-[#141225] truncate">{order.customerInfo?.email || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => { setActiveCustomizeOrder(order); setActiveModule('customize-order-details'); navigate('/profile/customize-orders/details'); }}
                          className="w-full mt-5 flex items-center justify-center gap-1.5 py-2 rounded-md bg-white border border-[#D04E26] text-[#D04E26] text-xs font-bold hover:bg-[#FDF0EB] transition"
                        >
                          <Eye className="w-4 h-4" /> View Details
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                      {/* Image */}
                      <div className="w-full md:w-36 h-40 md:h-24 rounded-lg bg-[#FAF8F5] shrink-0 overflow-hidden">
                        <img src={imageUrl} alt={productName} className="w-full h-full object-cover" />
                      </div>
                      
                      {/* Details Grid */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                        {/* Col 1 */}
                        <div className="space-y-4">
                          <div>
                            <p className="text-[11px] text-gray-500 mb-0.5">Order ID</p>
                            <p className="text-sm font-bold text-[#141225]">{reqId}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-gray-500 mb-0.5">Contact Name</p>
                            <p className="text-sm font-bold text-[#141225] truncate">{contactName}</p>
                          </div>
                        </div>
                        
                        {/* Col 2 */}
                        <div className="space-y-4">
                          <div>
                            <p className="text-[11px] text-gray-500 mb-0.5">Product</p>
                            <p className="text-sm font-bold text-[#141225] truncate">{productName}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-gray-500 mb-0.5">Wood Type</p>
                            <p className="text-sm font-bold text-[#141225] truncate">{woodType}</p>
                          </div>
                        </div>
                        
                        {/* Col 3 */}
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <CalendarDays className="w-3 h-3 text-gray-500" />
                              <p className="text-[11px] text-gray-500">Requested On</p>
                            </div>
                            <p className="text-sm font-bold text-[#141225] pl-4">{date}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Status & Action */}
                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto mt-2 md:mt-0 gap-4 md:min-w-[120px]">
                        <div className="text-left md:text-right">
                          <p className="text-[11px] text-gray-500 mb-1 hidden md:block">Status</p>
                          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClasses}`}>
                            {status}
                          </span>
                        </div>
                        <button 
                          onClick={() => { setActiveCustomizeOrder(order); setActiveModule('customize-order-details'); navigate('/profile/customize-orders/details'); }}
                          className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md bg-white border border-[#D04E26] text-[#D04E26] text-[11px] font-bold hover:bg-[#FDF0EB] transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Details
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Pagination Controls */}
            <Pagination currentPage={customizeOrdersPage} totalPages={totalPages} onPageChange={setCustomizeOrdersPage} />
          </div>
        )}
      </section>
    );
  };

  const renderCustomizeOrderDetails = () => {
    if (!activeCustomizeOrder) return null;
    const { customerInfo, shippingAddress, productDetails, status, rejectionReason, createdAt, images } = activeCustomizeOrder;

    return (
      <section className="px-5 py-7 lg:px-7">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#141225]">Customize Order Details</h2>
            <p className="mt-1 text-sm text-[#6D625C]">Requested on {formatDate(createdAt)}</p>
          </div>
          <button type="button" onClick={() => openProfileModule('customize-orders')} className="rounded-[8px] border border-[#E9DED3] px-4 py-2 text-sm font-bold text-[#141225] hover:bg-gray-50">Back to Customize Orders</button>
        </div>

        <div className="space-y-6">
          <div className="rounded-[14px] border border-[#E9DED3] bg-white p-5">
            <h3 className="font-bold text-[#141225] mb-4">Request Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
               <div>
                  <p className="text-[#6D625C]">Full Name</p>
                  <p className="font-semibold text-[#141225] mt-1">{customerInfo.fullName}</p>
               </div>
               <div>
                  <p className="text-[#6D625C]">Email Address</p>
                  <p className="font-semibold text-[#141225] mt-1">{customerInfo.email}</p>
               </div>
               <div>
                  <p className="text-[#6D625C]">Phone Number</p>
                  <p className="font-semibold text-[#141225] mt-1">{customerInfo.phone}</p>
               </div>
               <div>
                  <p className="text-[#6D625C]">Status</p>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider mt-1 ${
                    status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                    status === 'Rejected' ? 'bg-red-100 text-red-700' :
                    'bg-[#F2E3D1] text-[#8B5E3C]'
                  }`}>
                    {status || 'Pending'}
                  </span>
               </div>
               {status === 'Rejected' && rejectionReason && (
                 <div className="col-span-1 sm:col-span-2">
                    <p className="text-red-600 font-bold">Rejection Reason</p>
                    <p className="font-semibold text-[#141225] mt-1">{rejectionReason}</p>
                 </div>
               )}
            </div>
          </div>

          <div className="rounded-[14px] border border-[#E9DED3] bg-white p-5">
            <h3 className="font-bold text-[#141225] mb-4">Shipping Address</h3>
            <p className="text-sm text-[#141225] font-semibold">{shippingAddress.addressLine1}</p>
            {shippingAddress.addressLine2 && <p className="text-sm text-[#6D625C]">{shippingAddress.addressLine2}</p>}
            <p className="text-sm text-[#6D625C]">{shippingAddress.city}, {shippingAddress.state} {shippingAddress.pincode}</p>
          </div>

          <div className="rounded-[14px] border border-[#E9DED3] bg-white p-5">
            <h3 className="font-bold text-[#141225] mb-4">Product Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm bg-[#FAF8F5] p-4 rounded-xl border border-[#E9DED3]">
               {Array.isArray(productDetails) ? (
                 productDetails.map((field, idx) => (
                   <div key={idx}>
                      <p className="text-[#8B5E3C] text-xs font-bold uppercase">{field.label}</p>
                      <p className="font-bold text-[#141225] mt-1">
                        {typeof field.value === 'boolean' 
                          ? (field.value ? 'Yes' : 'No') 
                          : (field.value || 'N/A')}
                      </p>
                   </div>
                 ))
               ) : (
                 <div className="col-span-1 sm:col-span-2 text-gray-500 italic">No configuration data</div>
               )}
            </div>
            
            {images && images.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-[#141225] mb-3">Reference Images</h3>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {images.map((img, idx) => (
                    <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" className="shrink-0 group relative rounded-lg overflow-hidden border border-[#E9DED3] shadow-sm">
                      <img src={img.url} alt={`Reference ${idx + 1}`} className="h-32 w-32 object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ExternalLink className="w-6 h-6 text-white" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  };

  const getBulkOrderValue = (order, keyword) => {
    const field = order.customFields?.find(f => f.label?.toLowerCase().includes(keyword.toLowerCase()));
    return field ? field.value : '-';
  };

  const renderBulkOrders = () => {
    let filteredOrders = bulkOrders;
    
    // Apply search
    if (bulkSearchTerm) {
      const term = bulkSearchTerm.toLowerCase();
      filteredOrders = filteredOrders.filter(o => {
        const idMatch = (o.displayId || generateDisplayId('MKB', o._id)).toLowerCase().includes(term);
        const company = getBulkOrderValue(o, 'company').toLowerCase();
        const name = getBulkOrderValue(o, 'name').toLowerCase();
        return idMatch || company.includes(term) || name.includes(term);
      });
    }

    if (bulkFilterStatus !== 'All') {
       filteredOrders = filteredOrders.filter(o => o.status === bulkFilterStatus);
    }

    const itemsPerPage = isMobile ? 5 : 10;
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
    const paginatedOrders = filteredOrders.slice((bulkOrdersPage - 1) * itemsPerPage, bulkOrdersPage * itemsPerPage);

    return (
      <section className="px-5 py-7 lg:px-7 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
             <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4EBE2] text-[#A7632E] shrink-0">
                <User className="h-5 w-5" strokeWidth={2} />
             </div>
             <h2 className="text-2xl font-serif font-bold text-[#141225]">Bulk Orders</h2>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <h3 className="text-[17px] font-bold text-[#141225] font-serif">Your Bulk Order Requests</h3>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-72">
              <input 
                type="text" 
                placeholder="Search by Company or Name..." 
                value={bulkSearchTerm}
                onChange={(e) => {
                  setBulkSearchTerm(e.target.value);
                  setBulkOrdersPage(1);
                }}
                className="w-full pl-4 pr-10 py-2.5 rounded-md border border-[#E9DED3] bg-white text-sm focus:outline-none focus:border-[#8B5E3C] shadow-sm"
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
            </div>
            <div className="relative w-full sm:w-auto">
              <select
                value={bulkFilterStatus}
                onChange={(e) => {
                  setBulkFilterStatus(e.target.value);
                  setBulkOrdersPage(1);
                }}
                className="appearance-none flex w-full sm:w-auto items-center gap-2 pl-9 pr-8 py-2.5 rounded-md bg-[#FAF8F5] border border-[#E9DED3] text-[#141225] text-sm font-semibold hover:bg-[#F0EAE1] transition shadow-sm outline-none cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <Filter className="w-4 h-4 text-[#141225] absolute left-3 top-3 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-[#141225] absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {bulkOrdersLoading ? (
          <p className="mt-8 text-sm text-[#6D625C]">Loading bulk orders...</p>
        ) : bulkOrders.length === 0 ? (
          <EmptyState icon={Package} title="No Bulk Orders Yet" text="You haven't placed any bulk order requests." action="Request Bulk Order" onAction={() => onNavigate('/bulk-orders')} />
        ) : filteredOrders.length === 0 ? (
           <div className="py-12 text-center text-sm text-gray-500">No matching orders found.</div>
        ) : (
          <div className="flex flex-col flex-1">
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-[14px] border border-[#E9DED3] bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#E9DED3] text-[13px] font-semibold text-[#141225]">
                      <th className="px-6 py-4 whitespace-nowrap">Request ID</th>
                      <th className="px-6 py-4 whitespace-nowrap">Company Name</th>
                      <th className="px-6 py-4 whitespace-nowrap">Your Name</th>
                      <th className="px-6 py-4 whitespace-nowrap">Email</th>
                      <th className="px-6 py-4 whitespace-nowrap">Phone</th>
                      <th className="px-6 py-4 whitespace-nowrap">Requested On</th>
                      <th className="px-6 py-4 whitespace-nowrap">Status</th>
                      <th className="px-6 py-4 whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9DED3]">
                    {paginatedOrders.map((order) => {
                      const reqId = order.displayId || generateDisplayId('MKB', order._id);
                      const company = getBulkOrderValue(order, 'Company');
                      const name = getBulkOrderValue(order, 'Name');
                      const email = getBulkOrderValue(order, 'Email');
                      const phone = getBulkOrderValue(order, 'Phone');
                      const date = formatDate(order.createdAt);
                      const status = (order.status || 'PENDING').toUpperCase();

                      let statusClasses = 'bg-gray-100 text-gray-600';
                      if (status === 'APPROVED') statusClasses = 'bg-emerald-100 text-emerald-700';
                      if (status === 'PENDING') statusClasses = 'bg-orange-100 text-orange-700';
                      if (status === 'UNDER REVIEW') statusClasses = 'bg-blue-100 text-blue-700';
                      if (status === 'REJECTED') statusClasses = 'bg-red-100 text-red-700';
                      if (status === 'COMPLETED') statusClasses = 'bg-gray-200 text-gray-700';

                      return (
                        <tr key={order._id} className="hover:bg-gray-50/50 transition">
                          <td className="px-6 py-4 text-[13px] font-bold text-[#D04E26] whitespace-nowrap">{reqId}</td>
                          <td className="px-6 py-4 text-[13px] text-[#141225] whitespace-nowrap uppercase">{company}</td>
                          <td className="px-6 py-4 text-[13px] text-[#141225] whitespace-nowrap capitalize">{name}</td>
                          <td className="px-6 py-4 text-[13px] text-[#141225] whitespace-nowrap">{email}</td>
                          <td className="px-6 py-4 text-[13px] text-[#141225] whitespace-nowrap">{phone}</td>
                          <td className="px-6 py-4 text-[13px] text-[#141225] whitespace-nowrap">{date}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${statusClasses}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button 
                              onClick={() => { setActiveBulkOrder(order); setActiveModule('bulk-order-details'); navigate('/profile/bulk-orders/details'); }}
                              className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md bg-white border border-[#D04E26] text-[#D04E26] text-xs font-semibold hover:bg-[#FDF0EB] transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-4">
              {paginatedOrders.map((order) => {
                const reqId = order.displayId || generateDisplayId('MKB', order._id);
                const company = getBulkOrderValue(order, 'Company');
                const name = getBulkOrderValue(order, 'Name');
                const phone = getBulkOrderValue(order, 'Phone');
                const date = formatDate(order.createdAt);
                const status = (order.status || 'PENDING').toUpperCase();

                let statusClasses = 'bg-gray-100 text-gray-600';
                if (status === 'APPROVED') statusClasses = 'bg-emerald-100 text-emerald-700';
                if (status === 'PENDING') statusClasses = 'bg-orange-100 text-orange-700';
                if (status === 'UNDER REVIEW') statusClasses = 'bg-blue-100 text-blue-700';
                if (status === 'REJECTED') statusClasses = 'bg-red-100 text-red-700';
                if (status === 'COMPLETED') statusClasses = 'bg-gray-200 text-gray-700';

                return (
                  <div key={`mob-${order._id}`} className="rounded-[12px] border border-[#E9DED3] bg-white p-4 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-bold text-[#D04E26]">{reqId}</span>
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${statusClasses}`}>
                        {status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm text-[#141225]">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="uppercase truncate font-medium">{company}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate">{date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="capitalize truncate">{name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate">{phone}</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-gray-100/50 mt-1">
                      <button 
                        onClick={() => { setActiveBulkOrder(order); setActiveModule('bulk-order-details'); navigate('/profile/bulk-orders/details'); }}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-white border border-[#D04E26] text-[#D04E26] text-xs font-semibold hover:bg-[#FDF0EB] transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination Controls */}
            <Pagination currentPage={bulkOrdersPage} totalPages={totalPages} onPageChange={setBulkOrdersPage} className="mt-6 flex items-center justify-center gap-2 flex-wrap" />
          </div>
        )}
      </section>
    );
  };

  const renderBulkOrderDetails = () => {
    if (!activeBulkOrder) return null;
    const { product, category, subCategory, customFields, status, rejectionReason, createdAt } = activeBulkOrder;
    
    let productImageUrl = '';
    
    // Check product image
    if (product?.images?.length > 0) {
       productImageUrl = product.images.find(img => img.isThumbnail)?.url || product.images[0]?.url || productImageUrl;
    } else if (product?.image?.url || typeof product?.image === 'string') {
       productImageUrl = product.image.url || product.image;
    } 
    // Fallback to category image
    else if (category?.image?.url || typeof category?.image === 'string') {
       productImageUrl = category.image.url || category.image;
    }
    // Fallback to subCategory image
    else if (subCategory?.image?.url || typeof subCategory?.image === 'string') {
       productImageUrl = subCategory.image.url || subCategory.image;
    }

    return (
      <section className="px-5 py-7 lg:px-7">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#141225]">Bulk Order Details</h2>
            <p className="mt-1 text-sm text-[#6D625C]">Requested on {formatDate(createdAt)}</p>
          </div>
          <button type="button" onClick={() => openProfileModule('bulk-orders')} className="rounded-[8px] border border-[#E9DED3] px-4 py-2 text-sm font-bold text-[#141225] hover:bg-gray-50">Back to Bulk Orders</button>
        </div>

        <div className="space-y-6">
          <div className="rounded-[14px] border border-[#E9DED3] bg-white p-5">
            <h3 className="font-bold text-[#141225] mb-4">Product Details</h3>
            <div className="flex flex-col sm:flex-row gap-6">
               <div className="h-32 w-32 shrink-0 overflow-hidden rounded-[12px] bg-[#F8F3EF] border border-[#E9DED3]">
                 <img src={productImageUrl} alt={product?.name || 'Product'} className="h-full w-full object-cover" />
               </div>
               <div>
                  <p className="font-bold text-lg text-[#141225]">{product?.name || 'Unknown Product'}</p>
                  {product?.price || product?.basePrice ? (
                     <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-[16px] font-bold text-[#333333]">
                           ₹{Number(product.price || product.basePrice).toLocaleString()}
                        </span>
                        {product.compareAtPrice > (product.price || product.basePrice) ? (
                           <>
                              <span className="text-[12px] text-[#999999] line-through">
                                 ₹{Number(product.compareAtPrice).toLocaleString()}
                              </span>
                              <span className="inline-flex items-center self-start rounded-full bg-[#B1621F]/15 px-2 py-0.5 text-[10px] font-semibold text-[#B1621F]">
                                 -{Math.round(((product.compareAtPrice - (product.price || product.basePrice)) / product.compareAtPrice) * 100)}%
                              </span>
                           </>
                        ) : null}
                     </div>
                  ) : null}
                  <p className="text-sm text-[#6D625C] mt-2"><span className="font-semibold">Category:</span> {category?.name || 'N/A'} {'>'} {subCategory?.name || 'N/A'}</p>
                  <div className="mt-4">
                     <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                        status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-[#F2E3D1] text-[#8B5E3C]'
                      }`}>
                        {status || 'Pending'}
                      </span>
                  </div>
               </div>
            </div>
          </div>

          {customFields && customFields.length > 0 && (
            <div className="rounded-[14px] border border-[#E9DED3] bg-white p-5">
              <h3 className="font-bold text-[#141225] mb-4">Request Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                {customFields.map((field, idx) => (
                  <div key={idx}>
                    <p className="text-[#6D625C] text-xs font-bold uppercase tracking-wider">{field.label}</p>
                    <p className="font-semibold text-[#141225] mt-1">
                      {typeof field.value === 'boolean' ? (field.value ? 'Yes' : 'No') : field.value || 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  };

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
      { id: 'shipped', label: 'Shipped', statuses: ['Shipped', 'Out for delivery', 'Delivered'] },
      { id: 'out_for_delivery', label: 'Out for Delivery', statuses: ['Out for delivery', 'Delivered'] },
      { id: 'delivery', label: 'Delivery', statuses: ['Delivered'] }
    ];

    const currentStatusIndex = steps.map(s => s.statuses.includes(order.status)).lastIndexOf(true);
    
    // Calculate exact progress to place truck and tooltip
    const progressMap = {
      'Pending': 0,
      'Placed': 0,
      'Packed': 1,
      'Shipping': 1.5,
      'Shipped': 2,
      'Out for delivery': 3,
      'Delivered': 4
    };
    const exactProgress = progressMap[order.status] ?? 0;
    
    let displayProgress = exactProgress;
    // Visually push the line and truck past the node so it travels between nodes
    if (order.status === 'Placed') {
      displayProgress = 0.5;
    } else if (order.status === 'Packed') {
      displayProgress = 1.5;
    } else if (order.status === 'Shipping') {
      displayProgress = 2.5;
    } else if (order.status === 'Out for delivery') {
      displayProgress = 3.5;
    }
    const progressPercent = (displayProgress / (steps.length - 1)) * 100;

    const orderDate = new Date(order.createdAt);
    const minDeliveryDate = new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const maxDeliveryDate = new Date(orderDate.getTime() + 10 * 24 * 60 * 60 * 1000);

    const getStepDate = (idx) => {
      if (idx === 0) return formatDate(order.createdAt);
      if (idx === steps.length - 1 && order.deliveredAt) return formatDate(order.deliveredAt);
      if (idx === steps.length - 1 && currentStatusIndex >= 1) return formatDate(maxDeliveryDate);
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
              <p className="text-[#6D625C] text-sm mt-0.5">Estimated Delivery between {formatDate(minDeliveryDate)} and {formatDate(maxDeliveryDate)}</p>
            )}
          </div>
        </div>

        <div className="w-full pb-4">
          <div className="relative flex items-start justify-between w-full mx-auto px-2 sm:px-8">
            {/* Progress bar track */}
            <div className="absolute top-4 left-6 right-6 sm:left-12 sm:right-12 h-1 bg-gray-200 rounded-full">
              {/* Active progress bar */}
              <div 
                className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
              {/* Current status icon / tooltip on the track */}
              {order.status !== 'Delivered' && (
                <div 
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-500"
                  style={{ left: `${progressPercent}%` }}
                >
                  <div className="relative flex justify-center items-center">
                    <div className="bg-white rounded-full p-1 shadow-sm border border-[rgb(176,97,28)]/20 flex items-center justify-center">
                      <Truck className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-[rgb(176,97,28)] fill-current" />
                    </div>
                    <div className="absolute -top-10 sm:-top-11 bg-gray-800 text-white text-[9px] sm:text-xs font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                      <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      In Progress!
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {steps.map((step, idx) => {
              const isCompleted = exactProgress >= idx;
              const isCurrent = currentStatusIndex === idx;
              
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center gap-1.5 sm:gap-2">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 shadow-sm transition-colors duration-300 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300 text-transparent'}`}>
                    {isCompleted ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <div className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-gray-200" />}
                  </div>

                  {isCurrent && (idx === 2 || idx === 3) && (
                    <div className="absolute top-0 -right-3 sm:-right-6 text-[rgb(176,97,28)] bg-white p-0.5 rounded-full z-20 shadow-sm border border-[rgb(176,97,28)]/20">
                      <Truck className="w-3 h-3 sm:w-5 sm:h-5 fill-current" />
                    </div>
                  )}

                  <div className="text-center mt-1 sm:mt-2 w-[52px] sm:w-20">
                    <p className={`text-[8.5px] sm:text-xs font-bold leading-tight ${isCompleted ? 'text-[#141225]' : 'text-gray-400'}`}>{step.label}</p>
                    <p className={`text-[7.5px] sm:text-[10px] mt-0.5 leading-tight ${isCompleted ? 'text-[#6D625C]' : 'text-transparent'}`}>{getStepDate(idx)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderOrderDetails = () => {
    if (!activeOrder) return null;
    return (
      <section className="px-5 py-7 lg:px-7">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#141225]">Order Details</h2>
            <p className="mt-1 text-sm text-[#6D625C]">Order #{formatOrderId(activeOrder)}</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {(activeOrder.isPaid || activeOrder.paymentMethod === 'COD') && activeOrder.status !== 'Cancelled' && (
              <button 
                type="button" 
                onClick={() => handleDownloadInvoice(activeOrder._id)}
                disabled={downloadingInvoice === activeOrder._id}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-[8px] bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
              >
                {downloadingInvoice === activeOrder._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Invoice
              </button>
            )}
            <button 
              type="button" 
              onClick={() => {
                if (activeOrder.isGiftOrder) {
                  openProfileModule('gift-card');
                } else {
                  openProfileModule('orders');
                }
              }} 
              className="flex-1 sm:flex-none rounded-[8px] border border-[#E9DED3] px-4 py-2 text-sm font-bold text-[#141225] hover:bg-gray-50 transition-colors"
            >
              {activeOrder.isGiftOrder ? 'Back to Gift Orders' : 'Back to Orders'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6 md:block md:space-y-6">
          <div className="rounded-[14px] border border-[#E9DED3] bg-white p-5 sm:p-7 overflow-x-auto">
            {renderTrackingTimeline(activeOrder)}
          </div>

          {/* Mobile Tracking ID (Order 1) */}
          {(activeOrder.trackingId || (activeOrder.additionalTracking && activeOrder.additionalTracking.length > 0)) && (
            <div className="md:hidden order-1 rounded-[14px] border border-[#E9DED3] bg-white p-5">
              {activeOrder.courierName && (
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-[#E9DED3]">
                  <p className="text-sm font-bold text-[#6D625C]">Courier:</p>
                  <p className="text-sm font-semibold text-[#141225]">{activeOrder.courierName}</p>
                </div>
              )}
              {activeOrder.trackingId && (
                <div className="mb-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-[#6D625C]">Tracking ID:</p>
                    <p className="text-sm font-semibold text-[#141225]">{activeOrder.trackingId}</p>
                  </div>
                  {activeOrder.trackingUrl && (
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm font-bold text-[#6D625C]">Tracking Link:</p>
                      <a href={activeOrder.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
                        Track Order <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}
              {activeOrder.additionalTracking && activeOrder.additionalTracking.map((track, idx) => track.trackingUrl && (
                <div key={idx} className="mb-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-[#6D625C]">Additional Details {idx + 1}:</p>
                    {track.trackingUrl.startsWith('http') ? (
                      <a href={track.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
                        Track Order <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-[#141225]">{track.trackingUrl}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="order-2 rounded-[14px] border border-[#E9DED3] bg-white p-5">
            <h3 className="font-bold text-[#141225] mb-4">Products</h3>
            <div className="divide-y divide-[#E9DED3]">
              {activeOrder.orderItems?.map((item, idx) => {
                const imageSrc = item.image ? (item.image.startsWith('http') || item.image.startsWith('data:') ? item.image : (item.image.startsWith('/uploads') || item.image.startsWith('uploads/')) ? `http://localhost:5000${item.image.startsWith('/') ? '' : '/'}${item.image}` : item.image) : '';
                return (
                  <div key={idx} className="py-4 flex flex-col gap-2 border-b border-[#E9DED3] last:border-0">
                    <div className="flex flex-row gap-4 items-center">
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
                    <div className="hidden md:block">
                      <button 
                        onClick={() => onNavigate(`/product/${item.product}`)}
                        className="rounded-[8px] bg-[#9A6031] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#7E4B25] shadow-sm"
                      >
                        Buy Again
                      </button>
                      {activeOrder.status === 'Delivered' && (
                        <button 
                          onClick={() => setReviewModalProduct({
                            productId: item.product,
                            orderId: activeOrder._id,
                            orderItemId: item._id,
                            reviewKey: `${activeOrder._id}:${item._id}`,
                          })}
                          className="ml-2 rounded-[8px] border border-[#9A6031] text-[#9A6031] px-5 py-2.5 text-xs font-bold transition hover:bg-[#FAF8F5] shadow-sm"
                        >
                          Write Review
                        </button>
                      )}
                    </div>
                    </div>
                    {item.isGift && (
                      <div className="w-full mt-2 bg-[#FAF4EF] p-4 rounded-sm border border-[#E9DED3]">
                        <h4 className="text-[11px] font-bold text-[#141225] uppercase tracking-widest mb-3">GIFT PREFERENCES</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <p className="text-sm"><span className="font-bold text-[#6D625C]">Order Date:</span> {new Date(activeOrder.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            <p className="text-sm"><span className="font-bold text-[#6D625C]">Delivery Date:</span> {item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                            <p className="text-sm"><span className="font-bold text-[#6D625C]">Style:</span> {item.giftMessageStyle || 'Classic'}</p>
                            <p className="text-sm"><span className="font-bold text-[#6D625C]">Wrapper:</span> {item.isGiftWrapper ? 'Premium Wrapping' : 'No Wrapper'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#6D625C] mb-1">Message:</p>
                            <div className={`w-full bg-white border border-[#E9DED3] p-3 rounded-sm min-h-[60px] text-gray-700 ${item.giftMessageStyle === 'Classic' ? 'font-serif text-sm' : item.giftMessageStyle === 'Elegant' ? 'font-script italic text-base' : 'font-sans tracking-wide text-sm'}`}>
                              {item.giftMessage || 'No message provided'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
            {(activeOrder.trackingId || (activeOrder.additionalTracking && activeOrder.additionalTracking.length > 0)) && (
              <div className="hidden md:flex mt-4 pt-4 border-t border-[#E9DED3] flex-col gap-3">
                {activeOrder.courierName && (
                  <div className="flex justify-between items-center pb-2 border-b border-[#E9DED3]">
                    <p className="text-sm font-bold text-[#6D625C]">Courier:</p>
                    <p className="text-sm font-semibold text-[#141225]">{activeOrder.courierName}</p>
                  </div>
                )}
                {activeOrder.trackingId && (
                  <div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-[#6D625C]">Tracking ID:</p>
                      <p className="text-sm font-semibold text-[#141225]">{activeOrder.trackingId}</p>
                    </div>
                    {activeOrder.trackingUrl && (
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-sm font-bold text-[#6D625C]">Tracking Link:</p>
                        <a href={activeOrder.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
                          Track Order <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {activeOrder.additionalTracking && activeOrder.additionalTracking.map((track, idx) => track.trackingUrl && (
                  <div key={idx}>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm font-bold text-[#6D625C]">Additional Details {idx + 1}:</p>
                      {track.trackingUrl.startsWith('http') ? (
                        <a href={track.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
                          Track Order <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <p className="text-sm font-semibold text-[#141225]">{track.trackingUrl}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="order-3 rounded-[14px] border border-[#E9DED3] bg-white p-5">
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

          {/* Mobile Buy Again Card (Order 4) */}
          <div className="md:hidden order-4 rounded-[14px] border border-[#E9DED3] bg-white p-5">
             <h3 className="font-bold text-[#141225] mb-4">Actions</h3>
             <div className="flex flex-col gap-3">
               {activeOrder.orderItems?.map((item, idx) => (
                 <div key={idx} className="flex flex-col gap-2">
                    <button 
                      onClick={() => onNavigate(`/product/${item.product}`)}
                      className="w-full rounded-[8px] bg-[#9A6031] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#7E4B25] shadow-sm"
                    >
                      Buy {item.name} Again
                    </button>
                    {activeOrder.status === 'Delivered' && (
                      <button 
                        onClick={() => setReviewModalProduct({
                          productId: item.product,
                          orderId: activeOrder._id,
                          orderItemId: item._id,
                          reviewKey: `${activeOrder._id}:${item._id}`,
                        })}
                        className="w-full rounded-[8px] border border-[#9A6031] text-[#9A6031] px-5 py-3 text-sm font-bold transition hover:bg-[#FAF8F5] shadow-sm"
                      >
                        Write Review for {item.name}
                      </button>
                    )}
                 </div>
               ))}
             </div>
          </div>

          <div className="order-5 rounded-[14px] border border-[#E9DED3] bg-white p-5">
            <h3 className="font-bold text-[#141225] mb-4">Payment Summary</h3>
            <OrderPricingSummary order={activeOrder} />
          </div>
          
          <div className="order-6 pt-4">
            <h3 className="font-bold text-[#141225] mb-4">Recently Viewed Products</h3>
            {recentlyViewed && recentlyViewed.length > 0 ? (
               <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                 {recentlyViewed.slice(0, 3).map((item, i) => {
                    const imgUrl = typeof item.image === 'string' ? item.image : (item.image?.url || '');
                    const imageSrc = imgUrl ? (imgUrl.startsWith('http') || imgUrl.startsWith('data:') ? imgUrl : (imgUrl.startsWith('/uploads') || imgUrl.startsWith('uploads/')) ? `http://localhost:5000${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}` : imgUrl) : '';
                    
                    const productObj = {
                      ...item,
                      _id: item.id || item._id,
                      name: item.name,
                      image: imageSrc,
                      basePrice: item.basePrice || item.price,
                      salePrice: item.salePrice || item.discountPrice || item.price,
                      averageRating: item.averageRating || 0,
                      reviewCount: item.reviewCount || 0
                    };
                    
                    return (
                      <ProductCard 
                        key={i} 
                        product={productObj} 
                        onNavigate={onNavigate} 
                        user={user} 
                      />
                    );
                  })}
               </div>
            ) : (
               <div className="rounded-[12px] border border-[#E9DED3] bg-white p-6 text-center">
                 <p className="text-sm text-[#6D625C]">No recently viewed products found.</p>
                 <button onClick={() => onNavigate('/')} className="mt-3 text-[#9A6031] font-bold text-sm hover:underline">Start browsing toys</button>
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
        <button type="button" onClick={() => onNavigate('/cart')} className="rounded-[8px] bg-[#9A6031] px-4 py-2 text-sm font-bold text-white">Open Cart</button>
      </div>

      {cartItems.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Your cart is empty" text="Add toys to your cart and they will stay with your account." action="Continue Shopping" onAction={() => onNavigate('/')} />
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
    <CustomerAddressManager />
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
          <EmptyState icon={Heart} title="Your wishlist is empty" text="Start adding toys you love." action="Explore Toys" onAction={() => onNavigate('/')} />
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {wishlistItems.map((item, index) => {
              const product = item.product || item;
              if (!product || !product.name) return null; // Skip dummy or invalid products
              
              return (
                <ProductCard 
                  key={product._id || index}
                  product={product}
                  viewMode="grid"
                  onNavigate={onNavigate}
                  user={user}
                  onRemoveFromWishlist={() => onRemoveFromWishlist(index)}
                  hideCartIcon={true}
                  hideRating={true}
                  actionButton={
                    <button 
                      onClick={(e) => { e.stopPropagation(); onMoveToCart(item, index); }}
                      className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#9A6031] py-2 text-sm font-bold text-white transition hover:bg-[#7E4B25]"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Move to Cart
                    </button>
                  }
                />
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
          <EmptyState icon={Bookmark} title="No saved products" text="You haven't saved any products yet." action="Browse Toys" onAction={() => onNavigate('/')} />
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

  const renderWallet = () => {
    const txns = walletSummary.transactions || [];
    const credits = txns.filter((entry) => entry.type === 'credit').reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const debits = txns.filter((entry) => entry.type === 'debit').reduce((sum, entry) => sum + (entry.amount || 0), 0);

    return (
      <section className="px-5 py-7 lg:px-7">
        <div className="rounded-[24px] border border-[#E9DED3] bg-[linear-gradient(135deg,#FFF8F0_0%,#F7E7D6_100%)] p-6 shadow-[0_20px_45px_rgba(139,94,60,0.12)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9A6031]">Wallet Balance</p>
              <h2 className="mt-2 text-4xl font-black text-[#141225]">₹{Number(walletSummary.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
              <p className="mt-3 max-w-2xl text-sm text-[#6D625C]">Refunds are credited here automatically after admin approval, and you can use this balance during future purchases.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-[16px] border border-[#EFE2D1] bg-white/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A817C]">Credits</p>
              <p className="mt-2 text-xl font-black text-[#2E7D32]">₹{credits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-[16px] border border-[#EFE2D1] bg-white/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A817C]">Transactions</p>
              <p className="mt-2 text-xl font-black text-[#141225]">{txns.length}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[20px] border border-[#E9DED3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#141225]">Recent Activity</h3>
              <p className="mt-1 text-sm text-[#6D625C]">Your latest wallet credits and debits appear here.</p>
            </div>
          </div>

          {walletLoading ? (
            <div className="mt-5 rounded-[14px] border border-[#E9DED3] bg-[#FAF8F5] p-6 text-sm text-[#6D625C]">Loading wallet history…</div>
          ) : txns.length === 0 ? (
            <div className="mt-5 rounded-[14px] border border-dashed border-[#E9DED3] bg-[#FAF8F5] p-8 text-center text-sm text-[#6D625C]">No wallet activity yet. Refund approvals will appear here automatically.</div>
          ) : (
            <div className="mt-5 space-y-3">
              {txns.map((entry) => (
                <div key={entry._id || entry.referenceId || entry.createdAt} className="flex flex-col gap-3 rounded-[14px] border border-[#E9DED3] p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${entry.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {entry.type === 'credit' ? 'Credit' : 'Debit'}
                      </span>
                      <span className="text-xs font-semibold text-[#8A817C]">{new Date(entry.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#141225]">{entry.description || 'Wallet activity'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${entry.type === 'credit' ? 'text-emerald-600' : 'text-[#C94A4A]'}`}>
                      {entry.type === 'credit' ? '+' : '-'}₹{Number(entry.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-[#8A817C]">Balance: ₹{Number(entry.balanceAfter || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderNotifications = () => {
    const notifications = [];
    
    // Dynamically generate notifications based on user state
    if (orders && orders.length > 0) {
      notifications.push({ 
        id: 'order', 
        type: 'order', 
        title: 'Order Processing', 
        message: `Your latest order #${formatOrderId(orders[0])} is being processed.`, 
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

  const renderGiftCardOrders = () => {
    let giftOrders = orders.filter(o => o.isGiftOrder);
    if (giftSearchTerm) {
      giftOrders = giftOrders.filter(o => {
        const orderId = (o.displayId || generateDisplayId('MKG', o._id)).toLowerCase();
        return orderId.includes(giftSearchTerm.toLowerCase());
      });
    }

    if (giftFilterStatus !== 'All') {
      giftOrders = giftOrders.filter(o => o.status === giftFilterStatus);
    }
    const giftItemsPerPage = isMobile ? 5 : 10;
    const totalGiftPages = Math.ceil(giftOrders.length / giftItemsPerPage);
    const paginatedGiftOrders = giftOrders.slice((giftOrdersPage - 1) * giftItemsPerPage, giftOrdersPage * giftItemsPerPage);
    
    return (
      <section className="px-5 py-7 lg:px-7 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#141225]">Gift & Card Orders</h2>
            <p className="mt-1 text-sm text-[#6D625C]">Track your curated gifts and personalized messages.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 mb-6">
          <div className="relative w-full sm:w-72">
            <input 
              type="text" 
              placeholder="Search by Order ID..." 
              value={giftSearchTerm}
              onChange={(e) => {
                setGiftSearchTerm(e.target.value);
                setGiftOrdersPage(1);
              }}
              className="w-full pl-4 pr-10 py-2 rounded-md border border-[#E9DED3] bg-white text-sm focus:outline-none focus:border-[#8B5E3C]"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
          </div>
          <div className="relative">
            <select
              value={giftFilterStatus}
              onChange={(e) => {
                setGiftFilterStatus(e.target.value);
                setGiftOrdersPage(1);
              }}
              className="appearance-none flex items-center gap-2 pl-9 pr-8 py-2 rounded-md bg-[#FAF8F5] border border-[#E9DED3] text-[#141225] text-sm font-semibold hover:bg-[#F0EAE1] transition whitespace-nowrap outline-none cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <Filter className="w-4 h-4 text-[#141225] absolute left-3 top-2.5 pointer-events-none" />
            <ChevronDown className="w-4 h-4 text-[#141225] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {ordersLoading ? (
          <p className="mt-8 text-sm text-[#6D625C]">Loading gift orders...</p>
        ) : giftOrders.length === 0 ? (
          <EmptyState icon={Gift} title="No Gift Orders" text={giftSearchTerm ? "No matching gift orders found." : "You haven't placed any gift orders yet."} action="Send a Gift" onAction={() => onNavigate('/gift-and-card')} />
        ) : (
          <>
          <div className="space-y-6">
            {paginatedGiftOrders.map((order) => {
              const firstItem = order.orderItems?.[0] || {};
              const imageSrc = firstItem.image ? (firstItem.image.startsWith('http') || firstItem.image.startsWith('data:') ? firstItem.image : (firstItem.image.startsWith('/uploads') || firstItem.image.startsWith('uploads/')) ? `http://localhost:5000${firstItem.image.startsWith('/') ? '' : '/'}${firstItem.image}` : firstItem.image) : '';
              
              return (
                <div key={order._id} className="rounded-xl border border-[#E9DED3] bg-white p-3 sm:p-4 shadow-sm flex flex-col lg:flex-row gap-4 lg:gap-6">
                  
                  {/* Image Column - Mobile: side-by-side with basic info, Desktop: standalone column */}
                  <div className="flex flex-row gap-3 sm:gap-4 lg:contents">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-48 lg:h-48 shrink-0 rounded-lg overflow-hidden bg-[#F8F3EF]">
                      {imageSrc ? <img src={imageSrc} alt="Product" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400" /></div>}
                    </div>

                    {/* Mobile Only: Basic Info next to image */}
                    <div className="flex flex-col justify-between py-0.5 sm:py-1 lg:hidden flex-1">
                      <div>
                        <h3 className="font-serif font-bold text-[#141225] text-[14px] sm:text-[16px] leading-tight">#{formatOrderId(order)}</h3>
                        <p className="text-[11px] sm:text-xs text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-2 mb-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-[#FDF0EB] text-[#D04E26] text-[9px] sm:text-[10px] font-bold rounded whitespace-nowrap">
                          <CalendarDays className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          {formatDate(getDeliveryDate(order))}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-end mt-auto">
                        <p className="text-[13px] sm:text-sm font-bold text-[#141225]">₹ {Number(order.totalPrice || 0).toLocaleString()}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500">{order.orderItems?.length || 1} Item{order.orderItems?.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid - Desktop Only Columns (Hidden on Mobile) */}
                  <div className="hidden lg:grid flex-1 grid-cols-4 gap-6 lg:gap-8 items-start py-2">
                    
                    {/* Column 1: Order ID & Message */}
                    <div className="flex flex-col gap-3 h-full">
                      <h3 className="font-serif font-bold text-[#141225] text-[17px]">#{formatOrderId(order)}</h3>
                      {order.giftMessage ? (
                         <div className="p-3 bg-[#FAF8F5] rounded-md border border-[#E9DED3] flex-1">
                           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Personalized Message</p>
                           <p className="text-sm italic font-serif text-[#141225]">"{order.giftMessage}"</p>
                           <p className="text-xs text-gray-500 mt-2">Style: {order.giftMessageStyle || 'Classic'}</p>
                         </div>
                      ) : (
                         <div className="p-3 bg-gray-50 rounded-md border border-gray-100 flex-1 flex items-center justify-center">
                           <p className="text-xs text-gray-400">No message provided</p>
                         </div>
                      )}
                      <div className="mt-auto pt-2">
                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FDF0EB] text-[#D04E26] text-[11px] font-bold rounded-md whitespace-nowrap">
                           <CalendarDays className="w-3 h-3" />
                           Scheduled Delivery: {formatDate(getDeliveryDate(order))}
                         </span>
                      </div>
                    </div>

                    {/* Column 2: Dates */}
                    <div className="flex flex-col gap-5 lg:border-l border-[#E9DED3] lg:pl-6 h-full justify-center">
                      <div className="flex items-start gap-3">
                        <CalendarDays className="w-5 h-5 text-[#8B5E3C] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Order Date</p>
                          <p className="text-sm font-bold text-[#141225]">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Truck className="w-5 h-5 text-[#8B5E3C] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Delivery Date</p>
                          <p className="text-sm font-bold text-[#141225]">{order.status === 'Delivered' ? formatDate(order.updatedAt) : formatDate(getDeliveryDate(order))}</p>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Items & Amount */}
                    <div className="flex flex-col gap-5 lg:border-l border-[#E9DED3] lg:pl-6 h-full justify-center">
                      <div className="flex items-start gap-3">
                        <Package className="w-5 h-5 text-[#8B5E3C] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Items</p>
                          <p className="text-sm font-bold text-[#141225]">{order.orderItems?.length || 1} Gift Box{order.orderItems?.length > 1 ? 'es' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Tag className="w-5 h-5 text-[#8B5E3C] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Amount</p>
                          <p className="text-sm font-bold text-[#141225]">₹ {Number(order.totalPrice || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Column 4: Actions */}
                    <div className="flex flex-col gap-3 lg:border-l border-[#E9DED3] lg:pl-6 h-full justify-center">
                      <button 
                        onClick={() => { setActiveOrder(order); setActiveModule('order-details'); navigate('/profile/order-history/details'); }}
                        className="w-full py-2.5 rounded-md border border-[#8B5E3C] text-[#8B5E3C] text-sm font-semibold hover:bg-[#FAF8F5] transition text-center"
                      >
                        View Details
                      </button>
                      <button 
                        onClick={() => { const pId = firstItem.product?._id || firstItem.product; if (pId) navigate(`/product/${pId}`); }}
                        className="w-full py-2.5 rounded-md bg-[#8B5E3C] text-white text-sm font-semibold hover:bg-[#7E4B25] transition text-center flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" /> Buy Again
                      </button>
                    </div>
                  </div>
                  
                  {/* Actions Row - Mobile Only */}
                  <div className="flex lg:hidden flex-row gap-2 sm:gap-3 mt-1 sm:mt-2 border-t border-[#E9DED3] pt-3 sm:pt-4">
                    <button 
                      onClick={() => { setActiveOrder(order); setActiveModule('order-details'); navigate('/profile/order-history/details'); }}
                      className="flex-1 py-2 sm:py-2.5 rounded-md border border-[#8B5E3C] text-[#8B5E3C] text-[13px] sm:text-sm font-semibold hover:bg-[#FAF8F5] transition text-center"
                    >
                      View Details
                    </button>
                    <button 
                      onClick={() => { const pId = firstItem.product?._id || firstItem.product; if (pId) navigate(`/product/${pId}`); }}
                      className="flex-1 py-2 sm:py-2.5 rounded-md bg-[#8B5E3C] text-white text-[13px] sm:text-sm font-semibold hover:bg-[#7E4B25] transition text-center flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Buy Again
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <Pagination 
            currentPage={giftOrdersPage} 
            totalPages={totalGiftPages} 
            onPageChange={setGiftOrdersPage} 
            className="mt-8 flex items-center justify-center gap-2 flex-wrap"
          />
          </>
        )}
      </section>
    );
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - navRef.current.offsetLeft);
    setScrollLeft(navRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - navRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll-fast
    navRef.current.scrollLeft = scrollLeft - walk;
  };

  const isModuleActive = (id) => {
    if (activeModule === id) return true;
    if (activeModule === 'order-details') {
      if (id === 'gift-card' && activeOrder?.isGiftOrder) return true;
      if (id === 'orders' && !activeOrder?.isGiftOrder) return true;
    }
    if (activeModule === 'bulk-order-details' && id === 'bulk-orders') return true;
    if (activeModule === 'customize-order-details' && id === 'customize-orders') return true;
    return false;
  };

  return (
    <section className="min-h-screen bg-[#FAF8F5] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
        
        {/* Top Horizontal Drag-to-Scroll Navigation */}
        <div className="rounded-[18px] bg-white shadow-[0_18px_60px_rgba(62,39,35,0.08)] overflow-hidden">
          <nav 
            ref={navRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className="flex overflow-x-auto gap-4 p-3 custom-scrollbar cursor-grab active:cursor-grabbing select-none"
          >
            {visibleModules.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => openProfileModule(id)}
                className={`flex shrink-0 whitespace-nowrap items-center gap-2 lg:gap-3 rounded-[10px] px-4 py-3 text-left text-sm font-semibold transition ${
                  isModuleActive(id)
                    ? 'bg-[#F4EBE2] text-[#2E2E2E] shadow-sm border border-[#E9DED3]'
                    : 'text-[#6D625C] hover:bg-[#FAF4EF] hover:text-[#8B5E3C]'
                }`}
              >
                <Icon className="h-4 w-4 text-[#A7632E]" strokeWidth={2} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="overflow-hidden rounded-[18px] border border-[#E9DED3] bg-white shadow-[0_18px_70px_rgba(62,39,35,0.07)]">
          <header className="flex flex-col gap-5 border-b border-[#E9DED3] px-5 py-7 sm:flex-row sm:items-center sm:justify-between lg:px-7">
            <div className="flex items-center gap-4">
              {(() => {
                const ActiveModule = modules.find((item) => isModuleActive(item.id));
                const ActiveIcon = ActiveModule?.icon || User;
                return (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4EBE2] text-[#A7632E]">
                      <ActiveIcon className="h-6 w-6" strokeWidth={1.8} />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-[#141225]">{ActiveModule?.label || 'My Profile'}</h1>
                    </div>
                  </>
                );
              })()}
            </div>
            {activeModule === 'profile' && !isEditing && (
              <button type="button" onClick={() => navigate('/profile/edit')} className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#9A6031] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_25px_rgba(139,94,60,0.2)] transition hover:bg-[#7E4B25]">
                <Edit3 className="h-4 w-4" strokeWidth={1.8} />
                Edit Profile
              </button>
            )}
            {activeModule === 'orders' && (
              <button type="button" onClick={() => onNavigate('/order-history')} className="rounded-[10px] bg-[#9A6031] px-5 py-2.5 text-[15px] font-bold text-white hover:bg-[#7a5234] transition-colors shadow-[0_12px_25px_rgba(139,94,60,0.2)]">Open Full Page</button>
            )}
            {activeModule === 'addresses' && (
              <button type="button" onClick={() => document.dispatchEvent(new CustomEvent('open-address-modal'))} className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#9A6031] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_25px_rgba(139,94,60,0.2)] transition hover:bg-[#7E4B25]">
                <Plus className="h-4 w-4" strokeWidth={1.8} />
                Add Address
              </button>
            )}
          </header>

          {activeModule === 'profile' && renderProfile()}
          {activeModule === 'orders' && renderOrders()}
          {activeModule === 'bulk-orders' && renderBulkOrders()}
          {activeModule === 'bulk-order-details' && renderBulkOrderDetails()}
          {activeModule === 'customize-orders' && renderCustomizeOrders()}
          {activeModule === 'customize-order-details' && renderCustomizeOrderDetails()}
          {activeModule === 'reviews' && renderReviews()}
          {activeModule === 'order-details' && renderOrderDetails()}
          {activeModule === 'addresses' && renderAddresses()}
          {activeModule === 'cart' && renderCart()}
          {activeModule === 'wishlist' && renderWishlist()}
          {activeModule === 'saved' && renderSavedProducts()}
          {activeModule === 'rewards' && renderRewards()}
          {activeModule === 'wallet' && renderWallet()}
          {activeModule === 'refunds' && renderRefunds()}
          {activeModule === 'password' && renderChangePassword()}
          {activeModule === 'notifications' && renderNotifications()}
          {activeModule === 'gift-card' && renderGiftCardOrders()}
          {activeModule === 'advanced-booking' && <div className="p-4 md:p-8"><UserAdvancedBookings /></div>}
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
              <button type="button" onClick={() => navigate('/profile')} className="rounded-[8px] border border-[#E9DED3] px-4 py-2 text-sm font-bold text-[#6D625C]">Cancel</button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Full Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
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
                  {(resolveImage(form.profileImage) || profile.avatar) ? (
                    <img src={resolveImage(form.profileImage) || profile.avatar} alt="Profile preview" className="w-16 h-16 rounded-full object-cover border border-[#E9DED3]" />
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
                          if (response?.data?.success && response.data.data?.length > 0) {
                            setForm(current => ({ ...current, profileImage: response.data.data[0] }));
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
                    src={cancelOrderTarget.orderItems[0]?.image ? (cancelOrderTarget.orderItems[0].image.startsWith('http') || cancelOrderTarget.orderItems[0].image.startsWith('data:') ? cancelOrderTarget.orderItems[0].image : (cancelOrderTarget.orderItems[0].image.startsWith('/uploads') || cancelOrderTarget.orderItems[0].image.startsWith('uploads/')) ? `http://localhost:5000${cancelOrderTarget.orderItems[0].image.startsWith('/') ? '' : '/'}${cancelOrderTarget.orderItems[0].image}` : cancelOrderTarget.orderItems[0].image) : ''} 
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
                {cancelOrderTarget.fees && cancelOrderTarget.fees
                  .filter((fee, index, self) => 
                    index === self.findIndex((f) => f.name === fee.name && f.amount === fee.amount)
                  )
                  .map((fee, index) => (
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
              <p className="text-sm text-[#4A403B] mb-4">
                Please choose where you'd like to receive your refund of <span className="font-bold text-[#141225]">₹{cancellationPreviewData.estimatedRefund.toFixed(2)}</span>.
              </p>

              <div className="mb-4">
                <label className="inline-flex items-center mr-4">
                  <input type="radio" name="refundMethod" value="upi" checked={refundMethod === 'upi'} onChange={() => { setRefundMethod('upi'); setRefundDestinationInput(cancelOrderTarget?.shippingAddress?.phone || profile?.phone || ''); }} className="h-4 w-4" />
                  <span className="ml-2 text-sm">Phone / UPI</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" name="refundMethod" value="wallet" checked={refundMethod === 'wallet'} onChange={() => { setRefundMethod('wallet'); setRefundDestinationInput('WALLET'); }} className="h-4 w-4" />
                  <span className="ml-2 text-sm">Wallet</span>
                </label>
              </div>

              {refundMethod === 'upi' && (
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
              )}

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
          productId={reviewModalProduct.productId || reviewModalProduct}
          orderId={reviewModalProduct.orderId}
          orderItemId={reviewModalProduct.orderItemId}
          user={user}
          onClose={() => setReviewModalProduct(null)}
          onSuccess={(review) => {
            if (reviewModalProduct.reviewKey) {
              setUserReviews(current => ({
                ...current,
                [reviewModalProduct.reviewKey]: review?.rating ?? null,
              }));
            }
            setReviewModalProduct(null);
          }}
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
