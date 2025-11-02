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
  message?: string;
}

/**
 * Streaming Upload Handler
 * Handles chunked uploads with proper MIME type detection and streaming support
 */
export class StreamingUploadHandler {
  private static readonly CHUNK_SIZE = 8 * 1024 * 1024; // 8MB chunks for optimal throughput
  private static readonly MAX_RETRIES = 5; // More retries for reliability
  private static readonly MAX_PARALLEL = 6; // Increased parallel uploads
  private static networkSpeed: 'slow' | 'medium' | 'fast' = 'medium'; // Track network speed

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
  private static createChunks(file: File, forcedChunkSize?: number): Blob[] {
    const chunkSize = forcedChunkSize ?? this.getOptimalChunkSize(file);
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
        // Exponential backoff with jitter
        const baseWait = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, 8s, 16s
        const jitter = Math.random() * 1000; // Add up to 1s jitter
        const waitTime = Math.min(baseWait + jitter, 30000); // Cap at 30s
        console.log(`🔄 [Chunk ${chunkIndex + 1}] Retrying in ${Math.round(waitTime)}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.uploadChunkViaSigned(chunk, chunkIndex, totalChunks, chunkPath, mimeType, retryCount + 1);
      }
      
      console.error(`💥 [Chunk ${chunkIndex + 1}] Failed after ${this.MAX_RETRIES} retries`);
      return false;
    }
  }

  /**
   * Convert a blob to base64 (without data: prefix)
   */
  private static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read chunk'));
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Upload a single chunk through the Edge Function (base64 payload)
   */
  private static async uploadChunkViaEdge(
    chunk: Blob,
    chunkIndex: number,
    totalChunks: number,
    uploadId: string,
    fileName: string,
    mimeType: string,
    retryCount = 0
  ): Promise<boolean> {
    const chunkSizeMB = (chunk.size / (1024 * 1024)).toFixed(2);
    console.log(`📤 [Edge Chunk ${chunkIndex + 1}/${totalChunks}] ${chunkSizeMB}MB`);
    try {
      const chunkBase64 = await this.blobToBase64(chunk);
      const { data, error } = await supabase.functions.invoke('chunked-upload', {
        body: {
          action: 'upload-chunk',
          uploadId,
          fileName,
          chunkIndex,
          totalChunks,
          mimeType,
          chunkBase64,
        },
      });

      if (error || !(data && (data.success === true || data.ok === true))) {
        const errorMsg = error?.message || data?.error || 'Edge chunk upload failed';
        console.error(`❌ [Edge Chunk ${chunkIndex + 1}] Error details:`, {
          error,
          data,
          uploadId,
          fileName,
          chunkIndex,
          totalChunks
        });
        throw new Error(errorMsg);
      }

      console.log(`✅ [Edge Chunk ${chunkIndex + 1}/${totalChunks}] Uploaded`);
      return true;
    } catch (err) {
      console.warn(`❌ [Edge Chunk ${chunkIndex + 1}]`, err);
      if (retryCount < this.MAX_RETRIES) {
        // Exponential backoff with jitter
        const baseWait = Math.pow(2, retryCount) * 1000;
        const jitter = Math.random() * 1000;
        const waitTime = Math.min(baseWait + jitter, 30000);
        console.log(`🔄 [Edge Chunk ${chunkIndex + 1}] Retrying in ${Math.round(waitTime)}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        await new Promise((r) => setTimeout(r, waitTime));
        return this.uploadChunkViaEdge(chunk, chunkIndex, totalChunks, uploadId, fileName, mimeType, retryCount + 1);
      }
      return false;
    }
  }

  /**
   * Upload chunks in parallel through Edge Function with concurrency limit
   */
  private static async uploadChunksParallelEdge(
    chunks: Blob[],
    uploadId: string,
    fileName: string,
    mimeType: string,
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    const totalChunks = chunks.length;
    let completed = 0;
    let failed = 0;

    console.log(`🚀 [Edge Multipart] Starting: ${totalChunks} chunks, max ${this.MAX_PARALLEL} concurrent`);

    const results: boolean[] = new Array(totalChunks).fill(false);
    let nextIndex = 0;

    const worker = async (workerId: number) => {
      while (true) {
        const i = nextIndex++;
        if (i >= totalChunks) break;
        const ok = await this.uploadChunkViaEdge(chunks[i], i, totalChunks, uploadId, fileName, mimeType);
        results[i] = ok;
        if (ok) {
          completed++;
          const progress = 10 + Math.floor((completed / totalChunks) * 85);
          console.log(`📊 [Edge W${workerId}] Progress: ${completed}/${totalChunks} (${progress}%)`);
          onProgress?.(progress);
        } else {
          failed++;
          console.warn(`⚠️ [Edge W${workerId}] Chunk ${i} failed`);
        }
      }
    };

    const workers = Array.from({ length: Math.min(this.MAX_PARALLEL, totalChunks) }, (_, idx) => worker(idx + 1));
    await Promise.all(workers);

    if (failed > 0) {
      console.error(`💥 [Edge Multipart] Upload failed: ${failed}/${totalChunks} chunks failed`);
      return false;
    }

    console.log(`✅ [Edge Multipart] All ${totalChunks} chunks uploaded successfully`);
    return true;
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
    const totalChunks = chunks.length;
    let completed = 0;
    let failed = 0;

    console.log(`🚀 [Multipart] Starting parallel upload: ${totalChunks} chunks, max ${this.MAX_PARALLEL} concurrent`);

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

    const workers = Array.from({ length: Math.min(this.MAX_PARALLEL, totalChunks) }, (_, idx) => worker(idx + 1));
    await Promise.all(workers);

    if (failed > 0) {
      console.error(`💥 [Multipart] Upload failed: ${failed}/${totalChunks} chunks failed`);
      return false;
    }

    console.log(`✅ [Multipart] All ${totalChunks} chunks uploaded successfully`);
    return true;
  }

  /**
   * Upload file with intelligent routing (all files via Supabase Storage for now)
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

    console.log(`🎯 [Upload] Starting for: ${file.name}`);
    console.log(`  📦 Size: ${fileSizeMB}MB | Type: ${mimeType}`);
    console.log(`  🎫 Upload ID: ${uploadId}`);

    try {
      onProgress?.(2);
      
      // NOTE: R2 routing temporarily disabled - using optimized Supabase Storage for all files
      // TODO: Re-implement R2 routing with proper AWS SDK when needed
      console.log(`📦 [Supabase Route] Using optimized Supabase Storage`);
      
      // Measure network speed first for optimal chunk sizing
      await this.measureNetworkSpeed();
      
      onProgress?.(5);

      // Small files: direct upload (increased threshold for better performance)
      const MULTIPART_THRESHOLD = 20 * 1024 * 1024; // 20MB
      if (file.size < MULTIPART_THRESHOLD) {
        console.log(`📤 [Direct Upload] File < 20MB, using optimized single PUT`);
        return await this.uploadFileDirect(file, finalPath, mimeType, onProgress);
      }

      // Large files: Use Edge Function based chunked upload (more reliable)
      console.log(`📦 [Edge Multipart] File > 20MB, using optimized Edge Function chunked upload`);
      onProgress?.(8);

      // 1) Init upload session
      const initRes = await supabase.functions.invoke('chunked-upload', {
        body: {
          action: 'init-upload',
          uploadId,
          fileName: finalPath,
          mimeType,
        },
      });

      if (initRes.error || !(initRes.data && (initRes.data.success === true || initRes.data.ok === true))) {
        console.error('❌ [Edge Multipart] Init failed, details:', initRes.error || initRes.data);
        throw new Error('Failed to initialize upload session');
      }

      // 2) Create optimized chunks for Edge payload (6MB each for better throughput)
      const EDGE_CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks, base64 encodes to ~8MB
      const chunks = this.createChunks(file, EDGE_CHUNK_SIZE);
      onProgress?.(10);

      // 3) Upload chunks in parallel (max ${this.MAX_PARALLEL})
      console.log(`🚀 [Edge Upload Start] Uploading ${chunks.length} chunks with max ${this.MAX_PARALLEL} parallel streams`);
      const edgeChunksOk = await this.uploadChunksParallelEdge(
        chunks,
        uploadId,
        finalPath,
        mimeType,
        onProgress
      );

      if (!edgeChunksOk) {
        throw new Error('Chunk upload failed');
      }

      onProgress?.(95);

      // 4) Merge chunks server-side
      console.log(`🧩 [Edge Merge] Requesting server-side merge`);
      const mergeRes = await supabase.functions.invoke('chunked-upload', {
        body: {
          action: 'merge-chunks',
          uploadId,
          fileName: finalPath,
        },
      });

      if (mergeRes.error || !(mergeRes.data && (mergeRes.data.success === true || mergeRes.data.ok === true))) {
        console.error('❌ [Edge Merge] Failed', mergeRes.error || mergeRes.data);
        throw new Error(mergeRes.error?.message || mergeRes.data?.error || 'Merge failed');
      }

      const returnedPath: string | undefined = mergeRes.data.filePath || mergeRes.data.path || mergeRes.data.finalPath;
      if (!returnedPath) {
        console.warn('⚠️ [Edge Merge] No filePath returned, falling back to finalPath');
      }

      const mergedPath = returnedPath || finalPath;
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(mergedPath);

      // 5) Optional: Save a manifest for traceability
      try {
        const manifestPath = `manifests/${uploadId}.json`;
        const manifest = {
          uploadId,
          method: 'edge-function:chunked-upload',
          fileName: file.name,
          mimeType,
          size: file.size,
          finalPath: mergedPath,
          totalChunks: chunks.length,
          createdAt: new Date().toISOString(),
        };
        const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
        const { data: signedManifest } = await supabase.storage
          .from('uploads')
          .createSignedUploadUrl(manifestPath, { upsert: true });
        if (signedManifest?.token) {
          await supabase.storage
            .from('uploads')
            .uploadToSignedUrl(manifestPath, signedManifest.token, manifestBlob, {
              upsert: true,
              contentType: 'application/json',
            });
          console.log(`✅ [Manifest] Saved to: ${manifestPath}`);
        }
      } catch (mErr) {
        console.warn('⚠️ [Manifest] Could not save manifest', mErr);
      }

      onProgress?.(100);

      console.log(`✅ [Upload Complete] ${file.name} (${fileSizeMB}MB) uploaded successfully via Edge Function`);
      return {
        success: true,
        fileUrl: urlData.publicUrl,
        mimeType,
      };
    } catch (error) {
      console.error(`💥 [Upload Failed] ${file.name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
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
   * Measure network speed with a test chunk
   */
  private static async measureNetworkSpeed(): Promise<void> {
    try {
      const testSize = 512 * 1024; // 512KB test
      const testData = new Uint8Array(testSize);
      const testPath = `network-test/${Date.now()}.bin`;
      
      const start = performance.now();
      const { data: signed } = await supabase.storage
        .from('uploads')
        .createSignedUploadUrl(testPath, { upsert: true });
      
      if (signed?.token) {
        await supabase.storage
          .from('uploads')
          .uploadToSignedUrl(testPath, signed.token, testData, { upsert: true });
        
        const duration = performance.now() - start;
        const speedMbps = (testSize * 8) / (duration * 1000); // Mbps
        
        // Classify network speed
        if (speedMbps > 10) {
          this.networkSpeed = 'fast';
          console.log(`🚀 [Network] Fast connection detected: ${speedMbps.toFixed(2)} Mbps`);
        } else if (speedMbps > 2) {
          this.networkSpeed = 'medium';
          console.log(`📶 [Network] Medium connection detected: ${speedMbps.toFixed(2)} Mbps`);
        } else {
          this.networkSpeed = 'slow';
          console.log(`🐌 [Network] Slow connection detected: ${speedMbps.toFixed(2)} Mbps`);
        }
        
        // Cleanup test file
        await supabase.storage.from('uploads').remove([testPath]);
      }
    } catch (err) {
      console.warn('⚠️ [Network] Speed test failed, using default settings', err);
      this.networkSpeed = 'medium';
    }
  }

  /**
   * Upload to Cloudflare R2 via edge function
   */
  private static async uploadToR2(
    file: File,
    finalPath: string,
    mimeType: string,
    onProgress?: (progress: number) => void
  ): Promise<StreamingUploadResult> {
    console.log(`☁️ [R2] Starting upload to Cloudflare R2: ${finalPath}`);
    
    try {
      onProgress?.(10);
      
      // Convert file to base64 for edge function transport
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || '';
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      
      onProgress?.(30);
      const fileData = await base64Promise;
      
      onProgress?.(40);
      console.log(`📤 [R2] Sending ${(file.size / 1024 / 1024).toFixed(2)}MB to edge function`);
      
      // Upload via edge function
      const { data, error } = await supabase.functions.invoke('r2-upload', {
        body: {
          action: 'upload-direct',
          fileName: finalPath,
          fileType: mimeType,
          fileSize: file.size,
          fileData
        }
      });
      
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'R2 upload failed');
      }
      
      onProgress?.(100);
      
      console.log(`✅ [R2 Complete] ${file.name} uploaded successfully`);
      
      return {
        success: true,
        fileUrl: data.publicUrl,
        mimeType,
        message: data.message || 'Fichier stocké avec succès dans R2 Cloudflare'
      };
    } catch (error) {
      console.error(`💥 [R2 Failed] ${file.name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'R2 upload failed'
      };
    }
  }

  /**
   * Get optimal chunk size based on file type, size, and network speed
   */
  public static getOptimalChunkSize(file: File): number {
    const fileSizeMB = file.size / (1024 * 1024);
    
    // Adjust based on network speed
    const speedMultiplier = {
      slow: 0.5,    // 50% smaller chunks on slow networks
      medium: 1.0,  // Default chunk sizes
      fast: 1.5     // 50% larger chunks on fast networks
    }[this.networkSpeed];
    
    // Base chunk size calculation
    let baseSize: number;
    if (fileSizeMB > 500) {
      baseSize = 16 * 1024 * 1024; // 16MB for files > 500MB
    } else if (fileSizeMB > 100) {
      baseSize = 12 * 1024 * 1024; // 12MB for files > 100MB
    } else {
      baseSize = this.CHUNK_SIZE; // 8MB default
    }
    
    // Apply network speed adjustment
    const optimizedSize = Math.floor(baseSize * speedMultiplier);
    const finalSize = Math.max(2 * 1024 * 1024, Math.min(optimizedSize, 20 * 1024 * 1024)); // Between 2-20MB
    
    console.log(`📊 [Chunk Size] File: ${fileSizeMB.toFixed(2)}MB, Network: ${this.networkSpeed}, Size: ${(finalSize / (1024 * 1024)).toFixed(2)}MB`);
    
    return finalSize;
  }
}