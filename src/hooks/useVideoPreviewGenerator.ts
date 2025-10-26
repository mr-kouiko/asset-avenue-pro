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
 */
export function useVideoPreviewGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const generate = useCallback(async ({
    url,
    durationSec = 6,
    targetWidth = 426, // ~240p
    fps = 12,
    videoBitsPerSecond = 280_000, // ~280 kbps
  }: PreviewOptions): Promise<Blob> => {
    setIsGenerating(true);

    // Create video element
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;

    // Wait metadata
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => resolve();
      const onErr = (e: Event) => reject(new Error('Failed to load video for preview'));
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onErr, { once: true });
    });

    // Compute canvas dimensions preserving aspect ratio
    const aspect = video.videoWidth > 0 && video.videoHeight > 0
      ? video.videoWidth / video.videoHeight
      : 16 / 9;
    const width = Math.round(targetWidth);
    const height = Math.round(width / aspect);

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
    
    await new Promise<void>((resolve, reject) => {
      watermarkLogo.onload = () => resolve();
      watermarkLogo.onerror = () => {
        console.warn('Watermark logo failed to load, continuing without it');
        resolve(); // Continue even if watermark fails
      };
      watermarkLogo.src = watermarkUrl;
    });

    // Calculate watermark size - 5x larger than VideoWatermark 'normal' size
    // 100% width (20% * 5) with max 200% constraints (40% * 5)
    let watermarkWidth = Math.min(width * 1.0, width * 2.0);
    let watermarkHeight = (watermarkLogo.height / watermarkLogo.width) * watermarkWidth;
    
    // Ensure height doesn't exceed 200% of canvas height (40% * 5)
    if (watermarkHeight > height * 2.0) {
      watermarkHeight = height * 2.0;
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
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond,
    });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const recordPromise = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start();

    // Draw loop with watermark
    let raf = 0;
    const draw = () => {
      try {
        // Draw video frame
        ctx.drawImage(video, 0, 0, width, height);
        
        // Draw watermark if loaded (matching VideoWatermark 'normal' style)
        if (watermarkLogo.complete && watermarkLogo.naturalWidth > 0) {
          ctx.save();
          
          // Add drop shadow effect (matching filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3)))
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2;
          
          ctx.globalAlpha = 0.8; // 80% opacity
          ctx.drawImage(watermarkLogo, watermarkX, watermarkY, watermarkWidth, watermarkHeight);
          ctx.restore();
        }
      } catch (_) {
        // Cross-origin taint or not ready; ignore frame
      }
      raf = requestAnimationFrame(draw);
    };

    // Start playback and drawing
    await video.play().catch(() => {});
    draw();

    // Stop after duration or when video ends (whichever first)
    const stopAfter = Math.min(durationSec, isFinite(video.duration) ? video.duration : durationSec);
    await new Promise<void>((resolve) => setTimeout(resolve, stopAfter * 1000));

    cancelAnimationFrame(raf);
    try { video.pause(); } catch {}
    recorder.stop();
    await recordPromise;

    const blob = new Blob(chunks, { type: 'video/webm' });
    setIsGenerating(false);
    return blob;
  }, []);

  const cancel = useCallback(() => {
    try { recorderRef.current?.stop(); } catch {}
    setIsGenerating(false);
  }, []);

  return { isGenerating, generate, cancel };
}
