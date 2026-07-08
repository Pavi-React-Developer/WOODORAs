import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  MessageCircle, Star, Clock, AlertTriangle, Search, RefreshCw,
  Eye, Check, X, Trash2, ChevronLeft, ChevronRight,
  TrendingUp, BarChart2, Download, Calendar, Shield, User, Package,
  CheckCircle, XCircle, Award, Zap, ArrowUpRight, RotateCcw,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

const API = "http://localhost:5000/api";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const getToken = () => localStorage.getItem("token");
const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });
const DONUT_COLORS = ["#10b981","#3b82f6","#f59e0b","#f97316","#ef4444"];

/* ── helpers ──────────────────────────────────────── */
const StarRating = ({ rating, size = 14 }) => (
  <span className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(s => (
      <Star key={s} size={size}
        className={s <= rating ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}
      />
    ))}
  </span>
);

const StatusBadge = ({ status }) => {
  const cfg = {
    approved: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Approved", Icon: CheckCircle },
    pending:  { cls: "bg-amber-100 text-amber-700 border-amber-200",       label: "Pending",  Icon: Clock },
    rejected: { cls: "bg-red-100 text-red-700 border-red-200",             label: "Rejected", Icon: XCircle },
  };
  const { cls, label, Icon } = cfg[status] || cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
      <Icon size={11} /> {label}
    </span>
  );
};

const Avatar = ({ name = "", size = 36 }) => {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#06b6d4"];
  const bg = colors[(name.charCodeAt(0) || 0) % colors.length];
  return (
    <div className="rounded-xl flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}>
      {name[0]?.toUpperCase() || "?"}
    </div>
  );
};

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-xl ${className}`} />
);

const KpiCard = ({ label, value, icon: Icon, iconBg, badge, badgeColor, sub, loading }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg} shrink-0`}>
        <Icon size={20} />
      </div>
      {badge && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>}
    </div>
    <div className="mt-4">
      {loading ? <Skeleton className="h-8 w-20 mb-1" /> : (
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      )}
      <p className="text-xs text-gray-500 font-medium mt-1">{label}</p>
      {sub && <p className="text-xs text-emerald-600 font-semibold mt-0.5 flex items-center gap-1"><ArrowUpRight size={11}/>{sub}</p>}
    </div>
  </div>
);

