import React, { useMemo } from 'react';
import watermarkLogo from '@/assets/watermark-logo.png.asset.json';

interface VideoWatermarkProps {
  className?: string;
  size?: 'normal' | 'large' | 'thumbnail';
  /** Deprecated. Kept for API compatibility; the logo image is always used. */
  text?: string;
}

/**
 * Image-based diagonal tiled watermark overlay using the VisuStock logo.
 * Sits absolutely positioned over a media element. No re-encoding required.
 * Pointer-events disabled so it never blocks playback controls.
 */
export const VideoWatermark: React.FC<VideoWatermarkProps> = ({
  className = 'absolute inset-0 z-20 pointer-events-none overflow-hidden',
  size = 'normal',
}) => {
  const { tile, opacity } = useMemo(() => {
    switch (size) {
      case 'thumbnail':
        return { tile: 140, opacity: 0.32 };
      case 'large':
        return { tile: 260, opacity: 0.26 };
      case 'normal':
      default:
        return { tile: 200, opacity: 0.28 };
    }
  }, [size]);

  return (
    <div className={className} aria-hidden="true">
      <div
        className="absolute"
        style={{
          // Oversize + center so rotation never reveals empty edges.
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          backgroundImage: `url("${watermarkLogo.url}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: `${tile}px ${tile}px`,
          transform: 'rotate(-28deg)',
          opacity,
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  );
};

export default VideoWatermark;
