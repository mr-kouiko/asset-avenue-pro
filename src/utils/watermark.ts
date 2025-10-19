export interface WatermarkOptions {
  opacity?: number;
  position?: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'repeated-diagonal';
  size?: number; // percentage of canvas width
  text?: string;
  logoPath?: string;
  spacing?: number; // spacing between repeated watermarks
}

export interface ThumbnailOptions {
  maxSize?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/png';
}

export const addWatermarkToImage = async (
  imageFile: File,
  options: WatermarkOptions = {}
): Promise<Blob> => {
  const {
    opacity = 0.4,
    position = 'bottom-right',
    size = 12,
    text = 'VisuStock',
    logoPath = '/visustock-logo-watermark.png'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Load and draw logo with better sizing
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.onload = () => {
          // Calculate proportional logo size with better visibility
          const logoSize = Math.max(60, Math.min(150, (canvas.width * size) / 100));
          let x = canvas.width / 2 - logoSize / 2;
          let y = canvas.height / 2 - logoSize / 2;

          switch (position) {
            case 'bottom-right':
              x = canvas.width - logoSize - 20;
              y = canvas.height - logoSize - 20;
              break;
            case 'bottom-left':
              x = 20;
              y = canvas.height - logoSize - 20;
              break;
            case 'top-right':
              x = canvas.width - logoSize - 20;
              y = 20;
              break;
            case 'top-left':
              x = 20;
              y = 20;
              break;
          }

          // Create subtle background for better logo visibility
          ctx.globalAlpha = opacity * 0.2;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.fillRect(x - 8, y - 8, logoSize + 16, logoSize + 16);
          
          // Draw logo with enhanced opacity
          ctx.globalAlpha = opacity;
          ctx.drawImage(logoImg, x, y, logoSize, logoSize);
          ctx.globalAlpha = 1;

          // Convert canvas to high-quality blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create watermarked image'));
              }
            },
            'image/png',
            1.0
          );
        };

        logoImg.onerror = () => {
          // Fallback to text watermark if logo fails to load
          const fontSize = Math.max(16, (canvas.width * size) / 100);
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
          ctx.lineWidth = 2;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Calculate position
          let x = canvas.width / 2;
          let y = canvas.height / 2;

          switch (position) {
            case 'bottom-right':
              x = canvas.width - fontSize * 2;
              y = canvas.height - fontSize;
              ctx.textAlign = 'right';
              break;
            case 'bottom-left':
              x = fontSize;
              y = canvas.height - fontSize;
              ctx.textAlign = 'left';
              break;
            case 'top-right':
              x = canvas.width - fontSize * 2;
              y = fontSize * 2;
              ctx.textAlign = 'right';
              break;
            case 'top-left':
              x = fontSize;
              y = fontSize * 2;
              ctx.textAlign = 'left';
              break;
            case 'center':
            default:
              // Keep center position
              break;
          }

          // Draw watermark with stroke for better visibility
          ctx.strokeText(text, x, y);
          ctx.fillText(text, x, y);

          // Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create watermarked image'));
              }
            },
            'image/jpeg',
            0.9
          );
        };

        logoImg.src = logoPath;
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
};

export const addWatermarkToVideo = async (
  videoFile: File,
  options: WatermarkOptions = {}
): Promise<Blob> => {
  const {
    opacity = 0.6,
    position = 'bottom-right',
    size = 12,
    logoPath = '/visustock-logo-watermark.png'
  } = options;

  // For now, video watermarking would require server-side processing with ffmpeg
  // This is a placeholder that returns the original video
  // In production, implement server-side video watermarking
  console.info('Video watermarking: Server-side implementation recommended for production');
  return videoFile;
};

export const shouldWatermark = (fileType: string): boolean => {
  return fileType.startsWith('image/') || fileType.startsWith('video/');
};

