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
 */
export const WatermarkedVideoThumbnail: React.FC<WatermarkedVideoThumbnailProps> = ({
  thumbnail,
  title,
  videoUrl,
  className = "w-full h-full"
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Check if thumbnail is missing or is placeholder
  const hasValidThumbnail = thumbnail && 
    thumbnail !== '/placeholder.svg' && 
    !thumbnail.includes('placeholder');

  const shouldUseCrossOrigin = React.useMemo(() => {
    if (!videoUrl) return false;
    try {
      const host = new URL(videoUrl).hostname;
      // Only use CORS for Supabase-hosted assets; omit for external CDN to avoid blocked requests
      return host.includes('supabase.co');
    } catch {
      return false;
    }
  }, [videoUrl]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isHovered && videoUrl) {
      console.log('[HoverPreview] mouseenter, trying to play', { src: videoUrl });
      v.muted = true;
      const playPromise = v.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            console.log('[HoverPreview] play() resolved');
            setIsVideoReady(true);
          })
            .catch((err) => {
              console.warn('[HoverPreview] play() failed', err);
              setIsVideoReady(false);
              setPlayError(err instanceof Error ? err.message : 'play_failed');
            });
      }
    } else {
      try { v.pause(); } catch {}
      try { v.currentTime = 0; } catch {}
      console.log('[HoverPreview] mouseleave, paused and reset');
      setIsVideoReady(false);
      setPlayError(null);
    }
  }, [isHovered, videoUrl]);

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => videoUrl && setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsVideoReady(false); setPlayError(null); }}
    >
      {/* Video preview on hover */}
      {isHovered && videoUrl && (
        <video
          key={videoUrl}
          ref={videoRef}
          className={`absolute inset-0 z-10 w-full h-full object-cover transition-opacity duration-200 ${
            isVideoReady ? 'opacity-100' : 'opacity-0'
          }`}
          src={videoUrl}
          poster={thumbnail}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          crossOrigin={shouldUseCrossOrigin ? 'anonymous' : undefined}
          onLoadedData={() => { console.log('[HoverPreview] loadeddata'); setIsVideoReady(true); }}
          onLoadedMetadata={() => {
            console.log('[HoverPreview] loadedmetadata');
            try { if (videoRef.current && videoRef.current.currentTime === 0) videoRef.current.currentTime = 0.05; } catch {}
          }}
          onCanPlay={() => { console.log('[HoverPreview] canplay'); setIsVideoReady(true); }}
          onPlay={() => console.log('[HoverPreview] playing')}
          onError={(e) => { console.error('[HoverPreview] video error', e); setIsVideoReady(false); setPlayError('video_error'); }}
        />
      )}
      
      {/* Thumbnail image or video icon fallback */}
      {hasValidThumbnail ? (
        <img
          src={thumbnail}
          alt={title}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isHovered && isVideoReady && videoUrl ? 'opacity-0' : 'opacity-100'
          }`}
          onError={(e) => {
            // Replace with video icon on error
            const parent = e.currentTarget.parentElement;
            if (parent) {
              e.currentTarget.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.className = 'w-full h-full bg-gradient-to-br from-stock-blue/10 to-stock-blue/20 flex items-center justify-center';
              fallback.innerHTML = '<div class="text-center"><svg class="h-12 w-12 mx-auto mb-2 text-stock-blue/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg><span class="text-xs text-stock-dark/70 font-medium">Vidéo</span></div>';
              parent.insertBefore(fallback, e.currentTarget);
            }
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
      
      {/* Fallback CTA when autoplay fails */}
      {playError && videoUrl && (
        <button
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 text-white text-xs font-medium"
          onClick={(e) => {
            e.stopPropagation();
            setPlayError(null);
            const v = videoRef.current;
            if (v) {
              v.muted = true;
              v.play().then(() => setIsVideoReady(true)).catch((err) => {
                console.warn('[HoverPreview] manual play failed', err);
                setPlayError('play_failed');
              });
            }
          }}
          aria-label="Lancer l’aperçu vidéo"
        >
          Cliquer pour lancer l’aperçu
        </button>
      )}
      
      {/* Video play indicator */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
        Vidéo
      </div>
    </div>
  );
};