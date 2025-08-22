import centerLogo from '@/assets/visustock-center-logo.png';

interface CenteredWatermarkOptions {
  opacity?: number;
  quality?: number;
}

/**
 * Creates a centered watermark on images using Canvas API
 * Watermark size = image width / 8 (12.5% of image width)
 * Opacity = 50% for optimal visibility without being intrusive
 */
export const createCenteredWatermarkImage = async (
  imageFile: File,
  options: CenteredWatermarkOptions = {}
): Promise<Blob> => {
  const { opacity = 0.5, quality = 0.9 } = options;

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
        // Calculate watermark size: image width / 8
        const watermarkWidth = img.width / 8;
        const aspectRatio = logo.height / logo.width;
        const watermarkHeight = watermarkWidth * aspectRatio;
        
        // Center position
        const x = (img.width - watermarkWidth) / 2;
        const y = (img.height - watermarkHeight) / 2;
        
        // Apply opacity and draw watermark
        ctx.globalAlpha = opacity;
        ctx.drawImage(logo, x, y, watermarkWidth, watermarkHeight);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create watermarked image'));
          }
        }, 'image/webp', quality);
      };
      
      logo.onerror = () => {
        // Fallback to text watermark
        createTextWatermark(ctx, img.width, img.height, opacity);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create fallback watermark'));
          }
        }, 'image/webp', quality);
      };
      
      logo.src = centerLogo;
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
};

/**
 * Fallback text watermark when logo fails to load
 */
const createTextWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number, opacity: number) => {
  const fontSize = width / 16; // Proportional text size
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Text with outline for better visibility
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeText('VISUSTOCK', width / 2, height / 2);
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillText('VISUSTOCK', width / 2, height / 2);
};

/**
 * Generate preview and fullscreen watermarked images
 */
export const generateWatermarkedImages = async (
  imageFile: File,
  options: CenteredWatermarkOptions = {}
): Promise<{
  preview: Blob;
  fullscreen: Blob;
  previewFilename: string;
  fullscreenFilename: string;
}> => {
  const baseName = imageFile.name.replace(/\.[^/.]+$/, "");
  
  // Create preview (max 1280px width)
  const previewFile = await resizeImage(imageFile, 1280);
  const preview = await createCenteredWatermarkImage(previewFile, options);
  
  // Create fullscreen (original resolution)
  const fullscreen = await createCenteredWatermarkImage(imageFile, options);
  
  return {
    preview,
    fullscreen,
    previewFilename: `${baseName}_preview_center_watermarked.webp`,
    fullscreenFilename: `${baseName}_fullscreen_center_watermarked.${imageFile.name.split('.').pop()}`
  };
};

/**
 * Resize image to max width while maintaining aspect ratio
 */
const resizeImage = (file: File, maxWidth: number): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      if (img.width <= maxWidth) {
        resolve(file);
        return;
      }
      
      const ratio = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * ratio;
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], file.name, { type: 'image/webp' }));
        } else {
          resolve(file);
        }
      }, 'image/webp', 0.9);
    };
    
    img.src = URL.createObjectURL(file);
  });
};