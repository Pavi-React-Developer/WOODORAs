import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Camera, Video, Upload, Send, ShieldCheck, X, Star } from 'lucide-react';
import { reviewService } from '../api/reviewService';

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
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

export default function WriteReviewModal({ productId, user, onClose, onSuccess }) {
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
      // Always try create first; if user already reviewed, silently update instead
      let review;
      try {
        review = await reviewService.createReview(productId, fd);
      } catch (err) {
        if (err.response?.status === 400 && err.response?.data?.message?.includes('already reviewed')) {
          review = await reviewService.updateReview(productId, fd);
        } else {
          throw err;
        }
      }
      setDone(true);
      if (onSuccess) onSuccess(review);
      toast.success('Review submitted! Thank you.');
      setTimeout(() => { if (onClose) onClose(); }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSub(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Write a Review</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {done ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-emerald-800">Review Submitted!</h3>
              <p className="text-sm text-emerald-600 mt-1">Thank you for sharing your experience. Your review is currently pending approval.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Star Rating */}
              <div>
                <label className="block text-sm font-bold text-[#141225] mb-2">Your Rating *</label>
                <StarInput value={rating} onChange={setRating} />
                <p className="text-xs text-[#8A817C] mt-1">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating] || 'Tap to rate'}
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
                  <label className="block text-sm font-bold text-[#141225] mb-1.5 flex items-center gap-1.5">
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
                          <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-[#E9DED3]" />
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
                  <label className="block text-sm font-bold text-[#141225] mb-1.5 flex items-center gap-1.5">
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
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
