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
 * Always shows a large watermark over the thumbnail image
 */
export const WatermarkedVideoThumbnail: React.FC<WatermarkedVideoThumbnailProps> = ({
  thumbnail,
  title,
  videoUrl,
  className = "w-full h-full"
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Check if thumbnail is missing or is placeholder
  const hasValidThumbnail = thumbnail && 
    thumbnail !== '/placeholder.svg' && 
    !thumbnail.includes('placeholder');

  // Handle hover start - load and play video
  useEffect(() => {
    if (isHovered && videoUrl && videoRef.current) {
      const video = videoRef.current;
      
      // Load the video
      video.load();
      
      // Play when ready
      const playVideo = () => {
        video.play().catch(err => {
          console.log('Video autoplay prevented:', err);
        });
        setIsVideoReady(true);
      };
      
      video.addEventListener('loadeddata', playVideo);
      
      return () => {
        video.removeEventListener('loadeddata', playVideo);
      };
    } else if (!isHovered && videoRef.current) {
      // Stop and unload video when hover ends
      const video = videoRef.current;
      video.pause();
      video.currentTime = 0;
      video.removeAttribute('src');
      video.load();
      setIsVideoReady(false);
    }
  }, [isHovered, videoUrl]);

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => videoUrl && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video preview on hover */}
      {videoUrl && (
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isHovered && isVideoReady ? 'opacity-100' : 'opacity-0'
          }`}
          muted
          loop
          playsInline
          preload="none"
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}
      
      {/* Thumbnail image or video icon fallback */}
      {hasValidThumbnail ? (
        <img
          src={thumbnail}
          alt={title}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
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
      <VideoWatermark size="thumbnail" />
      
      {/* Video play indicator */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
        Vidéo
      </div>
    </div>
  );
};