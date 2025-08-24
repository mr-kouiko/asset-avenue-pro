import watermarkLogo from '@/assets/visustock-watermark-logo.png';

interface WatermarkResult {
  type: 'image' | 'video' | 'audio' | 'other';
  thumbnail: Blob;
  watermarked?: Blob;
  preview?: Blob;
  videoMeta?: {
    duration?: number;
    width?: number;
    height?: number;
    watermarkSize?: number;
  };
}

// Load watermark image
const loadWatermarkImage = (): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load watermark'));
    img.src = watermarkLogo;
  });
};

// Create canvas from image
const createCanvasFromImage = (img: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return canvas;
};

// Apply watermark to image
const applyWatermarkToImage = async (
  originalCanvas: HTMLCanvasElement,
  watermark: HTMLImageElement,
  opacity: number = 0.7
): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  canvas.width = originalCanvas.width;
  canvas.height = originalCanvas.height;
  const ctx = canvas.getContext('2d')!;

  // Draw original image
  ctx.drawImage(originalCanvas, 0, 0);

  // Calculate watermark size (30-40% of image width)
  const watermarkSize = Math.min(
    originalCanvas.width * 0.35,
    originalCanvas.height * 0.35,
    300 // Max size
  );

  // Center the watermark
  const x = (originalCanvas.width - watermarkSize) / 2;
  const y = (originalCanvas.height - watermarkSize) / 2;

  // Apply watermark with opacity
  ctx.globalAlpha = opacity;
  ctx.drawImage(watermark, x, y, watermarkSize, watermarkSize);
  ctx.globalAlpha = 1;

  return canvas;
};

// Create thumbnail from canvas
const createThumbnail = (
  sourceCanvas: HTMLCanvasElement,
  maxSize: number = 300
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Calculate thumbnail dimensions
  let { width, height } = sourceCanvas;
  if (width > height) {
    if (width > maxSize) {
      height = (height * maxSize) / width;
      width = maxSize;
    }
  } else {
    if (height > maxSize) {
      width = (width * maxSize) / height;
      height = maxSize;
    }
  }

  canvas.width = width;
  canvas.height = height;

  // Draw thumbnail
  ctx.drawImage(sourceCanvas, 0, 0, width, height);
  return canvas;
};

// Create preview (smaller watermarked version)
const createPreview = (
  sourceCanvas: HTMLCanvasElement,
  maxSize: number = 800
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Calculate preview dimensions
  let { width, height } = sourceCanvas;
  if (width > maxSize || height > maxSize) {
    if (width > height) {
      height = (height * maxSize) / width;
      width = maxSize;
    } else {
      width = (width * maxSize) / height;
      height = maxSize;
    }
  }

  canvas.width = width;
  canvas.height = height;

  // Draw preview
  ctx.drawImage(sourceCanvas, 0, 0, width, height);
  return canvas;
};

// Convert canvas to blob
const canvasToBlob = (canvas: HTMLCanvasElement, quality: number = 0.9): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert canvas to blob'));
    }, 'image/webp', quality);
  });
};

