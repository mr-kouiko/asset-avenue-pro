import watermarkLogo from '@/assets/visustock-watermark-logo.png';

interface AutoWatermarkOptions {
  opacity?: number;
  quality?: number;
}

interface WatermarkResult {
  watermarkedBlob: Blob;
  thumbnailBlob?: Blob;
  previewBlob?: Blob;
}

/**
 * Automatically applies watermark to images with optimal sizing (30-40% of image width)
 * Creates both watermarked version and thumbnail
 */
export const createWatermarkedImage = async (
  imageFile: File,
  options: AutoWatermarkOptions = {}
): Promise<WatermarkResult> => {
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
 * Generates video thumbnail and prepares for server-side watermarking
 */
export const prepareVideoForWatermarking = async (
  videoFile: File
): Promise<{ thumbnailBlob: Blob; videoMeta: any }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    video.onloadeddata = () => {
      // Set canvas size maintaining aspect ratio with max width 800px
      const maxWidth = 800;
      const scale = Math.min(maxWidth / video.videoWidth, maxWidth / video.videoHeight);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      // Draw first frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Generate thumbnail
      canvas.toBlob((thumbnailBlob) => {
        if (thumbnailBlob) {
          resolve({
            thumbnailBlob,
            videoMeta: {
              width: video.videoWidth,
              height: video.videoHeight,
              duration: video.duration,
              // Calculate watermark size for server-side processing (30% of width)
              watermarkSize: Math.round(video.videoWidth * 0.30)
            }
          });
        } else {
          reject(new Error('Failed to generate video thumbnail'));
        }
      }, 'image/webp', 0.8);
    };
    
    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(videoFile);
    video.currentTime = 0;
  });
};

/**
 * Generates a fallback thumbnail for unsupported file types
 */
export const generateFallbackThumbnail = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    canvas.width = 400;
    canvas.height = 200;

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1e40af');
    gradient.addColorStop(1, '#3b82f6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw file icon
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📄', canvas.width / 2, canvas.height / 2 - 20);

    // Add file name
    ctx.font = 'bold 16px Arial';
    const fileName = file.name.length > 30 ? file.name.substring(0, 30) + '...' : file.name;
    ctx.fillText(fileName, canvas.width / 2, canvas.height / 2 + 40);

    // Add watermark
    ctx.globalAlpha = 0.4;
    ctx.font = 'bold 14px Arial';
    ctx.fillText('VISUSTOCK', canvas.width / 2, canvas.height - 20);

    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create fallback thumbnail'));
      }
    }, 'image/webp', 0.8);
  });
};

/**
 * Generates audio waveform thumbnail
 */
export const generateAudioThumbnail = async (
  audioFile: File
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    // Set canvas dimensions
    canvas.width = 400;
    canvas.height = 200;

    const drawWaveform = async () => {
      try {
        // Create audio context for waveform analysis
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Get audio data
        const channelData = audioBuffer.getChannelData(0);
        const samples = canvas.width;
        const blockSize = Math.floor(channelData.length / samples);
        
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1e40af');
        gradient.addColorStop(1, '#3b82f6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw waveform
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.9;
        
        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[blockStart + j]);
          }
          let blockAvg = sum / blockSize;
          let yOffset = blockAvg * canvas.height * 0.8;
          
          ctx.fillRect(i, (canvas.height - yOffset) / 2, 1, yOffset);
        }
        
        // Add watermark text
        ctx.globalAlpha = 0.3;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('VISUSTOCK AUDIO', canvas.width / 2, canvas.height / 2);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create audio thumbnail'));
          }
        }, 'image/webp', 0.8);
        
        audioContext.close();
      } catch (error) {
        // Fallback: create simple audio icon
        createAudioIcon(ctx, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create audio icon'));
          }
        }, 'image/webp', 0.8);
      }
    };

    drawWaveform();
  });
};

/**
 * Automatically processes any file type and applies appropriate watermarking/thumbnail generation
 */
export const processFileWithWatermark = async (
  file: File
): Promise<{
  type: 'image' | 'video' | 'audio';
  watermarked?: Blob;
  thumbnail: Blob;
  preview?: Blob;
  videoMeta?: any;
}> => {
  const fileType = file.type;
  
  if (fileType.startsWith('image/')) {
    const result = await createWatermarkedImage(file);
    return {
      type: 'image',
      watermarked: result.watermarkedBlob,
      thumbnail: result.thumbnailBlob!,
      preview: result.previewBlob
    };
  } else if (fileType.startsWith('video/')) {
    const result = await prepareVideoForWatermarking(file);
    return {
      type: 'video',
      thumbnail: result.thumbnailBlob,
      videoMeta: result.videoMeta
    };
  } else if (fileType.startsWith('audio/')) {
    const thumbnailBlob = await generateAudioThumbnail(file);
    return {
      type: 'audio',
      thumbnail: thumbnailBlob
    };
  } else {
    // Fallback for unsupported file types (documents, 3D models, etc.)
    const thumbnailBlob = await generateFallbackThumbnail(file);
    return {
      type: 'other' as any,
      thumbnail: thumbnailBlob
    };
  }
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