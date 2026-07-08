import React, { useState, useEffect, useMemo } from 'react';
import { adminService } from '../../../api/adminService';
import toast from 'react-hot-toast';
import {
  Users, ShoppingBag, TrendingUp, IndianRupee, Search,
  ChevronDown, ChevronUp, Eye, Package, RefreshCw, Calendar, Phone, Mail,
  ArrowUpDown, ArrowLeft, Star
} from 'lucide-react';

/* ── helpers ─────────────────────────────────── */
const fmt  = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '–';
const avatar = (name = '') => {
  const c = name.trim()[0]?.toUpperCase() || '?';
  const colors = ['#9A6031','#C78B4A','#7E4B25','#5C6BC0','#42A5F5','#26A69A','#66BB6A','#EC407A'];
  const idx = name.charCodeAt(0) % colors.length;
  return { char: c, bg: colors[idx] };
};

const STATUS_COLORS = {
  Delivered:         'bg-emerald-100 text-emerald-700',
  Cancelled:         'bg-red-100 text-red-700',
  Placed:            'bg-amber-100 text-amber-700',
  Pending:           'bg-amber-100 text-amber-700',
  Packed:            'bg-blue-100 text-blue-700',
  Shipping:          'bg-indigo-100 text-indigo-700',
  'Out for delivery':'bg-purple-100 text-purple-700',
};

