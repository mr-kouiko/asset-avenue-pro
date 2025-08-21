export interface WatermarkOptions {
  opacity?: number;
  position?: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: number; // percentage of canvas width
  text?: string;
}

export const addWatermarkToImage = async (
  imageFile: File,
  options: WatermarkOptions = {}
): Promise<Blob> => {
  const {
    opacity = 0.3,
    position = 'center',
    size = 20,
    text = 'VisuStock'
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

        // Load and draw logo instead of text
        const logoImg = new Image();
        logoImg.onload = () => {
          // Calculate logo size and position
          const logoSize = Math.max(50, (canvas.width * size) / 100);
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

          // Draw logo with opacity
          ctx.globalAlpha = opacity;
          ctx.drawImage(logoImg, x, y, logoSize, logoSize);
          ctx.globalAlpha = 1;

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

        logoImg.src = '/lovable-uploads/visustock-logo-no-bg.png';
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
    size = 15,
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    
    video.onloadedmetadata = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Load logo image
        const logoImg = new Image();
        logoImg.onload = () => {
          // For now, just return original video since proper video watermarking 
          // would require ffmpeg.wasm or server-side processing
          console.warn('Video watermarking: returning original file (full implementation needs ffmpeg.wasm)');
          resolve(videoFile);
        };

        logoImg.onerror = () => {
          console.warn('Could not load logo for video watermarking');
          resolve(videoFile);
        };

        logoImg.src = '/lovable-uploads/visustock-logo-no-bg.png';
      } catch (error) {
        reject(error);
      }
    };

    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(videoFile);
  });
};

export const shouldWatermark = (fileType: string): boolean => {
  return fileType.startsWith('image/') || fileType.startsWith('video/');
};

export const generateThumbnail = async (file: File): Promise<Blob> => {
  if (file.type.startsWith('image/')) {
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

          // Calculate thumbnail size (max 300px on longest side)
          const maxSize = 300;
          let { width, height } = img;
          
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

          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create thumbnail'));
              }
            },
            'image/jpeg',
            0.8
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
      img.src = URL.createObjectURL(file);
    });
  }

  if (file.type.startsWith('video/')) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      
      video.onloadedmetadata = () => {
        // Seek to 1 second or 10% of duration for better thumbnail
        const seekTime = Math.min(1, video.duration * 0.1);
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Calculate thumbnail size (max 300px on longest side)
          const maxSize = 300;
          let width = video.videoWidth;
          let height = video.videoHeight;
          
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

          // Draw video frame
          ctx.drawImage(video, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create video thumbnail'));
              }
            },
            'image/jpeg',
            0.8
          );
        } catch (error) {
          reject(error);
        }
      };

      video.onerror = () => reject(new Error('Failed to load video for thumbnail'));
      video.src = URL.createObjectURL(file);
    });
  }

  // For other file types, return the original file
  return file;
};
