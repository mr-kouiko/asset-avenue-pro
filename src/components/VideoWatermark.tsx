import React, { useMemo } from 'react';

interface VideoWatermarkProps {
  className?: string;
  size?: 'normal' | 'large' | 'thumbnail';
  text?: string;
}

/**
 * CSS-only diagonal repeated watermark overlay.
 * Sits absolutely positioned over a media element. No re-encoding required.
 * Pointer-events disabled so it never blocks playback controls.
 */
export const VideoWatermark: React.FC<VideoWatermarkProps> = ({
  className = 'absolute inset-0 z-20 pointer-events-none overflow-hidden',
  size = 'normal',
  text = 'VISUSTOCK',
}) => {
  const { fontSize, tileW, tileH, opacity } = useMemo(() => {
    switch (size) {
      case 'thumbnail':
        return { fontSize: 22, tileW: 220, tileH: 140, opacity: 0.32 };
      case 'large':
        return { fontSize: 32, tileW: 320, tileH: 200, opacity: 0.28 };
      case 'normal':
      default:
        return { fontSize: 28, tileW: 280, tileH: 180, opacity: 0.26 };
    }
  }, [size]);

  // Inline SVG tile, repeated via background-image. Rotated text + soft shadow.
  const svg = useMemo(() => {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `
      <svg xmlns='http://www.w3.org/2000/svg' width='${tileW}' height='${tileH}'>
        <g transform='rotate(-28 ${tileW / 2} ${tileH / 2})'>
          <text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle'
                font-family='system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                font-weight='700' font-size='${fontSize}'
                fill='white' fill-opacity='${opacity}'
                stroke='black' stroke-opacity='${opacity * 0.55}' stroke-width='0.6'
                letter-spacing='2'>${escaped}</text>
        </g>
      </svg>`;
  }, [text, tileW, tileH, fontSize, opacity]);

  const dataUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

  return (
    <div
      className={className}
      style={{
        backgroundImage: dataUrl,
        backgroundRepeat: 'repeat',
        backgroundSize: `${tileW}px ${tileH}px`,
        mixBlendMode: 'overlay',
      }}
      aria-hidden="true"
    />
  );
};

export default VideoWatermark;
