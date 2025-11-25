import React, { useState, useRef, useEffect } from 'react';
import { Film } from 'lucide-react';
import { VideoWatermark } from './VideoWatermark';

interface WatermarkedVideoThumbnailProps {
  thumbnail: string;
  title: string;
  videoUrl?: string;
  className?: string;
}

/**
 * Static watermarked thumbnail for video previews in listings
 * Adds hover auto-play preview of the actual video
 * Optimized: video element only mounted on hover to save bandwidth
 */
export const WatermarkedVideoThumbnail: React.FC<WatermarkedVideoThumbnailProps> = ({
  thumbnail,
  title,
  videoUrl,
  className = "w-full h-full"
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Check if thumbnail is missing or is placeholder
  const hasValidThumbnail = thumbnail && 
    thumbnail !== '/placeholder.svg' && 
    !thumbnail.includes('placeholder');

  // Auto-play video on hover
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    
    if (isHovered && videoUrl) {
      v.muted = true;
      v.play()
        .then(() => setIsVideoReady(true))
        .catch((err) => console.warn('[HoverPreview] play failed', err));
    } else {
      v.pause();
      v.currentTime = 0;
      setIsVideoReady(false);
    }
  }, [isHovered, videoUrl]);

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      onMouseEnter={() => videoUrl && setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsVideoReady(false); }}
    >
      {/* Loading skeleton */}
      {!isVisible && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {isVisible && (
        <>
      {/* Video preview on hover - only mounted when hovering */}
      {isHovered && videoUrl && (
        <video
          ref={videoRef}
          className={`absolute inset-0 z-10 w-full h-full object-cover transition-opacity duration-300 ${
            isVideoReady ? 'opacity-100' : 'opacity-0'
          }`}
          muted
          loop
          playsInline
          preload="none"
          onCanPlay={() => setIsVideoReady(true)}
        >
          <source src={videoUrl} type={videoUrl.endsWith('.mov') ? 'video/quicktime' : 'video/mp4'} />
          {/* Fallback for .mov files - try as MP4 if QuickTime fails */}
          {videoUrl.endsWith('.mov') && <source src={videoUrl} type="video/mp4" />}
        </video>
      )}
      
      {/* Thumbnail image or video icon fallback */}
      {!thumbnailError && hasValidThumbnail ? (
        <img
          src={thumbnail}
          alt={title}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isHovered && isVideoReady && videoUrl ? 'opacity-0' : 'opacity-100'
          }`}
          onError={() => {
            console.warn(`Thumbnail failed to load for ${title}, showing fallback`);
            setThumbnailError(true);
          }}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-stock-blue/10 to-stock-blue/20 flex items-center justify-center">
          <div className="text-center">
            <Film className="h-12 w-12 mx-auto mb-2 text-stock-blue/60" />
            <span className="text-xs text-stock-dark/70 font-medium">Aperçu vidéo</span>
          </div>
        </div>
      )}
      
      {/* Large watermark overlay for thumbnail */}
      <div className="pointer-events-none">
        <VideoWatermark size="thumbnail" />
      </div>
      
      {/* Video play indicator */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
        Vidéo
      </div>
      </>
      )}
    </div>
  );
};
