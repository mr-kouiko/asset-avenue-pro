import React, { useRef, useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { LazyImage } from '@/components/LazyImage';
import { VideoWatermark } from '@/components/VideoWatermark';

interface WatermarkedVideoThumbnailProps {
  thumbnail?: string;
  title?: string;
  videoUrl?: string;
  className?: string;
}

/**
 * Marketplace video thumbnail.
 * Shows a poster, plays the original video on hover (muted, looping),
 * and overlays a CSS-only diagonal watermark — no re-encoding.
 */
export const WatermarkedVideoThumbnail: React.FC<WatermarkedVideoThumbnailProps> = ({
  thumbnail,
  title = 'Video',
  videoUrl,
  className = 'w-full h-full',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [canPlay, setCanPlay] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (hovered && canPlay) {
      v.play().catch(() => {});
    } else {
      v.pause();
      try { v.currentTime = 0; } catch {}
    }
  }, [hovered, canPlay]);

  const showVideo = !!videoUrl;

  return (
    <div
      className={`${className} relative overflow-hidden bg-stock-gray`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Poster */}
      {thumbnail && (
        <LazyImage
          src={thumbnail}
          alt={title}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${hovered && showVideo ? 'opacity-0' : 'opacity-100'}`}
        />
      )}

      {/* Hover-playing video */}
      {showVideo && (
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          loop
          playsInline
          preload="none"
          crossOrigin="anonymous"
          onCanPlay={() => setCanPlay(true)}
          onContextMenu={(e) => e.preventDefault()}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      {/* Play icon hint */}
      {!hovered && showVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 rounded-full p-2">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
      )}

      {/* CSS watermark — always on top */}
      <VideoWatermark size="thumbnail" />
    </div>
  );
};

export default WatermarkedVideoThumbnail;
