import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2, AlertCircle, RotateCcw, Music } from 'lucide-react';
import { Button } from './ui/button';
import { detectDevice, getMediaPlayerConfig, getOptimalMediaFormats } from '@/utils/deviceDetection';
import { useAudioWatermark } from '@/hooks/useAudioWatermark';

interface UniversalAudioPlayerProps {
  src?: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  muted?: boolean;
  poster?: string;
  compact?: boolean;
}

/**
 * Universal Audio Player
 * Optimized for both desktop and mobile with device-specific enhancements
 */
export const UniversalAudioPlayer: React.FC<UniversalAudioPlayerProps> = ({ 
  src, 
  title = "Audio",
  className = "w-full h-full",
  autoPlay = false,
  controls = true,
  muted = false,
  poster,
  compact = false
}) => {
  // Device detection
  const deviceInfo = detectDevice();
  const playerConfig = getMediaPlayerConfig(deviceInfo);
  const optimalFormats = getOptimalMediaFormats(deviceInfo);
  
  // Player state
  const [audioError, setAudioError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [canPlay, setCanPlay] = useState(false);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Hook pour le watermark audio
  useAudioWatermark({
    isPlaying,
    mainVolume: volume,
    isMuted
  });

  /**
   * Smart audio loading with device-specific optimizations
   */
  const loadAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    console.log(`🎵 [${deviceInfo.isMobile ? 'Mobile' : 'Desktop'}] Loading audio:`, src, `(Attempt ${retryCount + 1})`);
    setIsLoading(true);
    setAudioError(false);
    setCanPlay(false);

    try {
      // Smart URL selection based on device and retry count
      let audioSrc = src;
      
      // Add timestamp to force cache bypass on retries
      if (retryCount > 0) {
        const separator = audioSrc.includes('?') ? '&' : '?';
        audioSrc = `${audioSrc}${separator}_t=${Date.now()}`;
        console.log('🔄 Adding cache-busting timestamp to audio URL');
      }
      
      if (deviceInfo.isMobile && retryCount > 0 && (src as any).public_preview_url) {
        audioSrc = (src as any).public_preview_url;
        setFallbackUsed(true);
        console.log('📱 Using mobile audio fallback URL:', audioSrc);
      }

      // Device-specific loading strategy
      if (deviceInfo.isMobile) {
        // Mobile: Direct source assignment for better compatibility
        audio.src = audioSrc;
        audio.load();
      } else {
        // Desktop: Full reload for consistency
        audio.pause();
        audio.src = '';
        audio.load();
        audio.src = audioSrc;
        audio.load();
      }
      
      // Event handlers
      const handleCanPlay = () => {
        console.log(`✅ Audio ready: ${audioSrc}`);
        setIsLoading(false);
        setCanPlay(true);
        setAudioError(false);
      };

      const handleError = (e: Event) => {
        const target = e.target as HTMLAudioElement;
        const error = target.error;
        
        console.error(`❌ Audio error [${deviceInfo.isMobile ? 'Mobile' : 'Desktop'}]:`, {
          code: error?.code,
          message: error?.message,
          src: audioSrc,
          networkState: target.networkState,
          readyState: target.readyState,
          retryCount,
          fallbackUsed
        });
        
        setIsLoading(false);
        setCanPlay(false);
        
        // Smart retry logic
        if (retryCount < playerConfig.retryAttempts) {
          console.log(`🔄 Retrying audio (${retryCount + 1}/${playerConfig.retryAttempts}) in ${playerConfig.retryDelay}ms...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, playerConfig.retryDelay);
        } else {
          console.error('💥 All audio retry attempts failed');
          setAudioError(true);
        }
      };

      const handleLoadedMetadata = () => {
        console.log(`📊 Audio metadata loaded:`, {
          duration: audio.duration,
          device: deviceInfo.isMobile ? 'Mobile' : 'Desktop'
        });
        setDuration(audio.duration);
      };

      const handleProgress = () => {
        if (audio.buffered.length > 0) {
          const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
          const bufferedPercent = (bufferedEnd / audio.duration) * 100;
          setBuffered(bufferedPercent);
        }
      };

      // Attach event listeners
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleError);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('progress', handleProgress);

      // Cleanup function
      return () => {
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('progress', handleProgress);
      };
    } catch (error) {
      console.error('💥 Exception during audio load:', error);
      setIsLoading(false);
      setAudioError(true);
    }
  }, [src, retryCount, deviceInfo, playerConfig]);

  // Audio loading effect
  useEffect(() => {
    if (src) {
      loadAudio();
    }
  }, [src, loadAudio]);

  // Standard audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleVolumeChange = () => {
      setIsMuted(audio.muted);
      setVolume(audio.volume);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('volumechange', handleVolumeChange);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('volumechange', handleVolumeChange);
    };
  }, []);

  /**
   * Smart play/pause with device-aware user interaction handling
   */
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !canPlay) return;

    setHasUserInteracted(true);
    
    try {
      if (isPlaying) {
        await audio.pause();
      } else {
        // Device-specific play strategy
        if (audio.readyState >= 2) {
          await audio.play();
        } else {
          // Wait for audio to be ready
          const playWhenReady = async () => {
            try {
              await audio.play();
            } catch (error) {
              console.warn('⚠️ Audio play failed after canplay:', error);
            }
          };
          audio.addEventListener('canplay', playWhenReady, { once: true });
        }
      }
    } catch (error) {
      console.error('🚫 Audio playback toggle failed:', error);
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          console.warn('🔒 Autoplay blocked - user interaction required');
        } else if (error.name === 'NotSupportedError') {
          console.error('❌ Audio format not supported');
          setAudioError(true);
        }
      }
    }
  }, [isPlaying, canPlay]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = newVolume;
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted && newVolume > 0) {
      audio.muted = false;
      setIsMuted(false);
    }
  }, [isMuted]);

  /**
   * Enhanced seek handling with device-specific touch optimization
   */
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration || !canPlay) return;

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
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration, canPlay]);

  const formatTime = useCallback((time: number) => {
    if (!isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setAudioError(false);
    setFallbackUsed(false);
    setIsLoading(true);
    loadAudio();
  }, [loadAudio]);

  // No source provided
  if (!src) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center relative overflow-hidden rounded-lg border border-border min-h-[120px]`}>
        <div className="text-center p-6">
          <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <Music className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">
            Audio en cours de traitement...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (audioError) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center relative overflow-hidden rounded-lg border border-border min-h-[120px]`}>
        <div className="text-center p-6">
          <div className="w-12 h-12 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-destructive font-medium mb-1">Playback error</p>
          <p className="text-muted-foreground text-sm mb-4">
            Unable to play this audio file
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

  // Main audio player
  return (
    <div className={`${className} relative bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-border overflow-hidden ${compact ? 'min-h-[80px]' : 'min-h-[140px]'}`}>
      <audio 
        ref={audioRef}
        preload={playerConfig.preloadStrategy}
        autoPlay={hasUserInteracted && autoPlay && canPlay && playerConfig.autoplayAllowed}
        muted={isMuted}
        crossOrigin="anonymous"
        webkit-playsinline={deviceInfo.isMobile ? "true" : undefined}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '1px',
          height: '1px'
        }}
      >
        {/* Progressive source loading based on device capability */}
        {optimalFormats.audio.map((format, index) => (
          <source key={index} src={src} type={format} />
        ))}
        Your browser does not support audio playback.
      </audio>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-primary text-sm">
              {fallbackUsed ? 'Loading fallback URL...' : 'Loading...'}
            </p>
          </div>
        </div>
      )}

      {/* Player interface */}
      {canPlay && (
        <div className={`relative z-10 ${compact ? 'p-2 flex items-center' : 'p-4 h-full flex flex-col justify-center'}`}>
          {/* Compact layout */}
          {compact ? (
            <div className="flex items-center w-full gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className={`text-foreground hover:bg-primary/10 ${
                  deviceInfo.touchCapable ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'
                } p-0 rounded-full flex-shrink-0`}
                disabled={!canPlay}
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
              >
                {isPlaying ? (
                  <Pause className={deviceInfo.touchCapable ? "h-5 w-5" : "h-4 w-4"} />
                ) : (
                  <Play className={`${deviceInfo.touchCapable ? "h-5 w-5" : "h-4 w-4"} ml-0.5`} />
                )}
              </Button>
              
              <div className="flex-1 min-w-0">
                {title && <p className="text-sm font-medium truncate">{title}</p>}
                <div 
                  className={`w-full bg-muted/80 rounded-full cursor-pointer ${
                    deviceInfo.touchCapable ? 'h-2 touch-manipulation' : 'h-1'
                  } mt-1`}
                  onClick={handleSeek}
                  onTouchEnd={deviceInfo.touchCapable ? handleSeek : undefined}
                >
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-200"
                    style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                  />
                </div>
              </div>
              
              <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                {formatTime(currentTime)}
              </span>
            </div>
          ) : (
            <>
              {/* Full layout */}
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <Music className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">{title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <div 
                  className={`w-full bg-muted/80 rounded-full cursor-pointer ${
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

              {controls && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size={deviceInfo.touchCapable ? "default" : "sm"}
                    onClick={togglePlay}
                    className={`text-foreground hover:bg-primary/10 ${
                      deviceInfo.touchCapable ? 'h-12 w-12 touch-manipulation' : 'h-10 w-10'
                    } p-0 rounded-full`}
                    disabled={!canPlay}
                    aria-label={isPlaying ? "Pause audio" : "Play audio"}
                  >
                    {isPlaying ? (
                      <Pause className={deviceInfo.touchCapable ? "h-6 w-6" : "h-5 w-5"} />
                    ) : (
                      <Play className={`${deviceInfo.touchCapable ? "h-6 w-6" : "h-5 w-5"} ml-0.5`} />
                    )}
                  </Button>
                  
                  {/* Volume control - hidden on iOS due to system limitations */}
                  {!deviceInfo.isIOS && (
                    <Button
                      variant="ghost"
                      size={deviceInfo.touchCapable ? "default" : "sm"}
                      onClick={toggleMute}
                      className={`text-foreground hover:bg-primary/10 ${
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
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};