/* ══════════════════════════════════════════════
   CUSTOMER DETAIL PAGE
══════════════════════════════════════════════ */
function CustomerDetailPage({ customer, onBack }) {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const av = avatar(customer.name || '');

  useEffect(() => {
    adminService.getCustomerOrders(customer._id)
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, [customer._id]);

  const delivered  = orders.filter(o => o.status === 'Delivered').length;
  const cancelled  = orders.filter(o => o.status === 'Cancelled').length;
  const avgOrder   = fmt((customer.totalSpend || 0) / Math.max(1, customer.totalOrders || 1));

  return (
    <div className="bg-[#FAF8F5] min-h-screen">
      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-[#E9DED3] px-6 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-[#6D625C] hover:text-[#9A6031] transition"
        >
          <ArrowLeft size={16} /> Back to Customers
        </button>
        <span className="text-[#E9DED3]">|</span>
        <span className="text-sm text-[#141225] font-bold">{customer.name}</span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Profile Hero Card ── */}
        <div className="bg-white rounded-2xl border border-[#E9DED3] shadow-sm p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shrink-0 shadow-md"
              style={{ background: av.bg }}
            >
              {av.char}
            </div>
            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[#141225]">{customer.name}</h1>
                {customer.loyalty?.tier && (
                  <span className="flex items-center gap-1 text-xs font-bold text-[#9A6031] bg-[#F8F4EC] px-2.5 py-1 rounded-full">
                    <Star size={10} fill="#9A6031" /> {customer.loyalty.tier}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#8A817C] mt-1">Customer since {fmtDate(customer.createdAt)}</p>
              <div className="flex flex-wrap gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-sm text-[#141225]">
                  <Mail size={13} className="text-[#9A6031]" /> {customer.email}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-[#141225]">
                  <Phone size={13} className="text-[#9A6031]" /> {customer.phone || 'No mobile'}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-[#141225]">
                  <Calendar size={13} className="text-[#9A6031]" /> Joined {fmtDate(customer.createdAt)}
                </span>
              </div>
            </div>
            {/* Quick Stats */}
            <div className="flex gap-4 shrink-0">
              <div className="text-center bg-[#FAF8F5] rounded-xl p-4 border border-[#E9DED3] min-w-[90px]">
                <p className="text-[10px] font-bold text-[#8A817C] uppercase tracking-wider">Total Orders</p>
                <p className="text-3xl font-bold text-[#141225] mt-1">{customer.totalOrders || 0}</p>
              </div>
              <div className="text-center bg-[#FAF8F5] rounded-xl p-4 border border-[#E9DED3] min-w-[110px]">
                <p className="text-[10px] font-bold text-[#8A817C] uppercase tracking-wider">Delivered Spent</p>
                <p className="text-xl font-bold text-[#9A6031] mt-1">{fmt(customer.totalSpend)}</p>
                <p className="text-[9px] text-emerald-600 font-semibold mt-0.5">Delivered only</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Analytics Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Avg Order Value',  value: avgOrder,    icon: <TrendingUp size={18} />, color: 'text-indigo-600',  bg: 'bg-indigo-50' },
            { label: 'Delivered',         value: delivered,   icon: <Package size={18} />,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Cancelled',         value: cancelled,   icon: <ShoppingBag size={18} />,color: 'text-red-600',    bg: 'bg-red-50' },
            { label: 'Preferred Payment', value: orders[0]?.paymentMethod || '–', icon: <IndianRupee size={18} />, color: 'text-[#9A6031]', bg: 'bg-[#F8F4EC]' },
          ].map(a => (
            <div key={a.label} className="bg-white rounded-2xl border border-[#E9DED3] p-4 shadow-sm flex flex-col gap-3">
              <div className={`w-9 h-9 rounded-xl ${a.bg} ${a.color} flex items-center justify-center shrink-0`}>
                {a.icon}
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#8A817C] uppercase tracking-wider">{a.label}</p>
                <p className="text-lg font-bold text-[#141225] mt-0.5">{a.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Order History Table ── */}
        <div className="bg-white rounded-2xl border border-[#E9DED3] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E9DED3] flex items-center gap-2">
            <ShoppingBag size={16} className="text-[#9A6031]" />
            <h2 className="text-base font-bold text-[#141225]">Order History</h2>
            <span className="ml-auto text-xs text-[#8A817C] font-semibold">{orders.length} order(s)</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-[#8A817C]">Loading orders…</div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#8A817C]">No orders found for this customer.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E9DED3]">
                    {['Order ID', 'Date', 'Products', 'Status', 'Payment', 'Amount'].map(h => (
                      <th key={h} className="px-5 py-3 text-[10px] font-bold text-[#6D625C] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2EBE4]">
                  {orders.map(order => (
                    <tr key={order._id} className="hover:bg-[#FAF8F5] transition-colors">
                      {/* Order ID */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-xs font-bold text-[#141225]">#{String(order._id).slice(-8).toUpperCase()}</p>
                      </td>
                      {/* Date */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-[#6D625C]">
                        {fmtDate(order.createdAt)}
                      </td>
                      {/* Products */}
                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          {(order.orderItems || []).slice(0, 2).map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-8 h-8 rounded-lg object-cover border border-[#E9DED3] shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-[#F2EBE4] flex items-center justify-center shrink-0">
                                  <Package size={11} className="text-[#9A6031]" />
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-[#141225] leading-tight max-w-[160px] truncate">{item.name}</p>
                                <p className="text-[10px] text-[#8A817C]">Qty: {item.qty}</p>
                              </div>
                            </div>
                          ))}
                          {(order.orderItems || []).length > 2 && (
                            <p className="text-[10px] text-[#8A817C] pl-10">+{order.orderItems.length - 2} more</p>
                          )}
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                          {order.status || 'Pending'}
                        </span>
                      </td>
                      {/* Payment */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-[#6D625C]">
                        {order.paymentMethod || '–'}
                      </td>
                      {/* Amount */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-[#9A6031]">{fmt(order.totalPrice)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   CUSTOMER LIST PAGE
══════════════════════════════════════════════ */
export default function CustomerManagementPage() {
  const [customers, setCustomers]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [sortKey, setSortKey]           = useState('totalSpend');
  const [sortDir, setSortDir]           = useState('desc');
  const [detailCustomer, setDetail]     = useState(null); // null = list view

  /* ── fetch ───────────────────────────────── */
  const load = async () => {
    setLoading(true);
    try {
      const data = await adminService.getCustomers();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  /* ── stats ───────────────────────────────── */
  const stats = useMemo(() => {
    const totalRevenue = customers.reduce((s, c) => s + (c.totalSpend || 0), 0);
    const totalOrders  = customers.reduce((s, c) => s + (c.totalOrders || 0), 0);
    const active       = customers.filter(c => (c.totalOrders || 0) > 0).length;
    return { totalRevenue, totalOrders, active, total: customers.length };
  }, [customers]);

  /* ── filter + sort ───────────────────────── */
  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
    return [...filtered].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) =>
    sortKey === col
      ? (sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)
      : <ArrowUpDown size={12} className="opacity-40" />;

  /* ── If detail view ───────────────────────── */
  if (detailCustomer) {
    return (
      <CustomerDetailPage
        customer={detailCustomer}
        onBack={() => setDetail(null)}
      />
    );
  }

  /* ── List View ──────────────────────────── */
  return (
    <div className="bg-[#FAF8F5] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#141225] font-serif">Customer Management</h1>
            <p className="text-[#6D625C] mt-1 text-sm">View customer details, order history, and purchase analytics.</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-[#9A6031] text-white rounded-xl text-sm font-bold hover:bg-[#7E4B25] shadow-sm transition"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Customers',  value: stats.total,           icon: <Users size={20} />,       color: 'text-indigo-600',  bg: 'bg-indigo-50' },
            { label: 'Active Customers', value: stats.active,          icon: <Users size={20} />,       color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Orders',     value: stats.totalOrders,     icon: <Package size={20} />,     color: 'text-amber-600',   bg: 'bg-amber-50' },
            { label: 'Delivered Revenue', value: fmt(stats.totalRevenue),icon: <IndianRupee size={20} />,color: 'text-[#9A6031]',  bg: 'bg-[#F8F4EC]', big: true },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-[#E9DED3] p-5 shadow-sm flex flex-col gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center`}>{s.icon}</div>
              <div>
                <p className="text-xs text-[#8A817C] font-semibold uppercase tracking-wide">{s.label}</p>
                <p className={`font-bold text-[#141225] mt-0.5 ${s.big ? 'text-lg' : 'text-2xl'}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-[#E9DED3] shadow-sm mb-6 px-5 py-4 flex items-center gap-3">
          <Search size={16} className="text-[#8A817C] shrink-0" />
          <input
            type="text"
            placeholder="Search customers by name, email, or mobile..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#141225] placeholder-[#C4B9B0] outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[#8A817C] hover:text-[#141225]">
              ✕
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E9DED3] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E9DED3]">
                  {[
                    { label: 'Customer Name', key: 'name' },
                    { label: 'Contact',       key: null },
                    { label: 'Joined Date',   key: 'createdAt' },
                    { label: 'Total Orders',  key: 'totalOrders' },
                    { label: 'Delivered Spend', key: 'totalSpend' },
                    { label: 'Actions',       key: null },
                  ].map(col => (
                    <th
                      key={col.label}
                      onClick={() => col.key && toggleSort(col.key)}
                      className={`px-5 py-3.5 text-[10px] font-bold text-[#6D625C] uppercase tracking-wider whitespace-nowrap ${col.key ? 'cursor-pointer hover:text-[#9A6031] select-none' : ''}`}
                    >
                      <span className="flex items-center gap-1.5">
                        {col.label}
                        {col.key && <SortIcon col={col.key} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EBE4]">
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-[#8A817C] text-sm">Loading customers…</td></tr>
                ) : displayed.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-[#8A817C] text-sm">No customers found.</td></tr>
                ) : displayed.map(c => {
                  const av = avatar(c.name || '');
                  return (
                    <tr key={c._id} className="hover:bg-[#FAF8F5] transition-colors">
                      {/* Name + Avatar */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: av.bg }}>
                            {av.char}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#141225]">{c.name}</p>
                            {c.loyalty?.tier && (
                              <span className="text-[10px] font-semibold text-[#9A6031] bg-[#F8F4EC] px-1.5 py-0.5 rounded-full">{c.loyalty.tier}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Contact */}
                      <td className="px-5 py-4">
                        <p className="text-xs text-[#141225]">{c.email}</p>
                        <p className="text-xs text-[#8A817C] mt-0.5">{c.phone || 'No mobile'}</p>
                      </td>
                      {/* Joined */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-[#6D625C]">{fmtDate(c.createdAt)}</td>
                      {/* Orders */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-[#141225]">{c.totalOrders || 0}</span>
                      </td>
                      {/* Spend */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-[#9A6031]">{fmt(c.totalSpend)}</span>
                      </td>
                      {/* View Button */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setDetail(c)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] border border-[#E9DED3] rounded-lg text-xs font-bold text-[#6D625C] hover:border-[#9A6031] hover:text-[#9A6031] transition"
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && displayed.length > 0 && (
            <div className="px-5 py-3 border-t border-[#E9DED3] text-xs text-[#8A817C]">
              Showing {displayed.length} of {customers.length} customers
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
