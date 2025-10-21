import { supabase } from '@/integrations/supabase/client';

// Helper to get upload API key from environment or fallback
const getUploadApiKey = async (): Promise<string> => {
  // For now, use a temporary API key - this should be moved to a secure environment variable
  return 'temp-upload-key-2024';
};

interface UploadChunk {
  chunk: Blob;
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
  uploadId: string;
}

interface StreamingUploadResult {
  success: boolean;
  fileUrl?: string;
  mimeType?: string;
  error?: string;
}

/**
 * Streaming Upload Handler
 * Handles chunked uploads with proper MIME type detection and streaming support
 */
export class StreamingUploadHandler {
  private static readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  private static readonly MAX_RETRIES = 3;

  /**
   * Detect MIME type from file extension with WebP priority
   */
  private static detectMimeType(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // ✅ Forcer le bon type MIME pour WebP
    if (extension === 'webp') {
      console.log(`🎯 Forced MIME type for WebP: image/webp`);
      return 'image/webp';
    }
    
    console.log(`🔍 Frontend MIME detection - File: ${file.name}, Extension: ${extension}, Browser type: ${file.type}`);
    
    // Image MIME types
    const imageTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'svg': 'image/svg+xml'
    };

    // Video MIME types
    const videoTypes: Record<string, string> = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'video/ogg',
      'ogv': 'video/ogg',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
      'm4v': 'video/mp4'
    };

    // Audio MIME types
    const audioTypes: Record<string, string> = {
      'mp3': 'audio/mpeg',
      'aac': 'audio/aac',
      'm4a': 'audio/mp4',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'ога': 'audio/ogg',
      'webm': 'audio/webm',
      'flac': 'audio/flac'
    };

    // Priority 1: Use extension-based detection first for reliability
    if (extension) {
      const detectedType = imageTypes[extension] || videoTypes[extension] || audioTypes[extension];
      if (detectedType) {
        console.log(`✅ MIME type detected from extension: ${detectedType} for .${extension}`);
        return detectedType;
      }
    }

    // Priority 2: Use browser file.type if it's reliable and matches extension
    if (file.type && file.type !== 'application/octet-stream') {
      // Validate that browser type makes sense with extension
      const browserType = file.type.toLowerCase();
      if (extension) {
        const expectedType = imageTypes[extension] || videoTypes[extension] || audioTypes[extension];
        if (expectedType && browserType === expectedType) {
          console.log(`✅ Validated browser MIME type: ${file.type}`);
          return file.type;
        } else if (expectedType) {
          console.log(`⚠️ Browser type ${file.type} doesn't match extension ${extension}, using extension-based: ${expectedType}`);
          return expectedType;
        }
      }
      // Use browser type if no extension conflict
      console.log(`📋 Using browser MIME type: ${file.type}`);
      return file.type;
    }

    console.warn(`⚠️ Could not detect MIME type for file: ${file.name} (ext: ${extension}), using application/octet-stream`);
    return 'application/octet-stream';
  }

  /**
   * Create chunks from file with streaming optimization
   */
  private static createChunks(file: File): Blob[] {
    const chunkSize = this.getOptimalChunkSize(file);
    const chunks: Blob[] = [];
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    console.log(`📦 Creating ${totalChunks} chunks (size ~${Math.round(chunkSize / (1024 * 1024))}MB) for file: ${file.name} (${file.size} bytes)`);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      chunks.push(chunk);
    }
    
    return chunks;
  }

  /**
   * Upload single chunk with retry logic
   */
  private static async uploadChunk(
    chunk: Blob, 
    chunkIndex: number, 
    totalChunks: number, 
    fileName: string, 
    uploadId: string,
    mimeType: string,
    retryCount = 0
  ): Promise<boolean> {
    try {
      console.log(`📤 Uploading chunk ${chunkIndex + 1}/${totalChunks} for ${fileName}`);
      
      // Convert chunk to array buffer for the edge function
      const chunkBuffer = await chunk.arrayBuffer();
      
      const response = await supabase.functions.invoke('chunked-upload', {
        body: {
          action: 'upload-chunk',
          uploadId,
          chunkIndex,
          chunk: Array.from(new Uint8Array(chunkBuffer))
        }
      });

      if (response.error) {
        throw new Error(`Chunk upload failed: ${response.error.message}`);
      }

      if (!response.data?.success) {
        throw new Error(`Chunk upload failed: ${response.data?.error || 'Unknown error'}`);
      }

      console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Chunk ${chunkIndex + 1} upload failed:`, error);
      
      if (retryCount < this.MAX_RETRIES) {
        console.log(`🔄 Retrying chunk ${chunkIndex + 1} (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.uploadChunk(chunk, chunkIndex, totalChunks, fileName, uploadId, mimeType, retryCount + 1);
      }
      
      return false;
    }
  }

  /**
   * Upload file with streaming support and proper MIME type handling
   */
  public static async uploadFile(
    file: File,
    onProgress?: (progress: number) => void,
    desiredPath?: string
  ): Promise<StreamingUploadResult> {
    try {
      // Detect MIME type
      const mimeType = this.detectMimeType(file);
      console.log(`🎯 Starting streaming upload for: ${file.name} (${mimeType})`);
      
      // Generate unique upload ID
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize upload first
      console.log(`🔄 Initializing upload for: ${file.name}`);
      const initResponse = await supabase.functions.invoke('chunked-upload', {
        body: { uploadId, action: 'init-upload' }
      });
      
      if (initResponse.error) {
        throw new Error(`Initialization failed: ${initResponse.error.message}`);
      };
      
      if (!initResponse.data?.success) {
        throw new Error(`Initialization failed: ${initResponse.data?.error || 'Unknown error'}`);
      }
      
      // Create chunks
      const chunks = this.createChunks(file);
      const totalChunks = chunks.length;
      
      // Upload chunks in parallel with limited concurrency
      const CONCURRENT_UPLOADS = 3;
      let uploadedChunks = 0;
      let hasErrors = false;
      
      for (let i = 0; i < totalChunks; i += CONCURRENT_UPLOADS) {
        const chunkBatch = chunks.slice(i, i + CONCURRENT_UPLOADS);
        const uploadPromises = chunkBatch.map((chunk, batchIndex) => {
          const chunkIndex = i + batchIndex;
          return this.uploadChunk(chunk, chunkIndex, totalChunks, file.name, uploadId, mimeType);
        });
        
        const results = await Promise.all(uploadPromises);
        
        for (const success of results) {
          if (success) {
            uploadedChunks++;
          } else {
            hasErrors = true;
          }
        }
        
        // Report progress
        const progress = (uploadedChunks / totalChunks) * 100;
        onProgress?.(progress);
        console.log(`📊 Upload progress: ${progress.toFixed(1)}% (${uploadedChunks}/${totalChunks} chunks)`);
        
        if (hasErrors) {
          throw new Error('Some chunks failed to upload');
        }
      }
      
      if (uploadedChunks !== totalChunks) {
        throw new Error(`Upload incomplete: ${uploadedChunks}/${totalChunks} chunks uploaded`);
      }
      
      // Finalize upload by merging chunks
      console.log(`🔄 Finalizing upload for: ${file.name}`);
      const finalizeResponse = await supabase.functions.invoke('chunked-upload', {
        body: {
          action: 'merge-chunks',
          uploadId,
          fileName: desiredPath || file.name
        }
      });
      
      if (finalizeResponse.error) {
        throw new Error(`Finalization failed: ${finalizeResponse.error.message}`);
      }
      
      if (!finalizeResponse.data?.success) {
        throw new Error(`Finalization failed: ${finalizeResponse.data?.error || 'Unknown error'}`);
      }
      
      console.log(`✅ Upload completed successfully: ${finalizeResponse.data.path}`);
      
      // Get the public URL from the final path
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(finalizeResponse.data.path);
      
      return {
        success: true,
        fileUrl: urlData.publicUrl,
        mimeType: mimeType
      };
    } catch (error) {
      console.error('💥 Streaming upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Check if file is supported for streaming
   */
  public static isSupportedForStreaming(file: File): boolean {
    const mimeType = this.detectMimeType(file);
    const supportedTypes = [
      // Images
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/svg+xml',
      // Videos
      'video/mp4',
      'video/webm',
      'video/ogg',
      // Audio
      'audio/mpeg',
      'audio/mp4',
      'audio/aac',
      'audio/wav',
      'audio/webm'
    ];
    
    return supportedTypes.includes(mimeType);
  }

  /**
   * Get optimal chunk size based on file type and size
   */
  public static getOptimalChunkSize(file: File): number {
    const mimeType = this.detectMimeType(file);
    const fileSizeMB = file.size / (1024 * 1024);
    
    // Larger chunks for video files to speed up upload
    if (mimeType.startsWith('video/')) {
      if (fileSizeMB < 10) return this.CHUNK_SIZE; // 1MB for small videos
      if (fileSizeMB < 50) return this.CHUNK_SIZE * 3; // 3MB for medium videos
      if (fileSizeMB < 200) return this.CHUNK_SIZE * 5; // 5MB for large videos
      if (fileSizeMB < 500) return this.CHUNK_SIZE * 7; // 7MB for very large videos
      return this.CHUNK_SIZE * 10; // 10MB for huge video files (500MB+)
    }
    
    // Standard chunk size for audio and other files
    return this.CHUNK_SIZE;
  }
}