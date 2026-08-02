import React, { useEffect, useRef, useState } from "react";

export default function AutoFadingImage({
  images,
  alt,
  className = "",
  wrapperClassName = "",
  interval = 5000,
  fadeDuration = 1000,
}) {
  const idxRef = useRef(0);
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (images.length <= 1) return;

    const container = containerRef.current;
    if (!container) return;

    const timer = setInterval(() => {
      const prevIdx = idxRef.current;
      const nextIdx = (prevIdx + 1) % images.length;
      idxRef.current = nextIdx;

      const prevEl = container.querySelector(`[data-carousel-idx="${prevIdx}"]`);
      const nextEl = container.querySelector(`[data-carousel-idx="${nextIdx}"]`);

      if (prevEl) {
        // Set transition FIRST, then change opacity — browser captures the "from" state
        prevEl.style.transition = `opacity ${fadeDuration}ms ease-in-out`;
        prevEl.style.opacity = "0";
        // After transition ends, lower z-index so it doesn't block clicks
        setTimeout(() => { prevEl.style.zIndex = "0"; }, fadeDuration);
      }

      if (nextEl) {
        nextEl.style.transition = `opacity ${fadeDuration}ms ease-in-out`;
        nextEl.style.opacity = "1";
        nextEl.style.zIndex = "2";
      }
    }, interval);

    return () => clearInterval(timer);
  }, [images.length, interval, fadeDuration]);

  const handleFirstLoad = (e) => {
    if (ready) return;
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight && containerRef.current) {
      containerRef.current.style.aspectRatio = `${img.naturalWidth / img.naturalHeight}`;
      setReady(true);
    }
  };

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${wrapperClassName}`}>
      {/* Spacer: invisible, keeps container height stable */}
      <img
        src={images[0]}
        alt=""
        aria-hidden="true"
        onLoad={handleFirstLoad}
        className="invisible w-full h-auto block"
      />

      {images.map((src, index) => (
        <img
          key={src}
          data-carousel-idx={index}
          src={src}
          alt={alt}
          loading={index === 0 ? "eager" : "lazy"}
          className={`${className} absolute inset-0 w-full h-full`}
          style={{
            opacity: index === 0 ? 1 : 0,
            zIndex: index === 0 ? 2 : 0,
          }}
        />
      ))}
    </div>
  );
}
