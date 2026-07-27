import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { reviewService } from '../api/reviewService';
import {
  Star, ThumbsUp, ThumbsDown, Image as ImageIcon, Video,
  X, Upload, MessageSquare, ChevronDown, ZoomIn, Send,
  ShieldCheck, Camera, BarChart2, ChevronLeft, ChevronRight
} from 'lucide-react';

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */
const fmt = (n) => Number(n || 0).toFixed(1);
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const normalizeMediaUrl = (url) => {
  if (!url) return '';
  if (typeof url !== 'string') {
    if (url.url && typeof url.url === 'string') url = url.url;
    else if (url.path && typeof url.path === 'string') url = url.path;
    else return '';
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const clean = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${clean}`;
};

const StarRow = ({ rating, size = 16, filled = 'text-amber-400', empty = 'text-gray-300' }) => (
  <span className="inline-flex gap-0.5">
    {[1,2,3,4,5].map(s => (
      <Star key={s} size={size} className={s <= rating ? filled : empty} fill={s <= rating ? 'currentColor' : 'none'} />
    ))}
  </span>
);

const Avatar = ({ user, size = 40 }) => {
  const colors = ['#9A6031','#5C6BC0','#26A69A','#EC407A','#42A5F5','#66BB6A','#7E4B25'];
  const name   = user?.name || 'U';
  const bg     = colors[name.charCodeAt(0) % colors.length];
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return user?.profileImage ? (
    <img src={normalizeMediaUrl(user.profileImage)} alt={name}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/animal_balance_maze.png'; }} />
  ) : (
    <div className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
};

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/* ═══════════════════════════════════════════════════
   LIGHTBOX
═══════════════════════════════════════════════════ */
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(images.length - 1, i + 1));
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });
  return (
    <div className="fixed inset-0 z-100 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
        <X size={32} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); prev(); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl px-2"
        style={{ display: idx === 0 ? 'none' : undefined }}>‹</button>
      <img src={normalizeMediaUrl(images[idx])} alt="" className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
        onClick={e => e.stopPropagation()} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/animal_balance_maze.png'; }} />
      <button onClick={(e) => { e.stopPropagation(); next(); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl px-2"
        style={{ display: idx === images.length - 1 ? 'none' : undefined }}>›</button>
      <p className="absolute bottom-4 text-white/60 text-sm">{idx + 1} / {images.length}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STAR RATER INPUT
═══════════════════════════════════════════════════ */
function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="transition-transform hover:scale-125 focus:outline-none"
        >
          <Star size={32}
            className={(hover || value) >= s ? 'text-amber-400' : 'text-gray-300'}
            fill={(hover || value) >= s ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   RATING BREAKDOWN BAR (new labeled style)
═══════════════════════════════════════════════════ */
const STAR_COLORS = { 5: '#22c55e', 4: '#4ade80', 3: '#f59e0b', 2: '#f97316', 1: '#ef4444' };

function RatingBar({ star, pct, count }) {
  const color = STAR_COLORS[star] || '#9A6031';
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_24px] items-center gap-3">
      <span className="flex items-center gap-0.5 text-[#141225]">
        {Array.from({ length: star }, (_, idx) => (
          <Star key={idx} size={14} className="text-amber-400" fill="currentColor" />
        ))}
      </span>
      <div className="flex-1 bg-[#F2EBE4] rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-sm font-semibold text-[#6D625C] text-right">{count}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   WRITE REVIEW FORM
═══════════════════════════════════════════════════ */

function WriteReviewForm({ productId, user, onSuccess }) {
  const [rating, setRating]   = useState(0);
  const [title, setTitle]     = useState('');
  const [desc, setDesc]       = useState('');
  const [imgFiles, setImg]    = useState([]);
  const [vidFiles, setVid]    = useState([]);
  const [previews, setPrev]   = useState([]);
  const [submitting, setSub]  = useState(false);
  const [done, setDone]       = useState(false);
  const imgRef = useRef(); const vidRef = useRef();

  const handleImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setImg(files);
    setPrev(files.map(f => URL.createObjectURL(f)));
  };

  const removeImg = (i) => {
    setImg(prev => prev.filter((_, idx) => idx !== i));
    setPrev(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { toast.error('Please sign in to write a review.'); return; }
    if (!rating) { toast.error('Please select a star rating.'); return; }
    setSub(true);
    try {
      const fd = new FormData();
      fd.append('rating', rating);
      fd.append('title', title);
      fd.append('description', desc);
      imgFiles.forEach(f => fd.append('images', f));
      vidFiles.forEach(f => fd.append('videos', f));
      const review = await reviewService.createReview(productId, fd);
      setDone(true);
      onSuccess(review);
      toast.success('Review submitted! Thank you.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSub(false);
    }
  };

  if (done) return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
      <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <ShieldCheck size={28} className="text-emerald-600" />
      </div>
      <h3 className="text-lg font-bold text-emerald-800">Review Submitted!</h3>
      <p className="text-sm text-emerald-600 mt-1">Thank you for sharing your experience. Your review is currently pending approval.</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E9DED3] shadow-sm overflow-hidden">
      <div className="bg-linear-to-r from-[#9A6031] to-[#C78B4A] px-6 py-4">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <MessageSquare size={18} /> Write Your Review
        </h2>
        <p className="text-amber-100/80 text-sm mt-0.5">Tell other customers about your experience.</p>
      </div>

      <div className="p-6 space-y-5">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-bold text-[#141225] mb-2">Your Rating *</label>
          <StarInput value={rating} onChange={setRating} />
          <p className="text-xs text-[#8A817C] mt-1">
            {['','Poor','Fair','Good','Very Good','Excellent'][rating] || 'Tap to rate'}
          </p>
        </div>

        {/* Title + Description */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-[#141225] mb-1.5">Review Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Amazing Quality!"
              className="w-full border border-[#E9DED3] rounded-xl px-4 py-3 text-sm text-[#141225] placeholder-[#C4B9B0] focus:outline-none focus:border-[#9A6031] focus:ring-1 focus:ring-[#9A6031] transition" />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#141225] mb-1.5">Review Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4}
              placeholder="Tell us why you liked this wooden toy..."
              className="w-full border border-[#E9DED3] rounded-xl px-4 py-3 text-sm text-[#141225] placeholder-[#C4B9B0] focus:outline-none focus:border-[#9A6031] focus:ring-1 focus:ring-[#9A6031] resize-none transition" />
          </div>
        </div>

        {/* Media Uploads */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Images */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-bold text-[#141225] mb-1.5">
              <Camera size={14} className="text-[#9A6031]" /> Upload Images (max 5)
            </label>
            <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp,image/jpg"
              multiple onChange={handleImages} className="hidden" />
            <div
              onClick={() => imgRef.current.click()}
              className="border-2 border-dashed border-[#E9DED3] rounded-xl p-4 text-center cursor-pointer hover:border-[#9A6031] hover:bg-[#FAF8F5] transition"
            >
              <Upload size={20} className="text-[#C4B9B0] mx-auto mb-1" />
              <p className="text-xs text-[#8A817C]">JPG, PNG, WEBP · Max 5 files</p>
            </div>
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={normalizeMediaUrl(src)} alt="" className="w-16 h-16 object-cover rounded-lg border border-[#E9DED3]" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/animal_balance_maze.png'; }} />
                    <button type="button" onClick={() => removeImg(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-bold text-[#141225] mb-1.5">
              <Video size={14} className="text-[#9A6031]" /> Upload Video (optional)
            </label>
            <input ref={vidRef} type="file" accept="video/mp4,video/quicktime"
              onChange={e => setVid(Array.from(e.target.files))} className="hidden" />
            <div
              onClick={() => vidRef.current.click()}
              className="border-2 border-dashed border-[#E9DED3] rounded-xl p-4 text-center cursor-pointer hover:border-[#9A6031] hover:bg-[#FAF8F5] transition"
            >
              <Video size={20} className="text-[#C4B9B0] mx-auto mb-1" />
              <p className="text-xs text-[#8A817C]">MP4, MOV · Max 50 MB</p>
            </div>
            {vidFiles.length > 0 && (
              <p className="text-xs text-emerald-600 mt-2 font-medium">✓ {vidFiles[0].name}</p>
            )}
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={submitting}
          className="w-full bg-[#9A6031] hover:bg-[#7E4B25] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm">
          {submitting ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting…</>
          ) : (
            <><Send size={16} /> Submit Review</>
          )}
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════
   SINGLE REVIEW CARD
═══════════════════════════════════════════════════ */
function ReviewCard({ review, user, onVote, onOpenImage }) {
  const [imgSlide, setImgSlide] = useState(0);
  
  const nextImg = (e) => {
    e.stopPropagation();
    if (review.images?.length) setImgSlide((prev) => (prev + 1) % review.images.length);
  };
  
  const prevImg = (e) => {
    e.stopPropagation();
    if (review.images?.length) setImgSlide((prev) => (prev - 1 + review.images.length) % review.images.length);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E9DED3] shadow-sm p-3 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between">
        <Avatar user={review.user} size={42} />
        <div className="flex-1 min-w-0 ml-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#141225]">{review.user?.name || 'Customer'}</span>
            {review.isVerifiedPurchase && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <ShieldCheck size={10} /> Verified Purchase
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <StarRow rating={review.rating} size={13} />
            <span className="text-[10px] text-[#8A817C]">{fmtDate(review.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Title + Description */}
      {review.title && <h4 className="font-bold text-[#141225] text-sm break-all">{review.title}</h4>}
      {review.description && <p className="text-sm text-[#6D625C] leading-relaxed break-all whitespace-pre-wrap">{review.description}</p>}

      {/* Images Slider */}
      {review.images?.length > 0 && (
        <div className="relative group/reviewimg overflow-hidden rounded-lg border border-[#E9DED3] h-12 md:h-16">
          <div 
            className="flex transition-transform duration-500 ease-in-out h-full"
            style={{ transform: `translateX(-${imgSlide * 100}%)` }}
          >
            {review.images.map((img, i) => (
              <div key={i} className="w-full h-full shrink-0 relative cursor-pointer" onClick={() => onOpenImage(review.images, i)}>
                <img src={normalizeMediaUrl(img)} alt="" className="w-full h-full object-cover group-hover/reviewimg:opacity-90 transition" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/animal_balance_maze.png'; }} />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/reviewimg:opacity-100 transition">
                  <ZoomIn size={24} className="text-white drop-shadow-md" />
                </div>
              </div>
            ))}
          </div>

          {/* Arrows */}
          {review.images.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevImg}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/95 border border-[#E9DED3] text-[#141225] hover:text-[#B0611C] shadow-md flex items-center justify-center transition-all opacity-0 group-hover/reviewimg:opacity-100 z-10"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={nextImg}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/95 border border-[#E9DED3] text-[#141225] hover:text-[#B0611C] shadow-md flex items-center justify-center transition-all opacity-0 group-hover/reviewimg:opacity-100 z-10"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Videos */}
      {review.videos?.length > 0 && review.videos.map((v, i) => (
        <video key={i} src={normalizeMediaUrl(v)} controls className="rounded-xl max-w-xs w-full border border-[#E9DED3]" />
      ))}

      {/* Helpful + Not Helpful */}
      <div className="flex items-center gap-3 pt-1 border-t border-[#F2EBE4]">
        <span className="text-[11px] text-[#8A817C] font-medium">Helpful?</span>
        <button
          onClick={() => onVote(review._id, review.myVote === 'helpful' ? null : 'helpful')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition ${review.myVote === 'helpful' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-[#E9DED3] text-[#6D625C] hover:border-emerald-400 hover:text-emerald-700'}`}
        >
          <ThumbsUp size={12} /> {review.helpfulCount || 0}
        </button>
        <button
          onClick={() => onVote(review._id, review.myVote === 'not_helpful' ? null : 'not_helpful')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition ${review.myVote === 'not_helpful' ? 'border-red-400 bg-red-50 text-red-600' : 'border-[#E9DED3] text-[#6D625C] hover:border-red-400 hover:text-red-600'}`}
        >
          <ThumbsDown size={12} /> {review.notHelpfulCount || 0}
        </button>
      </div>

      {/* Admin Reply */}
      {review.adminReply?.text && (
        <div className="bg-[#FAF8F5] border border-[#E9DED3] rounded-xl p-4">
          <p className="text-[10px] font-bold text-[#9A6031] uppercase tracking-wider mb-1">🏪 Store Response</p>
          <p className="text-sm text-[#141225]">{review.adminReply.text}</p>
          {review.adminReply.repliedAt && (
            <p className="text-[10px] text-[#8A817C] mt-1">{fmtDate(review.adminReply.repliedAt)}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN EXPORT: ProductReviewSection
═══════════════════════════════════════════════════ */
export default function ProductReviewSection({ product, user }) {
  const [reviews, setReviews]     = useState([]);
  const [stats, setStats]         = useState(null);
  const [gallery, setGallery]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sort, setSort]           = useState('newest');
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);
  const [lightbox, setLightbox]   = useState(null); // { images, index }
  const [reviewSlide, setReviewSlide] = useState(0);
  const [gallerySlide, setGallerySlide] = useState(0);
  const [sortOpen, setSortOpen] = useState(false);
  const statsBoxRef = useRef(null);
  const LIMIT = 5;
  const productId = product?._id;

  /* ── load reviews ────────────────── */
  const loadReviews = useCallback(async (newSort = sort, newPage = 1, append = false) => {
    if (!productId) return;
    setLoading(true);
    try {
      const { reviews: data, stats: s } = await reviewService.getReviews(productId, {
        sort: newSort, page: newPage, limit: LIMIT,
      });
      setStats(s);
      if (append) setReviews(prev => [...prev, ...data]);
      else setReviews(data);
      setHasMore(data.length === LIMIT);
    } catch (e) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [productId, sort]);

  const loadGallery = useCallback(async () => {
    if (!productId) return;
    try {
      const data = await reviewService.getGallery(productId);
      setGallery(data || []);
    } catch {}
  }, [productId]);

  useEffect(() => {
    loadReviews('newest', 1, false);
    loadGallery();
  }, [productId]);

  useEffect(() => {
    setReviewSlide(0);
  }, [productId, sort, reviews.length]);

  const handleSort = (newSort) => {
    setSort(newSort);
    setPage(1);
    loadReviews(newSort, 1, false);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadReviews(sort, next, true);
  };

  /* ── vote ────────────────────────── */
  const handleVote = async (reviewId, vote) => {
    if (!user) { toast.error('Please sign in to vote.'); return; }
    try {
      const result = await reviewService.voteReview(reviewId, vote);
      setReviews(prev => prev.map(r => r._id === reviewId
        ? { ...r, helpfulCount: result.helpfulCount, notHelpfulCount: result.notHelpfulCount, myVote: result.myVote }
        : r
      ));
    } catch { toast.error('Failed to record vote.'); }
  };

  /* ── new review added ─────────────── */
  const handleNewReview = (review) => {
    // Only show immediately if it happens to be approved, otherwise wait for admin approval
    if (review.status === 'approved') {
      setReviews(prev => [review, ...prev]);
      if (stats) setStats(s => ({
        ...s,
        total: s.total + 1,
        avg: Math.round(((s.avg * s.total + review.rating) / (s.total + 1)) * 10) / 10,
      }));
      loadGallery();
    }
  };

  /* ── stats ──────────────────────── */
  const allImages = reviews.flatMap(r => r.images || []);
  const reviewPages = [];
  for (let i = 0; i < reviews.length; i += 3) {
    reviewPages.push(reviews.slice(i, i + 3));
  }
  const hasReviewSlider = reviewPages.length > 1;
  const prevReview = () => setReviewSlide(prev => (prev - 1 + reviewPages.length) % reviewPages.length);
  const nextReview = () => setReviewSlide(prev => (prev + 1) % reviewPages.length);

  /* ── gallery slider ──────────────── */
  const galleryPages = [];
  for (let i = 0; i < gallery.length; i += 4) {
    galleryPages.push(gallery.slice(i, i + 4));
  }
  const hasGallerySlider = galleryPages.length > 1;
  const prevGallery = () => setGallerySlide(prev => (prev - 1 + galleryPages.length) % galleryPages.length);
  const nextGallery = () => setGallerySlide(prev => (prev + 1) % galleryPages.length);

  /* ──────────────────────────────────
     RENDER
  ────────────────────────────────── */
  return (
    <div className="py-4 lg:py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-2">
        <div className="bg-[#FAF7F2] rounded-xl border border-[#E9DED3] p-2 md:p-3 shadow-sm mt-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-2 px-2 pt-1">
            <h2 className="text-2xl lg:text-3xl font-serif text-[#141225] font-bold">Customer Reviews</h2>
            <div className="flex items-center gap-4">
              <div 
                className="relative hidden md:block z-30"
                onMouseLeave={() => setSortOpen(false)}
              >
                <button 
                  onClick={() => setSortOpen(!sortOpen)}
                  className="relative flex items-center justify-between w-40 px-4 py-2 bg-[#9A6031] text-white rounded-xl text-sm font-semibold hover:bg-[#7E4B25] transition-all duration-200"
                >
                  {sort === 'newest' ? 'Newest' : sort === 'oldest' ? 'Oldest' : sort === 'highest_rating' ? 'Highest Rating' : 'Lowest Rating'}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                
                {sortOpen && (
                  <div className="absolute top-full mt-2 right-0 w-48 bg-[#FDF9F1] border border-[#9A6031]/20 rounded-xl shadow-lg py-2 overflow-hidden flex flex-col">
                    {[
                      { value: 'newest', label: 'Newest' },
                      { value: 'oldest', label: 'Oldest' },
                      { value: 'highest_rating', label: 'Highest Rating' },
                      { value: 'lowest_rating', label: 'Lowest Rating' }
                    ].map(option => (
                      <button 
                        key={option.value}
                        onClick={() => { handleSort(option.value); setSortOpen(false); }}
                        className={`text-left px-4 py-2.5 cursor-pointer transition-colors text-sm ${
                          sort === option.value 
                            ? 'bg-[#9A6031] text-white font-semibold' 
                            : 'text-[#5C2E0E] hover:bg-[#9A6031]/10 hover:text-[#9A6031] font-medium'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="text-sm font-bold text-[#141225] hover:text-[#B0611C] transition whitespace-nowrap">
                View All Reviews &rarr;
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr] gap-4 lg:gap-6 items-start px-2 pb-2">
            {/* RATING SUMMARY (Left Column) */}
            {stats?.total > 0 && (
              <div ref={statsBoxRef} className="flex flex-col items-center shrink-0 w-full lg:border-r lg:border-[#E9DED3] lg:pr-6">
                <div className="relative flex flex-col items-center justify-center">
                  {/* Big brown star */}
                  <svg viewBox="0 0 24 24" className="w-44 h-44 md:w-48 md:h-48 text-[#B0611C]" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white mt-3">
                    <span className="text-4xl md:text-5xl font-black leading-none">{fmt(stats.avg)}</span>
                    <span className="text-xs md:text-sm font-medium opacity-90 mt-1">Out of 5</span>
                  </div>
                </div>
                <p className="mt-4 text-sm font-bold text-[#141225]">Based on {stats.total} reviews</p>
                <div className="mt-6 w-full space-y-3">
                  {(stats.dist || []).map(d => (
                    <RatingBar key={d.star} star={d.star} pct={d.pct} count={d.count} />
                  ))}
                </div>
              </div>
            )}

            {/* RIGHT COLUMN (Two Rows) */}
            <div className="relative flex-1 min-w-0 flex flex-col gap-0">
              
              {/* ── CUSTOMER REVIEWS SLIDER (Row 1) ── */}
              <div className="relative">
                {/* Review List */}
                {loading && reviews.length === 0 ? (
                  <div className="py-12 text-center text-[#8A817C] text-sm h-full flex items-center justify-center">Loading reviews…</div>
                ) : reviews.length === 0 ? (
                  /* Empty State */
                  <div className="bg-white rounded-3xl border border-[#E9DED3] shadow-sm py-10 text-center h-full flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-[#F8F4EC] rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare size={24} className="text-[#C4B9B0]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#141225]">No Reviews Yet</h3>
                    <p className="text-sm text-[#8A817C] mt-1">Be the first customer to review this product.</p>
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="overflow-hidden rounded-2xl">
                      <div
                        className="flex transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateX(-${reviewSlide * 100}%)` }}
                      >
                        {reviewPages.map((pageReviews, pageIndex) => (
                          <div key={pageReviews.map(r => r._id).join('-') || pageIndex} className="w-full shrink-0 px-1 py-1">
                            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start">
                              {pageReviews.map(r => (
                                <ReviewCard
                                  key={r._id}
                                  review={r}
                                  user={user}
                                  onVote={handleVote}
                                  onOpenImage={(imgs, i) => setLightbox({ images: imgs, index: i })}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Left & Right Arrows Positioned on edges vertically centered */}
                    {hasReviewSlider && (
                      <>
                        <button
                          type="button"
                          onClick={prevReview}
                          className="absolute -left-4 md:-left-6 lg:-left-8 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full border border-[#E9DED3] bg-white text-[#141225] hover:text-[#B0611C] hover:border-[#B0611C] shadow-md flex items-center justify-center transition-colors z-10"
                          aria-label="Previous customer review"
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <button
                          type="button"
                          onClick={nextReview}
                          className="absolute -right-4 md:-right-6 lg:-right-8 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full border border-[#E9DED3] bg-white text-[#141225] hover:text-[#B0611C] hover:border-[#B0611C] shadow-md flex items-center justify-center transition-colors z-10"
                          aria-label="Next customer review"
                        >
                          <ChevronRight size={24} />
                        </button>
                      </>
                    )}

                    {hasMore && (
                      <div className="text-center pt-6 mt-auto">
                        <button onClick={loadMore}
                          className="px-8 py-2.5 border border-[#E9DED3] rounded-full text-sm font-bold text-[#6D625C] hover:border-[#9A6031] hover:text-[#9A6031] bg-white transition">
                          Load More Reviews
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── PHOTO GALLERY (Row 2) ── */}
              {gallery.length > 0 && (
                <div className="relative group/gallery border-t border-[#E9DED3] pt-2 mt-2">
                  <h2 className="text-base lg:text-lg font-serif font-bold text-[#141225] mb-2 flex items-center gap-1.5">
                    <Camera size={20} className="text-[#B0611C]" /> Customer Photo Gallery
                  </h2>
                  
                  <div className="relative overflow-hidden rounded-2xl mx-auto px-1 py-1">
                    <div
                      className="flex transition-transform duration-500 ease-in-out"
                      style={{ transform: `translateX(-${gallerySlide * 100}%)` }}
                    >
                      {galleryPages.map((pagePhotos, pageIndex) => (
                        <div key={pageIndex} className="w-full shrink-0 flex gap-4">
                          {pagePhotos.map((g, i) => (
                            <div key={i} onClick={() => setLightbox({ images: gallery.map(x => x.url), index: pageIndex * 4 + i })}
                              className="relative group cursor-pointer h-20 md:h-24 w-[calc(25%-12px)] min-w-[80px] overflow-hidden rounded-2xl border border-[#E9DED3] shrink-0 shadow-sm">
                              <img src={normalizeMediaUrl(g.url)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/animal_balance_maze.png'; }} />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                                <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-md scale-75 group-hover:scale-100" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Slider Arrows */}
                    {hasGallerySlider && (
                      <>
                        <button
                          type="button"
                          onClick={prevGallery}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 backdrop-blur border border-[#E9DED3] text-[#141225] hover:text-[#B0611C] hover:border-[#B0611C] shadow-md flex items-center justify-center transition-all z-10 opacity-0 group-hover/gallery:opacity-100"
                          aria-label="Previous photos"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={nextGallery}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 backdrop-blur border border-[#E9DED3] text-[#141225] hover:text-[#B0611C] hover:border-[#B0611C] shadow-md flex items-center justify-center transition-all z-10 opacity-0 group-hover/gallery:opacity-100"
                          aria-label="Next photos"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div> {/* Closes Right Column */}
          </div> {/* Closes Grid */}
        </div> {/* Closes Beige Container */}

      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox images={lightbox.images} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
