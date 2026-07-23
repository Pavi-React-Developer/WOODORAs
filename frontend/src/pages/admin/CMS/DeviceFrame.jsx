import React from 'react';

export default function DeviceFrame({ mode, children }) {
  if (mode === 'desktop') {
    return (
      <div className="w-[1200px] h-[800px] mx-auto bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden relative flex flex-col my-4 shrink-0">
        {/* Fake Browser Chrome */}
        <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <div className="flex-1 ml-4 bg-white rounded text-xs px-2 py-1 text-gray-500 font-mono text-center">preview.woodentoy.com</div>
        </div>
        <div className="flex-1 relative bg-white">
            {children}
        </div>
      </div>
    );
  }

  if (mode === 'tablet') {
    return (
      <div className="w-[768px] h-[1024px] mx-auto bg-white rounded-[32px] border-[16px] border-[#1a1a1a] shadow-2xl overflow-hidden relative flex flex-col my-8 shrink-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 mt-3 bg-[#1a1a1a] rounded-full z-50 shadow-inner border border-gray-700/50"></div>
        {children}
      </div>
    );
  }

  if (mode === 'mobile') {
    return (
      <div className="w-[390px] h-[844px] mx-auto bg-white rounded-[44px] border-[14px] border-[#1a1a1a] shadow-2xl overflow-hidden relative flex flex-col my-8 shrink-0">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-[#1a1a1a] rounded-b-3xl z-50"></div>
        {children}
      </div>
    );
  }

  return children;
}