// Create web preview with repeated diagonal watermark
export const createWebPreviewWithWatermark = async (
  imageFile: File,
  options: WatermarkOptions = {}
): Promise<Blob> => {
  const {
    opacity = 0.3,
    text = 'VisuStock',
    logoPath = '/visustock-logo-watermark.png',
    spacing = 200
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Resize image to max width of 1280px while maintaining aspect ratio
        const maxWidth = 1280;
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw the original image
        ctx.drawImage(img, 0, 0, width, height);

        // Load watermark logo
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        
        logoImg.onload = () => {
          // Create repeated diagonal watermark pattern
          const watermarkSize = 120; // Fixed size for consistency
          const diagonalSpacing = spacing;
          
          // Calculate how many watermarks we need across the diagonal
          const diagonal = Math.sqrt(width * width + height * height);
          const watermarksNeeded = Math.ceil(diagonal / diagonalSpacing) + 2;
          
          // Save the current context state
          ctx.save();
          
          // Set up for repeated watermarks
          ctx.globalAlpha = opacity;
          
          // Create the diagonal pattern
          for (let row = -watermarksNeeded; row <= watermarksNeeded; row++) {
            for (let col = -watermarksNeeded; col <= watermarksNeeded; col++) {
              // Calculate position on a 45-degree diagonal grid
              const x = (col * diagonalSpacing) + (row * diagonalSpacing * 0.5);
              const y = row * diagonalSpacing * 0.866; // sqrt(3)/2 for proper diagonal spacing
              
              // Only draw if the watermark would be visible on the canvas
              if (x + watermarkSize > -100 && x < width + 100 && 
                  y + watermarkSize > -100 && y < height + 100) {
                
                ctx.save();
                // Rotate 45 degrees around the watermark center
                ctx.translate(x + watermarkSize/2, y + watermarkSize/2);
                ctx.rotate(Math.PI / 4); // 45 degrees
                
                // Draw the logo centered
                ctx.drawImage(logoImg, -watermarkSize/2, -watermarkSize/2, watermarkSize, watermarkSize);
                
                ctx.restore();
              }
            }
          }
          
          // Restore the context state
          ctx.restore();

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create web preview with watermark'));
              }
            },
            'image/jpeg',
            0.85 // Good quality for web preview
          );
        };

        logoImg.onerror = () => {
          // Fallback to text watermark pattern
          const fontSize = 32;
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
          ctx.lineWidth = 2;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Create diagonal text pattern
          const diagonalSpacing = spacing;
          const diagonal = Math.sqrt(width * width + height * height);
          const watermarksNeeded = Math.ceil(diagonal / diagonalSpacing) + 2;
          
          ctx.save();
          
          for (let row = -watermarksNeeded; row <= watermarksNeeded; row++) {
            for (let col = -watermarksNeeded; col <= watermarksNeeded; col++) {
              const x = (col * diagonalSpacing) + (row * diagonalSpacing * 0.5);
              const y = row * diagonalSpacing * 0.866;
              
              if (x > -100 && x < width + 100 && y > -100 && y < height + 100) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(Math.PI / 4);
                
                // Draw text with stroke for better visibility
                ctx.strokeText(text, 0, 0);
                ctx.fillText(text, 0, 0);
                
                ctx.restore();
              }
            }
          }
          
          ctx.restore();

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create web preview with text watermark'));
              }
            },
            'image/jpeg',
            0.85
          );
        };

        logoImg.src = logoPath;
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
};

// Default watermark logo from Supabase storage
const DEFAULT_LOGO_URL = 'https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/public/LOGO%20DE%20WATERMARKING/Blue%20Modern%20Sound%20Studio%20Logo%20(3).png';

// Generate video thumbnail by extracting frame at 1 second
// Returns clean thumbnail WITHOUT watermark - watermark is added by VideoWatermark component
export const generateVideoThumbnail = async (
  videoFile: File,
  options: ThumbnailOptions = {}
): Promise<Blob> => {
  const { maxSize = 400, quality = 0.8, format = 'image/jpeg' } = options;
  
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    video.onloadedmetadata = () => {
      // Set canvas dimensions maintaining aspect ratio
      const aspectRatio = video.videoWidth / video.videoHeight;
      if (video.videoWidth > video.videoHeight) {
        canvas.width = Math.min(maxSize, video.videoWidth);
        canvas.height = canvas.width / aspectRatio;
      } else {
        canvas.height = Math.min(maxSize, video.videoHeight);
        canvas.width = canvas.height * aspectRatio;
      }
      
      // Seek to 1 second for thumbnail (or start if video is shorter)
      video.currentTime = Math.min(1, video.duration * 0.1);
    };
    
    video.onseeked = () => {
      // Draw video frame to canvas - NO watermark, will be added by VideoWatermark component
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob immediately without watermark
      canvas.toBlob((blob) => {
        if (blob) {
          // Clean up video element
          URL.revokeObjectURL(video.src);
          resolve(blob);
        } else {
          reject(new Error('Failed to create video thumbnail'));
        }
      }, format, quality);
    };
    
    video.onerror = (e) => {
      console.error('Video thumbnail generation error:', e);
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video for thumbnail'));
    };
    
    // Create object URL and load video
    video.src = URL.createObjectURL(videoFile);
    video.load();
  });
};

// Generate image thumbnail - clean without watermark for display
export const generateImageThumbnail = async (
  imageFile: File,
  options: ThumbnailOptions = {}
): Promise<Blob> => {
  const { maxSize = 400, quality = 0.8, format = 'image/jpeg' } = options;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Calculate thumbnail dimensions maintaining aspect ratio
      const aspectRatio = img.width / img.height;
      if (img.width > img.height) {
        canvas.width = Math.min(maxSize, img.width);
        canvas.height = canvas.width / aspectRatio;
      } else {
        canvas.height = Math.min(maxSize, img.height);
        canvas.width = canvas.height * aspectRatio;
      }
      
      // Draw image - clean thumbnail without watermark
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          URL.revokeObjectURL(img.src);
          resolve(blob);
        } else {
          reject(new Error('Failed to create image thumbnail'));
        }
      }, format, quality);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(imageFile);
  });
};

