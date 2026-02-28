import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2, AlertCircle, RotateCcw, MoreVertical, Download, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { VideoWatermark } from '@/components/VideoWatermark';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useServerVideoPreview } from '@/hooks/useServerVideoPreview';
import { useVideoPreviewGenerator } from '@/hooks/useVideoPreviewGenerator';
import { useAudioWatermark } from '@/hooks/useAudioWatermark';

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
  watermarkSize?: 'normal' | 'large' | 'thumbnail';
  contentId?: string;      // For server-side preview generation
  storagePath?: string;    // Storage path for the video (for server-side preview)
  previewPath?: string;    // Pre-generated preview path (if available)
}

/** Utility: deduce MIME type from file extension */
function getMimeFromSrc(src: string | undefined, kind: 'video' | 'audio'): string | undefined {
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

/**
 * Universal Media Player
 * - Device-aware playback with mobile/desktop optimizations
 * - Proper MIME type handling and source management
 * - Retry logic and error handling
 * - Touch-friendly controls on mobile
 */
export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  src,
  type,
  title = 'Media',
  poster,
  className = 'w-full',
  autoPlay = false,
  controls = true,
  muted = false,
  compact = false,
  watermarkSize = 'normal',
  contentId,
  storagePath,
  previewPath: existingPreviewPath,
}) => {
  const deviceInfo = useDeviceDetection();
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(muted);
  const [volume, setVolume] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [buffered, setBuffered] = useState<number>(0);
  const [canPlay, setCanPlay] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Preview generators - server-side (preferred) and client-side (fallback)
  const { toast } = useToast();
  const serverPreview = useServerVideoPreview();
  const clientPreview = useVideoPreviewGenerator();

  // Audio watermark hook - only active for audio type
  useAudioWatermark({ 
    isPlaying: type === 'audio' ? isPlaying : false, 
    mainVolume: volume, 
    isMuted
  });

  // Determine if preview generation is in progress
  const isGeneratingPreview = serverPreview.isGenerating || clientPreview.isGenerating;
  const previewStage = serverPreview.isGenerating 
    ? serverPreview.stage 
    : clientPreview.state.stage;
  const previewProgress = serverPreview.isGenerating 
    ? serverPreview.progress 
    : clientPreview.state.progress;

  // Helper: fetch a URL as blob and trigger download as a proper file
  const downloadUrlAsFile = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      return true;
    } catch (err) {
      console.warn('[MediaPlayer] Blob download failed, using direct link fallback:', err);
      // Fallback: direct link (may open in tab for cross-origin)
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    }
  }, []);

  const handleDownloadPreview = useCallback(async () => {
    if (type !== 'video' || !src) return;
    
    const filenameBase = (title || 'video').replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();

    // Option 1: If pre-generated preview exists, download as blob for proper MP4
    if (existingPreviewPath) {
      console.log('[MediaPlayer] Using pre-generated preview:', existingPreviewPath);
      toast({ 
        title: 'Downloading preview…', 
        description: 'Preparing MP4 file', 
        duration: 10000 
      });
      await downloadUrlAsFile(existingPreviewPath, `${filenameBase}_preview.mp4`);
      toast({ 
        title: 'Preview ready', 
        description: 'Watermarked preview downloaded.', 
        duration: 3000 
      });
      return;
    }

    // Option 2: Try to download the source video directly as preview (watermarked)
    // This uses the preview URL (which is already watermarked) and downloads it as a real file
    if (src) {
      const cleanSrc = src.split('#')[0]; // Remove any #t=2 fragments
      console.log('[MediaPlayer] Downloading source as preview:', cleanSrc);
      toast({ 
        title: 'Downloading preview…', 
        description: 'Preparing watermarked MP4 file', 
        duration: 30000 
      });
      
      try {
        await downloadUrlAsFile(cleanSrc, `${filenameBase}_preview.mp4`);
        toast({ 
          title: 'Preview ready', 
          description: 'Watermarked preview downloaded.', 
          duration: 3000 
        });
        return;
      } catch (err) {
        console.warn('[MediaPlayer] Direct download failed, trying server generation:', err);
      }
    }

    // Option 3: Try server-side generation (fallback)
    if (storagePath) {
      toast({ 
        title: 'Generating preview…', 
        description: 'Server processing (720p MP4)', 
        duration: 60000 
      });
      
      try {
        const result = await serverPreview.generate({
          videoPath: storagePath,
          contentId,
          resolution: 720,
        });
        
        console.log('[MediaPlayer] Server preview generated:', result);
        await downloadUrlAsFile(result.previewUrl, `${filenameBase}_preview.mp4`);
        
        toast({ 
          title: 'Preview ready', 
          description: result.cached 
            ? 'Downloaded from cache.' 
            : `Generated in ${(result.processingTimeMs / 1000).toFixed(1)}s`, 
          duration: 3000 
        });
        return;
      } catch (serverErr) {
        console.warn('[MediaPlayer] Server preview failed, falling back to client-side:', serverErr);
      }
    }

    // Option 4: Fallback to client-side generation (slower, may produce WebM)
    toast({ 
      title: 'Generating preview…', 
      description: 'Processing in browser (720p)', 
      duration: 60000 
    });
    
    try {
      const blob = await clientPreview.generate({ 
        url: src, 
        targetWidth: 1280,
        fps: 24, 
        videoBitsPerSecond: 2500000
      });
      
      const a = document.createElement('a');
      const href = URL.createObjectURL(blob);
      a.href = href;
      const ext = blob.type === 'video/mp4' ? 'mp4' : 'webm';
      a.download = `${filenameBase}_preview.${ext}`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(href);
      a.remove();
      
      toast({ 
        title: 'Preview ready', 
        description: 'Watermarked preview downloaded.', 
        duration: 3000 
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to create preview';
      console.error('[MediaPlayer] Preview generation failed:', errorMessage);
      toast({ 
        title: 'Generation failed', 
        description: errorMessage, 
        variant: 'destructive',
        duration: 5000
      });
    }
  }, [src, type, title, existingPreviewPath, storagePath, contentId, serverPreview, clientPreview, toast]);

  // User interaction tracking for mobile autoplay restrictions
  const userInteractedRef = useRef<boolean>(false);

  // MIME type calculation
  const mimeType = useMemo(() => getMimeFromSrc(src, type), [src, type]);

// Reload key for forcing media reload on src change or retry
  const mediaKey = useMemo(() => `${src || 'no-src'}::${retryCount}`, [src, retryCount]);
  
  // Decide whether to set crossOrigin attribute (only when server supports CORS)
  const shouldUseCrossOrigin = useMemo(() => {
    if (!src) return false;
    try {
      const host = new URL(src).hostname;
      // Enable CORS for Supabase assets or same-origin media only
      return host.includes('supabase.co') || host === window.location.hostname;
    } catch {
      return false;
    }
  }, [src]);
  
  // Event handlers
  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    setCanPlay(true);
    setHasError(false);
  }, []);

  const handleError = useCallback(
    (e: Event) => {
      const target = e.target as HTMLMediaElement | null;
      const error = target?.error;
      console.error('Media error:', {
        code: error?.code,
        message: (error as any)?.message,
        src,
        mimeType,
        device: deviceInfo.isMobile ? 'Mobile' : 'Desktop',
        retryCount,
      });
      setIsLoading(false);
      setCanPlay(false);

      if (retryCount < 3) {
        setTimeout(() => setRetryCount((p) => p + 1), 800 + retryCount * 400);
      } else {
        setHasError(true);
      }
    },
    [src, mimeType, deviceInfo.isMobile, retryCount]
  );

  const handleLoadedMetadata = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    const d = Number.isFinite(media.duration) ? media.duration : 0;
    setDuration(d);
  }, []);

  const handleDurationChange = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    const d = Number.isFinite(media.duration) ? media.duration : 0;
    if (d > 0) setDuration(d);
  }, []);

  const handleProgress = useCallback(() => {
    const media = mediaRef.current;
    if (!media || !Number.isFinite(media.duration) || media.duration <= 0) return;
    if (media.buffered.length > 0) {
      const end = media.buffered.end(media.buffered.length - 1);
      const pct = Math.max(0, Math.min(100, (end / media.duration) * 100));
      setBuffered(pct);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    setCurrentTime(media.currentTime || 0);
  }, []);

  const handlePlayEvt = useCallback(() => setIsPlaying(true), []);
  const handlePauseEvt = useCallback(() => setIsPlaying(false), []);
  const handleEndedEvt = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);
  const handleVolumeEvt = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    setIsMuted(media.muted);
    setVolume(media.volume);
  }, []);

  // Attach event listeners
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    media.addEventListener('canplay', handleCanPlay);
    media.addEventListener('error', handleError);
    media.addEventListener('loadedmetadata', handleLoadedMetadata);
    media.addEventListener('durationchange', handleDurationChange);
    media.addEventListener('progress', handleProgress);
    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('play', handlePlayEvt);
    media.addEventListener('pause', handlePauseEvt);
    media.addEventListener('ended', handleEndedEvt);
    media.addEventListener('volumechange', handleVolumeEvt);

    return () => {
      media.removeEventListener('canplay', handleCanPlay);
      media.removeEventListener('error', handleError);
      media.removeEventListener('loadedmetadata', handleLoadedMetadata);
      media.removeEventListener('durationchange', handleDurationChange);
      media.removeEventListener('progress', handleProgress);
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('play', handlePlayEvt);
      media.removeEventListener('pause', handlePauseEvt);
      media.removeEventListener('ended', handleEndedEvt);
      media.removeEventListener('volumechange', handleVolumeEvt);
    };
  }, [
    handleCanPlay,
    handleError,
    handleLoadedMetadata,
    handleDurationChange,
    handleProgress,
    handleTimeUpdate,
    handlePlayEvt,
    handlePauseEvt,
    handleEndedEvt,
    handleVolumeEvt,
  ]);

  // Reset player state when source changes
  // The key={mediaKey} prop forces React to remount the element,
  // so we just reset our tracking state here.
  const prevSrcRef = useRef<string | undefined>();
  useEffect(() => {
    if (prevSrcRef.current !== src) {
      prevSrcRef.current = src;
      if (src) {
        setIsLoading(true);
        setHasError(false);
        setCanPlay(false);
        setBuffered(0);
        setDuration(0);
        setCurrentTime(0);
        setIsPlaying(false);
      } else {
        setIsLoading(false);
        setHasError(false);
        setCanPlay(false);
      }
    }
  }, [src]);

  // Controls
  const togglePlay = useCallback(async () => {
    const media = mediaRef.current;
    if (!media || !canPlay) return;

    userInteractedRef.current = true;

    try {
      if (isPlaying) {
        await media.pause();
      } else {
        if (media.readyState >= 2) {
          await media.play();
        } else {
          const onReady = async () => {
            media.removeEventListener('canplay', onReady);
            try {
              await media.play();
            } catch (err) {
              console.warn('Play after canplay failed:', err);
            }
          };
          media.addEventListener('canplay', onReady, { once: true });
          media.load();
        }
      }
    } catch (error: any) {
      console.error('Playback toggle failed:', { name: error?.name, message: error?.message });
      if (error?.name === 'NotAllowedError') {
        if (type === 'video') {
          try {
            media.muted = true;
            setIsMuted(true);
            await media.play();
          } catch (e) {
            console.warn('Muted play also failed:', e);
          }
        }
      } else if (error?.name === 'NotSupportedError') {
        setHasError(true);
      }
    }
  }, [canPlay, isPlaying, type]);

  const toggleMute = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.muted = !media.muted;
    setIsMuted(media.muted);
  }, []);

  const handleVolumeChangeUI = useCallback(
    (newVolume: number) => {
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
    },
    [isMuted]
  );

  const handleSeek = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const media = mediaRef.current;
      if (!media || !canPlay || !Number.isFinite(duration) || duration <= 0) return;

      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const clientX =
        'touches' in e
          ? e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0
          : (e as React.MouseEvent).clientX;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newTime = ratio * duration;

      media.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [canPlay, duration]
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    if (type !== 'video') return;
    const container = containerRef.current;
    if (!container) return;
    try {
      if (!isFullscreen) {
        if (container.requestFullscreen) await container.requestFullscreen();
        else if ((container as any).webkitRequestFullscreen) await (container as any).webkitRequestFullscreen();
        else if ((container as any).mozRequestFullScreen) await (container as any).mozRequestFullScreen();
        else if ((container as any).msRequestFullscreen) await (container as any).msRequestFullscreen();
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
        else if ((document as any).mozCancelFullScreen) await (document as any).mozCancelFullScreen();
        else if ((document as any).msExitFullscreen) await (document as any).msExitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  }, [isFullscreen, type]);

  const formatTime = useCallback((t: number) => {
    if (!Number.isFinite(t) || t < 0) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setHasError(false);
    setIsLoading(true);
    setTimeout(() => setRetryCount((p) => p + 1), 0);
  }, []);

  // Loading state
  if (!src) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center rounded-lg border border-border min-h-[120px]`}>
        <div className="text-center p-6">
          <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            {type === 'video' ? <Play className="h-6 w-6 text-primary" /> : <Volume2 className="h-6 w-6 text-primary" />}
          </div>
          <p className="text-muted-foreground text-sm">
            {type === 'video' ? 'Video' : 'Audio'} processing...
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
          <p className="text-destructive font-medium mb-1">Playback Error</p>
          <p className="text-muted-foreground text-sm mb-4">
            Unable to play this {type === 'video' ? 'video' : 'audio'} file
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${className} relative bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-border overflow-hidden ${
        compact ? 'min-h-[80px]' : type === 'video' ? 'min-h-[300px]' : 'min-h-[140px]'
      }`}
      role="group"
      aria-label={title}
    >
      {/* Media element with typed source */}
      {type === 'video' ? (
        <video
          key={mediaKey}
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={src}
          poster={poster}
          preload={deviceInfo.isMobile ? 'metadata' : 'auto'}
          autoPlay={autoPlay && !deviceInfo.isMobile}
          muted={isMuted}
          playsInline
          crossOrigin={shouldUseCrossOrigin ? 'anonymous' : undefined}
          className="w-full h-full object-cover"
          style={{ opacity: isLoading ? 0 : 1 }}
          controls={false}
        />
      ) : (
        <audio
          key={mediaKey}
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          preload={deviceInfo.isMobile ? 'metadata' : 'auto'}
          autoPlay={autoPlay && !deviceInfo.isMobile}
          muted={isMuted}
          crossOrigin={shouldUseCrossOrigin ? 'anonymous' : undefined}
          style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
          controls={false}
        >
          <source src={src} type={mimeType} />
        </audio>
      )}

      {/* Video Watermark - ALWAYS show for videos, even when loading */}
      {type === 'video' && !hasError && (
        <VideoWatermark size={watermarkSize} />
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-primary text-sm">Loading...</p>
          </div>
        </div>
      )}

      {/* Controls */}
      {canPlay && controls && (
        <div className="absolute inset-0 z-25">
          {compact ? (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlay}
                  className={`text-white hover:bg-white/20 ${
                    deviceInfo.touchCapable ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'
                  } p-0 rounded-full flex-shrink-0`}
                >
                  {isPlaying ? (
                    <Pause className={deviceInfo.touchCapable ? 'h-5 w-5' : 'h-4 w-4'} />
                  ) : (
                    <Play className={`${deviceInfo.touchCapable ? 'h-5 w-5' : 'h-4 w-4'} ml-0.5`} />
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
                      style={{ width: `${(currentTime / (duration || 1)) * 100 || 0}%` }}
                    />
                  </div>
                </div>

                <span className="text-white text-xs font-mono flex-shrink-0">{formatTime(currentTime)}</span>
              </div>
            </div>
          ) : (
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
                    style={{ width: `${(currentTime / (duration || 1)) * 100 || 0}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size={deviceInfo.touchCapable ? 'default' : 'sm'}
                    onClick={togglePlay}
                    className={`text-white hover:bg-white/20 ${
                      deviceInfo.touchCapable ? 'h-12 w-12 touch-manipulation' : 'h-10 w-10'
                    } p-0 rounded-full`}
                  >
                    {isPlaying ? (
                      <Pause className={deviceInfo.touchCapable ? 'h-6 w-6' : 'h-5 w-5'} />
                    ) : (
                      <Play className={`${deviceInfo.touchCapable ? 'h-6 w-6' : 'h-5 w-5'} ml-0.5`} />
                    )}
                  </Button>

                  {!deviceInfo.isIOS && (
                    <Button
                      variant="ghost"
                      size={deviceInfo.touchCapable ? 'default' : 'sm'}
                      onClick={toggleMute}
                      className={`text-white hover:bg-white/20 ${
                        deviceInfo.touchCapable ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'
                      } p-0 rounded-full`}
                    >
                      {isMuted ? (
                        <VolumeX className={deviceInfo.touchCapable ? 'h-5 w-5' : 'h-4 w-4'} />
                      ) : (
                        <Volume2 className={deviceInfo.touchCapable ? 'h-5 w-5' : 'h-4 w-4'} />
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  {type === 'video' && (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size={deviceInfo.touchCapable ? 'default' : 'sm'}
                            className={`text-white hover:bg-white/20 ${
                              deviceInfo.touchCapable ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'
                            } p-0 rounded-full`}
                            aria-label="Options"
                          >
                            <MoreVertical className={deviceInfo.touchCapable ? 'h-5 w-5' : 'h-4 w-4'} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[260px]">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleDownloadPreview} disabled={isGeneratingPreview}>
                            {isGeneratingPreview ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {previewStage === 'loading' && 'Loading video...'}
                                {previewStage === 'requesting' && 'Requesting server...'}
                                {previewStage === 'processing' && `Processing (${previewProgress}%)`}
                                {previewStage === 'recording' && `Recording (${previewProgress}%)`}
                                {previewStage === 'downloading' && 'Downloading...'}
                              </>
                            ) : existingPreviewPath ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                Download preview (cached)
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Download preview (720p)
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="ghost"
                        size={deviceInfo.touchCapable ? 'default' : 'sm'}
                        onClick={toggleFullscreen}
                        className={`text-white hover:bg-white/20 ${
                          deviceInfo.touchCapable ? 'h-10 w-10 touch-manipulation' : 'h-8 w-8'
                        } p-0 rounded-full`}
                      >
                        <Maximize className={deviceInfo.touchCapable ? 'h-5 w-5' : 'h-4 w-4'} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Buffer indicator */}
      {canPlay && !compact && type === 'video' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-white/50" style={{ width: `${buffered}%` }} />
        </div>
      )}
    </div>
  );
};
