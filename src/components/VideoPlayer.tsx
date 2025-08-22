import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import watermarkLogo from '@/assets/visustock-watermark-large.png';

interface VideoPlayerProps {
  src?: string;
  thumbnail?: string;
  poster?: string;
  className?: string;
  showThumbnailFirst?: boolean;
  autoPlay?: boolean;
  controls?: boolean;
  muted?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  thumbnail,
  poster, 
  className = "w-full h-full object-cover",
  showThumbnailFirst = false,
  autoPlay = false,
  controls = true,
  muted = false
}) => {
  const [showVideo, setShowVideo] = useState(!showThumbnailFirst);
  const [videoError, setVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Use thumbnail as fallback poster if poster is not provided
  const effectivePoster = poster || thumbnail;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setVideoError(true);
      setIsLoading(false);
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    video.currentTime = clickPosition * duration;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // If no src provided but we need watermark, show placeholder with info
  if (!src || src === 'watermark-needed') {
    return (
      <div className={`${className} bg-muted flex items-center justify-center relative overflow-hidden rounded-lg border border-border`}>
        {thumbnail && !videoError ? (
          <div className="relative w-full h-full">
            <img 
              src={thumbnail} 
              alt="Aperçu vidéo" 
              className="w-full h-full object-cover"
              onError={() => setVideoError(true)}
            />
            {/* Watermark overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <img 
                src={watermarkLogo}
                alt="VisuStock"
                className="w-[280px] h-[280px] opacity-60 select-none"
                draggable={false}
                style={{ 
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}
              />
            </div>
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded text-sm font-medium">
              Aperçu avec watermark • VisuStock
            </div>
          </div>
        ) : (
          <div className="text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground">
              {videoError ? 'Impossible de charger la vidéo' : 'Vidéo en cours de traitement...'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Les achats incluent la version sans watermark
            </p>
          </div>
        )}
      </div>
    );
  }

  if (showThumbnailFirst && !showVideo && thumbnail && !videoError) {
    return (
      <div 
        className={`${className} relative cursor-pointer group overflow-hidden rounded-lg border border-border`}
        onClick={() => setShowVideo(true)}
      >
        <img 
          src={thumbnail}
          alt="Aperçu vidéo"
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          onError={() => setVideoError(true)}
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 group-hover:bg-white group-hover:scale-110 transition-all duration-200 shadow-lg">
            <Play className="h-10 w-10 text-primary fill-current ml-1" />
          </div>
        </div>
        <div className="absolute bottom-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium">
          Vidéo
        </div>
      </div>
    );
  }

  if (videoError) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center relative overflow-hidden rounded-lg border border-border`}>
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
            <Play className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-destructive font-medium mb-1">Erreur de lecture</p>
          <p className="text-muted-foreground text-sm">
            Impossible de charger cette vidéo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${className} relative overflow-hidden rounded-lg border border-border bg-black`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video 
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={effectivePoster}
        preload="metadata"
        autoPlay={autoPlay}
        muted={isMuted}
        onError={() => setVideoError(true)}
        onClick={togglePlay}
      >
        <source src={src} type="video/mp4" />
        <source src={src} type="video/webm" />
        <source src={src} type="video/mov" />
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>

      {/* Watermark overlay for preview videos */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <img 
          src={watermarkLogo}
          alt="VisuStock"
          className="w-[280px] h-[280px] opacity-50 select-none"
          draggable={false}
          style={{ 
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
          onError={(e) => {
            console.error('Watermark failed to load:', e);
          }}
        />
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {controls && (showControls || !isPlaying) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-30">
          {/* Progress Bar */}
          <div 
            className="w-full h-1 bg-white/30 rounded-full mb-3 cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-primary rounded-full transition-all duration-200"
              style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>

              <span className="text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => videoRef.current?.requestFullscreen()}
              className="text-white hover:text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};