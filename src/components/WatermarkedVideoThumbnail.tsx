import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Play } from 'lucide-react';
import { VideoWatermark } from './VideoWatermark';
import { getProxiedVideoUrl, needsCorsProxy } from '@/utils/videoProxy';

interface WatermarkedVideoThumbnailProps {
  thumbnail: string;
  title: string;
  videoUrl?: string;
  className?: string;
  priority?: boolean;
}

/**
 * Normalized video thumbnail component for marketplace grid.
 * 
 * GUARANTEES:
 * 1. Always shows a poster (thumbnail, extracted frame, or styled placeholder)
 * 2. Always attempts muted autoplay on hover when videoUrl exists
 * 3. Graceful fallback if autoplay fails (shows poster, no error)
 * 4. Lazy loading via IntersectionObserver (skipped for priority items)
 * 
 * BROWSER AUTOPLAY POLICY:
 * - Muted videos can autoplay without user interaction in all modern browsers
 * - We set muted=true, playsInline=true to ensure compatibility
 */
const validateThumbnailBrightness = (img: HTMLImageElement): boolean => {
  try {
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let totalBrightness = 0;
    const pixelCount = size * size;
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / pixelCount;
    return avgBrightness > 15 && avgBrightness < 240;
  } catch {
    // CORS tainted canvas or other error - assume thumbnail is invalid
    // so the video #t=0.1 fallback can display instead
    return false;
  }
};

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
  const [videoPlayFailed, setVideoPlayFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameExtractionAttempted = useRef(false);

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

  // Check if thumbnail is valid (not placeholder or empty)
  const hasValidThumbnail = thumbnail && 
    thumbnail !== '/placeholder.svg' && 
    !thumbnail.includes('placeholder') &&
    thumbnail.trim() !== '';

  // Extract frame from video when thumbnail fails or is missing
  // This runs ONCE per component lifecycle when needed
  useEffect(() => {
    // Skip if: already have thumbnail, already extracted frame, already failed, no video URL
    if (hasValidThumbnail && !thumbnailError) return;
    if (extractedFrame || frameExtractionFailed) return;
    if (!videoUrl || frameExtractionAttempted.current) return;
    
    frameExtractionAttempted.current = true;
    
    const extractFrame = async () => {
      try {
        const video = document.createElement('video');
        video.muted = true;
        video.preload = 'metadata';
        video.playsInline = true;
        
        // Use proxied URL to avoid CORS canvas taint issues
        const srcUrl = needsCorsProxy(videoUrl!) ? getProxiedVideoUrl(videoUrl!) : videoUrl!;
        video.crossOrigin = 'anonymous';
        video.src = srcUrl;

        const timeoutId = setTimeout(() => {
          if (!extractedFrame) {
            setFrameExtractionFailed(true);
          }
        }, 8000); // 8 second timeout

        video.onloadeddata = () => {
          // Seek to 1 second for a better frame (skip black intro)
          video.currentTime = Math.min(1, video.duration * 0.1);
        };

        video.onseeked = () => {
          clearTimeout(timeoutId);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 360;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              // Validate frame is not empty/black
              if (dataUrl.length > 1000) {
                setExtractedFrame(dataUrl);
              } else {
                setFrameExtractionFailed(true);
              }
            }
          } catch (e) {
            console.warn('[VideoThumbnail] Frame extraction canvas error:', e);
            setFrameExtractionFailed(true);
          }
        };

        video.onerror = () => {
          clearTimeout(timeoutId);
          console.warn('[VideoThumbnail] Video load failed for frame extraction');
          setFrameExtractionFailed(true);
        };
      } catch (e) {
        console.warn('[VideoThumbnail] Frame extraction error:', e);
        setFrameExtractionFailed(true);
      }
    };

    extractFrame();
  }, [thumbnailError, videoUrl, extractedFrame, frameExtractionFailed, hasValidThumbnail]);

  // Muted autoplay on hover - with graceful fallback
  const attemptPlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    
    try {
      // Ensure video is ready
      v.muted = true;
      v.playsInline = true;
      
      // Only attempt play if video has loaded enough
      if (v.readyState >= 2) {
        await v.play();
        setIsVideoReady(true);
        setVideoPlayFailed(false);
      } else {
        // Wait for canplay event
        v.oncanplay = async () => {
          try {
            await v.play();
            setIsVideoReady(true);
            setVideoPlayFailed(false);
          } catch (err) {
            console.warn('[VideoThumbnail] Deferred play failed:', err);
            setVideoPlayFailed(true);
          }
        };
      }
    } catch (err) {
      // Autoplay failed - likely browser policy (shouldn't happen with muted)
      console.warn('[VideoThumbnail] Autoplay blocked:', err);
      setVideoPlayFailed(true);
    }
  }, [videoUrl]);

  // Handle hover state changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    
    if (isHovered && videoUrl && !videoPlayFailed) {
      attemptPlay();
    } else {
      v.pause();
      v.currentTime = 0;
      setIsVideoReady(false);
    }
  }, [isHovered, videoUrl, attemptPlay, videoPlayFailed]);

  // Reset play failure state when video URL changes
  useEffect(() => {
    setVideoPlayFailed(false);
  }, [videoUrl]);

  // Determine what to show as the poster
  const effectivePoster = extractedFrame || (hasValidThumbnail && !thumbnailError ? thumbnail : null);
  const showPlaceholder = !effectivePoster;
  // Only show watermark when we have actual video content visible (not on placeholder)
  const showWatermark = !showPlaceholder || (isHovered && isVideoReady);

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      onMouseEnter={() => videoUrl && setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsVideoReady(false); }}
    >
      {/* Loading skeleton before visible */}
      {!isVisible && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {isVisible && (
        <>
          {/* 
            VIDEO ELEMENT - Always render when videoUrl exists
            Acts as base layer: shows first frame via #t=0.1 even when thumbnail is missing/blank.
            On hover, plays the video at full opacity.
          */}
          {videoUrl && (
            <video
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                isHovered && isVideoReady 
                  ? 'opacity-100 z-10' 
                  : showPlaceholder 
                    ? 'opacity-100 z-[1]'  // Visible as fallback when no thumbnail
                    : 'opacity-0 z-10'
              }`}
              muted
              loop
              playsInline
              preload="metadata"
              poster={effectivePoster || undefined}
              onCanPlay={() => {
                if (isHovered) setIsVideoReady(true);
              }}
              onError={(e) => {
                console.warn('[VideoThumbnail] Video playback error:', e);
                setVideoPlayFailed(true);
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Primary MP4 source - append #t=0.1 to force first frame display as poster */}
              <source 
                src={`${videoUrl}${videoUrl.includes('#') ? '' : '#t=0.1'}`} 
                type="video/mp4" 
              />
            </video>
          )}
          
          {/* Primary thumbnail image - rendered on top of video base layer */}
          {effectivePoster && (
            <img
              src={effectivePoster}
              alt={title}
              crossOrigin="anonymous"
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
              className={`relative z-[2] w-full h-full object-cover transition-opacity duration-200 ${
                isHovered && isVideoReady && videoUrl ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={(e) => {
                if (!validateThumbnailBrightness(e.currentTarget)) {
                  setThumbnailError(true);
                }
              }}
              onError={() => {
                if (effectivePoster === thumbnail) {
                  setThumbnailError(true);
                }
              }}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
          )}

          {/* Styled placeholder fallback - shown when no poster AND no video URL */}
          {showPlaceholder && !videoUrl && (
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
                  Vidéo
                </span>
              </div>
            </div>
          )}
          
          {/* Large watermark overlay - only when video content is visible */}
          {showWatermark && (
            <div className="pointer-events-none">
              <VideoWatermark size="thumbnail" />
            </div>
          )}
          
          {/* Video badge indicator */}
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium z-30">
            Vidéo
          </div>
        </>
      )}
    </div>
  );
});

WatermarkedVideoThumbnail.displayName = 'WatermarkedVideoThumbnail';
