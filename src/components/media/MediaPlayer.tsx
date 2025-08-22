import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

interface MediaPlayerProps {
  src?: string;
  type: 'video' | 'audio';
  title?: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  muted?: boolean;
  compact?: boolean;
}

/**
 * Universal Media Player - Works on all devices
 * Device-aware optimizations for both desktop and mobile
 */
export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  src,
  type,
  title = "Media",
  poster,
  className = "w-full",
  autoPlay = false,
  controls = true,
  muted = false,
  compact = false
}) => {
  const deviceInfo = useDeviceDetection();
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [canPlay, setCanPlay] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  /**
   * Device-specific media loading with MIME type validation
   */
  const loadMedia = useCallback(async () => {
    const media = mediaRef.current;
    if (!media || !src) return;

    console.log(`🎵 [${deviceInfo.isMobile ? 'Mobile' : 'Desktop'}] Loading ${type}:`, src);
    setIsLoading(true);
    setHasError(false);
    setCanPlay(false);

    try {
      // Smart URL processing with MIME type detection
      let mediaSrc = src;
      let detectedMimeType = '';

      // Extract file extension for MIME type validation
      const urlParts = src.split('?')[0].split('.');
      const extension = urlParts[urlParts.length - 1]?.toLowerCase();
      
      if (type === 'video') {
        switch (extension) {
          case 'mp4': detectedMimeType = 'video/mp4'; break;
          case 'webm': detectedMimeType = 'video/webm'; break;
          case 'ogg': detectedMimeType = 'video/ogg'; break;
          case 'mov': detectedMimeType = 'video/quicktime'; break;
          default: detectedMimeType = 'video/mp4';
        }
      } else {
        switch (extension) {
          case 'mp3': detectedMimeType = 'audio/mpeg'; break;
          case 'aac': detectedMimeType = 'audio/aac'; break;
          case 'm4a': detectedMimeType = 'audio/mp4'; break;
          case 'wav': detectedMimeType = 'audio/wav'; break;
          case 'ogg': detectedMimeType = 'audio/ogg'; break;
          case 'webm': detectedMimeType = 'audio/webm'; break;
          default: detectedMimeType = 'audio/mpeg';
        }
      }

      console.log(`📋 Detected MIME type: ${detectedMimeType} for extension: ${extension}`);

      // Device-specific loading strategy
      if (deviceInfo.isMobile) {
        // Mobile: Lightweight loading approach
        media.src = mediaSrc;
        media.load();
      } else {
        // Desktop: Full reload for consistency
        media.pause();
        media.src = '';
        media.load();
        media.src = mediaSrc;
        media.load();
      }

      // Event handlers with device-specific optimizations
      const handleCanPlay = () => {
        console.log(`✅ ${type} ready:`, mediaSrc);
        setIsLoading(false);
        setCanPlay(true);
        setHasError(false);
      };

      const handleError = (e: Event) => {
        const target = e.target as HTMLMediaElement;
        const error = target.error;
        
        console.error(`❌ ${type} error:`, {
          code: error?.code,
          message: error?.message,
          src: mediaSrc,
          mimeType: detectedMimeType,
          device: deviceInfo.isMobile ? 'Mobile' : 'Desktop',
          retryCount
        });
        
        setIsLoading(false);
        setCanPlay(false);
        
        // Smart retry with fallback logic
        if (retryCount < 3) {
          console.log(`🔄 Retrying ${type} (${retryCount + 1}/3)...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000 + (retryCount * 500));
        } else {
          console.error(`💥 All ${type} retry attempts failed`);
          setHasError(true);
        }
      };

      const handleLoadedMetadata = () => {
        console.log(`📊 ${type} metadata loaded:`, {
          duration: media.duration,
          mimeType: detectedMimeType,
          device: deviceInfo.isMobile ? 'Mobile' : 'Desktop'
        });
        setDuration(media.duration);
      };

      const handleProgress = () => {
        if (media.buffered.length > 0) {
          const bufferedEnd = media.buffered.end(media.buffered.length - 1);
          const bufferedPercent = (bufferedEnd / media.duration) * 100;
          setBuffered(bufferedPercent);
        }
      };

      // Attach event listeners
      media.addEventListener('canplay', handleCanPlay);
      media.addEventListener('error', handleError);
      media.addEventListener('loadedmetadata', handleLoadedMetadata);
      media.addEventListener('progress', handleProgress);

      return () => {
        media.removeEventListener('canplay', handleCanPlay);
        media.removeEventListener('error', handleError);
        media.removeEventListener('loadedmetadata', handleLoadedMetadata);
        media.removeEventListener('progress', handleProgress);
      };
    } catch (error) {
      console.error(`💥 Exception during ${type} load:`, error);
      setIsLoading(false);
      setHasError(true);
    }
  }, [src, type, retryCount, deviceInfo]);

  // Media loading effect
  useEffect(() => {
    if (src) {
      loadMedia();
    }
  }, [src, loadMedia]);

  // Standard media event handlers
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handleTimeUpdate = () => setCurrentTime(media.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleVolumeChange = () => {
      setIsMuted(media.muted);
      setVolume(media.volume);
    };

    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('play', handlePlay);
    media.addEventListener('pause', handlePause);
    media.addEventListener('ended', handleEnded);
    media.addEventListener('volumechange', handleVolumeChange);

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('play', handlePlay);
      media.removeEventListener('pause', handlePause);
      media.removeEventListener('ended', handleEnded);
      media.removeEventListener('volumechange', handleVolumeChange);
    };
  }, []);

  /**
   * Device-aware play/pause with mobile autoplay restrictions
   */
  const togglePlay = useCallback(async () => {
    const media = mediaRef.current;
    if (!media || !canPlay) return;

    setHasUserInteracted(true);
    
    try {
      if (isPlaying) {
        await media.pause();
      } else {
        // Respect mobile autoplay restrictions
        if (deviceInfo.isMobile && !hasUserInteracted) {
          console.warn('📱 Mobile autoplay blocked - requires user interaction');
          return;
        }
        
        if (media.readyState >= 2) {
          await media.play();
        } else {
          // Wait for media to be ready
          const playWhenReady = async () => {
            try {
              await media.play();
            } catch (error) {
              console.warn(`⚠️ ${type} play failed after canplay:`, error);
            }
          };
          media.addEventListener('canplay', playWhenReady, { once: true });
        }
      }
    } catch (error) {
      console.error(`🚫 ${type} playback toggle failed:`, error);
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          console.warn('🔒 Autoplay blocked - user interaction required');
        } else if (error.name === 'NotSupportedError') {
          console.error(`❌ ${type} format not supported`);
          setHasError(true);
        }
      }
    }
  }, [isPlaying, canPlay, deviceInfo, hasUserInteracted, type]);

  const toggleMute = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;

    media.muted = !media.muted;
    setIsMuted(media.muted);
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    const media = mediaRef.current;
    if (!media) return;

    media.volume = newVolume;
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted && newVolume > 0) {
      media.muted = false;
      setIsMuted(false);
    }
  }, [isMuted]);

  /**
   * Touch-friendly seek handling
   */
  const handleSeek = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const media = mediaRef.current;
    if (!media || !duration || !canPlay) return;

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
    
    media.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration, canPlay]);

  /**
   * Fullscreen handling for video
   */
  const toggleFullscreen = useCallback(async () => {
    if (type !== 'video') return;
    
    const media = mediaRef.current;
    if (!media) return;

    try {
      if (!isFullscreen) {
        if (media.requestFullscreen) {
          await media.requestFullscreen();
        } else if ((media as any).webkitRequestFullscreen) {
          await (media as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.warn('Fullscreen toggle failed:', error);
    }
  }, [type, isFullscreen]);

  const formatTime = useCallback((time: number) => {
    if (!isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setHasError(false);
    setIsLoading(true);
    loadMedia();
  }, [loadMedia]);

  // No source provided
  if (!src) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center rounded-lg border border-border min-h-[120px]`}>
        <div className="text-center p-6">
          <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            {type === 'video' ? (
              <Play className="h-6 w-6 text-primary" />
            ) : (
              <Volume2 className="h-6 w-6 text-primary" />
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {type === 'video' ? 'Vidéo' : 'Audio'} en cours de traitement...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center rounded-lg border border-border min-h-[120px]`}>
        <div className="text-center p-6">
          <div className="w-12 h-12 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-destructive font-medium mb-1">Erreur de lecture</p>
          <p className="text-muted-foreground text-sm mb-4">
            Impossible de lire ce fichier {type === 'video' ? 'vidéo' : 'audio'}
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  // Main player interface
  return (
    <div className={`${className} relative bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-border overflow-hidden ${compact ? 'min-h-[80px]' : type === 'video' ? 'min-h-[300px]' : 'min-h-[140px]'}`}>
      {/* Media element with device-specific attributes */}
      {type === 'video' ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          poster={poster}
          preload={deviceInfo.isMobile ? 'metadata' : 'auto'}
          autoPlay={hasUserInteracted && autoPlay && canPlay && !deviceInfo.isMobile}
          muted={isMuted}
          playsInline={deviceInfo.isMobile}
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
          style={{ display: isLoading || hasError ? 'none' : 'block' }}
        />
      ) : (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          preload={deviceInfo.isMobile ? 'metadata' : 'auto'}
          autoPlay={hasUserInteracted && autoPlay && canPlay && !deviceInfo.isMobile}
          muted={isMuted}
          crossOrigin="anonymous"
          style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
        />
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-primary text-sm">Chargement...</p>
          </div>
        </div>
      )}

      {/* Player controls overlay */}
      {canPlay && controls && (
        <div className="absolute inset-0 z-10">
          {compact ? (
            // Compact controls
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlay}
                  className={`text-white hover:bg-white/20 ${
                    deviceInfo.touchCapable ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'
                  } p-0 rounded-full flex-shrink-0`}
                  disabled={!canPlay}
                >
                  {isPlaying ? (
                    <Pause className={deviceInfo.touchCapable ? "h-5 w-5" : "h-4 w-4"} />
                  ) : (
                    <Play className={`${deviceInfo.touchCapable ? "h-5 w-5" : "h-4 w-4"} ml-0.5`} />
                  )}
                </Button>
                
                <div className="flex-1 min-w-0">
                  <div 
                    className={`w-full bg-white/30 rounded-full cursor-pointer ${
                      deviceInfo.touchCapable ? 'h-2 touch-manipulation' : 'h-1'
                    }`}
                    onClick={handleSeek}
                    onTouchEnd={deviceInfo.touchCapable ? handleSeek : undefined}
                  >
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-200"
                      style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                    />
                  </div>
                </div>
                
                <span className="text-white text-xs font-mono flex-shrink-0">
                  {formatTime(currentTime)}
                </span>
              </div>
            </div>
          ) : (
            // Full controls
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
              <div className="mb-3">
                <div 
                  className={`w-full bg-white/30 rounded-full cursor-pointer ${
                    deviceInfo.touchCapable ? 'h-2 touch-manipulation' : 'h-1'
                  }`}
                  onClick={handleSeek}
                  onTouchEnd={deviceInfo.touchCapable ? handleSeek : undefined}
                >
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-200"
                    style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size={deviceInfo.touchCapable ? "default" : "sm"}
                    onClick={togglePlay}
                    className={`text-white hover:bg-white/20 ${
                      deviceInfo.touchCapable ? 'h-12 w-12 touch-manipulation' : 'h-10 w-10'
                    } p-0 rounded-full`}
                    disabled={!canPlay}
                  >
                    {isPlaying ? (
                      <Pause className={deviceInfo.touchCapable ? "h-6 w-6" : "h-5 w-5"} />
                    ) : (
                      <Play className={`${deviceInfo.touchCapable ? "h-6 w-6" : "h-5 w-5"} ml-0.5`} />
                    )}
                  </Button>
                  
                  {/* Volume control - hidden on iOS */}
                  {!deviceInfo.isIOS && (
                    <Button
                      variant="ghost"
                      size={deviceInfo.touchCapable ? "default" : "sm"}
                      onClick={toggleMute}
                      className={`text-white hover:bg-white/20 ${
                        deviceInfo.touchCapable ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'
                      } p-0 rounded-full`}
                    >
                      {isMuted ? (
                        <VolumeX className={deviceInfo.touchCapable ? "h-5 w-5" : "h-4 w-4"} />
                      ) : (
                        <Volume2 className={deviceInfo.touchCapable ? "h-5 w-5" : "h-4 w-4"} />
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  
                  {/* Fullscreen for video */}
                  {type === 'video' && (
                    <Button
                      variant="ghost"
                      size={deviceInfo.touchCapable ? "default" : "sm"}
                      onClick={toggleFullscreen}
                      className={`text-white hover:bg-white/20 ${
                        deviceInfo.touchCapable ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'
                      } p-0 rounded-full`}
                    >
                      <Maximize className={deviceInfo.touchCapable ? "h-5 w-5" : "h-4 w-4"} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};