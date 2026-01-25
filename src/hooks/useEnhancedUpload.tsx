import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error' | 'paused' | 'retrying';
  error?: string;
  retryCount: number;
}

export interface UploadResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface UseEnhancedUploadOptions {
  maxFileSize?: number; // in bytes, default 2GB
  maxConcurrent?: number;
  chunkSize?: number; // in bytes
  maxRetries?: number;
  onProgress?: (progress: UploadProgress[]) => void;
  onComplete?: (results: UploadResult[]) => void;
  onError?: (error: Error, file: File) => void;
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CHUNK_SIZE = 50 * 1024 * 1024; // 50MB
const MIN_CHUNK_SIZE = 1 * 1024 * 1024; // 1MB
const DEFAULT_MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const DEFAULT_MAX_CONCURRENT = 3;
const DEFAULT_MAX_RETRIES = 3;

export function useEnhancedUpload(options: UseEnhancedUploadOptions = {}) {
  const {
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    maxConcurrent = DEFAULT_MAX_CONCURRENT,
    chunkSize: initialChunkSize = DEFAULT_CHUNK_SIZE,
    maxRetries = DEFAULT_MAX_RETRIES,
    onProgress,
    onComplete,
    onError,
  } = options;

  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const pausedUploadsRef = useRef<Set<string>>(new Set());
  const networkSpeedRef = useRef<number>(1000000); // Start with 1MB/s estimate

  // Adaptive chunk size based on network speed
  const getOptimalChunkSize = useCallback((fileSize: number): number => {
    const speed = networkSpeedRef.current;
    
    // Target 2-5 seconds per chunk for good UX
    let optimalSize = Math.floor(speed * 3);
    
    // Clamp to reasonable bounds
    optimalSize = Math.max(MIN_CHUNK_SIZE, Math.min(MAX_CHUNK_SIZE, optimalSize));
    
    // For small files, use smaller chunks
    if (fileSize < 10 * 1024 * 1024) {
      optimalSize = Math.min(optimalSize, 2 * 1024 * 1024);
    }
    
    return optimalSize;
  }, []);

  // Detect MIME type accurately
  const detectMimeType = useCallback((file: File): string => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    const mimeMap: Record<string, string> = {
      // Video
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska',
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'heic': 'image/heic',
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac',
      'm4a': 'audio/mp4',
      // Documents
      'pdf': 'application/pdf',
    };
    
    return mimeMap[ext || ''] || file.type || 'application/octet-stream';
  }, []);

