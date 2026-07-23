import React, { useRef, useState, useEffect } from 'react';
import DeviceSwitcher from './DeviceSwitcher';
import DeviceFrame from './DeviceFrame';
import DeviceViewport from './DeviceViewport';

export default function PreviewPanel({ draftSections, dummyContext, mode, setMode, children }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      // Calculate available space with some padding
      const availableWidth = containerRef.current.clientWidth - 40; 
      const availableHeight = containerRef.current.clientHeight - 40;
      
      let targetWidth = 390;
      let targetHeight = 844;

      if (mode === 'desktop') {
        targetWidth = 1200;
        targetHeight = 800;
      } else if (mode === 'tablet') {
        targetWidth = 768;
        targetHeight = 1024;
      }

      // Calculate scale to fit both width and height (like object-fit: contain)
      const scaleX = availableWidth / targetWidth;
      const scaleY = availableHeight / targetHeight;
      const finalScale = Math.min(scaleX, scaleY, 1); // Don't scale up past 1x

      setScale(finalScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [mode]);

  return (
    <div className="flex-1 flex flex-col bg-[#F9F7F4] rounded-2xl border border-[#E6DFD4] overflow-hidden relative shadow-inner h-full">
      {/* Top Bar */}
      <div className="bg-white px-6 py-4 border-b border-[#E6DFD4] flex items-center justify-between z-10 shadow-sm shrink-0">
        <span className="font-bold text-brand-dark text-lg">Live Preview</span>
        <DeviceSwitcher mode={mode} setMode={setMode} />
      </div>
      
      {/* Preview Workspace */}
      <div ref={containerRef} className="flex-1 overflow-hidden bg-gray-100 flex justify-center items-center">
        <div 
          className="transition-transform duration-300 origin-center flex items-center justify-center"
          style={{ transform: `scale(${scale})` }}
        >
          <DeviceFrame mode={mode}>
            <DeviceViewport mode={mode}>
              {children}
            </DeviceViewport>
          </DeviceFrame>
        </div>
      </div>
    </div>
  );
}
