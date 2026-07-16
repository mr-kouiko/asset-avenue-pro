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
    logoPath = DEFAULT_LOGO_URL
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const videoUrl = URL.createObjectURL(videoFile);
    let cleanedUp = false;

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      URL.revokeObjectURL(videoUrl);
    };

    // Wait for the video to be fully ready to play
    video.oncanplaythrough = () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration) || duration <= 0) {
        cleanup();
        reject(new Error('Video has invalid duration'));
        return;
      }

      console.log(`[watermark] Video loaded: ${duration.toFixed(1)}s, ${video.videoWidth}x${video.videoHeight}`);

      // Cap preview to 720p
      const scale = Math.min(1, 720 / video.videoHeight);
      const width = Math.round(video.videoWidth * scale);
      const height = Math.round(video.videoHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // Load watermark logo before starting capture
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';

      logoImg.onload = () => {
        // Setup MediaRecorder with canvas stream
        const stream = canvas.captureStream(30);

        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }

        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 2_500_000,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          cleanup();
          const rawBlob = new Blob(chunks, { type: 'video/webm' });
          console.log(`[watermark] Generated watermarked preview: ${(rawBlob.size / 1024 / 1024).toFixed(1)}MB, duration: ${duration.toFixed(1)}s`);

          // Fix WebM duration metadata (MediaRecorder often writes 0 or Infinity)
          fixWebmDuration(rawBlob, duration * 1000).then(fixedBlob => {
            resolve(fixedBlob);
          }).catch(() => {
            // If fix fails, return raw blob anyway
            resolve(rawBlob);
          });
        };

        recorder.onerror = () => {
          cleanup();
          reject(new Error('MediaRecorder error during watermarking'));
        };

        // Watermark dimensions
        const watermarkSize = Math.round(width * 0.2);
        const logoAspect = logoImg.naturalWidth / logoImg.naturalHeight;
        const logoW = watermarkSize;
        const logoH = watermarkSize / logoAspect;

        let animFrameId: number;
        let recordingStartTime = 0;

        const drawFrame = () => {
          if (video.paused || video.ended) return;

          ctx.drawImage(video, 0, 0, width, height);

          // Draw centered watermark
          ctx.globalAlpha = opacity;
          ctx.drawImage(
            logoImg,
            (width - logoW) / 2,
            (height - logoH) / 2,
            logoW,
            logoH
          );
          ctx.globalAlpha = 1;

          animFrameId = requestAnimationFrame(drawFrame);
        };

        // Safety timeout: duration + 10s buffer
        const safetyTimeout = setTimeout(() => {
          console.warn('[watermark] Safety timeout reached, stopping recording');
          cancelAnimationFrame(animFrameId);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, (duration + 10) * 1000);

        video.onended = () => {
          clearTimeout(safetyTimeout);
          cancelAnimationFrame(animFrameId);
          // Draw one last frame to ensure we capture the end
          ctx.drawImage(video, 0, 0, width, height);
          ctx.globalAlpha = opacity;
          ctx.drawImage(logoImg, (width - logoW) / 2, (height - logoH) / 2, logoW, logoH);
          ctx.globalAlpha = 1;
          // Give MediaRecorder time to flush
          setTimeout(() => {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          }, 300);
        };

        // Collect data frequently for better duration tracking
        recorder.start(200);
        recordingStartTime = performance.now();

        video.play().then(() => {
          console.log('[watermark] Video playback started, recording frames...');
          drawFrame();
        }).catch(err => {
          cleanup();
          clearTimeout(safetyTimeout);
          reject(new Error(`Video playback failed: ${err.message}`));
        });
      };

      logoImg.onerror = () => {
        cleanup();
        reject(new Error('Failed to load watermark logo'));
      };

      logoImg.src = logoPath;
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video for watermarking'));
    };

    video.src = videoUrl;
    video.load();
  });
};

/**
 * Fix WebM duration metadata.
 * MediaRecorder-generated WebM files often have missing or incorrect duration.
 * This patches the Segment > Info > Duration EBML element.
 */
