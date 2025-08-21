export interface WatermarkOptions {
  opacity?: number;
  position?: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: number; // percentage of canvas width
  text?: string;
  logoPath?: string;
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
    logoPath = '/lovable-uploads/cbcf1708-4325-4f67-9462-a971922b933c.png'
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
          // Calculate proportional logo size (minimum 40px, maximum based on image size)
          const logoSize = Math.max(40, Math.min(120, (canvas.width * size) / 100));
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

          // Create semi-transparent background for logo visibility
          ctx.globalAlpha = opacity * 0.3;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10);
          
          // Draw logo with opacity
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
    logoPath = '/lovable-uploads/cbcf1708-4325-4f67-9462-a971922b933c.png'
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

export const generateThumbnail = async (
  file: File, 
  options: ThumbnailOptions = {}
): Promise<Blob> => {
  const {
    maxSize = 600, // Higher resolution for better web display
    quality = 0.9,
    format = 'image/jpeg'
  } = options;

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

          // Calculate high-quality thumbnail size
          let { width, height } = img;
          
          // Maintain aspect ratio while ensuring good quality
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw resized image with high quality
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create thumbnail'));
              }
            },
            format,
            quality
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
    return generateVideoThumbnail(file, options);
  }

  // For other file types, return the original file
  return file;
};

export const generateVideoThumbnail = async (
  videoFile: File,
  options: ThumbnailOptions = {}
): Promise<Blob> => {
  const {
    maxSize = 600,
    quality = 0.9,
    format = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    
    let thumbnailGenerated = false;
    
    video.onloadedmetadata = () => {
      if (thumbnailGenerated) return;
      
      // Smart frame selection based on video duration
      let seekTime: number;
      
      if (video.duration < 10) {
        // For short videos (<10s), try multiple frames and pick the best one
        seekTime = video.duration * 0.3; // 30% through the video
      } else if (video.duration < 30) {
        // For medium videos, seek to 20% or 3 seconds, whichever is later
        seekTime = Math.max(3, video.duration * 0.2);
      } else {
        // For longer videos, seek to 10% or 5 seconds, whichever is later
        seekTime = Math.max(5, video.duration * 0.1);
      }
      
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      if (thumbnailGenerated) return;
      thumbnailGenerated = true;
      
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate high-quality thumbnail size
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw video frame with high quality
        ctx.drawImage(video, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create video thumbnail'));
            }
          },
          format,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    video.onerror = (e) => {
      console.error('Video loading error:', e);
      reject(new Error('Failed to load video for thumbnail generation'));
    };

    // Set up timeout to prevent hanging
    setTimeout(() => {
      if (!thumbnailGenerated) {
        reject(new Error('Video thumbnail generation timed out'));
      }
    }, 10000);

    video.src = URL.createObjectURL(videoFile);
  });
};

// Enhanced function for generating multiple thumbnail options for short videos
export const generateMultipleVideoThumbnails = async (
  videoFile: File,
  options: ThumbnailOptions = {}
): Promise<Blob[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    
    video.onloadedmetadata = async () => {
      if (video.duration >= 10) {
        // For longer videos, just return single thumbnail
        try {
          const thumbnail = await generateVideoThumbnail(videoFile, options);
          resolve([thumbnail]);
        } catch (error) {
          reject(error);
        }
        return;
      }
      
      // For short videos, generate multiple thumbnails
      const thumbnails: Blob[] = [];
      const framePositions = [0.2, 0.4, 0.6, 0.8]; // 20%, 40%, 60%, 80%
      
      try {
        for (const position of framePositions) {
          const seekTime = video.duration * position;
          
          await new Promise<void>((seekResolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              seekResolve();
            };
            video.addEventListener('seeked', onSeeked);
            video.currentTime = seekTime;
          });
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) continue;
          
          const { maxSize = 600, quality = 0.9, format = 'image/jpeg' } = options;
          
          let width = video.videoWidth;
          let height = video.videoHeight;
          
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(video, 0, 0, width, height);
          
          const thumbnail = await new Promise<Blob>((blobResolve, blobReject) => {
            canvas.toBlob(
              (blob) => blob ? blobResolve(blob) : blobReject(new Error('Failed to create thumbnail')),
              format,
              quality
            );
          });
          
          thumbnails.push(thumbnail);
        }
        
        // Return the best thumbnail (or all if needed for selection)
        // For now, return the middle one (40% position) as it's often most representative
        resolve(thumbnails.length > 1 ? [thumbnails[1]] : thumbnails);
        
      } catch (error) {
        reject(error);
      }
    };

    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(videoFile);
  });
};
