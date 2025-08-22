import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
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
  const [retryCount, setRetryCount] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [canPlay, setCanPlay] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Use thumbnail as fallback poster if poster is not provided
  const effectivePoster = poster || thumbnail;

  // Mobile-optimized video loading with retry logic and URL fallback
  const loadVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !src) return;

    console.log('📹 Loading video:', src, 'Attempt:', retryCount + 1);
    setIsLoading(true);
    setVideoError(false);
    setCanPlay(false);

    try {
      // Try to use fallback URL if main URL fails and we have it available
      let videoSrc = src;
      if (retryCount > 0 && (src as any).public_preview_url) {
        videoSrc = (src as any).public_preview_url;
        console.log('🔄 Using fallback public URL:', videoSrc);
      }

      // Clear existing sources and set new source
      video.src = videoSrc;
      video.load();
      
      // Set up event listeners for this load attempt
      const handleCanPlay = () => {
        console.log('Video can play:', src);
        setIsLoading(false);
        setCanPlay(true);
        setVideoError(false);
      };

      const handleError = (e: Event) => {
        const target = e.target as HTMLVideoElement;
        const error = target.error;
        console.error('❌ Video load error:', {
          code: error?.code,
          message: error?.message,
          src: videoSrc,
          originalSrc: src,
          networkState: target.networkState,
          readyState: target.readyState,
          retryCount: retryCount
        });
        
        setIsLoading(false);
        setCanPlay(false);
        
        // Try fallback URL or retry
        if (retryCount < 3) {
          console.log('🔄 Retrying video load in 1 second...');
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000);
        } else {
          console.error('💥 All video load attempts failed');
          setVideoError(true);
        }
      };

      const handleLoadedMetadata = () => {
        console.log('Video metadata loaded:', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        });
        setDuration(video.duration);
      };

      const handleProgress = () => {
        if (video.buffered.length > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1);
          const bufferedPercent = (bufferedEnd / video.duration) * 100;
          setBuffered(bufferedPercent);
        }
      };

      // Add event listeners
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('progress', handleProgress);

      // Trigger load
      video.load();

      // Cleanup function
      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('progress', handleProgress);
      };
    } catch (error) {
      console.error('Exception during video load:', error);
      setIsLoading(false);
      setVideoError(true);
    }
  }, [src, retryCount]);

  // Effect to handle video loading and retry logic
  useEffect(() => {
    if (src && showVideo) {
      loadVideo();
    }
  }, [src, showVideo, loadVideo]);

  // Standard video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Fullscreen event handlers
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

  // Mobile-optimized play/pause with user interaction handling
  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !canPlay) return;

    setHasUserInteracted(true);
    
    try {
      if (isPlaying) {
        await video.pause();
      } else {
        // Ensure video is ready before playing
        if (video.readyState >= 2) {
          await video.play();
        } else {
          // Wait for video to be ready
          video.addEventListener('canplay', async () => {
            try {
              await video.play();
            } catch (error) {
              console.warn('Play failed after canplay:', error);
            }
          }, { once: true });
        }
      }
    } catch (error) {
      console.error('Playback toggle failed:', error);
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          console.warn('Autoplay blocked - user interaction required');
        } else if (error.name === 'NotSupportedError') {
          console.error('Video format not supported');
          setVideoError(true);
        }
      }
    }
  }, [isPlaying, canPlay]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  // Enhanced seek handling for mobile with better touch support
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration || !canPlay) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    let clientX: number;
    
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX || e.changedTouches[0]?.clientX || 0;
    } else {
      clientX = e.clientX;
    }
    
    const clickPosition = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = clickPosition * duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration, canPlay]);

  const formatTime = useCallback((time: number) => {
    if (!isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Enhanced fullscreen with mobile support
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!isFullscreen) {
        const element = containerRef.current as any;
        const video = videoRef.current as any;
        
        // iOS Safari specific - use video element fullscreen
        if (isMobile && video?.webkitEnterFullscreen) {
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
  }, [isFullscreen, isMobile]);

  // Mobile control visibility with auto-hide
  const showControlsWithTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer) {
      clearTimeout(controlsTimer);
    }
    if (isMobile) {
      const timer = setTimeout(() => setShowControls(false), 3000);
      setControlsTimer(timer);
    }
  }, [controlsTimer, isMobile]);

  const handleContainerInteraction = useCallback(() => {
    if (isMobile) {
      showControlsWithTimer();
    }
  }, [isMobile, showControlsWithTimer]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setVideoError(false);
    setIsLoading(true);
    loadVideo();
  }, [loadVideo]);

  // No source provided
  if (!src) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center relative overflow-hidden rounded-lg border border-border`}>
        {thumbnail && !videoError ? (
          <div 
            className="relative w-full h-full cursor-pointer group"
            onClick={handleRetry}
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
              Appuyez pour charger
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                className="mt-2"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Show thumbnail first mode
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

  // Video error state
  if (videoError) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center relative overflow-hidden rounded-lg border border-border`}>
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-destructive font-medium mb-1">Erreur de lecture</p>
          <p className="text-muted-foreground text-sm mb-4">
            Impossible de charger cette vidéo
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  // Main video player
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
        autoPlay={hasUserInteracted && autoPlay && canPlay}
        muted={isMuted}
        playsInline={true}
        crossOrigin="anonymous"
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        onClick={togglePlay}
        onTouchEnd={(e) => {
          e.preventDefault();
          togglePlay();
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      >
        {/* Multiple source formats for maximum compatibility */}
        <source src={src} type="video/mp4; codecs=avc1.42E01E,mp4a.40.2" />
        <source src={src} type="video/webm; codecs=vp8,vorbis" />
        <source src={src} type="video/quicktime" />
        <source src={src} type="video/ogg; codecs=theora,vorbis" />
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>

      {/* Watermark Overlay */}
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
        />
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-2" />
            <p className="text-white text-sm">Chargement...</p>
          </div>
        </div>
      )}

      {/* Controls */}
      {controls && canPlay && (showControls || !isPlaying || isMobile) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 md:p-4 z-30">
          {/* Progress Bar */}
          <div className="w-full mb-3">
            {/* Buffer Progress */}
            <div 
              className={`w-full bg-white/20 rounded-full ${isMobile ? 'h-2' : 'h-1'} mb-1`}
            >
              <div 
                className="h-full bg-white/40 rounded-full transition-all duration-200"
                style={{ width: `${buffered}%` }}
              />
            </div>
            
            {/* Playback Progress */}
            <div 
              className={`w-full bg-white/30 rounded-full cursor-pointer ${
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
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2 md:gap-3">
              <Button
                variant="ghost"
                size={isMobile ? "default" : "sm"}
                onClick={togglePlay}
                className={`text-white hover:text-white hover:bg-white/20 ${
                  isMobile ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'
                } p-0`}
                disabled={!canPlay}
                aria-label={isPlaying ? "Pause video" : "Play video"}
              >
                {isPlaying ? (
                  <Pause className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
                ) : (
                  <Play className={`${isMobile ? "h-5 w-5" : "h-4 w-4"} ml-0.5`} />
                )}
              </Button>

              {/* Volume control (hidden on iOS) */}
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