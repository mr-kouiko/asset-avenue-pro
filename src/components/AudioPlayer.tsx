import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2, AlertCircle, RotateCcw, Music } from 'lucide-react';
import { Button } from './ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAudioWatermark } from '@/hooks/useAudioWatermark';

interface AudioPlayerProps {
  src?: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  muted?: boolean;
  poster?: string;
  compact?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  src, 
  title = "Audio",
  className = "w-full h-full",
  autoPlay = false,
  controls = true,
  muted = false,
  poster,
  compact = false
}) => {
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
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const isMobile = useIsMobile();

  // Hook pour le watermark audio
  useAudioWatermark({
    isPlaying,
    mainVolume: volume,
    isMuted
  });

  // Device-aware audio loading with smart retry logic  
  const loadAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    console.log('🎵 Loading audio:', src, 'Attempt:', retryCount + 1, 'Mobile:', isMobile);
    setIsLoading(true);
    setAudioError(false);
    setCanPlay(false);

    try {
      // Use fallback URL only on mobile devices after first attempt
      let audioSrc = src;
      if (isMobile && retryCount > 0 && (src as any).public_preview_url) {
        audioSrc = (src as any).public_preview_url;
        console.log('📱 Mobile audio fallback URL:', audioSrc);
      }

      // Different loading strategy for mobile vs desktop
      if (isMobile) {
        // Mobile: Direct src assignment
        audio.src = audioSrc;
        audio.load();
      } else {
        // Desktop: Full reload
        audio.pause();
        audio.src = '';
        audio.load();
        audio.src = audioSrc;
        audio.load();
      }
      
      const handleCanPlay = () => {
        console.log('✅ Audio can play:', src);
        setIsLoading(false);
        setCanPlay(true);
        setAudioError(false);
      };

      const handleError = (e: Event) => {
        const target = e.target as HTMLAudioElement;
        const error = target.error;
        console.error('❌ Audio load error:', {
          code: error?.code,
          message: error?.message,
          src: audioSrc,
          originalSrc: src,
          networkState: target.networkState,
          readyState: target.readyState,
          retryCount: retryCount,
          isMobile: isMobile
        });
        
        setIsLoading(false);
        setCanPlay(false);
        
        // Smart retry logic - different for mobile vs desktop
        const maxRetries = isMobile ? 3 : 2;
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying audio load (${retryCount + 1}/${maxRetries})...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, isMobile ? 1500 : 1000); // Longer delay on mobile
        } else {
          console.error('💥 All audio load attempts failed');
          setAudioError(true);
        }
      };

      const handleLoadedMetadata = () => {
        console.log('📊 Audio metadata loaded:', {
          duration: audio.duration,
          src: src
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

      // Add event listeners
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleError);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('progress', handleProgress);

      // Trigger load
      audio.load();

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
  }, [src, retryCount]);

  // Effect to handle audio loading and retry logic
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

  // Mobile-optimized play/pause with user interaction handling
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !canPlay) return;

    setHasUserInteracted(true);
    
    try {
      if (isPlaying) {
        await audio.pause();
      } else {
        // Ensure audio is ready before playing
        if (audio.readyState >= 2) {
          await audio.play();
        } else {
          // Wait for audio to be ready
          audio.addEventListener('canplay', async () => {
            try {
              await audio.play();
            } catch (error) {
              console.warn('⚠️ Play failed after canplay:', error);
            }
          }, { once: true });
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

  // Enhanced seek handling for mobile
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

  // Audio error state
  if (audioError) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center relative overflow-hidden rounded-lg border border-border min-h-[120px]`}>
        <div className="text-center p-6">
          <div className="w-12 h-12 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-destructive font-medium mb-1">Erreur de lecture</p>
          <p className="text-muted-foreground text-sm mb-4">
            Impossible de lire ce fichier audio
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

  // Main audio player
  return (
    <div className={`${className} relative bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-border overflow-hidden ${compact ? 'min-h-[80px]' : 'min-h-[140px]'}`}>
      <audio 
        ref={audioRef}
        preload="metadata"
        autoPlay={hasUserInteracted && autoPlay && canPlay}
        muted={isMuted}
        crossOrigin="anonymous"
        webkit-playsinline={isMobile ? "true" : undefined}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '1px',
          height: '1px'
        }}
      >
        {/* Progressive source loading - mobile gets optimized formats */}
        {isMobile ? (
          <>
            <source src={src} type="audio/mpeg" />
            <source src={src} type="audio/mp4" />
            <source src={src} type="audio/aac" />
          </>
        ) : (
          <>
            <source src={src} type="audio/mpeg; codecs=mp3" />
            <source src={src} type="audio/mp4; codecs=mp4a.40.2" />
            <source src={src} type="audio/aac; codecs=mp4a.40.2" />
            <source src={src} type="audio/wav; codecs=1" />
            <source src={src} type="audio/ogg; codecs=vorbis" />
            <source src={src} type="audio/webm; codecs=vorbis" />
          </>
        )}
        Votre navigateur ne supporte pas la lecture audio.
      </audio>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-primary text-sm">Chargement...</p>
          </div>
        </div>
      )}

      {/* Player Interface */}
      {canPlay && (
        <div className={`relative z-10 ${compact ? 'p-2 flex items-center' : 'p-4 h-full flex flex-col justify-center'}`}>
          {/* Compact Layout */}
          {compact ? (
            <div className="flex items-center w-full gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-foreground hover:bg-primary/10 h-8 w-8 p-0 rounded-full flex-shrink-0"
                disabled={!canPlay}
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </Button>
              
              <div className="flex-1 min-w-0">
                {title && <p className="text-sm font-medium truncate">{title}</p>}
                <div 
                  className="w-full bg-muted/80 rounded-full cursor-pointer h-1 mt-1"
                  onClick={handleSeek}
                  onTouchEnd={handleSeek}
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
              {/* Full Layout */}
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
                    isMobile ? 'h-2 touch-manipulation' : 'h-1'
                  }`}
                  onClick={handleSeek}
                  onTouchEnd={handleSeek}
                >
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-200"
                    style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                  />
                </div>
              </div>

              {controls && (
                <div className="flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size={isMobile ? "default" : "sm"}
                    onClick={togglePlay}
                    className={`text-foreground hover:bg-primary/10 ${
                      isMobile ? 'h-12 w-12 touch-manipulation' : 'h-10 w-10'
                    } p-0 rounded-full`}
                    disabled={!canPlay}
                    aria-label={isPlaying ? "Pause audio" : "Play audio"}
                  >
                    {isPlaying ? (
                      <Pause className={isMobile ? "h-6 w-6" : "h-5 w-5"} />
                    ) : (
                      <Play className={`${isMobile ? "h-6 w-6" : "h-5 w-5"} ml-0.5`} />
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};