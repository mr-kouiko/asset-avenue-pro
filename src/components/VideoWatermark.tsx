import React, { useMemo } from 'react';
import watermarkLogo from '@/assets/watermark-logo.png.asset.json';

interface VideoWatermarkProps {
  className?: string;
  size?: 'normal' | 'large' | 'thumbnail';
  /** Deprecated. Kept for API compatibility; the logo image is always used. */
  text?: string;
}

/**
 * Large horizontal VisuStock logo centered over the media.
 * Pointer-events disabled so it never blocks playback controls.
 */
export const VideoWatermark: React.FC<VideoWatermarkProps> = ({
  className = 'absolute inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden',
  size = 'normal',
}) => {
  const { widthPct, opacity } = useMemo(() => {
    switch (size) {
      case 'thumbnail':
        return { widthPct: 45, opacity: 0.5 };
      case 'large':
        return { widthPct: 30, opacity: 0.4 };
      case 'normal':
      default:
        return { widthPct: 35, opacity: 0.45 };
    }
  }, [size]);

  return (
    <div className={className} aria-hidden="true">
      <img
        src={watermarkLogo.url}
        alt=""
        draggable={false}
        style={{
          width: `${widthPct}%`,
          maxWidth: '100%',
          height: 'auto',
          opacity,
          mixBlendMode: 'overlay',
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
          userSelect: 'none',
        }}
      />
    </div>
  );
};

export default VideoWatermark;