  // Generate unique file ID
  const generateFileId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Calculate file hash for duplicate detection
  // For large files: hash first 1MB + last 1MB + file size for better uniqueness
  const calculateFileHash = useCallback(async (file: File): Promise<string> => {
    const HASH_SIZE = 1024 * 1024; // 1MB
    
    if (file.size <= HASH_SIZE * 2) {
      // Small file: hash entire file
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Large file: hash first 1MB + last 1MB + file size
      const firstChunk = await file.slice(0, HASH_SIZE).arrayBuffer();
      const lastChunk = await file.slice(-HASH_SIZE).arrayBuffer();
      
      // Combine: first chunk + last chunk + size as string
      const sizeBuffer = new TextEncoder().encode(file.size.toString());
      const combined = new Uint8Array(firstChunk.byteLength + lastChunk.byteLength + sizeBuffer.length);
      combined.set(new Uint8Array(firstChunk), 0);
      combined.set(new Uint8Array(lastChunk), firstChunk.byteLength);
      combined.set(sizeBuffer, firstChunk.byteLength + lastChunk.byteLength);
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      console.log(`🔐 [HASH] Large file hash (first+last+size): ${file.name}, size: ${file.size}`);
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  }, []);

  // Check for duplicate files (hash + size fallback for older files without hash)
  const checkDuplicate = useCallback(async (
    hash: string, 
    fileSize: number
  ): Promise<{ isDuplicate: boolean; fileName?: string }> => {
    try {
      // 1. Primary check: by hash (most reliable)
      const { data: hashData, error: hashError } = await supabase.rpc(
        'check_file_duplicate', 
        { hash_value: hash }
      );
      
      if (!hashError && hashData && hashData.length > 0) {
        const result = hashData[0];
        if (result.exists_in_content || result.exists_in_uploaded) {
          console.log(`🔍 [DUPLICATE] Found by HASH: ${result.duplicate_file_name}`);
          return { isDuplicate: true, fileName: result.duplicate_file_name };
        }
      }
      
      // 2. Fallback: by file size (for older files without hash)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: sizeData, error: sizeError } = await supabase.rpc(
          'check_file_duplicate_by_size', 
          { p_file_size: fileSize, p_user_id: user.id }
        );
        
        if (!sizeError && sizeData && sizeData.length > 0) {
          const result = sizeData[0];
          if (result.exists_in_content || result.exists_in_uploaded) {
            console.log(`🔍 [DUPLICATE] Found by SIZE: ${result.duplicate_file_name}`);
            return { isDuplicate: true, fileName: result.duplicate_file_name };
          }
        }
      }
      
      return { isDuplicate: false };
    } catch (error) {
      console.error('Duplicate check failed:', error);
      return { isDuplicate: false };
    }
  }, []);

  // Update upload progress
  const updateProgress = useCallback((fileId: string, updates: Partial<UploadProgress>) => {
    setUploads(prev => {
      const updated = prev.map(u => u.fileId === fileId ? { ...u, ...updates } : u);
      onProgress?.(updated);
      return updated;
    });
  }, [onProgress]);

  // Upload a single chunk with retry logic
  const uploadChunk = useCallback(async (
    chunk: Blob,
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    fileName: string,
    abortSignal: AbortSignal
  ): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('fileName', fileName);

    const startTime = Date.now();
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chunked-upload?action=upload-chunk`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
        signal: abortSignal,
      }
    );

    if (!response.ok) {
      throw new Error(`Chunk upload failed: ${response.statusText}`);
    }

    // Update network speed estimate
    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed > 0) {
      const speed = chunk.size / elapsed;
      networkSpeedRef.current = networkSpeedRef.current * 0.7 + speed * 0.3; // Smoothed average
    }

    return true;
  }, []);

  // Upload file directly for small files
  const uploadFileDirect = useCallback(async (
    file: File,
    fileId: string,
    abortSignal: AbortSignal
  ): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const userId = session.user.id;
    const ext = file.name.split('.').pop();
    const fileName = `${userId}/${fileId}.${ext}`;
    const mimeType = detectMimeType(file);

    updateProgress(fileId, { status: 'uploading', progress: 10 });

    const { data, error } = await supabase.storage
      .from('content-uploads')
      .upload(fileName, file, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('content-uploads')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }, [detectMimeType, updateProgress]);

  // Upload file in chunks for large files
  const uploadFileChunked = useCallback(async (
    file: File,
    fileId: string,
    abortSignal: AbortSignal
  ): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const chunkSize = getOptimalChunkSize(file.size);
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadId = generateFileId();

    // Initialize upload
    const initResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chunked-upload?action=init-upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName: file.name, totalChunks }),
        signal: abortSignal,
      }
    );

    if (!initResponse.ok) {
      throw new Error('Failed to initialize upload');
    }

    // Upload chunks with parallel processing
    const uploadedChunks = new Set<number>();
    const maxParallel = Math.min(3, totalChunks);
    
    const uploadChunkWithRetry = async (chunkIndex: number): Promise<void> => {
      let retries = 0;
      while (retries < maxRetries) {
        try {
          // Check if paused
          while (pausedUploadsRef.current.has(fileId)) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (abortSignal.aborted) throw new Error('Upload cancelled');
          }

          const start = chunkIndex * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = file.slice(start, end);

          await uploadChunk(chunk, uploadId, chunkIndex, totalChunks, file.name, abortSignal);
          uploadedChunks.add(chunkIndex);

          const progress = Math.round((uploadedChunks.size / totalChunks) * 90) + 5;
          const remainingChunks = totalChunks - uploadedChunks.size;
          const remainingTime = (remainingChunks * chunkSize) / networkSpeedRef.current;
          
          updateProgress(fileId, { 
            progress, 
            speed: networkSpeedRef.current,
            remainingTime,
            status: 'uploading',
            retryCount: retries,
          });
          
          return;
        } catch (error) {
          retries++;
          if (retries >= maxRetries) throw error;
          
          updateProgress(fileId, { status: 'retrying', retryCount: retries });
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
        }
      }
    };

    // Process chunks in parallel batches
    for (let i = 0; i < totalChunks; i += maxParallel) {
      if (abortSignal.aborted) throw new Error('Upload cancelled');
      
      const batch = [];
      for (let j = i; j < Math.min(i + maxParallel, totalChunks); j++) {
        batch.push(uploadChunkWithRetry(j));
      }
      await Promise.all(batch);
    }

    // Merge chunks
    updateProgress(fileId, { status: 'processing', progress: 95 });
    
    const mergeResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chunked-upload?action=merge-chunks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uploadId, fileName: file.name }),
        signal: abortSignal,
      }
    );

    if (!mergeResponse.ok) {
      throw new Error('Failed to merge chunks');
    }

    const { url } = await mergeResponse.json();
    return url;
  }, [getOptimalChunkSize, generateFileId, uploadChunk, updateProgress, maxRetries]);

  // Generate thumbnail for images
  const generateImageThumbnail = useCallback(async (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 400;
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
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve(undefined);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });
  }, []);

  // Generate thumbnail for videos
  const generateVideoThumbnail = useCallback(async (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.crossOrigin = 'anonymous';
      
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration / 4);
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(400, video.videoWidth);
        canvas.height = (canvas.width / video.videoWidth) * video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        URL.revokeObjectURL(video.src);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(undefined);
      };
      
      video.src = URL.createObjectURL(file);
    });
  }, []);

  // Main upload function
  const uploadFiles = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    if (isUploading) {
      toast.error('Upload already in progress');
      return [];
    }

    setIsUploading(true);
    const results: UploadResult[] = [];
    const validFiles: { file: File; id: string }[] = [];

    // Validate files and check for duplicates
    for (const file of files) {
      const fileId = generateFileId();
      
      // Size validation
      if (file.size > maxFileSize) {
        toast.error(`File "${file.name}" exceeds maximum size of ${Math.round(maxFileSize / (1024 * 1024 * 1024))}GB`);
        continue;
      }

      // Type validation
      const mimeType = detectMimeType(file);
      const isValid = mimeType.startsWith('image/') || 
                      mimeType.startsWith('video/') || 
                      mimeType.startsWith('audio/') ||
                      mimeType === 'application/pdf';
      
      if (!isValid) {
        toast.error(`File "${file.name}" has unsupported type`);
        continue;
      }

      // Duplicate check (hash + size fallback)
      try {
        const hash = await calculateFileHash(file);
        const { isDuplicate, fileName } = await checkDuplicate(hash, file.size);
        if (isDuplicate) {
          toast.error(`Duplicate detected: "${file.name}" already exists${fileName ? ` (matches ${fileName})` : ''}`);
          continue;
        }
      } catch (error) {
        console.warn('Duplicate check failed, proceeding with upload');
      }

      validFiles.push({ file, id: fileId });
      
      setUploads(prev => [...prev, {
        fileId,
        fileName: file.name,
        progress: 0,
        speed: 0,
        remainingTime: 0,
        status: 'pending',
        retryCount: 0,
      }]);
    }

    // Process uploads with concurrency limit
    const uploadQueue = [...validFiles];
    const activeUploads: Promise<void>[] = [];

    const processFile = async (item: { file: File; id: string }) => {
      const { file, id } = item;
      const abortController = new AbortController();
      abortControllersRef.current.set(id, abortController);

      try {
        updateProgress(id, { status: 'uploading', progress: 5 });

        // Choose upload method based on file size
        const threshold = 20 * 1024 * 1024; // 20MB
        let url: string;
        
        if (file.size < threshold) {
          url = await uploadFileDirect(file, id, abortController.signal);
        } else {
          url = await uploadFileChunked(file, id, abortController.signal);
        }

        // Generate thumbnails
        updateProgress(id, { status: 'processing', progress: 90 });
        
        let thumbnailUrl: string | undefined;
        let previewUrl: string | undefined;
        const mimeType = detectMimeType(file);
        
        if (mimeType.startsWith('image/')) {
          thumbnailUrl = await generateImageThumbnail(file);
        } else if (mimeType.startsWith('video/')) {
          thumbnailUrl = await generateVideoThumbnail(file);
          
          // Trigger server-side video preview generation (async, don't wait)
          updateProgress(id, { status: 'processing', progress: 95 });
          try {
            // Extract storage path from URL
            const urlParts = new URL(url);
            const storagePath = urlParts.pathname.split('/storage/v1/object/public/uploads/')[1];
            
            if (storagePath) {
              // Fire and forget - preview will be generated in background
              supabase.functions.invoke('generate-video-preview', {
                body: { 
                  videoPath: storagePath,
                  duration: 6,
                  resolution: 720
                },
              }).then(({ data, error }) => {
                if (error) {
                  console.warn('[useEnhancedUpload] Video preview generation failed:', error);
                } else if (data?.previewUrl) {
                  console.log('[useEnhancedUpload] Video preview generated:', data.previewUrl);
                  previewUrl = data.previewUrl;
                }
              }).catch(err => {
                console.warn('[useEnhancedUpload] Video preview request failed:', err);
              });
            }
          } catch (previewError) {
            console.warn('[useEnhancedUpload] Failed to trigger video preview:', previewError);
            // Non-blocking - continue with upload completion
          }
        }

        updateProgress(id, { status: 'complete', progress: 100 });

        results.push({
          id,
          url,
          thumbnailUrl,
          previewUrl,
          fileName: file.name,
          fileType: mimeType,
          fileSize: file.size,
        });

        toast.success(`Uploaded "${file.name}"`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        updateProgress(id, { status: 'error', error: errorMessage });
        onError?.(error instanceof Error ? error : new Error(errorMessage), file);
        toast.error(`Failed to upload "${file.name}": ${errorMessage}`);
      } finally {
        abortControllersRef.current.delete(id);
      }
    };

    // Start initial batch
    while (uploadQueue.length > 0 && activeUploads.length < maxConcurrent) {
      const item = uploadQueue.shift()!;
      const promise = processFile(item).finally(() => {
        const index = activeUploads.indexOf(promise);
        if (index > -1) activeUploads.splice(index, 1);
        
        // Start next upload if queue not empty
        if (uploadQueue.length > 0 && activeUploads.length < maxConcurrent) {
          const nextItem = uploadQueue.shift()!;
          const nextPromise = processFile(nextItem);
          activeUploads.push(nextPromise);
        }
      });
      activeUploads.push(promise);
    }

    await Promise.all(activeUploads);

    setIsUploading(false);
    onComplete?.(results);
    return results;
  }, [
    isUploading, maxFileSize, maxConcurrent, generateFileId, detectMimeType,
    calculateFileHash, checkDuplicate, updateProgress, uploadFileDirect,
    uploadFileChunked, generateImageThumbnail, generateVideoThumbnail, onError, onComplete
  ]);

  // Pause upload
  const pauseUpload = useCallback((fileId: string) => {
    pausedUploadsRef.current.add(fileId);
    updateProgress(fileId, { status: 'paused' });
  }, [updateProgress]);

  // Resume upload
  const resumeUpload = useCallback((fileId: string) => {
    pausedUploadsRef.current.delete(fileId);
    updateProgress(fileId, { status: 'uploading' });
  }, [updateProgress]);

  // Cancel upload
  const cancelUpload = useCallback((fileId: string) => {
    const controller = abortControllersRef.current.get(fileId);
    if (controller) {
      controller.abort();
    }
    pausedUploadsRef.current.delete(fileId);
    setUploads(prev => prev.filter(u => u.fileId !== fileId));
  }, []);

  // Cancel all uploads
  const cancelAllUploads = useCallback(() => {
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
    pausedUploadsRef.current.clear();
    setUploads([]);
    setIsUploading(false);
  }, []);

  // Retry failed upload
  const retryUpload = useCallback(async (fileId: string, file: File) => {
    cancelUpload(fileId);
    return uploadFiles([file]);
  }, [cancelUpload, uploadFiles]);

  // Clear completed uploads
  const clearCompleted = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status !== 'complete' && u.status !== 'error'));
  }, []);

  return {
    uploads,
    isUploading,
    uploadFiles,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    cancelAllUploads,
    retryUpload,
    clearCompleted,
  };
}
