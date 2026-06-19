import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { detectDevice, getMediaPlayerConfig, getOptimalMediaFormats } from '@/utils/deviceDetection';
import { VideoWatermark } from '@/components/VideoWatermark';


interface UniversalVideoPlayerProps {
  src?: string;
  thumbnail?: string;
  poster?: string;
  className?: string;
  showThumbnailFirst?: boolean;
  autoPlay?: boolean;
  controls?: boolean;
  muted?: boolean;
  watermarkSize?: 'normal' | 'large' | 'thumbnail';
}

/**
 * Universal Video Player
 * Optimized for both desktop and mobile with device-specific enhancements
 */
export const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({ 
  src, 
  thumbnail,
  poster, 
  className = "w-full h-full object-contain",
  showThumbnailFirst = false,
  autoPlay = false,
  controls = true,
  muted = false,
  watermarkSize = 'normal'
}) => {
  // Device detection
  const deviceInfo = detectDevice();
  const playerConfig = getMediaPlayerConfig(deviceInfo);
  const optimalFormats = getOptimalMediaFormats(deviceInfo);
  
  // Player state
  const [showVideo, setShowVideo] = useState(!showThumbnailFirst);
  const [videoError, setVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(playerConfig.controlsAlwaysVisible);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsTimer, setControlsTimer] = useState<NodeJS.Timeout | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [canPlay, setCanPlay] = useState(false);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const effectivePoster = poster || thumbnail;

  /**
   * Smart video loading with device-specific optimizations
   */
  const loadVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !src) return;

    console.log(`🎬 [${deviceInfo.isMobile ? 'Mobile' : 'Desktop'}] Loading video:`, src, `(Attempt ${retryCount + 1})`);
    setIsLoading(true);
    setVideoError(false);
    setCanPlay(false);

    try {
      // Smart URL selection based on device and retry count
      let videoSrc = src;
      
      if (deviceInfo.isMobile && retryCount > 0 && (src as any).public_preview_url) {
        videoSrc = (src as any).public_preview_url;
        setFallbackUsed(true);
        console.log('📱 Using mobile fallback URL:', videoSrc);
      }

      // Device-specific loading strategy
      if (deviceInfo.isMobile) {
        // Mobile: Direct source assignment for better compatibility
        video.src = videoSrc;
        video.load();
      } else {
        // Desktop: Full reload for consistency
        video.pause();
        video.src = '';
        video.load();
        video.src = videoSrc;
        video.load();
      }

      // Event handlers
      const handleCanPlay = () => {
        console.log(`✅ Video ready: ${videoSrc}`);
        setIsLoading(false);
        setCanPlay(true);
        setVideoError(false);
      };

      const handleError = (e: Event) => {
        const target = e.target as HTMLVideoElement;
        const error = target.error;
        
        console.error(`❌ Video error [${deviceInfo.isMobile ? 'Mobile' : 'Desktop'}]:`, {
          code: error?.code,
          message: error?.message,
          src: videoSrc,
          networkState: target.networkState,
          readyState: target.readyState,
          retryCount,
          fallbackUsed
        });
        
        setIsLoading(false);
        setCanPlay(false);
        
        // Smart retry logic
        if (retryCount < playerConfig.retryAttempts) {
          console.log(`🔄 Retrying (${retryCount + 1}/${playerConfig.retryAttempts}) in ${playerConfig.retryDelay}ms...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, playerConfig.retryDelay);
        } else {
          console.error('💥 All retry attempts failed');
          setVideoError(true);
        }
      };

      const handleLoadedMetadata = () => {
        console.log(`📊 Video metadata loaded:`, {
          duration: video.duration,
          dimensions: `${video.videoWidth}x${video.videoHeight}`,
          device: deviceInfo.isMobile ? 'Mobile' : 'Desktop'
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

      // Attach event listeners
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('progress', handleProgress);

      // Cleanup function
      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('progress', handleProgress);
      };
    } catch (error) {
      console.error('💥 Exception during video load:', error);
      setIsLoading(false);
      setVideoError(true);
    }
  }, [src, retryCount, deviceInfo, playerConfig]);

  // Video loading effect
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

  /**
   * Smart play/pause with device-aware user interaction handling
   */
  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !canPlay) return;

    setHasUserInteracted(true);
    
    try {
      if (isPlaying) {
        await video.pause();
      } else {
        // Device-specific play strategy
        if (video.readyState >= 2) {
          await video.play();
        } else {
          // Wait for video to be ready
          const playWhenReady = async () => {
            try {
              await video.play();
            } catch (error) {
              console.warn('⚠️ Play failed after canplay:', error);
            }
          };
          video.addEventListener('canplay', playWhenReady, { once: true });
        }
      }
    } catch (error) {
      console.error('🚫 Playback toggle failed:', error);
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          console.warn('🔒 Autoplay blocked - user interaction required');
        } else if (error.name === 'NotSupportedError') {
          console.error('❌ Video format not supported');
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

  /**
   * Enhanced seek handling with device-specific touch optimization
   */
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

  /**
   * Device-aware fullscreen handling
   */
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!isFullscreen) {
        const element = containerRef.current as any;
        const video = videoRef.current as any;
        
        // Prioritize container fullscreen for better watermark support
        if (element?.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element?.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        } else if (element?.mozRequestFullScreen) {
          await element.mozRequestFullScreen();
        } else if (element?.msRequestFullscreen) {
          await element.msRequestFullscreen();
        } else if (deviceInfo.isIOS && video?.webkitEnterFullscreen) {
          // Fallback to native iOS fullscreen (watermark won't be visible)
          await video.webkitEnterFullscreen();
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
      console.error('💥 Fullscreen toggle failed:', error);
    }
  }, [isFullscreen, deviceInfo]);

  /**
   * Device-aware control visibility management
   */
  const showControlsWithTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer) {
      clearTimeout(controlsTimer);
    }
    if (!playerConfig.controlsAlwaysVisible) {
      const timer = setTimeout(() => setShowControls(false), playerConfig.controlsAutoHideDelay);
      setControlsTimer(timer);
    }
  }, [controlsTimer, playerConfig]);

  const handleContainerInteraction = useCallback(() => {
    if (deviceInfo.touchCapable) {
      showControlsWithTimer();
    }
  }, [deviceInfo, showControlsWithTimer]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setVideoError(false);
    setFallbackUsed(false);
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
              alt="Video preview" 
              className="w-full h-full object-contain"
              onError={() => setVideoError(true)}
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 group-hover:bg-white group-hover:scale-110 transition-all duration-200 shadow-lg">
                <Play className="h-10 w-10 text-primary fill-current ml-1" />
              </div>
            </div>
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium">
              Tap to load
            </div>
          </div>
        ) : (
          <div className="text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground">
              {videoError ? 'Unable to load video' : 'Video processing...'}
            </p>
            {videoError && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                className="mt-2"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Thumbnail first mode
  if (showThumbnailFirst && !showVideo && thumbnail && !videoError) {
    return (
      <div 
        className={`${className} relative cursor-pointer group overflow-hidden rounded-lg border border-border`}
        onClick={() => setShowVideo(true)}
      >
        <img 
          src={thumbnail}
          alt="Video preview"
          className="w-full h-full object-contain transition-transform group-hover:scale-105"
          onError={() => setVideoError(true)}
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 group-hover:bg-white group-hover:scale-110 transition-all duration-200 shadow-lg">
            <Play className="h-10 w-10 text-primary fill-current ml-1" />
          </div>
        </div>
        <div className="absolute bottom-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium">
          Video
        </div>
      </div>
    );
  }

  // Error state
  if (videoError) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center relative overflow-hidden rounded-lg border border-border`}>
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-destructive font-medium mb-1">Playback error</p>
          <p className="text-muted-foreground text-sm mb-4">
            Unable to load this video
          </p>
          {fallbackUsed && (
            <p className="text-xs text-muted-foreground mb-4">
              Fallback attempt used
            </p>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
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
      onMouseEnter={() => !deviceInfo.touchCapable && setShowControls(true)}
      onMouseLeave={() => !deviceInfo.touchCapable && !playerConfig.controlsAlwaysVisible && setShowControls(false)}
      onTouchStart={deviceInfo.touchCapable ? handleContainerInteraction : undefined}
      onClick={handleContainerInteraction}
    >
      <video 
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={effectivePoster}
        preload={playerConfig.preloadStrategy}
        autoPlay={hasUserInteracted && autoPlay && canPlay && playerConfig.autoplayAllowed}
        muted={isMuted}
        playsInline={true}
        crossOrigin="anonymous"
        webkit-playsinline={deviceInfo.isMobile ? "true" : undefined}
        x-webkit-airplay={deviceInfo.isMobile ? "allow" : undefined}
        onClick={togglePlay}
        onTouchEnd={deviceInfo.touchCapable ? (e) => {
          e.preventDefault();
          togglePlay();
        } : undefined}
      >
        {/* Progressive source loading based on device capability */}
        {optimalFormats.video.map((format, index) => (
          <source key={index} src={src} type={format} />
        ))}
        Your browser does not support video playback.
      </video>

      {/* Video Watermark - ALWAYS show for videos, even when loading */}
      {!videoError && (
        <VideoWatermark size={watermarkSize} />
      )}


      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-2" />
            <p className="text-white text-sm">
              {fallbackUsed ? 'Chargement de l\'URL de secours...' : 'Chargement...'}
            </p>
          </div>
        </div>
      )}

      {/* Device-optimized controls */}
      {controls && canPlay && (showControls || !isPlaying || playerConfig.controlsAlwaysVisible) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 md:p-4 z-30">
          {/* Progress bar */}
          <div className="w-full mb-3">
            {/* Buffer progress */}
            <div 
              className={`w-full bg-white/20 rounded-full ${deviceInfo.touchCapable ? 'h-2' : 'h-1'} mb-1`}
            >
              <div 
                className="h-full bg-white/40 rounded-full transition-all duration-200"
                style={{ width: `${buffered}%` }}
              />
            </div>
            
            {/* Playback progress */}
            <div 
              className={`w-full bg-white/30 rounded-full cursor-pointer ${
                deviceInfo.touchCapable ? 'h-2 touch-manipulation' : 'h-1'
              }`}
              onClick={handleSeek}
              onTouchEnd={deviceInfo.touchCapable ? handleSeek : undefined}
            >
              <div 
                className="h-full bg-white rounded-full transition-all duration-200"
                style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
              />
            </div>
          </div>
          
          {/* Control buttons */}
          <div className="flex items-center justify-between text-white text-sm">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size={deviceInfo.touchCapable ? "default" : "sm"}
                onClick={togglePlay}
                className={`text-white hover:bg-white/20 ${
                  deviceInfo.touchCapable ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'
                } p-0`}
                disabled={!canPlay}
              >
                {isPlaying ? (
                  <Pause className={deviceInfo.touchCapable ? "h-5 w-5" : "h-4 w-4"} />
                ) : (
                  <Play className={`${deviceInfo.touchCapable ? "h-5 w-5" : "h-4 w-4"} ml-0.5`} />
                )}
              </Button>
              
              {/* Volume control - hidden on iOS due to system restrictions */}
              {!deviceInfo.isIOS && (
                <Button
                  variant="ghost"
                  size={deviceInfo.touchCapable ? "default" : "sm"}
                  onClick={toggleMute}
                  className={`text-white hover:bg-white/20 ${
                    deviceInfo.touchCapable ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'
                  } p-0`}
                >
                  {isMuted ? (
                    <VolumeX className={deviceInfo.touchCapable ? "h-5 w-5" : "h-4 w-4"} />
                  ) : (
                    <Volume2 className={deviceInfo.touchCapable ? "h-5 w-5" : "h-4 w-4"} />
                  )}
                </Button>
              )}
              
              <span className="font-mono text-xs">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size={deviceInfo.touchCapable ? "default" : "sm"}
              onClick={toggleFullscreen}
              className={`text-white hover:bg-white/20 ${
                deviceInfo.touchCapable ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'
              } p-0`}
            >
              <Maximize2 className={deviceInfo.touchCapable ? "h-5 w-5" : "h-4 w-4"} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};