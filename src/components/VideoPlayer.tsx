import React, { useState } from 'react';
import { Play } from 'lucide-react';

interface VideoPlayerProps {
  src?: string;
  thumbnail?: string;
  poster?: string;
  className?: string;
  showThumbnailFirst?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  thumbnail,
  poster, 
  className = "w-full h-full object-cover",
  showThumbnailFirst = false
}) => {
  const [showVideo, setShowVideo] = useState(!showThumbnailFirst);
  const [videoError, setVideoError] = useState(false);

  // Use thumbnail as fallback poster if poster is not provided
  const effectivePoster = poster || thumbnail;

  if (!src) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center relative overflow-hidden rounded-lg`}>
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt="Aperçu vidéo" 
            className="w-full h-full object-cover"
            onError={() => setVideoError(true)}
          />
        ) : (
          <p className="text-muted-foreground">Aperçu vidéo non disponible</p>
        )}
      </div>
    );
  }

  if (showThumbnailFirst && !showVideo && thumbnail) {
    return (
      <div 
        className={`${className} relative cursor-pointer group overflow-hidden rounded-lg`}
        onClick={() => setShowVideo(true)}
      >
        <img 
          src={thumbnail}
          alt="Aperçu vidéo"
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="bg-white/90 rounded-full p-3 group-hover:bg-white transition-colors">
            <Play className="h-8 w-8 text-primary fill-current" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <video 
      controls 
      className={className}
      poster={effectivePoster}
      preload="metadata"
      onError={() => setVideoError(true)}
    >
      <source src={src} type="video/mp4" />
      <source src={src} type="video/webm" />
      <source src={src} type="video/ogg" />
      {videoError ? (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <p className="text-muted-foreground">Erreur lors du chargement de la vidéo</p>
        </div>
      ) : (
        "Votre navigateur ne supporte pas la lecture vidéo."
      )}
    </video>
  );
};