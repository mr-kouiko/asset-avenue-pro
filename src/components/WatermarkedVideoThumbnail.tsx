import React from 'react';
import { Film } from 'lucide-react';
import { VideoWatermark } from './VideoWatermark';

interface WatermarkedVideoThumbnailProps {
  thumbnail: string;
  title: string;
  className?: string;
}

/**
 * Static watermarked thumbnail for video previews in listings
 * Always shows a large watermark over the thumbnail image
 */
export const WatermarkedVideoThumbnail: React.FC<WatermarkedVideoThumbnailProps> = ({
  thumbnail,
  title,
  className = "w-full h-full"
}) => {
  return (
    <div className={`relative ${className}`}>
      {/* Thumbnail image or fallback */}
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = '/placeholder.svg';
          }}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-stock-blue/10 to-stock-blue/20 flex items-center justify-center">
          <div className="text-center">
            <Film className="h-12 w-12 mx-auto mb-2 text-stock-blue/60" />
            <span className="text-xs text-stock-dark/70 font-medium">Vidéo</span>
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