// Process image file
const processImageFile = async (file: File): Promise<WatermarkResult> => {
  const watermark = await loadWatermarkImage();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      try {
        // Create canvas from original image
        const originalCanvas = createCanvasFromImage(img);
        
        // Apply watermark
        const watermarkedCanvas = await applyWatermarkToImage(originalCanvas, watermark);
        
        // Create thumbnail from watermarked image
        const thumbnailCanvas = createThumbnail(watermarkedCanvas);
        
        // Create preview (smaller watermarked version)
        const previewCanvas = createPreview(watermarkedCanvas);
        
        // Convert to blobs
        const [watermarked, thumbnail, preview] = await Promise.all([
          canvasToBlob(watermarkedCanvas),
          canvasToBlob(thumbnailCanvas),
          canvasToBlob(previewCanvas)
        ]);

        resolve({
          type: 'image',
          watermarked,
          thumbnail,
          preview
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Process video file (create thumbnail and metadata)
const processVideoFile = async (file: File): Promise<WatermarkResult> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    
    video.onloadedmetadata = async () => {
      try {
        // Seek to middle of video for thumbnail
        video.currentTime = Math.min(video.duration / 2, 10);
        
        video.onseeked = async () => {
          try {
            // Create canvas for thumbnail
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(video, 0, 0);
            
            // Create thumbnail
            const thumbnailCanvas = createThumbnail(canvas);
            const thumbnail = await canvasToBlob(thumbnailCanvas);
            
            // Calculate watermark size for video (25-35% of width)
            const watermarkSize = Math.min(
              video.videoWidth * 0.3,
              video.videoHeight * 0.3,
              250
            );
            
            resolve({
              type: 'video',
              thumbnail,
              videoMeta: {
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                watermarkSize
              }
            });
          } catch (error) {
            reject(error);
          }
        };
      } catch (error) {
        reject(error);
      }
    };

    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(file);
  });
};

// Process audio file (create waveform thumbnail)
const processAudioFile = async (file: File): Promise<WatermarkResult> => {
  try {
    // Create a simple audio thumbnail (waveform visualization)
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#1e40af');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 200);
    
    // Draw audio icon/waveform placeholder
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎵 AUDIO', 150, 100);
    ctx.font = '12px Arial';
    ctx.fillText(file.name.split('.').pop()?.toUpperCase() || 'AUDIO', 150, 120);
    
    // Draw simple waveform pattern
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 300; i += 10) {
      const height = Math.random() * 60 + 20;
      ctx.moveTo(i, 150);
      ctx.lineTo(i, 150 - height);
    }
    ctx.stroke();
    
    const thumbnail = await canvasToBlob(canvas);
    
    return {
      type: 'audio',
      thumbnail
    };
  } catch (error) {
    throw new Error(`Failed to process audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Create fallback thumbnail for unsupported files
const createFallbackThumbnail = async (file: File): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;
  
  // Background
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, 300, 200);
  
  // File icon
  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('📄', 150, 80);
  
  // File name and type
  ctx.font = 'bold 14px Arial';
  ctx.fillText('FILE', 150, 110);
  ctx.font = '12px Arial';
  const extension = file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
  ctx.fillText(extension, 150, 130);
  
  return canvasToBlob(canvas);
};

// Main processing function
export const processFileWithWatermark = async (file: File): Promise<WatermarkResult> => {
  const fileType = file.type.toLowerCase();
  
  try {
    if (fileType.startsWith('image/')) {
      return await processImageFile(file);
    } else if (fileType.startsWith('video/')) {
      return await processVideoFile(file);
    } else if (fileType.startsWith('audio/')) {
      return await processAudioFile(file);
    } else {
      // Fallback for other file types
      const thumbnail = await createFallbackThumbnail(file);
      return {
        type: 'other',
        thumbnail
      };
    }
  } catch (error) {
    console.error('Error processing file:', error);
    
    // Fallback thumbnail on error
    const thumbnail = await createFallbackThumbnail(file);
    return {
      type: 'other',
      thumbnail
    };
  }
};

/**
 * Legacy function for backwards compatibility
 */
export const createWatermarkedImage = async (
  imageFile: File,
  options: { opacity?: number; quality?: number } = {}
): Promise<{ watermarkedBlob: Blob; thumbnailBlob?: Blob; previewBlob?: Blob }> => {
  const { opacity = 0.6, quality = 0.9 } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const img = new Image();
    const logo = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      logo.onload = () => {
        // Calculate watermark size: 35% of image width (middle of 30-40% range)
        const watermarkWidth = img.width * 0.35;
        const aspectRatio = logo.height / logo.width;
        const watermarkHeight = watermarkWidth * aspectRatio;
        
        // Center position
        const x = (img.width - watermarkWidth) / 2;
        const y = (img.height - watermarkHeight) / 2;
        
        // Apply opacity and draw watermark
        ctx.globalAlpha = opacity;
        ctx.drawImage(logo, x, y, watermarkWidth, watermarkHeight);
        ctx.globalAlpha = 1;
        
        // Convert to watermarked blob
        canvas.toBlob(async (watermarkedBlob) => {
          if (watermarkedBlob) {
            // Generate thumbnail from watermarked image
            const thumbnailBlob = await generateThumbnailFromCanvas(canvas, 400);
            const previewBlob = await generateThumbnailFromCanvas(canvas, 800);
            
            resolve({
              watermarkedBlob,
              thumbnailBlob,
              previewBlob
            });
          } else {
            reject(new Error('Failed to create watermarked image'));
          }
        }, 'image/webp', quality);
      };
      
      logo.onerror = () => {
        // Fallback to text watermark
        createTextWatermark(ctx, img.width, img.height, opacity);
        canvas.toBlob(async (watermarkedBlob) => {
          if (watermarkedBlob) {
            const thumbnailBlob = await generateThumbnailFromCanvas(canvas, 400);
            const previewBlob = await generateThumbnailFromCanvas(canvas, 800);
            
            resolve({
              watermarkedBlob,
              thumbnailBlob,
              previewBlob
            });
          } else {
            reject(new Error('Failed to create fallback watermark'));
          }
        }, 'image/webp', quality);
      };
      
      logo.src = watermarkLogo;
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
};

/**
 * Helper functions
 */
const generateThumbnailFromCanvas = (canvas: HTMLCanvasElement, maxSize: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const thumbnailCanvas = document.createElement('canvas');
    const thumbnailCtx = thumbnailCanvas.getContext('2d');
    
    if (!thumbnailCtx) {
      reject(new Error('Failed to create thumbnail canvas'));
      return;
    }
    
    // Calculate thumbnail size maintaining aspect ratio
    const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height);
    thumbnailCanvas.width = canvas.width * scale;
    thumbnailCanvas.height = canvas.height * scale;
    
    // Draw scaled image
    thumbnailCtx.drawImage(canvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
    
    thumbnailCanvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create thumbnail'));
      }
    }, 'image/webp', 0.8);
  });
};

const createTextWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number, opacity: number) => {
  const fontSize = width * 0.08; // 8% of width
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Text with outline for better visibility
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 3;
  ctx.strokeText('VISUSTOCK', width / 2, height / 2);
  
  ctx.fillStyle = 'rgba(0, 100, 200, 0.8)';
  ctx.fillText('VISUSTOCK', width / 2, height / 2);
};

const createAudioIcon = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  // Create simple gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1e40af');
  gradient.addColorStop(1, '#3b82f6');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Draw audio icon
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.8;
  
  // Simple speaker icon
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Speaker base
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(centerX - 15, centerY - 10, 15, 20);
  
  // Sound waves
  ctx.beginPath();
  ctx.arc(centerX, centerY, 25, -Math.PI/3, Math.PI/3);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, 35, -Math.PI/4, Math.PI/4);
  ctx.stroke();
  
  // Add watermark text
  ctx.globalAlpha = 0.4;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('VISUSTOCK AUDIO', centerX, centerY + 50);
};