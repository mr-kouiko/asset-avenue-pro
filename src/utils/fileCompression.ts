/**
 * File compression utilities for images and videos
 * Handles client-side compression before upload
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

interface VideoCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  videoBitrate?: number;
  audioBitrate?: number;
}

/**
 * Compress an image file on the client side
 * @param file - The original image file
 * @param options - Compression options
 * @returns Promise<File> - The compressed image file
 */
export const compressImage = async (
  file: File, 
  options: CompressionOptions = {}
): Promise<File> => {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.8,
    format = 'webp'
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not supported'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = Math.min(width, maxWidth);
          height = width / aspectRatio;
        } else {
          height = Math.min(height, maxHeight);
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression failed'));
            return;
          }

          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, `.${format === 'jpeg' ? 'jpg' : format}`),
            {
              type: `image/${format}`,
              lastModified: Date.now()
            }
          );

          resolve(compressedFile);
        },
        `image/${format}`,
        quality
      );
    };

    img.onerror = () => reject(new Error('Image loading failed'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Generate a low-resolution preview for video files
 * @param file - The original video file
 * @param options - Compression options
 * @returns Promise<File> - The compressed video preview file
 */
export const generateVideoPreview = async (
  file: File,
  options: VideoCompressionOptions = {}
): Promise<File> => {
  const {
    maxWidth = 480,
    maxHeight = 480,
    videoBitrate = 500000, // 500kbps
    audioBitrate = 64000   // 64kbps
  } = options;

  // Note: This is a simplified implementation
  // For production, you might want to use FFmpeg.wasm for better video compression
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not supported'));
      return;
    }

    video.onloadedmetadata = () => {
      // Calculate new dimensions
      let { videoWidth: width, videoHeight: height } = video;
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = Math.min(width, maxWidth);
          height = width / aspectRatio;
        } else {
          height = Math.min(height, maxHeight);
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Capture frame at 1 second (or middle of video)
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Video preview generation failed'));
            return;
          }

          const previewFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, '_preview.jpg'),
            {
              type: 'image/jpeg',
              lastModified: Date.now()
            }
          );

          resolve(previewFile);
        },
        'image/jpeg',
        0.8
      );
    };

    video.onerror = () => reject(new Error('Video loading failed'));
    video.src = URL.createObjectURL(file);
    video.load();
  });
};

/**
 * Split a file into chunks for resumable upload
 * @param file - The file to chunk
 * @param chunkSize - Size of each chunk in bytes (default 5MB)
 * @returns Blob[] - Array of file chunks
 */
export const createFileChunks = (file: File, chunkSize: number = 5 * 1024 * 1024): Blob[] => {
  const chunks: Blob[] = [];
  let start = 0;

  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size);
    chunks.push(file.slice(start, end));
    start = end;
  }

  return chunks;
};

/**
 * Calculate optimal chunk size based on file size
 * @param fileSize - Size of the file in bytes
 * @returns number - Optimal chunk size in bytes
 */
export const getOptimalChunkSize = (fileSize: number): number => {
  if (fileSize < 10 * 1024 * 1024) return 1 * 1024 * 1024; // 1MB for small files
  if (fileSize < 100 * 1024 * 1024) return 5 * 1024 * 1024; // 5MB for medium files
  return 10 * 1024 * 1024; // 10MB for large files
};

/**
 * Get compression progress callback
 * @param onProgress - Progress callback function
 * @returns Function to track compression progress
 */
export const createCompressionProgress = (onProgress: (progress: number) => void) => {
  return (step: string, progress: number) => {
    console.log(`Compression ${step}: ${progress}%`);
    onProgress(progress);
  };
};