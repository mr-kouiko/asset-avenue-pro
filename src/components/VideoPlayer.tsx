import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { VideoWatermark } from '@/components/VideoWatermark';

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

/** Helper: deduce MIME from src extension */
function getMimeFromSrc(src?: string, kind: 'video' | 'audio' = 'video'): string | undefined {
  if (!src) return undefined;
  const clean = src.split('?')[0];
  const ext = clean.slice(clean.lastIndexOf('.') + 1).toLowerCase();
  if (kind === 'video') {
    if (ext === 'mp4') return 'video/mp4';
    if (ext === 'webm') return 'video/webm';
    if (ext === 'ogg' || ext === 'ogv') return 'video/ogg';
    if (ext === 'mov') return 'video/quicktime';
    return 'video/mp4';
  } else {
    if (ext === 'mp3') return 'audio/mpeg';
    if (ext === 'aac') return 'audio/aac';
    if (ext === 'm4a') return 'audio/mp4';
    if (ext === 'wav') return 'audio/wav';
    if (ext === 'ogg' || ext === 'oga') return 'audio/ogg';
    if (ext === 'webm') return 'audio/webm';
    return 'audio/mpeg';
  }
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  src,
  type,
  title = 'Media',
  poster,
  className = 'w-full',
  autoPlay = false,
  controls = true,
  muted = false,
  compact = false
}) => {
  const deviceInfo = useDeviceDetection();
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  // Player state (kept as in original)
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

  // *** MODIF ***
  // fix du 1er tap mobile : on marque l'interaction via un ref synchronously
  const userInteractedRef = useRef(false);

  // mime type détecté (utilisé via <source>)
  const mimeType = useMemo(() => getMimeFromSrc(src, type), [src, type]);

  // mediaKey forcera le rerender/reload lorsque src ou retryCount change
  const mediaKey = useMemo(() => `${src || 'no-src'}::${retryCount}`, [src, retryCount]);

  /***********************
   *  HANDLERS (stables) *
   ***********************/
  // *** MODIF ***
  // Handlers centralisés (attachés une seule fois par useEffect)
  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    setCanPlay(true);
    setHasError(false);
    console.log('canplay fired');
  }, []);

  const handleError = useCallback((e: Event) => {
    const target = e.target as HTMLMediaElement | null;
    const error = target?.error;
    console.error('media error', { code: error?.code, message: (error as any)?.message, src, mimeType, retryCount });
    setIsLoading(false);
    setCanPlay(false);
    if (retryCount < 3) {
      setTimeout(() => setRetryCount(p => p + 1), 1000 + retryCount * 500);
    } else {
      setHasError(true);
    }
  }, [src, mimeType, retryCount]);

  const handleLoadedMetadata = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    const d = Number.isFinite(media.duration) ? media.duration : 0;
    setDuration(d);
    console.log('loadedmetadata', d);
  }, []);

  const handleProgress = useCallback(() => {
    const media = mediaRef.current;
    if (!media || !Number.isFinite(media.duration) || media.duration <= 0) return;
    if (media.buffered.length > 0) {
      const bufferedEnd = media.buffered.end(media.buffered.length - 1);
      const bufferedPercent = (bufferedEnd / media.duration) * 100;
      setBuffered(Math.max(0, Math.min(100, bufferedPercent)));
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    setCurrentTime(media.currentTime || 0);
  }, []);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleEnded = useCallback(() => { setIsPlaying(false); setCurrentTime(0); }, []);
  const handleVolumeChangeEvent = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    setIsMuted(media.muted);
    setVolume(media.volume);
  }, []);

  // *** MODIF ***
  // Attache / détache les listeners UNE seule fois (empêche accumulation)
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.addEventListener('canplay', handleCanPlay);
    media.addEventListener('error', handleError);
    media.addEventListener('loadedmetadata', handleLoadedMetadata);
    media.addEventListener('progress', handleProgress);
    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('play', handlePlay);
    media.addEventListener('pause', handlePause);
    media.addEventListener('ended', handleEnded);
    media.addEventListener('volumechange', handleVolumeChangeEvent);

    return () => {
      media.removeEventListener('canplay', handleCanPlay);
      media.removeEventListener('error', handleError);
      media.removeEventListener('loadedmetadata', handleLoadedMetadata);
      media.removeEventListener('progress', handleProgress);
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('play', handlePlay);
      media.removeEventListener('pause', handlePause);
      media.removeEventListener('ended', handleEnded);
      media.removeEventListener('volumechange', handleVolumeChangeEvent);
    };
  }, [handleCanPlay, handleError, handleLoadedMetadata, handleProgress, handleTimeUpdate, handlePlay, handlePause, handleEnded, handleVolumeChangeEvent]);

  /***********************
   *  LOAD MEDIA (fix)   *
   ***********************/
  // *** MODIF ***
  // loadMedia simplified: ne rattache pas d'events, fait un reload propre et laisse
  // le useEffect listeners gérés plus haut capturer canplay/error/loadedmetadata.
  const loadMedia = useCallback(async () => {
    const media = mediaRef.current;
    if (!media || !src) return;
    console.log(`Loading ${type}:`, src);
    setIsLoading(true);
    setHasError(false);
    setCanPlay(false);
    setBuffered(0);
    setDuration(0);
    setCurrentTime(0);

    try {
      // Forcer un reset propre (évite états fantômes)
      media.pause();
      media.removeAttribute('src');
      // remove child <source> if any — React will render <source> again because of key (mediaKey)
      // call load to reset internal state
      try { media.load(); } catch (e) { /* ignore */ }

      // If mobile keep lightweight; desktop we also set src via React <source> and force load using key
      // (actual src injection is handled by the rendered <source> element keyed by mediaKey)
    } catch (err) {
      console.error('Exception during loadMedia', err);
      setIsLoading(false);
      setHasError(true);
    }
  }, [src, type]);

  // auto-run loadMedia when src or retryCount change (mediaKey)
  useEffect(() => {
    if (src) loadMedia();
  }, [src, loadMedia, mediaKey]);

  /***********************
   *  PLAY / MUTE / SEEK  *
   ***********************/
  // *** MODIF ***
  const togglePlay = useCallback(async () => {
    const media = mediaRef.current;
    if (!media || !canPlay) return;

    // marque l'interaction immédiatement (fix pour mobile)
    userInteractedRef.current = true;
    if (!hasUserInteracted) setHasUserInteracted(true);

    try {
      if (isPlaying) {
        await media.pause();
      } else {
        if (media.readyState >= 2) {
          await media.play();
        } else {
          // Attendre canplay
          const playWhenReady = async () => {
            media.removeEventListener('canplay', playWhenReady);
            try { await media.play(); } catch (err) { console.warn('play after canplay failed', err); }
          };
          media.addEventListener('canplay', playWhenReady);
          media.load();
        }
      }
    } catch (error: any) {
      console.error('playback toggle failed:', error);
      if (error?.name === 'NotAllowedError') {
        // try muted play if video and autoplay blocked
        if (type === 'video') {
          try {
            media.muted = true;
            setIsMuted(true);
            await media.play();
          } catch (e) {
            console.warn('muted play failed', e);
          }
        }
      } else if (error?.name === 'NotSupportedError') {
        setHasError(true);
      }
    }
  }, [canPlay, isPlaying, hasUserInteracted, type]);

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
      media.muted = true;
      setIsMuted(true);
    } else if (isMuted && newVolume > 0) {
      media.muted = false;
      setIsMuted(false);
    }
  }, [isMuted]);

  const handleSeek = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const media = mediaRef.current;
    if (!media || !duration || !canPlay) return;

    const progressBar = e.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    let clientX = 0;

    if ('touches' in e && e.touches.length) {
      clientX = (e.touches[0] as Touch).clientX;
    } else if ('changedTouches' in e && e.changedTouches.length) {
      clientX = (e.changedTouches[0] as Touch).clientX;
    } else if ('clientX' in (e as any)) {
      clientX = (e as any).clientX;
    }

    const clickPosition = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = clickPosition * duration;
    media.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration, canPlay]);

  const toggleFullscreen = useCallback(async () => {
    if (type !== 'video') return;
    const media = mediaRef.current as HTMLVideoElement | null;
    if (!media) return;
    try {
      if (!isFullscreen) {
        if (media.requestFullscreen) await media.requestFullscreen();
        else if ((media as any).webkitRequestFullscreen) await (media as any).webkitRequestFullscreen();
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  }, [isFullscreen, type]);

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
    // relance via mediaKey effect
    setTimeout(() => setRetryCount(c => c + 1), 0);
  }, []);

  /***********************
   *  RENDER (UI)        *
   ***********************/
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

  return (
    <div className={`${className} relative bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-border overflow-hidden ${compact ? 'min-h-[80px]' : type === 'video' ? 'min-h-[300px]' : 'min-h-[140px]'}`}>
      {/* Media element with typed <source> (helps mobile) */}
      {type === 'video' ? (
        <video
          key={mediaKey} // force re-render when src/retry changes
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          poster={poster}
          preload={deviceInfo.isMobile ? 'metadata' : 'auto'}
          autoPlay={hasUserInteracted && autoPlay && canPlay && !deviceInfo.isMobile}
          muted={isMuted}
          playsInline={deviceInfo.isMobile}
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
          style={{ display: isLoading || hasError ? 'none' : 'block' }}
          controls={false}
        >
          <source src={src} type={mimeType} />
        </video>
      ) : (
        <audio
          key={mediaKey}
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          preload={deviceInfo.isMobile ? 'metadata' : 'auto'}
          autoPlay={hasUserInteracted && autoPlay && canPlay && !deviceInfo.isMobile}
          muted={isMuted}
          crossOrigin="anonymous"
          style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
          controls={false}
        >
          <source src={src} type={mimeType} />
        </audio>
      )}

      {/* Video Watermark - only for videos */}
      {type === 'video' && canPlay && !isLoading && !hasError && (
        <VideoWatermark />
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-primary text-sm">Chargement...</p>
          </div>
        </div>
      )}

      {/* Controls (left intact, only logic references above changed) */}
      {canPlay && controls && (
        <div className="absolute inset-0 z-10">
          {compact ? (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlay}
                  className={`text-white hover:bg-white/20 ${deviceInfo.touchCapable ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'} p-0 rounded-full flex-shrink-0`}
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
                    className={`w-full bg-white/30 rounded-full cursor-pointer ${deviceInfo.touchCapable ? 'h-2 touch-manipulation' : 'h-1'}`}
                    onClick={handleSeek}
                    onTouchEnd={deviceInfo.touchCapable ? handleSeek : undefined}
                  >
                    <div className="h-full bg-primary rounded-full transition-all duration-200" style={{ width: `${(currentTime / (duration || 1)) * 100 || 0}%` }} />
                  </div>
                </div>

                <span className="text-white text-xs font-mono flex-shrink-0">
                  {formatTime(currentTime)}
                </span>
              </div>
            </div>
          ) : (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
              <div className="mb-3">
                <div
                  className={`w-full bg-white/30 rounded-full cursor-pointer ${deviceInfo.touchCapable ? 'h-2 touch-manipulation' : 'h-1'}`}
                  onClick={handleSeek}
                  onTouchEnd={deviceInfo.touchCapable ? handleSeek : undefined}
                >
                  <div className="h-full bg-primary rounded-full transition-all duration-200" style={{ width: `${(currentTime / (duration || 1)) * 100 || 0}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size={deviceInfo.touchCapable ? "default" : "sm"}
                    onClick={togglePlay}
                    className={`text-white hover:bg-white/20 ${deviceInfo.touchCapable ? 'h-12 w-12 touch-manipulation' : 'h-10 w-10'} p-0 rounded-full`}
                    disabled={!canPlay}
                  >
                    {isPlaying ? (
                      <Pause className={deviceInfo.touchCapable ? "h-6 w-6" : "h-5 w-5"} />
                    ) : (
                      <Play className={`${deviceInfo.touchCapable ? "h-6 w-6" : "h-5 w-5"} ml-0.5`} />
                    )}
                  </Button>

                  {!deviceInfo.isIOS && (
                    <Button
                      variant="ghost"
                      size={deviceInfo.touchCapable ? "default" : "sm"}
                      onClick={toggleMute}
                      className={`text-white hover:bg-white/20 ${deviceInfo.touchCapable ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'} p-0 rounded-full`}
                    >
                      {isMuted ? <VolumeX className={deviceInfo.touchCapable ? "h-5 w-5" : "h-4 w-4"} /> : <Volume2 className={deviceInfo.touchCapable ? "h-5 w-5" : "h-4 w-4"} />}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  {type === 'video' && (
                    <Button
                      variant="ghost"
                      size={deviceInfo.touchCapable ? "default" : "sm"}
                      onClick={toggleFullscreen}
                      className={`text-white hover:bg-white/20 ${deviceInfo.touchCapable ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'} p-0 rounded-full`}
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

      {/* buffered bar */}
      {canPlay && !compact && type === 'video' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-white/50" style={{ width: `${buffered}%` }} />
        </div>
      )}
    </div>
  );
};
