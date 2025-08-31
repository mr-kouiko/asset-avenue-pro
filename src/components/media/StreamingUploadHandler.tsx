import { supabase } from '@/integrations/supabase/client';

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
    const chunks: Blob[] = [];
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    
    console.log(`📦 Creating ${totalChunks} chunks for file: ${file.name} (${file.size} bytes)`);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, file.size);
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
      
      const response = await fetch(`https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/chunked-upload?action=upload-chunk&uploadId=${uploadId}&chunkIndex=${chunkIndex}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2Zwb3BocG9xdWd0dXZmeHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQzMzEsImV4cCI6MjA3MDE2MDMzMX0.m8KZCGvdZm2v6jBiQnv6LQqM2DPhuaVlcVWrTc0dMp8`,
          'Content-Type': 'application/octet-stream'
        },
        body: chunkBuffer
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Chunk upload failed: ${data.error}`);
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
    onProgress?: (progress: number) => void
  ): Promise<StreamingUploadResult> {
    try {
      // Detect MIME type
      const mimeType = this.detectMimeType(file);
      console.log(`🎯 Starting streaming upload for: ${file.name} (${mimeType})`);
      
      // Generate unique upload ID
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize upload first
      console.log(`🔄 Initializing upload for: ${file.name}`);
      const initResponse = await fetch(`https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/chunked-upload?action=init-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2Zwb3BocG9xdWd0dXZmeHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQzMzEsImV4cCI6MjA3MDE2MDMzMX0.m8KZCGvdZm2v6jBiQnv6LQqM2DPhuaVlcVWrTc0dMp8`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uploadId })
      });
      
      if (!initResponse.ok) {
        throw new Error(`Initialization failed: HTTP ${initResponse.status}`);
      }
      
      const initData = await initResponse.json();
      if (!initData.success) {
        throw new Error(`Initialization failed: ${initData.error}`);
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
      const finalizeResponse = await fetch(`https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/chunked-upload?action=merge-chunks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2Zwb3BocG9xdWd0dXZmeHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQzMzEsImV4cCI6MjA3MDE2MDMzMX0.m8KZCGvdZm2v6jBiQnv6LQqM2DPhuaVlcVWrTc0dMp8`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uploadId,
          fileName: file.name
        })
      });
      
      if (!finalizeResponse.ok) {
        throw new Error(`Finalization failed: HTTP ${finalizeResponse.status}`);
      }
      
      const finalizeData = await finalizeResponse.json();
      if (!finalizeData.success) {
        throw new Error(`Finalization failed: ${finalizeData.error}`);
      }
      
      console.log(`✅ Upload completed successfully: ${finalizeData.path}`);
      
      // Get the public URL from the final path
      const { data: urlData } = supabase.storage
        .from('original-files')
        .getPublicUrl(finalizeData.path);
      
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
    
    // Larger chunks for video files
    if (mimeType.startsWith('video/')) {
      return file.size > 50 * 1024 * 1024 ? 2 * 1024 * 1024 : this.CHUNK_SIZE; // 2MB for large videos
    }
    
    // Standard chunk size for audio and other files
    return this.CHUNK_SIZE;
  }
}