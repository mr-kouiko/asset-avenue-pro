import React from 'react';

interface VideoPlayerProps {
  src?: string;
  poster?: string;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  poster, 
  className = "w-full h-full object-cover" 
}) => {
  if (!src) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <p className="text-muted-foreground">Aperçu vidéo non disponible</p>
      </div>
    );
  }

  return (
    <video 
      controls 
      className={className}
      poster={poster}
      preload="metadata"
    >
      <source src={src} type="video/mp4" />
      <source src={src} type="video/webm" />
      <source src={src} type="video/ogg" />
      Votre navigateur ne supporte pas la lecture vidéo.
    </video>
  );
};