async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Find the Segment > Info > Duration element in the EBML structure
  // Duration element ID is 0x4489
  const durationIdBytes = [0x44, 0x89];
  
  for (let i = 0; i < bytes.length - 12; i++) {
    if (bytes[i] === durationIdBytes[0] && bytes[i + 1] === durationIdBytes[1]) {
      // Found Duration element ID. Next byte is the size (should be 0x88 = 8 bytes for float64)
      const sizeIdx = i + 2;
      if (bytes[sizeIdx] === 0x88) {
        // Write duration as float64 big-endian at offset sizeIdx + 1
        const view = new DataView(buffer, sizeIdx + 1, 8);
        view.setFloat64(0, durationMs, false); // big-endian
        console.log(`[watermark] Fixed WebM duration to ${(durationMs / 1000).toFixed(1)}s`);
        return new Blob([buffer], { type: 'video/webm' });
      }
    }
  }

  // If we couldn't find/patch, return original
  console.warn('[watermark] Could not find Duration element in WebM to patch');
  return blob;
}

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
const DEFAULT_LOGO_URL = 'https://i.imgur.com/UsTmDOl.png';

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
    
    // Extended timeout for .mov files (15 seconds) as they may take longer to decode
    const isMov = videoFile.name.toLowerCase().endsWith('.mov');
    const timeout = isMov ? 15000 : 8000;
    
    const loadTimeout = setTimeout(() => {
      console.error(`Video loading timeout for ${videoFile.name} after ${timeout}ms`);
      URL.revokeObjectURL(video.src);
      reject(new Error('Video loading timeout - try converting to MP4 format for better compatibility'));
    }, timeout);
    
    video.onloadedmetadata = () => {
      clearTimeout(loadTimeout);
      
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
      clearTimeout(loadTimeout);
      console.error('Video thumbnail generation error:', e);
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video for thumbnail - file may be corrupted or in unsupported format'));
    };
    
    // Create object URL and load video
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;
    
    // For .mov files, log for debugging
    if (isMov) {
      console.log(`Loading .mov file for thumbnail extraction: ${videoFile.name}`);
    }
    
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

// Rasterize an SVG onto a canvas at a resolution derived from its viewBox,
// scaled to at least 800px on the longest side, then apply the diagonal
// watermark used for other image previews. The SVG is sanitized first.
export const generateVectorThumbnail = async (
  svgFile: File,
  options: ThumbnailOptions = {}
): Promise<Blob> => {
  const { quality = 0.9, format = 'image/png' } = options;
  const { readAndSanitizeSvg, parseSvgDimensionsFromString } = await import('./svgUtils');

  const cleanSvg = await readAndSanitizeSvg(svgFile);
  const dims = parseSvgDimensionsFromString(cleanSvg) || { width: 800, height: 800 };

  const blob = new Blob([cleanSvg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('SVG rasterization failed'));
      el.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');

    // White backdrop for transparent SVGs so watermark stays visible.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Same diagonal text watermark used elsewhere.
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    const fontSize = Math.max(24, Math.round(canvas.width / 22));
    ctx.lineWidth = Math.max(1, fontSize / 20);
    ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((-30 * Math.PI) / 180);
    const diag = Math.hypot(canvas.width, canvas.height);
    const stepX = fontSize * 9;
    const stepY = fontSize * 3;
    for (let y = -diag; y < diag; y += stepY) {
      for (let x = -diag; x < diag; x += stepX) {
        ctx.strokeText('VISUSTOCK', x, y);
        ctx.fillText('VISUSTOCK', x, y);
      }
    }
    ctx.restore();

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Vector thumbnail toBlob failed'))),
        format,
        quality,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};

// Main thumbnail generation function
export const generateThumbnail = async (
  file: File,
  options: ThumbnailOptions = {}
): Promise<Blob> => {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  try {
    if (fileType === 'image/svg+xml' || fileName.endsWith('.svg')) {
      return await generateVectorThumbnail(file, options);
    } else if (fileType.startsWith('video/')) {
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
