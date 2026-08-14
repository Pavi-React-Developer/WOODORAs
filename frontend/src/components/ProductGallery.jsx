import React, { useState, useRef } from 'react';

const ProductImageZoom = ({ src, alt }) => {
  const [showZoom, setShowZoom] = useState(false);
  const [lensState, setLensState] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [bgState, setBgState] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const imgRef = useRef(null);

  const ZOOM_LEVEL = 2.5;

  const handleMouseMove = (e) => {
    if (!imgRef.current) return;
    const { left, top, width, height } = imgRef.current.getBoundingClientRect();

    const zoomWinW = 500;
    const zoomWinH = 500;

    const bgW = width * ZOOM_LEVEL;
    const bgH = height * ZOOM_LEVEL;

    const lensW = Math.min(zoomWinW / ZOOM_LEVEL, width);
    const lensH = Math.min(zoomWinH / ZOOM_LEVEL, height);

    let x = e.clientX - left;
    let y = e.clientY - top;

    let lensX = x - lensW / 2;
    let lensY = y - lensH / 2;

    if (lensX < 0) lensX = 0;
    if (lensY < 0) lensY = 0;
    if (lensX > width - lensW) lensX = width - lensW;
    if (lensY > height - lensH) lensY = height - lensH;

    setLensState({ x: lensX, y: lensY, w: lensW, h: lensH });
    setBgState({
      x: -(lensX * ZOOM_LEVEL),
      y: -(lensY * ZOOM_LEVEL),
      w: bgW,
      h: bgH
    });
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white rounded-[2rem]">
      {/* Mobile view (no zoom) */}
      <img src={src} alt={alt} className="w-full h-auto max-h-[500px] object-cover md:hidden rounded-none sm:rounded-[2rem]" onError={(e) => { e.target.style.display = 'none'; }} />

      {/* Desktop view (with zoom) */}
      <div
        className="hidden md:block relative w-full h-full cursor-crosshair group rounded-[2rem] overflow-hidden"
        onMouseEnter={() => setShowZoom(true)}
        onMouseLeave={() => setShowZoom(false)}
        onMouseMove={handleMouseMove}
      >
        <img ref={imgRef} src={src} alt={alt} className="w-full h-auto max-h-[600px] object-cover rounded-[2rem]" onError={(e) => { e.target.style.display = 'none'; }} />

        {showZoom && (
          <div
            className="absolute bg-white/30 border border-[#AA7327]/50 pointer-events-none"
            style={{
              left: lensState.x,
              top: lensState.y,
              width: lensState.w,
              height: lensState.h,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.15)'
            }}
          />
        )}
      </div>

      {/* Zoomed Result Window */}
      {showZoom && (
        <div
          className="hidden lg:block absolute top-0 left-[calc(100%+40px)] w-[500px] h-[500px] bg-white z-[9999] border border-gray-200 shadow-2xl overflow-hidden rounded-2xl pointer-events-none"
          style={{
            backgroundImage: `url(${src})`,
            backgroundPosition: `${bgState.x}px ${bgState.y}px`,
            backgroundSize: `${bgState.w}px ${bgState.h}px`,
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}
    </div>
  );
};

export default function ProductGallery({ images, productName, pricing, selectedImage, setSelectedImage }) {
  return (
    <div className="space-y-6 min-w-0 w-full relative">
      {pricing?.hasDiscount && (
        <div className="absolute top-4 left-0 sm:top-8 sm:left-8 hexagon-badge scale-[1.3] sm:scale-[2.2] origin-top-left z-20 shadow-md font-serif">
          <span className="text-[15px] leading-tight font-bold">{pricing.discountPercent}%</span>
          <span className="text-[11px] leading-tight font-bold tracking-wide">OFF</span>
        </div>
      )}
      <div className="-mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full rounded-none sm:rounded-[2rem] bg-white shadow-sm flex items-center justify-center relative">
        {selectedImage && selectedImage.trim() !== '' ? (
          <ProductImageZoom src={selectedImage} alt={productName} />
        ) : (
          <div className="h-[460px] flex items-center justify-center text-slate-500 overflow-hidden rounded-[2rem]">No image available</div>
        )}
      </div>

      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {images.slice(0, 4).map((src, index) => {
          const isSelected = selectedImage === src;
          return (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setSelectedImage(src)}
              className={`cursor-pointer overflow-hidden rounded-[16px] border-[3px] transition shrink-0 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white snap-start ${isSelected ? 'border-[#AA7327]' : 'border-transparent hover:border-[#AA7327] shadow-sm'
                }`}
            >
              <img
                src={src}
                alt={`${productName} view ${index + 1}`}
                className="w-full h-full object-cover rounded-[14px]"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
