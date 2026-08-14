import React from 'react';

export default function ShareModal({ showSharePopup, setShowSharePopup }) {
  if (!showSharePopup) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setShowSharePopup(false)}>
      <div className="w-full max-w-md rounded-[2rem] bg-white p-6 md:p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#B0611C] font-serif">Share this product</h3>
          <button onClick={() => setShowSharePopup(false)} className="text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2 items-center">
          <input
            type="text"
            readOnly
            value={typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : ''}
            className="flex-1 bg-transparent px-3 py-1 text-sm text-slate-600 outline-none truncate"
          />
          <button
            onClick={() => {
              const cleanUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
              navigator.clipboard.writeText(cleanUrl);
              alert('Link copied to clipboard!');
              setShowSharePopup(false);
            }}
            className="admin-btn shrink-0"
          >
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}
