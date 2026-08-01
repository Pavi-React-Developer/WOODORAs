import React, { useEffect, useState } from 'react';
import { adminService } from '../api/adminService';
import toast from 'react-hot-toast';
import { Ticket, CheckCircle2 } from 'lucide-react';

export default function CouponSection({ subtotal, items = [], onApplyCoupon, appliedCoupon }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await adminService.getEligibleCoupons(subtotal, items);
        const normalizedCoupons = Array.isArray(data)
          ? data
          : Array.isArray(data?.coupons)
            ? data.coupons
            : Array.isArray(data?.data)
              ? data.data
              : [];
        setCoupons(normalizedCoupons);
        if (selectedCoupon && !normalizedCoupons.some((coupon) => coupon.couponCode === selectedCoupon)) {
          setSelectedCoupon('');
          onApplyCoupon?.({ coupon: null, discountAmount: 0 });
        }
      } catch (err) {
        console.error(err);
        setCoupons([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [subtotal, items]);

  const handleApply = async () => {
    if (!selectedCoupon) return;
    setApplying(true);
    try {
      const result = await adminService.applyCoupon(selectedCoupon, subtotal, items);
      onApplyCoupon?.(result);
      toast.success('Coupon applied successfully');
    } catch (err) {
      toast.error(err.message || 'Coupon could not be applied');
    } finally {
      setApplying(false);
    }
  };

  const handleApplyManual = async () => {
    if (!manualCode || !manualCode.trim()) return;
    setApplying(true);
    try {
      const result = await adminService.applyCoupon(manualCode.trim().toUpperCase(), subtotal, items);
      onApplyCoupon?.(result);
      toast.success('Coupon applied successfully');
    } catch (err) {
      toast.error(err.message || 'Coupon could not be applied');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[#E6DFD4] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Ticket size={18} className="text-[#8B5E3C]" />
        <h3 className="text-lg font-bold text-[#2F241D]">Coupons & Offers</h3>
      </div>
      {appliedCoupon ? (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-2xl">
          <div>
            <div className="text-sm font-bold text-green-800 flex items-center gap-1.5">
              <CheckCircle2 size={16} /> Coupon Applied
            </div>
            <div className="text-lg font-bold text-green-900 mt-1">{appliedCoupon.couponCode || appliedCoupon.code}</div>
          </div>
          <button 
            onClick={() => {
              setSelectedCoupon('');
              setManualCode('');
              onApplyCoupon?.({ coupon: null, discountAmount: 0 });
              toast.success('Coupon removed');
            }} 
            className="text-red-500 hover:text-red-700 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            Remove
          </button>
        </div>
      ) : loading ? (
        <div className="text-sm text-gray-500">Loading coupons…</div>
      ) : coupons.length === 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Enter coupon code" className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 text-sm outline-none focus:border-[#8B5E3C]" />
            <button onClick={handleApplyManual} disabled={applying || !manualCode.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#8B5E3C] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Apply</button>
          </div>
          <p className="text-sm text-gray-500">No eligible coupons available for this order.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Enter coupon code" className="w-full rounded-xl border border-[#E6DFD4] px-3 py-2.5 text-sm outline-none focus:border-[#8B5E3C]" />
            <button onClick={handleApplyManual} disabled={applying || !manualCode.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#8B5E3C] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Apply</button>
          </div>
          {coupons.map((coupon) => (
            <label key={coupon._id} className="flex items-start gap-3 rounded-2xl border border-[#E6DFD4] p-3">
              <input type="radio" name="coupon" value={coupon.couponCode} checked={selectedCoupon === coupon.couponCode} onChange={() => setSelectedCoupon(coupon.couponCode)} className="mt-1 h-4 w-4" />
              <div className="flex-1">
                <div className="font-semibold text-[#2F241D]">{coupon.couponCode}</div>
                <div className="text-sm text-gray-600">{coupon.description || `${coupon.discountType} ${coupon.discountValue}${coupon.discountType === 'Percentage' ? '%' : ''}`}</div>
              </div>
            </label>
          ))}
          <button onClick={handleApply} disabled={applying || !selectedCoupon} className="inline-flex items-center gap-2 rounded-xl bg-[#8B5E3C] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            <CheckCircle2 size={16} /> {applying ? 'Applying…' : 'Apply Coupon'}
          </button>
        </div>
      )}
    </div>
  );
}
