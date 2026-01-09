import { useCallback, useRef, useState } from 'react';

export interface PreviewOptions {
  url: string;
  durationSec?: number; // how many seconds to capture
  targetWidth?: number; // approximate width (height will keep aspect)
  fps?: number;
  videoBitsPerSecond?: number;
}

/**
 * Generate a lightweight, low-resolution WebM preview from a video URL in the browser.
 * - Uses a canvas + MediaRecorder on a canvas captureStream for wide compatibility
 * - No external dependencies, fast for short previews
 * - Handles CORS issues gracefully with fallback options
 */
export function useVideoPreviewGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const generate = useCallback(async ({
    url,
    durationSec = 6,
    targetWidth, // undefined = use original resolution
    fps = 24,
    videoBitsPerSecond = 4_000_000, // ~4 Mbps for full resolution
  }: PreviewOptions): Promise<Blob> => {
    setIsGenerating(true);
    console.log('[VideoPreview] Starting generation for:', url);

    // Create video element - try without crossOrigin first if same-origin or Supabase
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    
    // Check if URL is from Supabase storage (which supports CORS)
    const isSupabaseUrl = url.includes('supabase.co') || url.includes('supabase.in');
    
    // For Supabase URLs, use crossOrigin; for others, try without first
    if (isSupabaseUrl) {
      video.crossOrigin = 'anonymous';
    }
    
    video.src = url;

    // Wait metadata with timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Video load timeout')), 30000);
      const onLoaded = () => {
        clearTimeout(timeout);
        console.log('[VideoPreview] Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
        resolve();
      };
      const onErr = (e: Event) => {
        clearTimeout(timeout);
        const videoEl = e.target as HTMLVideoElement;
        const error = videoEl?.error;
        console.error('[VideoPreview] Video load error:', error?.code, error?.message);
        reject(new Error(`Failed to load video: ${error?.message || 'unknown error'}`));
      };
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onErr, { once: true });
    });

    // Validate video dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setIsGenerating(false);
      throw new Error('Invalid video dimensions');
    }

    // Use original video dimensions if targetWidth not specified
    const aspect = video.videoWidth / video.videoHeight;
    const width = targetWidth ? Math.round(targetWidth) : video.videoWidth;
    const height = targetWidth ? Math.round(width / aspect) : video.videoHeight;

    console.log('[VideoPreview] Canvas dimensions:', width, 'x', height);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsGenerating(false);
      throw new Error('Canvas context not available');
    }

    // Load watermark logo
    const watermarkLogo = new Image();
    watermarkLogo.crossOrigin = 'anonymous';
    const watermarkUrl = 'https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/public/LOGO%20DE%20WATERMARKING/Blue%20Modern%20Sound%20Studio%20Logo%20(3).png';
    
    let watermarkLoaded = false;
    await new Promise<void>((resolve) => {
      watermarkLogo.onload = () => {
        watermarkLoaded = true;
        resolve();
      };
      watermarkLogo.onerror = () => {
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
      setIsGenerating(false);
      throw new Error('Canvas captureStream not supported');
    }

    const chunks: BlobPart[] = [];
    
    // Try MP4 first (Safari, newer Chrome), fallback to WebM
    const mimeTypes = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm'
    ];
    
    let selectedMimeType = 'video/webm';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMimeType = mime;
        console.log('[VideoPreview] Using MIME type:', selectedMimeType);
        break;
      }
    }
    
    const recorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      videoBitsPerSecond,
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

    recorder.start(1000); // Request data every second

    // Track if we successfully drew any frames
    let framesDrawn = 0;
    let drawErrors = 0;

    // Draw loop with watermark
    let raf = 0;
    const draw = () => {
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
      } catch (err) {
        // Cross-origin taint or not ready
        drawErrors++;
        if (drawErrors === 1) {
          console.warn('[VideoPreview] Canvas draw error (CORS taint?):', err);
        }
      }
      raf = requestAnimationFrame(draw);
    };

    // Start playback and drawing
    console.log('[VideoPreview] Starting video playback...');
    try {
      await video.play();
      console.log('[VideoPreview] Video playing');
    } catch (playErr) {
      console.warn('[VideoPreview] Play failed:', playErr);
    }
    
    draw();

    // Stop after duration or when video ends (whichever first)
    const stopAfter = Math.min(durationSec, isFinite(video.duration) ? video.duration : durationSec);
    console.log('[VideoPreview] Recording for', stopAfter, 'seconds');
    await new Promise<void>((resolve) => setTimeout(resolve, stopAfter * 1000));

    cancelAnimationFrame(raf);
    try { video.pause(); } catch {}
    recorder.stop();
    await recordPromise;

    console.log('[VideoPreview] Frames drawn:', framesDrawn, 'Draw errors:', drawErrors);

    // Check if we got any data
    if (chunks.length === 0) {
      setIsGenerating(false);
      throw new Error('No video data recorded - possible CORS issue');
    }

    const outputMimeType = selectedMimeType.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
    const blob = new Blob(chunks, { type: outputMimeType });
    
    console.log('[VideoPreview] Generated blob:', blob.size, 'bytes, type:', blob.type);
    
    // Validate blob size (should be at least a few KB for real video)
    if (blob.size < 1000) {
      setIsGenerating(false);
      throw new Error('Generated preview too small - likely empty frames due to CORS');
    }
    
    setIsGenerating(false);
    return blob;
  }, []);

  const cancel = useCallback(() => {
    try { recorderRef.current?.stop(); } catch {}
    setIsGenerating(false);
  }, []);

  return { isGenerating, generate, cancel };
}