/* ── Detail Modal ─────────────────────────────────── */
function ReviewDetailModal({ review, onClose, onStatusChange, onDelete }) {
  const [note, setNote] = useState("");
  if (!review) return null;
  const p = review.product || {};
  const u = review.user || {};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <MessageCircle size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Review Details</h2>
              <p className="text-xs text-gray-500">#{String(review._id).slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition">
            <X size={16} className="text-gray-600" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><User size={11}/>Customer</p>
              <div className="flex items-center gap-3">
                <Avatar name={u.name || "?"} size={42} />
                <div>
                  <p className="font-bold text-gray-900 text-sm">{u.name || "Unknown"}</p>
                  <p className="text-xs text-gray-500">{u.email || "—"}</p>
                  {u.phone && <p className="text-xs text-gray-500">{u.phone}</p>}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Package size={11}/>Product</p>
              <div className="flex items-center gap-3">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-11 h-11 rounded-xl object-cover border border-gray-200 shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
                    <Package size={16} className="text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-gray-900 text-sm leading-tight">{p.name || "Unknown"}</p>
                  {p.sku && <p className="text-xs text-gray-400 mt-0.5">SKU: {p.sku}</p>}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div><p className="text-xs text-gray-400 mb-1">Rating</p><StarRating rating={review.rating} size={20} /></div>
            <div><p className="text-xs text-gray-400 mb-1">Status</p><StatusBadge status={review.status} /></div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Date</p>
              <p className="text-sm font-semibold text-gray-700">
                {new Date(review.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
              </p>
            </div>
            {review.isVerifiedPurchase && (
              <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">
                <Shield size={11}/> Verified
              </span>
            )}
          </div>
          {review.title && <p className="font-bold text-gray-900">"{review.title}"</p>}
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              {review.description || <span className="italic text-gray-400">No text provided.</span>}
            </p>
          </div>
          {review.images?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Review Images</p>
              <div className="flex flex-wrap gap-2">
                {review.images.map((img, i) => (
                  <img key={i} src={img} alt={`img-${i}`} className="w-20 h-20 rounded-xl object-cover border border-gray-200 hover:scale-105 transition cursor-pointer" />
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Admin Note</p>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="Add a private note..."
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => onStatusChange(review._id, "approved")}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition">
              <Check size={15}/> Approve
            </button>
            <button onClick={() => onStatusChange(review._id, "rejected")}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition">
              <X size={15}/> Reject
            </button>
            <button onClick={() => onDelete(review._id)}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition flex items-center gap-2">
              <Trash2 size={15}/> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════ */
export default function ReviewManagementPage() {
  const [reviews,   setReviews]   = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [statsLoad, setStatsLoad] = useState(true);
  const [search,    setSearch]    = useState("");
  const [rating,    setRating]    = useState("");
  const [status,    setStatus]    = useState("");
  const [sortBy,    setSortBy]    = useState("newest");
  const [page,      setPage]      = useState(1);
  const [limit,     setLimit]     = useState(10);
  const [total,     setTotal]     = useState(0);
  const [detailReview, setDetail]  = useState(null);
  const [confirm,      setConfirm] = useState(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, sort: sortBy };
      if (rating) params.rating = rating;
      if (status) params.status = status;
      if (search) params.search = search;
      const { data } = await axios.get(`${API}/reviews/admin/all`, { headers: authHeader(), params });
      setReviews(data.reviews || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load reviews");
    } finally { setLoading(false); }
  }, [page, limit, rating, status, search, sortBy]);

  const fetchStats = useCallback(async () => {
    setStatsLoad(true);
    try {
      const { data } = await axios.get(`${API}/reviews/admin/stats`, { headers: authHeader() });
      setStats(data);
    } catch (_) {
      // silent fail for stats
    } finally { setStatsLoad(false); }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { fetchStats();   }, [fetchStats]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.patch(`${API}/reviews/admin/${id}/status`, { status: newStatus }, { headers: authHeader() });
      toast.success(`Review ${newStatus}! ✓`);
      setDetail(null);
      fetchReviews(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || "Action failed"); }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/reviews/${id}`, { headers: authHeader() });
      toast.success("Review deleted");
      setDetail(null); setConfirm(null);
      fetchReviews(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || "Delete failed"); }
  };

  const resetFilters = () => { setSearch(""); setRating(""); setStatus(""); setSortBy("newest"); setPage(1); };

  const monthlyData = useMemo(() => {
    if (!stats?.monthly) return [];
    return stats.monthly.map(m => ({
      name: MONTHS[(m._id.month - 1)],
      reviews: m.count,
      rating: Math.round(m.avgRating * 10) / 10,
    }));
  }, [stats]);

  const distData = useMemo(() => {
    if (!stats?.dist) return [];
    const t = stats.dist.reduce((s, d) => s + d.count, 0);
    return [5,4,3,2,1].map(star => {
      const found = stats.dist.find(d => d._id === star);
      return { name: `${star}★`, value: found?.count || 0, pct: t ? Math.round(((found?.count || 0) / t) * 100) : 0 };
    });
  }, [stats]);

  const pages = Math.ceil(total / limit);

  return (
    <div className="bg-[#F8F7F5] min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Star size={24} className="text-amber-400 fill-amber-400" />
              Rating &amp; Review Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Moderate, approve, and analyze customer reviews</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { fetchReviews(); fetchStats(); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-sm transition">
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>


        {/* Top Products Bar Chart */}
        {stats?.topProducts?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Award size={16} className="text-amber-500"/>
              <h3 className="font-bold text-gray-800 text-sm">Most Reviewed Products</h3>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={stats.topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0"/>
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }}/>
                <Bar dataKey="reviewCount" fill="#6366f1" radius={[0,6,6,0]} name="Reviews"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[220px] relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search reviews, customers, products..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition" />
            </div>
            <select value={rating} onChange={e => { setRating(e.target.value); setPage(1); }}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none cursor-pointer">
              <option value="">All Ratings</option>
              {[5,4,3,2,1].map(r => <option key={r} value={r}>{"★".repeat(r)}{"☆".repeat(5-r)}</option>)}
            </select>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none cursor-pointer">
              <option value="">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none cursor-pointer">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
            <button onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 text-gray-500 hover:text-gray-700 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition">
              <RotateCcw size={13}/> Reset
            </button>
            <div className="ml-auto text-sm text-gray-400 font-medium">
              {total.toLocaleString()} review{total !== 1 ? "s" : ""} found
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Customer","Product","Rating","Review","Date","Status","Actions"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full"/></td>
                      ))}
                    </tr>
                  ))
                ) : reviews.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                          <MessageCircle size={28} className="text-gray-300"/>
                        </div>
                        <p className="text-gray-400 font-medium">No reviews found</p>
                        <button onClick={resetFilters} className="text-sm text-indigo-600 hover:underline">Clear filters</button>
                      </div>
                    </td>
                  </tr>
                ) : reviews.map(r => {
                  const u = r.user || {};
                  const p = r.product || {};
                  return (
                    <tr key={r._id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name || "?"} size={36} />
                          <div>
                            <p className="text-sm font-bold text-gray-900 leading-tight">{u.name || "Unknown"}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-9 h-9 rounded-xl object-cover border border-gray-100 shrink-0"/>
                          ) : (
                            <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                              <Package size={14} className="text-gray-300"/>
                            </div>
                          )}
                          <p className="text-sm font-semibold text-gray-700 max-w-[130px] truncate">{p.name || "—"}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap"><StarRating rating={r.rating} /></td>
                      <td className="px-5 py-4 max-w-[200px]">
                        {r.title && <p className="text-xs font-bold text-gray-700 truncate">{r.title}</p>}
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {r.description || <span className="italic">No text</span>}
                        </p>
                        {r.images?.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-500 mt-1 font-semibold">
                            {r.images.length} photo{r.images.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar size={11}/>
                          {new Date(r.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                        </div>
                        {r.isVerifiedPurchase && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-0.5">
                            <Shield size={9}/> Verified
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setDetail(r)} title="View"
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-indigo-100 hover:text-indigo-600 flex items-center justify-center transition">
                            <Eye size={14}/>
                          </button>
                          {r.status !== "approved" && (
                            <button onClick={() => handleStatusChange(r._id, "approved")} title="Approve"
                              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 flex items-center justify-center transition">
                              <Check size={14}/>
                            </button>
                          )}
                          {r.status !== "rejected" && (
                            <button onClick={() => handleStatusChange(r._id, "rejected")} title="Reject"
                              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition">
                              <X size={14}/>
                            </button>
                          )}
                          <button onClick={() => setConfirm({ id: r._id })} title="Delete"
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && reviews.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Rows per page:</span>
                <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300">
                  {[10,25,50,100].map(n => <option key={n}>{n}</option>)}
                </select>
                <span className="text-gray-400">{((page-1)*limit)+1}–{Math.min(page*limit,total)} of {total}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(pg => Math.max(1, pg-1))} disabled={page===1}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition">
                  <ChevronLeft size={14}/>
                </button>
                {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                  const pg = Math.max(1, Math.min(pages-4, page-2)) + i;
                  return (
                    <button key={pg} onClick={() => setPage(pg)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition border ${pg===page ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      {pg}
                    </button>
                  );
                })}
                <button onClick={() => setPage(pg => Math.min(pages, pg+1))} disabled={page===pages || pages===0}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition">
                  <ChevronRight size={14}/>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Widgets */}
        <div className="grid grid-cols-1 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={15} className="text-amber-500"/>
              <h3 className="font-bold text-gray-800 text-sm">Recent Reviews</h3>
            </div>
            <div className="space-y-3">
              {loading ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-12"/>) :
                reviews.slice(0, 5).map(r => (
                  <div key={r._id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition cursor-pointer" onClick={() => setDetail(r)}>
                    <Avatar name={r.user?.name || "?"} size={34}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-800 truncate">{r.user?.name || "Unknown"}</p>
                        <StarRating rating={r.rating} size={11}/>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{r.description || r.product?.name || "—"}</p>
                    </div>
                    <StatusBadge status={r.status}/>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

      </div>

      {/* Detail Modal */}
      {detailReview && (
        <ReviewDetailModal review={detailReview} onClose={() => setDetail(null)}
          onStatusChange={handleStatusChange} onDelete={id => setConfirm({ id })} />
      )}

      {/* Confirm Delete Dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500"/>
            </div>
            <h3 className="text-center font-bold text-gray-900 text-lg mb-1">Delete Review?</h3>
            <p className="text-center text-sm text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirm.id)}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}