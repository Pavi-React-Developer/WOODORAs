import React from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';

export default function DeviceSwitcher({ mode, setMode }) {
  return (
    <div className="flex gap-2 bg-[#F7F3EE] p-1.5 rounded-xl border border-[#E6DFD4] shadow-inner">
      <button 
        onClick={() => setMode('desktop')} 
        className={`p-2 rounded-lg transition-all flex items-center justify-center ${mode === 'desktop' ? 'bg-white shadow text-brand-dark' : 'text-brand-medium hover:text-brand-dark'}`}
        title="Desktop (1200px)"
      >
        <Monitor size={18} />
      </button>
      <button 
        onClick={() => setMode('tablet')} 
        className={`p-2 rounded-lg transition-all flex items-center justify-center ${mode === 'tablet' ? 'bg-white shadow text-brand-dark' : 'text-brand-medium hover:text-brand-dark'}`}
        title="Tablet (768px)"
      >
        <Tablet size={18} />
      </button>
      <button 
        onClick={() => setMode('mobile')} 
        className={`p-2 rounded-lg transition-all flex items-center justify-center ${mode === 'mobile' ? 'bg-white shadow text-brand-dark' : 'text-brand-medium hover:text-brand-dark'}`}
        title="Mobile (390px)"
      >
        <Smartphone size={18} />
      </button>
    </div>
  );
}
