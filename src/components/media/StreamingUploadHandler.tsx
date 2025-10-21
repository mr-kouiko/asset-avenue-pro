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
   * Create chunks from file for multipart upload
   */
  private static createChunks(file: File): Blob[] {
    const chunkSize = this.getOptimalChunkSize(file);
    const chunks: Blob[] = [];
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    console.log(`📦 [Multipart] Creating ${totalChunks} chunks (${Math.round(chunkSize / (1024 * 1024))}MB each) for: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB total)`);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      chunks.push(chunk);
      console.log(`  ✓ Chunk ${i + 1}/${totalChunks}: ${start}-${end} (${((end - start) / (1024 * 1024)).toFixed(2)}MB)`);
    }
    
    return chunks;
  }

  /**
   * Upload single chunk via signed URL with retry logic
   */
  private static async uploadChunkViaSigned(
    chunk: Blob,
    chunkIndex: number,
    totalChunks: number,
    chunkPath: string,
    mimeType: string,
    retryCount = 0
  ): Promise<boolean> {
    const chunkSizeMB = (chunk.size / (1024 * 1024)).toFixed(2);
    console.log(`📤 [Chunk ${chunkIndex + 1}/${totalChunks}] Uploading ${chunkSizeMB}MB to: ${chunkPath}`);
    
    try {
      // Create signed upload URL for this chunk
      const { data: signed, error: signedErr } = await supabase.storage
        .from('uploads')
        .createSignedUploadUrl(chunkPath, { upsert: true });

      if (signedErr || !signed?.token) {
        throw new Error(`Failed to create signed URL: ${signedErr?.message || 'no token'}`);
      }

      console.log(`  🔑 Signed URL created for chunk ${chunkIndex + 1}`);

      // Upload chunk directly to Storage
      const { error: uploadErr } = await supabase.storage
        .from('uploads')
        .uploadToSignedUrl(chunkPath, signed.token, chunk, {
          upsert: true,
          contentType: mimeType
        });

      if (uploadErr) {
        throw new Error(`Chunk upload failed: ${uploadErr.message}`);
      }

      console.log(`✅ [Chunk ${chunkIndex + 1}/${totalChunks}] Uploaded successfully (${chunkSizeMB}MB)`);
      return true;
    } catch (error) {
      console.error(`❌ [Chunk ${chunkIndex + 1}/${totalChunks}] Upload failed:`, error);
      
      if (retryCount < this.MAX_RETRIES) {
        const waitTime = 1000 * (retryCount + 1);
        console.log(`🔄 [Chunk ${chunkIndex + 1}] Retrying in ${waitTime}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.uploadChunkViaSigned(chunk, chunkIndex, totalChunks, chunkPath, mimeType, retryCount + 1);
      }
      
      console.error(`💥 [Chunk ${chunkIndex + 1}] Failed after ${this.MAX_RETRIES} retries`);
      return false;
    }
  }

  /**
   * Upload chunks in parallel with concurrency limit
   */
  private static async uploadChunksParallel(
    chunks: Blob[],
    basePath: string,
    uploadId: string,
    mimeType: string,
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    const MAX_PARALLEL = 3;
    const totalChunks = chunks.length;
    let completed = 0;
    let failed = 0;

    console.log(`🚀 [Multipart] Starting parallel upload: ${totalChunks} chunks, max ${MAX_PARALLEL} concurrent`);

    const results: boolean[] = new Array(totalChunks).fill(false);
    let nextIndex = 0;

    const worker = async (workerId: number) => {
      while (true) {
        const i = nextIndex++;
        if (i >= totalChunks) break;
        const chunk = chunks[i];
        const chunkPath = `${basePath}/chunk_${String(i).padStart(4, '0')}`;
        const ok = await this.uploadChunkViaSigned(chunk, i, totalChunks, chunkPath, mimeType);
        results[i] = ok;
        if (ok) {
          completed++;
          const progress = 10 + Math.floor((completed / totalChunks) * 85);
          console.log(`📊 [Worker ${workerId}] Progress: ${completed}/${totalChunks} (${progress}%)`);
          onProgress?.(progress);
        } else {
          failed++;
          console.warn(`⚠️ [Worker ${workerId}] Chunk ${i} failed`);
        }
      }
    };

    const workers = Array.from({ length: Math.min(MAX_PARALLEL, totalChunks) }, (_, idx) => worker(idx + 1));
    await Promise.all(workers);

    if (failed > 0) {
      console.error(`💥 [Multipart] Upload failed: ${failed}/${totalChunks} chunks failed`);
      return false;
    }

    console.log(`✅ [Multipart] All ${totalChunks} chunks uploaded successfully`);
    return true;
  }

  /**
   * Upload file with multipart signed URLs (for large files)
   */
  public static async uploadFile(
    file: File,
    onProgress?: (progress: number) => void,
    desiredPath?: string
  ): Promise<StreamingUploadResult> {
    const mimeType = this.detectMimeType(file);
    const finalPath = desiredPath || file.name;
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    console.log(`🎯 [Multipart Upload] Starting for: ${file.name}`);
    console.log(`  📦 Size: ${fileSizeMB}MB | Type: ${mimeType}`);
    console.log(`  🎫 Upload ID: ${uploadId}`);

    try {
      onProgress?.(5);

      // Small files: direct upload
      const MULTIPART_THRESHOLD = 10 * 1024 * 1024; // 10MB
      if (file.size < MULTIPART_THRESHOLD) {
        console.log(`📤 [Direct Upload] File < 10MB, using single PUT`);
        return await this.uploadFileDirect(file, finalPath, mimeType, onProgress);
      }

      // Large files: multipart upload
      console.log(`📦 [Multipart Upload] File > 10MB, splitting into chunks`);
      
      // 1. Create chunks
      const chunks = this.createChunks(file);
      const basePath = `temp-multipart/${uploadId}`;
      
      onProgress?.(10);

      // 2. Upload chunks in parallel (max 3)
      console.log(`🚀 [Upload Start] Uploading ${chunks.length} chunks with max 3 parallel streams`);
      const chunksSuccess = await this.uploadChunksParallel(
        chunks,
        basePath,
        uploadId,
        mimeType,
        onProgress
      );

      if (!chunksSuccess) {
        throw new Error('Chunk upload failed');
      }

      onProgress?.(95);

      // 3. Create manifest JSON
      console.log(`📝 [Manifest] Creating assembly manifest`);
      const manifestPath = `manifests/${uploadId}.json`;
      const manifest = {
        uploadId,
        method: 'multipart-signed-urls',
        fileName: file.name,
        mimeType,
        size: file.size,
        finalPath,
        chunks: chunks.map((chunk, i) => ({
          index: i,
          path: `${basePath}/chunk_${String(i).padStart(4, '0')}`,
          size: chunk.size
        })),
        createdAt: new Date().toISOString(),
      };

      const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      const { data: signedManifest, error: manifestErr } = await supabase.storage
        .from('uploads')
        .createSignedUploadUrl(manifestPath, { upsert: true });

      if (manifestErr || !signedManifest?.token) {
        console.warn('⚠️ Could not create manifest signed URL:', manifestErr);
      } else {
        await supabase.storage
          .from('uploads')
          .uploadToSignedUrl(manifestPath, signedManifest.token, manifestBlob, {
            upsert: true,
            contentType: 'application/json'
          });
        console.log(`✅ [Manifest] Saved to: ${manifestPath}`);
      }

      onProgress?.(100);

      // For now, return the first chunk URL as placeholder
      // In production, you'd merge chunks or use a different access pattern
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(`${basePath}/chunk_0000`);

      console.log(`✅ [Upload Complete] ${file.name} (${fileSizeMB}MB) uploaded successfully`);
      console.log(`  📊 Total chunks: ${chunks.length}`);
      console.log(`  📝 Manifest: ${manifestPath}`);

      return {
        success: true,
        fileUrl: urlData.publicUrl,
        mimeType
      };
    } catch (error) {
      console.error(`💥 [Upload Failed] ${file.name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Direct upload for small files (< 10MB)
   */
  private static async uploadFileDirect(
    file: File,
    finalPath: string,
    mimeType: string,
    onProgress?: (progress: number) => void
  ): Promise<StreamingUploadResult> {
    console.log(`📤 [Direct] Uploading to: ${finalPath}`);

    const { data: signed, error: signedErr } = await supabase.storage
      .from('uploads')
      .createSignedUploadUrl(finalPath, { upsert: true });

    if (signedErr || !signed?.token) {
      throw new Error(`Failed to create signed URL: ${signedErr?.message}`);
    }

    onProgress?.(50);

    const { data: uploaded, error: uploadErr } = await supabase.storage
      .from('uploads')
      .uploadToSignedUrl(finalPath, signed.token, file, {
        upsert: true,
        contentType: mimeType
      });

    if (uploadErr) {
      throw new Error(`Upload failed: ${uploadErr.message}`);
    }

    onProgress?.(100);

    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(uploaded?.path || finalPath);

    console.log(`✅ [Direct] Upload complete: ${finalPath}`);

    return {
      success: true,
      fileUrl: urlData.publicUrl,
      mimeType
    };
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
    
    // Use 5MB chunks for videos (good balance between parallelism and efficiency)
    if (mimeType.startsWith('video/')) {
      return 8 * 1024 * 1024; // 8MB chunks for videos (fewer requests, faster)
    }
    
    // Standard 1MB chunks for other files
    return this.CHUNK_SIZE;
  }
}