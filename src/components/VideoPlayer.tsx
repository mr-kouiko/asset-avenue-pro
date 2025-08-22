import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import watermarkLogo from '@/assets/visustock-watermark.png';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsTimer, setControlsTimer] = useState<NodeJS.Timeout | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Use thumbnail as fallback poster if poster is not provided
  const effectivePoster = poster || thumbnail;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const handleLoadStart = () => {
      console.log('Video load started:', src);
      setIsLoading(true);
    };
    const handleCanPlay = () => {
      console.log('Video can play:', src);
      setIsLoading(false);
    };
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e) => {
      console.error('Video error:', e, 'Source:', src);
      setVideoError(true);
      setIsLoading(false);
    };
    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded:', src);
      setIsLoading(false);
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    // Force reload of video source
    video.load();

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, [src]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    setHasUserInteracted(true);
    
    try {
      if (isPlaying) {
        await video.pause();
      } else {
        // For mobile browsers, especially iOS Safari
        await video.play();
      }
    } catch (error) {
      console.error('Playback failed:', error);
      // Handle autoplay restrictions on mobile
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        console.warn('Autoplay blocked - user interaction required');
      }
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Enhanced seek handling for both mouse and touch
  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    let clientX: number;
    
    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0]?.clientX || e.changedTouches[0]?.clientX || 0;
    } else {
      // Mouse event
      clientX = e.clientX;
    }
    
    const clickPosition = (clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(clickPosition * duration, duration));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        const element = containerRef.current as any;
        const video = videoRef.current as any;
        
        // Try different fullscreen methods, prioritizing video element for mobile
        if (isMobile && video?.webkitEnterFullscreen) {
          // iOS Safari specific - use video element fullscreen
          await video.webkitEnterFullscreen();
        } else if (element?.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element?.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        } else if (element?.mozRequestFullScreen) {
          await element.mozRequestFullScreen();
        } else if (element?.msRequestFullscreen) {
          await element.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  // Handle mobile control visibility
  const showControlsWithTimer = () => {
    setShowControls(true);
    if (controlsTimer) {
      clearTimeout(controlsTimer);
    }
    // Auto-hide controls after 3 seconds on mobile
    if (isMobile) {
      const timer = setTimeout(() => setShowControls(false), 3000);
      setControlsTimer(timer);
    }
  };

  const handleContainerInteraction = () => {
    if (isMobile) {
      showControlsWithTimer();
    }
  };

  if (!src) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center relative overflow-hidden rounded-lg border border-border`}>
        {thumbnail && !videoError ? (
          <div 
            className="relative w-full h-full cursor-pointer group"
            onClick={() => {
              console.log('Thumbnail clicked, trying to reload video...');
              window.location.reload(); // Force page reload to retry video loading
            }}
          >
            <img 
              src={thumbnail} 
              alt="Aperçu vidéo" 
              className="w-full h-full object-cover"
              onError={() => setVideoError(true)}
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 group-hover:bg-white group-hover:scale-110 transition-all duration-200 shadow-lg">
                <Play className="h-10 w-10 text-primary fill-current ml-1" />
              </div>
            </div>
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium">
              Appuyez pour réessayer
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
            {videoError && (
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Rafraîchir la page
              </button>
            )}
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
      ref={containerRef}
      className={`${className} relative overflow-hidden rounded-lg border border-border bg-black`}
      onMouseEnter={() => !isMobile && setShowControls(true)}
      onMouseLeave={() => !isMobile && setShowControls(false)}
      onTouchStart={handleContainerInteraction}
      onClick={handleContainerInteraction}
    >
      <video 
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={effectivePoster}
        preload="metadata"
        autoPlay={hasUserInteracted && autoPlay}
        muted={isMuted}
        playsInline={true}
        crossOrigin="anonymous"
        onError={(e) => {
          console.error('Video playback error:', e.currentTarget.error, 'Source:', src);
          setVideoError(true);
        }}
        onClick={togglePlay}
        onTouchEnd={(e) => {
          e.preventDefault();
          togglePlay();
        }}
      >
        <source src={src} type="video/mp4" />
        <source src={src} type="video/webm" />
        <source src={src} type="video/mov" />
        <source src={src} type="video/quicktime" />
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>

      {/* Watermark Overlay - Always visible, responsive sizing */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
        <img 
          src={watermarkLogo}
          alt="VisuStock"
          className="opacity-50 select-none max-w-[min(540px,80vw)] max-h-[min(540px,80vh)] w-auto h-auto"
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

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {controls && (showControls || !isPlaying || isMobile) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 md:p-4 z-30">
          {/* Progress Bar - Enhanced for touch */}
          <div 
            className={`w-full bg-white/30 rounded-full mb-3 cursor-pointer ${
              isMobile ? 'h-2 touch-manipulation' : 'h-1'
            }`}
            onClick={handleSeek}
            onTouchEnd={handleSeek}
            role="slider"
            aria-label="Video progress"
            tabIndex={0}
          >
            <div 
              className="h-full bg-primary rounded-full transition-all duration-200"
              style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
            />
          </div>

          {/* Controls - Mobile-optimized sizing */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2 md:gap-3">
              <Button
                variant="ghost"
                size={isMobile ? "default" : "sm"}
                onClick={togglePlay}
                className={`text-white hover:text-white hover:bg-white/20 ${
                  isMobile ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'
                } p-0`}
                aria-label={isPlaying ? "Pause video" : "Play video"}
              >
                {isPlaying ? (
                  <Pause className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
                ) : (
                  <Play className={`${isMobile ? "h-5 w-5" : "h-4 w-4"} ml-0.5`} />
                )}
              </Button>

              {/* Hide volume control on iOS as it's not supported */}
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white hover:text-white hover:bg-white/20 h-8 w-8 p-0"
                  aria-label={isMuted ? "Unmute video" : "Mute video"}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              )}

              <span className={`font-mono ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <Button
              variant="ghost"
              size={isMobile ? "default" : "sm"}
              onClick={toggleFullscreen}
              className={`text-white hover:text-white hover:bg-white/20 ${
                isMobile ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'
              } p-0`}
              aria-label="Toggle fullscreen"
            >
              <Maximize2 className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};