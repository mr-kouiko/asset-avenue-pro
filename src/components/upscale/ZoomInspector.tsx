import { useRef, useState, useCallback } from 'react';

interface ZoomInspectorProps {
  src: string;
  alt?: string;
  className?: string;
  zoomLevel?: number;
  lensSize?: number;
}

export function ZoomInspector({
  src,
  alt = 'Zoom preview',
  className = '',
  zoomLevel = 2,
  lensSize = 160,
}: ZoomInspectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<{
    visible: boolean;
    x: number;
    y: number;
    bgX: number;
    bgY: number;
  }>({ visible: false, x: 0, y: 0, bgX: 0, bgY: 0 });

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Background position for zoomed view
      const bgX = (x / rect.width) * 100;
      const bgY = (y / rect.height) * 100;

      setLens({ visible: true, x, y, bgX, bgY });
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => handleMove(e.clientX, e.clientY),
    [handleMove],
  );

  const handlePointerLeave = useCallback(() => {
    setLens((l) => ({ ...l, visible: false }));
  }, []);

  const half = lensSize / 2;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl bg-slate-800 cursor-crosshair ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain block"
        draggable={false}
      />

      {lens.visible && (
        <div
          className="absolute rounded-full border-2 border-white/80 shadow-2xl pointer-events-none z-30 overflow-hidden"
          style={{
            width: lensSize,
            height: lensSize,
            left: lens.x - half,
            top: lens.y - half,
            backgroundImage: `url(${src})`,
            backgroundSize: `${(containerRef.current?.offsetWidth ?? 100) * zoomLevel}px ${(containerRef.current?.offsetHeight ?? 100) * zoomLevel}px`,
            backgroundPosition: `${lens.bgX}% ${lens.bgY}%`,
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}

      {lens.visible && (
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 text-xs text-white font-medium pointer-events-none z-10">
          {zoomLevel}× zoom
        </div>
      )}
    </div>
  );
}
