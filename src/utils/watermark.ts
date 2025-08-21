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
    logoPath = '/lovable-uploads/821f7e0a-33fd-4ede-8204-66bf887c8baa.png'
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
    logoPath = '/lovable-uploads/821f7e0a-33fd-4ede-8204-66bf887c8baa.png'
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

// Generate audio waveform as thumbnail
export const generateAudioThumbnail = async (
  audioFile: File,
  options: ThumbnailOptions = {}
): Promise<Blob> => {
  const {
    maxSize = 600,
    quality = 0.9,
    format = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Set canvas dimensions for waveform
    canvas.width = maxSize;
    canvas.height = Math.round(maxSize * 0.4); // 16:10 aspect ratio

    // Create a simple waveform visualization
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
        
        // Clear canvas with gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1e3a8a');
        gradient.addColorStop(1, '#3b82f6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw waveform
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.8;
        
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j] || 0);
          }
          const average = sum / blockSize;
          const height = average * canvas.height * 0.8;
          const y = (canvas.height - height) / 2;
          
          ctx.fillRect(i * 2, y, 1, height);
        }
        
        // Add audio icon overlay
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎵', canvas.width / 2, canvas.height / 2);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create audio thumbnail'));
            }
          },
          format,
          quality
        );
        
      } catch (error) {
        // Fallback: create a simple audio icon thumbnail
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1e3a8a');
        gradient.addColorStop(1, '#3b82f6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎵', canvas.width / 2, canvas.height / 2);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create audio thumbnail'));
            }
          },
          format,
          quality
        );
      }
    };

    drawWaveform();
  });
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

  if (file.type.startsWith('audio/')) {
    return generateAudioThumbnail(file, options);
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
