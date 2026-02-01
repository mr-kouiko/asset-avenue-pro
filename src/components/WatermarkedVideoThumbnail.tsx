import React, { useState, useRef, useEffect, memo } from 'react';
import { Film, Play } from 'lucide-react';
import { VideoWatermark } from './VideoWatermark';

interface WatermarkedVideoThumbnailProps {
  thumbnail: string;
  title: string;
  videoUrl?: string;
  className?: string;
  priority?: boolean;
}

/**
 * Static watermarked thumbnail for video previews in listings
 * Adds hover auto-play preview of the actual video
 * Optimized: video element only mounted on hover to save bandwidth
 * Enhanced: Uses video frame extraction as fallback for missing thumbnails
 */
export const WatermarkedVideoThumbnail: React.FC<WatermarkedVideoThumbnailProps> = memo(({
  thumbnail,
  title,
  videoUrl,
  className = "w-full h-full",
  priority = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [extractedFrame, setExtractedFrame] = useState<string | null>(null);
  const [frameExtractionFailed, setFrameExtractionFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Lazy loading with Intersection Observer - skip for priority items
  useEffect(() => {
    if (priority) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Check if thumbnail is missing or is placeholder
  const hasValidThumbnail = thumbnail && 
    thumbnail !== '/placeholder.svg' && 
    !thumbnail.includes('placeholder');

  // Extract frame from video when thumbnail fails
  useEffect(() => {
    if (!thumbnailError || !videoUrl || extractedFrame || frameExtractionFailed) return;

    const extractFrame = async () => {
      try {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.preload = 'metadata';
        
        // Try to fetch as blob first for better CORS handling
        try {
          const response = await fetch(videoUrl, { mode: 'cors' });
          if (response.ok) {
            const blob = await response.blob();
            video.src = URL.createObjectURL(blob);
          } else {
            video.src = videoUrl;
          }
        } catch {
          video.src = videoUrl;
        }

        video.onloadeddata = () => {
          // Seek to 1 second for a better frame
          video.currentTime = 1;
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 360;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              setExtractedFrame(dataUrl);
            }
          } catch (e) {
            console.warn('[WatermarkedVideoThumbnail] Frame extraction failed:', e);
            setFrameExtractionFailed(true);
          }
          // Cleanup
          if (video.src.startsWith('blob:')) {
            URL.revokeObjectURL(video.src);
          }
        };

        video.onerror = () => {
          console.warn('[WatermarkedVideoThumbnail] Video load failed for frame extraction');
          setFrameExtractionFailed(true);
        };

        // Timeout fallback
        setTimeout(() => {
          if (!extractedFrame) {
            setFrameExtractionFailed(true);
          }
        }, 5000);
      } catch (e) {
        console.warn('[WatermarkedVideoThumbnail] Frame extraction error:', e);
        setFrameExtractionFailed(true);
      }
    };

    extractFrame();
  }, [thumbnailError, videoUrl, extractedFrame, frameExtractionFailed]);

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

  // Determine what to show as the thumbnail
  const showThumbnail = !thumbnailError && hasValidThumbnail;
  const showExtractedFrame = thumbnailError && extractedFrame;
  const showPlaceholder = (thumbnailError || !hasValidThumbnail) && !extractedFrame;

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
              onContextMenu={(e) => e.preventDefault()}
            >
              <source src={videoUrl} type={videoUrl.endsWith('.mov') ? 'video/quicktime' : 'video/mp4'} />
              {videoUrl.endsWith('.mov') && <source src={videoUrl} type="video/mp4" />}
            </video>
          )}
          
          {/* Primary thumbnail */}
          {showThumbnail && (
            <img
              src={thumbnail}
              alt={title}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                isHovered && isVideoReady && videoUrl ? 'opacity-0' : 'opacity-100'
              }`}
              onError={() => setThumbnailError(true)}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
          )}

          {/* Extracted frame fallback */}
          {showExtractedFrame && (
            <img
              src={extractedFrame}
              alt={title}
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                isHovered && isVideoReady && videoUrl ? 'opacity-0' : 'opacity-100'
              }`}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
          )}

          {/* Styled placeholder fallback - much nicer than blue gradient */}
          {showPlaceholder && (
            <div className="w-full h-full bg-muted flex items-center justify-center relative overflow-hidden">
              {/* Subtle pattern background */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 10px,
                    currentColor 10px,
                    currentColor 11px
                  )`
                }} />
              </div>
              
              {/* Center play icon */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-background/80 flex items-center justify-center shadow-lg border border-border">
                  <Play className="h-6 w-6 text-muted-foreground ml-1" />
                </div>
                <span className="text-xs text-muted-foreground mt-3 font-medium">
                  {frameExtractionFailed ? 'Vidéo' : 'Chargement...'}
                </span>
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
});

WatermarkedVideoThumbnail.displayName = 'WatermarkedVideoThumbnail';
