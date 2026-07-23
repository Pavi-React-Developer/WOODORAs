import React, { useState, useEffect, useCallback } from 'react';
import { cmsService } from '../../../api/cmsService';
import { Save, Star, CheckSquare, Square, RefreshCw } from 'lucide-react';

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'}`}
        />
      ))}
    </div>
  );
}

export default function ReviewAdmin() {
  const [form, setForm] = useState({
    animationType: 'marquee',
    showArrows: false,
    showDots: false,
    sliderSpeed: 3000,
    marqueeSpeed: 30,
    desktopColumns: 3,
    mobileColumns: 1,
    featuredReviewIds: [],
  });
  const [allReviews, setAllReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setReviewsLoading(true);

    cmsService.getReviewConfig()
      .then(res => {
        if (res.data) {
          const ids = (res.data.featuredReviewIds || []).map(r =>
            typeof r === 'object' ? r._id : r
          );
          setForm({
            animationType: res.data.animationType || 'marquee',
            showArrows: !!res.data.showArrows,
            showDots: !!res.data.showDots,
            sliderSpeed: res.data.sliderSpeed || 3000,
            marqueeSpeed: res.data.marqueeSpeed || 30,
            desktopColumns: res.data.desktopColumns || 3,
            mobileColumns: res.data.mobileColumns || 1,
            featuredReviewIds: ids,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    cmsService.getApprovedReviews()
      .then(res => {
        if (res.data) setAllReviews(res.data);
      })
      .catch(console.error)
      .finally(() => setReviewsLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const toggleReview = (id) => {
    setForm(prev => {
      const ids = prev.featuredReviewIds;
      if (ids.includes(id)) {
        return { ...prev, featuredReviewIds: ids.filter(i => i !== id) };
      } else {
        return { ...prev, featuredReviewIds: [...ids, id] };
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await cmsService.updateReviewConfig(form);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-8 flex items-center gap-3 text-[#8C8374]">
      <RefreshCw className="w-4 h-4 animate-spin" /> Loading review settings...
    </div>
  );

  const isNonMarquee = form.animationType !== 'marquee';

  return (
    <div className="p-6 pb-32 space-y-6">

      {/* Success Banner */}
      {savedBanner && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-5 py-3 text-sm font-medium flex items-center gap-2 animate-fade-in">
          <CheckSquare className="w-4 h-4" /> Settings saved successfully!
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif text-brand-dark mb-1">Customer Reviews Settings</h2>
          <p className="text-sm text-brand-medium">Configure the "What Parents Love" section on the homepage.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#514332] text-white px-5 py-2.5 rounded-lg hover:bg-[#3d3225] transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      {/* ── Section 1: Animation Config ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E6DFD4] p-6 space-y-5 max-w-2xl">
        <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider">Animation Settings</h3>

        <div>
          <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-2">Animation Type</label>
          <select
            name="animationType"
            value={form.animationType}
            onChange={handleChange}
            className="w-full border border-[#E6DFD4] rounded-lg px-4 py-2.5 outline-none focus:border-[#514332] bg-[#FDF9F1] text-sm"
          >
            <option value="none">⬛ None — Static Grid (No Animation)</option>
            <option value="marquee">🎞️ Continuous Marquee</option>
            <option value="slide">▶️ Standard Slider</option>
            <option value="fade">🌅 Fade Transition</option>
          </select>
          <p className="text-xs text-brand-medium mt-1">
            None shows reviews as a static grid. Marquee scrolls continuously. Slider and Fade animate card by card.
          </p>
        </div>

        {form.animationType === 'marquee' && (
          <div>
            <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-2">Marquee Scroll Duration (seconds)</label>
            <input
              type="number"
              name="marqueeSpeed"
              value={form.marqueeSpeed}
              onChange={handleChange}
              min="5"
              max="120"
              step="1"
              className="w-full border border-[#E6DFD4] rounded-lg px-4 py-2.5 outline-none focus:border-[#514332] bg-[#FDF9F1] text-sm"
            />
            <p className="text-xs text-brand-medium mt-1">Lower value is faster, higher value is slower (default is 30s).</p>
          </div>
        )}

        {form.animationType !== 'marquee' && (
          <>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="showArrows"
                id="showArrows"
                checked={form.showArrows}
                onChange={handleChange}
                className="w-4 h-4 accent-[#514332] cursor-pointer"
              />
              <label htmlFor="showArrows" className="text-sm text-brand-dark cursor-pointer select-none">Show Arrow Navigation Buttons</label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="showDots"
                id="showDots"
                checked={form.showDots}
                onChange={handleChange}
                className="w-4 h-4 accent-[#514332] cursor-pointer"
              />
              <label htmlFor="showDots" className="text-sm text-brand-dark cursor-pointer select-none">Show Pagination Dots</label>
            </div>
          </>
        )}

        {form.animationType !== 'marquee' && form.animationType !== 'none' && (
          <div>
            <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-2">Autoplay Delay (ms)</label>
            <input
              type="number"
              name="sliderSpeed"
              value={form.sliderSpeed}
              onChange={handleChange}
              min="1000"
              max="10000"
              step="500"
              className="w-full border border-[#E6DFD4] rounded-lg px-4 py-2.5 outline-none focus:border-[#514332] bg-[#FDF9F1] text-sm"
            />
            <p className="text-xs text-brand-medium mt-1">Time each slide stays visible (e.g. 3000 = 3 seconds).</p>
          </div>
        )}

        {form.animationType !== 'marquee' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#E6DFD4]/50">
            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-2">Mobile View (Columns)</label>
              <input
                type="number"
                name="mobileColumns"
                value={form.mobileColumns}
                onChange={handleChange}
                min="1"
                max="4"
                className="w-full border border-[#E6DFD4] rounded-lg px-4 py-2.5 outline-none focus:border-[#514332] bg-[#FDF9F1] text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-2">Desktop View (Columns)</label>
              <input
                type="number"
                name="desktopColumns"
                value={form.desktopColumns}
                onChange={handleChange}
                min="1"
                max="6"
                className="w-full border border-[#E6DFD4] rounded-lg px-4 py-2.5 outline-none focus:border-[#514332] bg-[#FDF9F1] text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Featured Reviews Picker ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E6DFD4] p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider">Featured Reviews</h3>
            <p className="text-xs text-brand-medium mt-1">
              Check the reviews you want to show on the landing page.
              {form.featuredReviewIds.length > 0 && (
                <span className="ml-2 bg-[#514332] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {form.featuredReviewIds.length} selected
                </span>
              )}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-xs text-brand-medium hover:text-brand-dark border border-[#E6DFD4] px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {reviewsLoading ? (
          <div className="flex items-center gap-2 text-brand-medium text-sm py-8 justify-center">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading approved reviews...
          </div>
        ) : allReviews.length === 0 ? (
          <div className="text-center py-12 text-brand-medium">
            <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No approved reviews yet.</p>
            <p className="text-xs mt-1">Approve reviews from the Reviews management panel first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
            {allReviews.map(review => {
              const isChecked = form.featuredReviewIds.includes(review._id);
              return (
                <div
                  key={review._id}
                  onClick={() => toggleReview(review._id)}
                  className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all select-none ${
                    isChecked
                      ? 'border-[#514332] bg-[#FDF9F1] shadow-md'
                      : 'border-[#E6DFD4] bg-white hover:border-[#C8B9A5] hover:bg-[#FDFCF9]'
                  }`}
                >
                  {/* Checkbox indicator */}
                  <div className={`absolute top-3 right-3 w-5 h-5 rounded flex items-center justify-center transition-colors ${
                    isChecked ? 'bg-[#514332]' : 'bg-white border border-[#C8B9A5]'
                  }`}>
                    {isChecked && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                  </div>

                  <StarRating rating={review.rating} />

                  <p className="text-sm text-brand-dark mt-2 line-clamp-3 italic leading-snug">
                    "{review.description || review.title || '—'}"
                  </p>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F0EBE4]">
                    <div className="w-7 h-7 rounded-full bg-[#E6DFD4] flex items-center justify-center text-xs font-bold text-brand-dark shrink-0">
                      {(review.user?.name || 'G').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-brand-dark truncate">{review.user?.name || 'Guest'}</p>
                      <p className="text-[10px] text-brand-medium truncate">
                        {review.product?.name || ''}{review.isVerifiedPurchase ? ' · ✓ Verified' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
