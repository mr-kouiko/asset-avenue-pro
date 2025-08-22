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
   * Detect MIME type from file extension and content
   */
  private static detectMimeType(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
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
      'oga': 'audio/ogg',
      'webm': 'audio/webm',
      'flac': 'audio/flac'
    };

    if (extension) {
      const detectedType = videoTypes[extension] || audioTypes[extension];
      if (detectedType) {
        console.log(`📋 MIME type detected: ${detectedType} for extension: ${extension}`);
        return detectedType;
      }
    }

    // Fallback to file.type or generic types
    if (file.type) {
      console.log(`📋 Using file.type: ${file.type}`);
      return file.type;
    }

    // Final fallback based on common patterns
    if (file.name.includes('video') || extension && ['mp4', 'webm', 'ogg', 'mov'].includes(extension)) {
      return 'video/mp4';
    }
    
    if (file.name.includes('audio') || extension && ['mp3', 'aac', 'm4a', 'wav'].includes(extension)) {
      return 'audio/mpeg';
    }

    console.warn(`⚠️ Could not detect MIME type for file: ${file.name}, using application/octet-stream`);
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
      
      const { data, error } = await supabase.functions.invoke('chunked-upload', {
        body: {
          chunk: Array.from(new Uint8Array(await chunk.arrayBuffer())),
          chunkIndex,
          totalChunks,
          fileName,
          uploadId,
          mimeType,
          enableStreaming: true, // Enable streaming support
          acceptRanges: true // Enable range requests
        }
      });

      if (error) {
        throw new Error(`Chunk upload failed: ${error.message}`);
      }

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
      
      // Finalize upload with streaming metadata
      console.log(`🔄 Finalizing streaming upload for: ${file.name}`);
      const { data: finalizeData, error: finalizeError } = await supabase.functions.invoke('chunked-upload', {
        body: {
          action: 'finalize',
          uploadId,
          fileName: file.name,
          totalChunks,
          mimeType,
          enableStreaming: true,
          acceptRanges: true,
          fileSize: file.size
        }
      });
      
      if (finalizeError || !finalizeData.success) {
        throw new Error(`Finalization failed: ${finalizeError?.message || finalizeData.error}`);
      }
      
      console.log(`✅ Streaming upload completed successfully: ${finalizeData.fileUrl}`);
      
      return {
        success: true,
        fileUrl: finalizeData.fileUrl,
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
      'video/mp4',
      'video/webm',
      'video/ogg',
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