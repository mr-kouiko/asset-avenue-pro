import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, FileText, Image, Film, Music, Eye, Check, AlertCircle, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addWatermarkToImage, shouldWatermark, generateThumbnail } from "@/utils/watermark";
import { compressImage, createFileChunks, getOptimalChunkSize } from "@/utils/fileCompression";

interface FileUploadProps {
  onFilesUploaded?: (fileUrls: { 
    url: string; 
    name: string; 
    type: string; 
    bucket: string;
    size: number;
    previewUrl?: string;
    thumbnailUrl?: string;
    isWatermarked?: boolean;
  }[]) => void;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
  maxFiles?: number;
  autoUpload?: boolean;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'compressing' | 'uploading' | 'merging' | 'processing' | 'completed' | 'error' | 'paused' | 'cancelled';
  url?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  isWatermarked?: boolean;
  compressedFile?: File;
  chunks?: Blob[];
  uploadedChunks?: number;
  totalChunks?: number;
  abortController?: AbortController;
  retryCount?: number;
  uploadId?: string;
  uploadStartTime?: number;
  compressionSavings?: number;
}

export const FileUpload = ({ 
  onFilesUploaded, 
  acceptedTypes = ['image/*', 'video/*', 'audio/*', 'model/*'],
  maxFileSize = 500, // Increased for 3D files
  maxFiles = 50, // Allow more files for bulk upload
  autoUpload = false
}: FileUploadProps) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInstanceRef = useRef<string>(`upload-${Date.now()}`);

  // Cleanup function to remove all upload instances and listeners
  const cleanupUploadInstances = useCallback(() => {
    console.log('🧹 Cleaning up upload instances and listeners')
    
    // Clear all ongoing uploads
    files.forEach(file => {
      if (file.abortController && !file.abortController.signal.aborted) {
        file.abortController.abort()
      }
    })
    
    // Clear the files state
    setFiles([])
    
    // Remove any global event listeners that might have been added
    document.removeEventListener('dragover', preventDefault, true)
    document.removeEventListener('drop', preventDefault, true)
    window.removeEventListener('beforeunload', cleanupUploadInstances)
    
    uploadInstanceRef.current = `upload-${Date.now()}`
    console.log('✅ Cleanup completed, new instance:', uploadInstanceRef.current)
  }, [files])

  // Prevent default drag behaviors globally
  const preventDefault = useCallback((e: Event) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // Cleanup on unmount and remove old instances
  useEffect(() => {
    const currentInstance = uploadInstanceRef.current;
    
    // Add global drag prevention
    document.addEventListener('dragover', preventDefault, true)
    document.addEventListener('drop', preventDefault, true)
    window.addEventListener('beforeunload', cleanupUploadInstances)
    
    // Clear any existing upload instances
    const existingUploads = document.querySelectorAll('[data-upload-instance]');
    existingUploads.forEach(el => {
      if (el.getAttribute('data-upload-instance') !== currentInstance) {
        el.remove();
      }
    });
    
    return () => {
      cleanupUploadInstances()
      console.log(`FileUpload instance ${currentInstance} cleaned up`);
    };
  }, [cleanupUploadInstances, preventDefault])

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Film className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Enhanced retry operation with exponential backoff and jitter
  const retryOperation = async <T,>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3
  ): Promise<T> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()
        if (attempt > 1) {
          console.log(`✅ ${operationName} succeeded on attempt ${attempt}`)
        }
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.warn(`❌ ${operationName} attempt ${attempt}/${maxRetries} failed:`, errorMessage)
        
        if (attempt === maxRetries) {
          throw new Error(`${operationName} failed after ${maxRetries} attempts. Last error: ${errorMessage}`)
        }
        
        // Exponential backoff with jitter: 1s, 2s, 4s + random 0-1s
        const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 8000)
        const jitter = Math.random() * 1000
        const delay = baseDelay + jitter
        
        console.log(`⏳ Retrying ${operationName} in ${Math.round(delay)}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw new Error(`${operationName} failed after ${maxRetries} attempts`)
  }

  // Helper function to update file progress with more detailed status
  const updateFileProgress = (fileId: string, progress: number, status: UploadFile['status'], message?: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { 
        ...f, 
        progress: Math.min(100, Math.max(0, progress)), 
        status,
        ...(message && { error: status === 'error' ? message : undefined })
      } : f
    ))
  }

  // Upload a single chunk with retries
  const uploadSingleChunk = async (
    chunk: Blob, 
    chunkIndex: number, 
    totalChunks: number, 
    uploadId: string, 
    fileName: string, 
    uploadFile: UploadFile
  ): Promise<void> => {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('No valid session found')
    }

    const formData = new FormData()
    formData.append('chunk', chunk)
    formData.append('chunkIndex', chunkIndex.toString())
    formData.append('totalChunks', totalChunks.toString())
    formData.append('fileName', fileName)
    formData.append('uploadId', uploadId)

    await retryOperation(async () => {
      const response = await fetch(`https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/chunked-upload?action=upload-chunk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2Zwb3BocG9xdWd0dXZmeHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQzMzEsImV4cCI6MjA3MDE2MDMzMX0.m8KZCGvdZm2v6jBiQnv6LQqM2DPhuaVlcVWrTc0dMp8'
        },
        body: formData,
        signal: uploadFile.abortController?.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Chunk ${chunkIndex + 1} upload failed: ${errorData.error || response.statusText}`)
      }

      console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`)
    }, `upload chunk ${chunkIndex + 1}/${totalChunks}`)
  }

  // Enhanced MIME type detection with WebP priority
  const detectMimeType = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // ✅ Forcer le bon type MIME pour WebP
    if (extension === 'webp') {
      return 'image/webp';
    }
    
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
      'webm': 'audio/webm',
      'flac': 'audio/flac'
    };

    // Priority 1: Use extension-based detection first for reliability
    if (extension) {
      const detectedType = imageTypes[extension] || videoTypes[extension] || audioTypes[extension];
      if (detectedType) {
        return detectedType;
      }
    }

    // Priority 2: Use browser file.type if reliable
    if (file.type && file.type !== 'application/octet-stream') {
      return file.type;
    }

    return 'application/octet-stream';
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `Le fichier dépasse ${maxFileSize}MB`;
    }

    // Get reliable MIME type using extension-based detection
    const detectedMimeType = detectMimeType(file);
    
    // Check file type using detected MIME type
    const isValidType = acceptedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return detectedMimeType.startsWith(baseType);
      }
      return detectedMimeType === type;
    });

    if (!isValidType) {
      console.log(`🚫 File validation failed - File: ${file.name}, Detected type: ${detectedMimeType}, Browser type: ${file.type}, Accepted types: ${acceptedTypes.join(', ')}`);
      return 'Type de fichier non supporté';
    }

    console.log(`✅ File validation passed - File: ${file.name}, Detected type: ${detectedMimeType}`);
    return null;
  };

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadFile[] = [];
    const currentFileCount = files.length;

    for (let i = 0; i < fileList.length && newFiles.length + currentFileCount < maxFiles; i++) {
      const file = fileList[i];
      const error = validateFile(file);
      
      newFiles.push({
        file,
        id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2)}`,
        progress: 0,
        status: error ? 'error' : 'pending',
        error
      });
    }

    if (fileList.length + currentFileCount > maxFiles) {
      toast.error(`Maximum ${maxFiles} fichiers autorisés`);
    }

    setFiles(prev => [...prev, ...newFiles]);

    // Auto-upload if enabled
    if (autoUpload && newFiles.some(f => f.status === 'pending')) {
      // Small delay to let the UI update
      setTimeout(() => {
        uploadAllFiles();
      }, 500);
    }
  }, [files.length, maxFiles, acceptedTypes, maxFileSize, autoUpload]);

  const compressFileIfNeeded = async (file: File, uploadFile: UploadFile): Promise<File> => {
    const originalSize = file.size;
    
    if (file.type.startsWith('image/')) {
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'compressing', progress: 5 } : f
      ));

      try {
        const compressedFile = await compressImage(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.8,
          format: 'webp'
        });
        
        const compressionSavings = Math.round((1 - compressedFile.size / originalSize) * 100);
        
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { 
            ...f, 
            compressionSavings,
            progress: 10 
          } : f
        ));
        
        return compressedFile;
      } catch (error) {
        console.warn('Image compression failed, using original:', error);
        return file;
      }
    }
    
    if (file.type.startsWith('video/')) {
      // For videos, return original but could add preview generation here
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, progress: 10 } : f
      ));
      return file;
    }
    
    return file;
  };

  const uploadFileInChunks = async (
    file: File, 
    uploadFile: UploadFile, 
    basePath: string
  ): Promise<string> => {
    const chunkSize = getOptimalChunkSize(file.size);
    const chunks = createFileChunks(file, chunkSize);
    const totalChunks = chunks.length;
    
    // Initialize abort controller for this upload
    const abortController = new AbortController();
    setFiles(prev => prev.map(f => 
      f.id === uploadFile.id ? { 
        ...f, 
        abortController, 
        chunks, 
        uploadedChunks: 0,
        totalChunks,
        uploadStartTime: Date.now(),
        status: 'uploading'
      } : f
    ));
    
    // If file is small enough (< 10MB), upload directly to avoid chunking overhead
    if (file.size < 10 * 1024 * 1024) {
      try {
        const { data, error } = await supabase.storage
          .from('original-files')
          .upload(basePath, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          // If path already exists, try with a different name
          if (error.message.includes('already exists')) {
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2);
            const newBasePath = basePath.replace(/(\.[^.]+)$/, `_${timestamp}_${randomStr}$1`);
            
            const { data: retryData, error: retryError } = await supabase.storage
              .from('original-files')
              .upload(newBasePath, file, {
                cacheControl: '3600',
                upsert: false
              });
            
            if (retryError) throw retryError;
            return retryData.path;
          }
          throw error;
        }
        return data.path;
      } catch (error) {
        console.error('Direct upload failed:', error);
        // Fall back to chunked upload for reliability
      }
    }

    // 1. Initialize chunked upload with server
    updateFileProgress(uploadFile.id, 5, 'uploading', 'Initializing upload...')
    
    const initResponse = await retryOperation(async () => {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch(`https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/chunked-upload?action=init-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2Zwb3BocG9xdWd0dXZmeHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQzMzEsImV4cCI6MjA3MDE2MDMzMX0.m8KZCGvdZm2v6jBiQnv6LQqM2DPhuaVlcVWrTc0dMp8'
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          totalChunks,
          basePath
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to initialize upload: ${errorData.error || response.statusText}`);
      }

      return response.json();
    }, 'initialize upload');

    const uploadId = initResponse.uploadId;
    const fileName = file.name;
    
    setFiles(prev => prev.map(f => 
      f.id === uploadFile.id ? { ...f, uploadId } : f
    ));

    console.log(`🚀 Starting chunked upload: ${totalChunks} chunks for ${fileName}`);

    // 2. Parallel chunk upload with retries and better coordination
    const uploadChunks = async (chunks: Blob[], uploadId: string, fileName: string): Promise<void> => {
      const maxConcurrentUploads = 2 // Reduced concurrent uploads for better reliability
      const chunkStatus = new Array(chunks.length).fill(false)
      let uploadedCount = 0
      
      // Upload chunks in batches with proper verification
      for (let i = 0; i < chunks.length; i += maxConcurrentUploads) {
        const batch = chunks.slice(i, i + maxConcurrentUploads)
        const batchPromises = batch.map(async (chunk, batchIndex) => {
          const chunkIndex = i + batchIndex
          const maxRetries = 3
          let attempt = 0
          
          while (attempt < maxRetries && !chunkStatus[chunkIndex]) {
            try {
              await uploadSingleChunk(chunk, chunkIndex, chunks.length, uploadId, fileName, uploadFile)
              chunkStatus[chunkIndex] = true
              uploadedCount++
              
              // Update progress more granularly
              const progress = Math.round((uploadedCount / chunks.length) * 70) // 70% for upload phase
              updateFileProgress(uploadFile.id, 15 + progress, 'uploading', `Uploaded chunk ${uploadedCount}/${chunks.length}`)
              break
            } catch (error) {
              attempt++
              console.warn(`Chunk ${chunkIndex} upload attempt ${attempt} failed:`, error)
              
              if (attempt < maxRetries) {
                // Exponential backoff with jitter
                const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 10000)
                await new Promise(resolve => setTimeout(resolve, delay))
              } else {
                throw new Error(`Failed to upload chunk ${chunkIndex} after ${maxRetries} attempts: ${error.message}`)
              }
            }
          }
        })
        
        // Wait for this batch to complete before starting the next
        await Promise.all(batchPromises)
        
        // Small delay between batches to avoid overwhelming the server
        if (i + maxConcurrentUploads < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      // Verify all chunks were uploaded
      const failedChunks = chunkStatus.map((status, index) => status ? null : index).filter(index => index !== null)
      if (failedChunks.length > 0) {
        throw new Error(`Failed to upload chunks: ${failedChunks.join(', ')}`)
      }
    }

    // 3. Execute chunk uploads
    await uploadChunks(chunks, uploadId, fileName)
    
    // Add a small delay to ensure all chunks are fully written
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 4. Merge chunks on server with retry logic
    updateFileProgress(uploadFile.id, 85, 'merging', 'Merging file chunks...')
    
    const mergeResponse = await retryOperation(async () => {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch(`https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/chunked-upload?action=merge-chunks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2Zwb3BocG9xdWd0dXZmeHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQzMzEsImV4cCI6MjA3MDE2MDMzMX0.m8KZCGvdZm2v6jBiQnv6LQqM2DPhuaVlcVWrTc0dMp8'
        },
        body: JSON.stringify({
          uploadId,
          fileName,
          totalChunks: chunks.length,
          bucket: 'original-files',
          basePath
        }),
        signal: abortController.signal
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown merge error' }))
        
        // If chunks are missing, provide helpful error message
        if (errorData.error?.includes('missing') || response.status === 400) {
          throw new Error(`Some file chunks are missing. This may be due to network issues. Please try uploading again. Details: ${errorData.error}`)
        }
        
        throw new Error(`Merge failed: ${errorData.error || response.statusText}`)
      }
      
      return response.json()
    }, 'merge chunks', 2) // Reduced retries for merge as it's more likely to be a permanent issue
    
    console.log('📦 Merge completed:', mergeResponse)

    return mergeResponse.path;
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    console.log('🔄 Starting uploadFile for:', uploadFile.file.name);
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        console.log('📤 Attempt', retryCount + 1, 'for file:', uploadFile.file.name);
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { 
            ...f, 
            status: 'uploading', 
            progress: 5, 
            retryCount,
            error: undefined
          } : f
        ));

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        console.log('👤 User authenticated:', !!user, user?.id);
        if (!user) throw new Error('User not authenticated');

        // Compress file if needed
        const fileToUpload = await compressFileIfNeeded(uploadFile.file, uploadFile);
        
        // Update with compressed file info
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, compressedFile: fileToUpload, progress: 10 } : f
        ));

        // Generate unique filename
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const basePath = `${user.id}/${fileName}`;

        // Upload with chunking support
        const uploadPath = await uploadFileInChunks(fileToUpload, uploadFile, basePath);

      let previewUrl: string | undefined;
      let thumbnailUrl: string | undefined;
      let isWatermarked = false;

      // Process watermark and thumbnail for images, videos, and audio
      if (shouldWatermark(uploadFile.file.type) || uploadFile.file.type.startsWith('audio/')) {
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, status: 'processing', progress: 50 } : f
        ));

        try {
          if (uploadFile.file.type.startsWith('image/')) {
            // Generate watermarked preview for images with enhanced settings
            const watermarkedBlob = await addWatermarkToImage(uploadFile.file, {
              opacity: 0.4,
              position: 'bottom-right',
              size: 12
            });

            const previewFileName = `preview_${fileName}`;
            const previewPath = `${user.id}/${previewFileName}`;

            const { data: previewData, error: previewError } = await supabase.storage
              .from('previews')
              .upload(previewPath, watermarkedBlob);

            if (!previewError && previewData) {
              previewUrl = previewData.path;
              isWatermarked = true;
            }
          } else if (uploadFile.file.type.startsWith('video/')) {
            // For videos, note that watermarking requires server-side processing
            // This marks the video as processed but doesn't apply watermark yet
            isWatermarked = false; // Will be true once server-side watermarking is implemented
          } else if (uploadFile.file.type.startsWith('audio/')) {
            // Audio files don't need watermarking, just processing
            isWatermarked = false;
          }

          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { ...f, progress: 70 } : f
          ));

          // Generate high-quality thumbnail for images, videos, and audio
          const thumbnailBlob = await generateThumbnail(uploadFile.file, {
            maxSize: 600,
            quality: 0.9,
            format: 'image/jpeg'
          });
          const thumbnailFileName = `thumb_${fileName}`;
          const thumbnailPath = `${user.id}/${thumbnailFileName}`;

          const { data: thumbData, error: thumbError } = await supabase.storage
            .from('thumbnails')
            .upload(thumbnailPath, thumbnailBlob);

          if (!thumbError && thumbData) {
            thumbnailUrl = thumbData.path;
          }

        } catch (watermarkError) {
          console.warn('Watermarking failed:', watermarkError);
          // Continue without watermark if it fails
        }
      }

      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, progress: 90 } : f
      ));

      // Final update
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'completed', 
              progress: 100, 
              url: uploadPath,
              previewUrl,
              thumbnailUrl,
              isWatermarked
            }
          : f
      ));

        return { 
          url: uploadPath, 
          name: uploadFile.file.name, 
          type: uploadFile.file.type,
          bucket: 'original-files',
          size: uploadFile.compressedFile?.size || uploadFile.file.size,
          previewUrl,
          thumbnailUrl,
          isWatermarked
        };
      } catch (error) {
        console.error(`Upload error (attempt ${retryCount + 1}):`, error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'uploading', error: `Tentative ${retryCount}/${maxRetries}...` }
              : f
          ));
          // Exponential backoff: wait 2^retryCount seconds
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          continue;
        }

        const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'upload';
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'error', error: errorMessage, retryCount }
            : f
        ));
        throw error;
      }
    }
  };

  const pauseUpload = (id: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id && f.abortController) {
        f.abortController.abort('Upload paused');
        return { ...f, status: 'paused' };
      }
      return f;
    }));
  };

  const resumeUpload = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (file && file.status === 'paused') {
      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: 'pending' } : f
      ));
      await uploadFile(file);
    }
  };

  const uploadAllFiles = async () => {
    console.log('🚀 Starting uploadAllFiles');
    const pendingFiles = files.filter(f => f.status === 'pending');
    console.log('📁 Pending files count:', pendingFiles.length);
    if (pendingFiles.length === 0) return;
    
    toast.info(`Début de l'upload de ${pendingFiles.length} fichier(s)...`);
    
    try {
      // Process files in smaller batches to avoid overwhelming the server
      const batchSize = 5;
      const batches = [];
      for (let i = 0; i < pendingFiles.length; i += batchSize) {
        batches.push(pendingFiles.slice(i, i + batchSize));
      }

      const allResults = [];
      for (const batch of batches) {
        const batchPromises = batch.map(uploadFile);
        const batchResults = await Promise.allSettled(batchPromises);
        allResults.push(...batchResults);
        
        // Small delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successfulUploads = allResults
        .filter((result): result is PromiseFulfilledResult<{
          url: string; 
          name: string; 
          type: string; 
          bucket: string;
          size: number;
          previewUrl?: string;
          thumbnailUrl?: string;
          isWatermarked?: boolean;
        }> => result.status === 'fulfilled')
        .map(result => result.value);

      const failedCount = allResults.filter(result => result.status === 'rejected').length;

      if (successfulUploads.length > 0) {
        onFilesUploaded?.(successfulUploads);
        toast.success(`${successfulUploads.length} fichier(s) uploadé(s) avec succès${
          successfulUploads.filter(f => f.isWatermarked).length > 0 
            ? ' avec watermarking automatique' 
            : ''
        }`);
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} fichier(s) ont échoué lors de l'upload`);
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error('Erreur lors de l\'upload en masse');
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  return (
    <div className="space-y-4" data-upload-instance={uploadInstanceRef.current}>
      {/* Upload Zone */}
      <Card 
        className={`border-2 border-dashed transition-all duration-200 ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center">
          <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
            isDragOver ? 'text-primary' : 'text-muted-foreground'
          }`} />
          <h3 className="text-lg font-medium mb-2">
            {isDragOver ? 'Déposez vos fichiers ici' : 'Glissez vos fichiers ici'}
          </h3>
          <p className="text-muted-foreground mb-4">
            ou cliquez pour sélectionner des fichiers
          </p>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
          >
            Choisir des fichiers
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            {acceptedTypes.join(', ')} jusqu'à {maxFileSize}MB - Maximum {maxFiles} fichiers
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      </Card>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Fichiers sélectionnés ({files.length})</h4>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={cleanupUploadInstances}
              >
                Tout supprimer
              </Button>
              <Button 
                size="sm"
                onClick={uploadAllFiles}
                disabled={!files.some(f => f.status === 'pending')}
              >
                Uploader tout
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {files.map((uploadFile) => (
              <Card key={uploadFile.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getFileIcon(uploadFile.file.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </p>
                       <Badge variant={
                        uploadFile.status === 'completed' ? 'default' :
                        uploadFile.status === 'error' ? 'destructive' :
                        uploadFile.status === 'uploading' || uploadFile.status === 'merging' ? 'secondary' :
                        uploadFile.status === 'processing' ? 'secondary' : 'outline'
                      }>
                        {uploadFile.status === 'completed' && <Check className="h-3 w-3 mr-1" />}
                        {uploadFile.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {uploadFile.status === 'pending' && 'En attente'}
                        {uploadFile.status === 'compressing' && 'Compression...'}
                        {uploadFile.status === 'uploading' && 'Upload...'}
                        {uploadFile.status === 'merging' && 'Fusion...'}
                        {uploadFile.status === 'processing' && 'Traitement...'}
                        {uploadFile.status === 'completed' && (uploadFile.isWatermarked ? 'Terminé ✨' : 'Terminé')}
                        {uploadFile.status === 'error' && 'Erreur'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>{formatFileSize(uploadFile.compressedFile?.size || uploadFile.file.size)}</span>
                        {uploadFile.compressedFile && uploadFile.compressedFile.size < uploadFile.file.size && (
                          <Badge variant="outline" className="text-xs">
                            -{Math.round((1 - uploadFile.compressedFile.size / uploadFile.file.size) * 100)}%
                          </Badge>
                        )}
                      </div>
                      {(uploadFile.status === 'uploading' || uploadFile.status === 'processing' || uploadFile.status === 'merging') && (
                        <div className="flex items-center gap-2">
                          {uploadFile.chunks && uploadFile.uploadedChunks && (
                            <span className="text-xs">
                              {uploadFile.uploadedChunks}/{uploadFile.chunks.length} chunks
                            </span>
                          )}
                          <span>{Math.round(uploadFile.progress)}%</span>
                        </div>
                      )}
                      {uploadFile.error && (
                        <span className="text-destructive">{uploadFile.error}</span>
                      )}
                      {uploadFile.isWatermarked && uploadFile.status === 'completed' && (
                        <span className="text-primary text-xs">Watermarqué</span>
                      )}
                      {uploadFile.retryCount && uploadFile.retryCount > 0 && (
                        <span className="text-warning text-xs">Retry {uploadFile.retryCount}</span>
                      )}
                    </div>

                    {(uploadFile.status === 'uploading' || uploadFile.status === 'processing' || uploadFile.status === 'merging' || uploadFile.status === 'compressing') && (
                      <Progress value={uploadFile.progress} className="mt-2 h-1" />
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {uploadFile.status === 'uploading' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => pauseUpload(uploadFile.id)}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {uploadFile.status === 'paused' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resumeUpload(uploadFile.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {uploadFile.status === 'completed' && (
                      <Badge variant="outline" className="text-xs">
                        Uploadé
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(uploadFile.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