// Generate PDF thumbnail (fallback with watermark)
export const generatePDFThumbnail = async (
  pdfFile: File,
  options: ThumbnailOptions = {}
): Promise<Blob> => {
  // For PDF files, generate a styled fallback thumbnail with watermark
  // This avoids external dependencies while still providing branded visuals
  console.log('Generating fallback thumbnail for PDF file:', pdfFile.name);
  return generateFallbackThumbnail('PDF', options);
};

// Generate audio waveform thumbnail
export const generateAudioThumbnail = async (
  audioFile: File,
  options: ThumbnailOptions = {}
): Promise<Blob> => {
  const { maxSize = 400, quality = 0.8, format = 'image/jpeg' } = options;
  
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    canvas.width = maxSize;
    canvas.height = maxSize * 0.6; // 5:3 aspect ratio for audio
    
    // Create a simple waveform visualization
    ctx.fillStyle = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw waveform pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const centerY = canvas.height / 2;
    const barWidth = 3;
    const barSpacing = 2;
    const numBars = Math.floor(canvas.width / (barWidth + barSpacing));
    
    for (let i = 0; i < numBars; i++) {
      const x = i * (barWidth + barSpacing);
      const height = Math.random() * (canvas.height * 0.3) + 10;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(x, centerY - height / 2, barWidth, height);
    }
    
    // Add audio icon
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♪', canvas.width / 2, canvas.height / 2);
    
    // Add watermark
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    
    logoImg.onload = () => {
      const watermarkSize = Math.min(60, canvas.width * 0.12);
      const x = canvas.width - watermarkSize - 10;
      const y = canvas.height - watermarkSize - 10;
      
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x - 5, y - 5, watermarkSize + 10, watermarkSize + 10);
      
      ctx.globalAlpha = 0.7;
      ctx.drawImage(logoImg, x, y, watermarkSize, watermarkSize);
      ctx.globalAlpha = 1;
      
      canvas.toBlob(resolve, format, quality);
    };
    
    logoImg.onerror = () => {
      const fontSize = Math.max(10, canvas.width * 0.03);
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      
      const x = canvas.width - 8;
      const y = canvas.height - 8;
      
      ctx.fillText('VisuStock', x, y);
      canvas.toBlob(resolve, format, quality);
    };
    
    logoImg.src = DEFAULT_LOGO_URL;
  });
};

// Generate fallback thumbnail for unsupported file types
export const generateFallbackThumbnail = async (
  fileType: string,
  options: ThumbnailOptions = {}
): Promise<Blob> => {
  const { maxSize = 400, quality = 0.8, format = 'image/jpeg' } = options;
  
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = maxSize;
    canvas.height = maxSize;
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#4f46e5');
    gradient.addColorStop(1, '#7c3aed');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add file type text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `bold ${canvas.width * 0.1}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fileType, canvas.width / 2, canvas.height / 2);
    
    // Add watermark
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    
    logoImg.onload = () => {
      const watermarkSize = Math.min(60, canvas.width * 0.12);
      const x = canvas.width - watermarkSize - 10;
      const y = canvas.height - watermarkSize - 10;
      
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x - 5, y - 5, watermarkSize + 10, watermarkSize + 10);
      
      ctx.globalAlpha = 0.7;
      ctx.drawImage(logoImg, x, y, watermarkSize, watermarkSize);
      ctx.globalAlpha = 1;
      
      canvas.toBlob(resolve, format, quality);
    };
    
    logoImg.onerror = () => {
      const fontSize = Math.max(10, canvas.width * 0.03);
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      
      const x = canvas.width - 8;
      const y = canvas.height - 8;
      
      ctx.fillText('VisuStock', x, y);
      canvas.toBlob(resolve, format, quality);
    };
    
    logoImg.src = DEFAULT_LOGO_URL;
  });
};

// Main thumbnail generation function
export const generateThumbnail = async (
  file: File,
  options: ThumbnailOptions = {}
): Promise<Blob> => {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  try {
    if (fileType.startsWith('video/')) {
      return await generateVideoThumbnail(file, options);
    } else if (fileType.startsWith('image/')) {
      return await generateImageThumbnail(file, options);
    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await generatePDFThumbnail(file, options);
    } else if (fileType.startsWith('audio/')) {
      return await generateAudioThumbnail(file, options);
    } else {
      // Fallback for unknown file types
      const typeLabel = fileName.split('.').pop()?.toUpperCase() || 'FILE';
      return await generateFallbackThumbnail(typeLabel, options);
    }
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    const typeLabel = fileName.split('.').pop()?.toUpperCase() || 'FILE';
    return await generateFallbackThumbnail(typeLabel, options);
  }
};

// Enhanced function for generating multiple thumbnail options for short videos
export const generateMultipleVideoThumbnails = async (
  videoFile: File,
  options: ThumbnailOptions = {}
): Promise<Blob[]> => {
  // For now, return single thumbnail - can be enhanced later for multiple frames
  const thumbnail = await generateVideoThumbnail(videoFile, options);
  return [thumbnail];
};
