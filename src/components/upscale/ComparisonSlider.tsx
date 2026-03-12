import { useState, useRef, useCallback, useEffect } from 'react';

interface ComparisonSliderProps {
  originalSrc: string;
  resultSrc: string;
  className?: string;
  onHover?: (pos: { x: number; y: number } | null) => void;
}

export function ComparisonSlider({
  originalSrc,
  resultSrc,
  className = '',
  onHover,
}: ComparisonSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setPosition(pct);
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      updatePosition(e.clientX);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [updatePosition],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging) {
        updatePosition(e.clientX);
      }
      if (onHover && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        onHover({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        });
      }
    },
    [isDragging, updatePosition, onHover],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePointerLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  // Keyboard accessibility
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setPosition((p) => Math.max(0, p - 2));
      if (e.key === 'ArrowRight') setPosition((p) => Math.min(100, p + 2));
    };
    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-xl bg-slate-800 select-none touch-none cursor-col-resize ${className}`}
      style={{ aspectRatio: 'auto' }}
      tabIndex={0}
      role="slider"
      aria-label="Comparison slider"
      aria-valuenow={Math.round(position)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {/* AI result (full background) */}
      <img
        src={resultSrc}
        alt="AI Upscaled"
        className="w-full h-full object-contain block"
        draggable={false}
      />

      {/* Original (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={originalSrc}
          alt="Original"
          className="w-full h-full object-contain block"
          style={{
            width: containerRef.current
              ? `${containerRef.current.offsetWidth}px`
              : '100%',
            maxWidth: 'none',
          }}
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg pointer-events-none z-10"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      />

      {/* Handle */}
      <div
        className="absolute top-1/2 z-20 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur border-2 border-white shadow-xl flex items-center justify-center pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M5 3L2 8L5 13" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
          <path d="M11 3L14 8L11 13" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 text-xs text-white font-medium pointer-events-none z-10">
        Original
      </div>
      <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/60 text-xs text-white font-medium pointer-events-none z-10">
        AI Upscaled
      </div>
    </div>
  );
}
