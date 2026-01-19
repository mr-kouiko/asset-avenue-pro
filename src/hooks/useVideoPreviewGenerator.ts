import { useCallback, useRef, useState } from 'react';

export interface PreviewOptions {
  url: string;
  durationSec?: number; // how many seconds to capture
  targetWidth?: number; // approximate width (height will keep aspect)
  fps?: number;
  videoBitsPerSecond?: number;
}

export interface GeneratorState {
  isGenerating: boolean;
  progress: number; // 0-100
  stage: 'idle' | 'loading' | 'recording' | 'processing' | 'done' | 'error';
  error?: string;
}

/**
 * Generate a lightweight, low-resolution WebM preview from a video URL in the browser.
 * - Uses a canvas + MediaRecorder on a canvas captureStream for wide compatibility
 * - No external dependencies, fast for short previews
 * - Handles CORS issues gracefully with fallback options
 */
export function useVideoPreviewGenerator() {
  const [state, setState] = useState<GeneratorState>({
    isGenerating: false,
    progress: 0,
    stage: 'idle'
  });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const abortRef = useRef<boolean>(false);

  const generate = useCallback(async ({
    url,
    durationSec = 6,
    targetWidth, // undefined = use original resolution
    fps = 24,
    videoBitsPerSecond = 4_000_000, // ~4 Mbps for full resolution
  }: PreviewOptions): Promise<Blob> => {
    abortRef.current = false;
    setState({ isGenerating: true, progress: 0, stage: 'loading' });
    console.log('[VideoPreview] Starting generation for:', url);

    // First, try to fetch the video as a blob to avoid CORS taint issues
    let blobUrl: string | null = null;

    try {
      // Try to fetch video as blob first - this avoids CORS canvas taint issues
      try {
        console.log('[VideoPreview] Attempting to fetch video as blob to avoid CORS...');
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
          const videoBlob = await response.blob();
          blobUrl = URL.createObjectURL(videoBlob);
          console.log('[VideoPreview] Video fetched as blob successfully, size:', videoBlob.size);
          setState(s => ({ ...s, progress: 5 }));
        }
      } catch (fetchErr) {
        console.warn('[VideoPreview] Blob fetch failed, falling back to direct URL:', fetchErr);
      }

      // Create video element
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      
      // Use blob URL if available (no CORS taint), otherwise use direct URL with crossOrigin
      if (blobUrl) {
        video.src = blobUrl;
        console.log('[VideoPreview] Using blob URL (CORS-safe)');
      } else {
        video.crossOrigin = 'anonymous';
        // Add cache-busting parameter to avoid stale CORS issues
        const urlSeparator = url.includes('?') ? '&' : '?';
        video.src = `${url}${urlSeparator}t=${Date.now()}`;
        console.log('[VideoPreview] Using direct URL with crossOrigin=anonymous');
      }

      // Wait metadata with timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('[VideoPreview] Timeout waiting for video metadata');
          reject(new Error('Video load timeout - file may be too large or network is slow'));
        }, 45000); // Increased timeout for large files
        
        const onLoaded = () => {
          clearTimeout(timeout);
          console.log('[VideoPreview] Video metadata loaded:', video.videoWidth, 'x', video.videoHeight, 'duration:', video.duration);
          setState(s => ({ ...s, progress: 10 }));
          resolve();
        };
        
        const onErr = (e: Event) => {
          clearTimeout(timeout);
          const videoEl = e.target as HTMLVideoElement;
          const error = videoEl?.error;
          console.error('[VideoPreview] Video load error:', error?.code, error?.message);
          
          // Provide helpful error messages
          let message = 'Failed to load video';
          if (error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
            message = 'Video format not supported by browser';
          } else if (error?.code === MediaError.MEDIA_ERR_NETWORK) {
            message = 'Network error loading video - check your connection';
          } else if (error?.code === MediaError.MEDIA_ERR_DECODE) {
            message = 'Video decode error - file may be corrupted';
          }
          reject(new Error(message));
        };
        
        video.addEventListener('loadedmetadata', onLoaded, { once: true });
        video.addEventListener('error', onErr, { once: true });
      });

      if (abortRef.current) throw new Error('Generation cancelled');

      // Validate video dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Invalid video dimensions - video may not have loaded correctly');
      }

      // Use original video dimensions if targetWidth not specified
      const aspect = video.videoWidth / video.videoHeight;
      const width = targetWidth ? Math.round(targetWidth) : video.videoWidth;
      const height = targetWidth ? Math.round(width / aspect) : video.videoHeight;

      console.log('[VideoPreview] Canvas dimensions:', width, 'x', height);
      setState(s => ({ ...s, progress: 15, stage: 'recording' }));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Load watermark logo with timeout
      const watermarkLogo = new Image();
      watermarkLogo.crossOrigin = 'anonymous';
      const watermarkUrl = 'https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/public/LOGO%20DE%20WATERMARKING/Blue%20Modern%20Sound%20Studio%20Logo%20(3).png';
      
      let watermarkLoaded = false;
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('[VideoPreview] Watermark load timeout, continuing without it');
          resolve();
        }, 5000);
        
        watermarkLogo.onload = () => {
          clearTimeout(timeout);
          watermarkLoaded = true;
          console.log('[VideoPreview] Watermark loaded successfully');
          resolve();
        };
        watermarkLogo.onerror = () => {
          clearTimeout(timeout);
          console.warn('[VideoPreview] Watermark logo failed to load, continuing without it');
          resolve();
        };
        watermarkLogo.src = watermarkUrl;
      });

      // Calculate watermark size - 50% width for high visibility
      let watermarkWidth = width * 0.5;
      let watermarkHeight = watermarkLoaded ? (watermarkLogo.height / watermarkLogo.width) * watermarkWidth : 0;
      
      // Ensure height doesn't exceed canvas height
      if (watermarkHeight > height * 0.8) {
        watermarkHeight = height * 0.8;
        watermarkWidth = (watermarkLogo.width / watermarkLogo.height) * watermarkHeight;
      }
      
      const watermarkX = (width - watermarkWidth) / 2;
      const watermarkY = (height - watermarkHeight) / 2;

      // Prepare recorder from canvas stream
      const stream = (canvas as any).captureStream ? canvas.captureStream(fps) : (canvas as any).mozCaptureStream?.(fps);
      if (!stream) {
        throw new Error('Canvas captureStream not supported - please use a modern browser');
      }

      const chunks: BlobPart[] = [];
      
      // Try MP4 first (Safari, newer Chrome), fallback to WebM
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4;codecs=avc1',
        'video/mp4',
      ];
      
      let selectedMimeType = 'video/webm';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          console.log('[VideoPreview] Using MIME type:', selectedMimeType);
          break;
        }
      }
      
      // Use lower bitrate if on mobile or video is very large
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const adjustedBitrate = isMobile ? Math.min(videoBitsPerSecond, 2_000_000) : videoBitsPerSecond;
      
      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: adjustedBitrate,
      });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
          console.log('[VideoPreview] Chunk received:', e.data.size, 'bytes');
        }
      };

      const recordPromise = new Promise<void>((resolve) => {
        recorder.onstop = () => {
          console.log('[VideoPreview] Recording stopped, total chunks:', chunks.length);
          resolve();
        };
      });

      recorder.start(500); // Request data every 500ms for better responsiveness

      // Track if we successfully drew any frames
      let framesDrawn = 0;
      let drawErrors = 0;
      let lastFrameTime = 0;

      // Draw loop with watermark
      let raf = 0;
      const draw = (timestamp: number) => {
        if (abortRef.current) {
          cancelAnimationFrame(raf);
          return;
        }
        
        // Limit to target fps
        if (timestamp - lastFrameTime >= 1000 / fps) {
          try {
            // Draw video frame
            ctx.drawImage(video, 0, 0, width, height);
            framesDrawn++;
            
            // Draw watermark if loaded
            if (watermarkLoaded && watermarkLogo.complete && watermarkLogo.naturalWidth > 0) {
              ctx.save();
              
              // Strong drop shadow for visibility
              ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
              ctx.shadowBlur = 12;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 4;
              
              ctx.globalAlpha = 0.95; // High opacity for protection
              ctx.drawImage(watermarkLogo, watermarkX, watermarkY, watermarkWidth, watermarkHeight);
              ctx.restore();
            }
            
            lastFrameTime = timestamp;
          } catch (err) {
            // Cross-origin taint or not ready
            drawErrors++;
            if (drawErrors === 1) {
              console.warn('[VideoPreview] Canvas draw error (CORS taint?):', err);
            }
          }
        }
        raf = requestAnimationFrame(draw);
      };

      // Start playback and drawing
      console.log('[VideoPreview] Starting video playback...');
      setState(s => ({ ...s, progress: 20 }));
      
      try {
        await video.play();
        console.log('[VideoPreview] Video playing');
      } catch (playErr) {
        console.warn('[VideoPreview] Play failed:', playErr);
        // Try to continue anyway - some browsers may still allow frame capture
      }
      
      raf = requestAnimationFrame(draw);

      // Stop after duration or when video ends (whichever first)
      const stopAfter = Math.min(durationSec, isFinite(video.duration) ? video.duration : durationSec);
      console.log('[VideoPreview] Recording for', stopAfter, 'seconds');
      
      // Update progress during recording
      const progressInterval = setInterval(() => {
        if (!abortRef.current) {
          const currentProgress = Math.min(video.currentTime / stopAfter, 1);
          setState(s => ({ ...s, progress: 20 + Math.round(currentProgress * 60) }));
        }
      }, 200);
      
      await new Promise<void>((resolve) => setTimeout(resolve, stopAfter * 1000));
      clearInterval(progressInterval);

      if (abortRef.current) throw new Error('Generation cancelled');

      cancelAnimationFrame(raf);
      try { video.pause(); } catch {}
      recorder.stop();
      await recordPromise;

      setState(s => ({ ...s, progress: 85, stage: 'processing' }));
      console.log('[VideoPreview] Frames drawn:', framesDrawn, 'Draw errors:', drawErrors);

      // Check if frames were drawn successfully
      if (framesDrawn === 0) {
        throw new Error('No frames captured - video may have CORS restrictions. Try downloading from source.');
      }
      
      if (drawErrors > framesDrawn * 0.5) {
        console.warn('[VideoPreview] High draw error rate, but some frames captured');
      }

      // Check if we got any data
      if (chunks.length === 0) {
        throw new Error('No video data recorded - browser may not support this format');
      }

      const outputMimeType = selectedMimeType.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
      const blob = new Blob(chunks, { type: outputMimeType });
      
      console.log('[VideoPreview] Generated blob:', blob.size, 'bytes, type:', blob.type);
      
      // Validate blob size (should be at least a few KB for real video)
      if (blob.size < 1000) {
        throw new Error('Generated preview too small - may be empty frames');
      }
      
      // Cleanup blob URL if we created one
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      
      setState({ isGenerating: false, progress: 100, stage: 'done' });
      return blob;
      
    } catch (error) {
      // Cleanup blob URL on error
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[VideoPreview] Generation failed:', errorMessage);
      setState({ isGenerating: false, progress: 0, stage: 'error', error: errorMessage });
      throw error;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current = true;
    try { recorderRef.current?.stop(); } catch {}
    setState({ isGenerating: false, progress: 0, stage: 'idle' });
  }, []);

  // Backwards compatible getter for isGenerating
  const isGenerating = state.isGenerating;

  return { isGenerating, state, generate, cancel };
}
