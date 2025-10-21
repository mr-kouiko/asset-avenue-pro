import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateThumbnail, addWatermarkToImage, createWebPreviewWithWatermark } from '@/utils/watermark';
import { StreamingUploadHandler } from '@/components/media/StreamingUploadHandler';

interface ProcessedFile {
  id: string;
  originalFile: File;
  watermarkedUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  status: 'processing' | 'completed' | 'error';
  error?: string;
}

interface UseAutomaticWatermarkReturn {
  processedFiles: ProcessedFile[];
  isProcessing: boolean;
  processFiles: (files: File[], onProgress?: (fileId: string, progress: number) => void) => Promise<ProcessedFile[]>;
  clearProcessedFiles: () => void;
}

export const useAutomaticWatermark = (): UseAutomaticWatermarkReturn => {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Enhanced MIME type detection with priority for video files
  const detectMimeType = (blob: Blob, originalFile?: File, forceType?: string): string => {
    if (forceType) return forceType;
    
    // For video files, prioritize extension-based detection over browser MIME type
    if (originalFile?.name) {
      const ext = originalFile.name.toLowerCase().split('.').pop();
      const videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv', 'flv', '3gp', 'm4v'];
      
      if (ext && videoExtensions.includes(ext)) {
        const videoMimeMap: { [key: string]: string } = {
          'mp4': 'video/mp4',
          'mov': 'video/quicktime',
          'avi': 'video/x-msvideo',
          'webm': 'video/webm',
          'mkv': 'video/x-matroska',
          'wmv': 'video/x-ms-wmv',
          'flv': 'video/x-flv',
          '3gp': 'video/3gpp',
          'm4v': 'video/mp4'
        };
        const mimeType = videoMimeMap[ext];
        console.log(`🎥 Video MIME type detection - File: ${originalFile.name}, Extension: ${ext}, Type: ${mimeType}`);
        return mimeType;
      }
    }
    
    // Use original file MIME type for non-video files
    if (originalFile?.type && blob === originalFile && !originalFile.type.includes('octet-stream')) {
      return originalFile.type;
    }
    
    // Use blob MIME type if reliable
    if (blob.type && blob.type !== 'application/octet-stream') {
      return blob.type;
    }
    
    // Extended fallback detection based on file extension
    if (originalFile?.name) {
      const ext = originalFile.name.toLowerCase().split('.').pop();
      const mimeMap: { [key: string]: string } = {
        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'tiff': 'image/tiff',
        'svg': 'image/svg+xml',
        // Videos (redundant but safe)
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'webm': 'video/webm',
        'mkv': 'video/x-matroska',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        '3gp': 'video/3gpp',
        'm4v': 'video/mp4',
        // Audio
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac',
        'flac': 'audio/flac',
        // Documents
        'pdf': 'application/pdf'
      };
      
      const detectedType = mimeMap[ext || ''] || 'application/octet-stream';
      console.log(`📄 File MIME type detection - File: ${originalFile.name}, Extension: ${ext}, Type: ${detectedType}`);
      return detectedType;
    }
    
    return 'application/octet-stream';
  };

  const uploadToSupabase = async (
    blob: Blob, 
    path: string, 
    bucket: string = 'uploads',
    originalFile?: File,
    forceContentType?: string,
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    // Auto-detect MIME type with proper handling
    const contentType = detectMimeType(blob, originalFile, forceContentType);
    
    console.log(`Uploading to ${bucket}/${path} with MIME type: ${contentType}`);
    
    // Always use Supabase client for uploads - no manual HTTP requests
    onProgress?.(10);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType
      });

    onProgress?.(90);

    if (error) {
      console.error(`Upload failed for ${path}:`, error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    onProgress?.(100);

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const processVideoWatermark = async (
    file: File,
    videoMeta: any,
    userId: string,
    fileId: string
  ): Promise<string> => {
    console.log(`Processing video: ${file.name}, MIME type: ${file.type}`);
    
    // Ensure we support the video format
    const supportedVideoFormats = ['video/mp4', 'video/webm', 'video/quicktime'];
    const videoMimeType = file.type || detectMimeType(file, file);
    
    if (!supportedVideoFormats.includes(videoMimeType)) {
      console.warn(`Unsupported video format: ${videoMimeType}, uploading as original`);
    }

    // Upload original video with correct MIME type
    const videoExtension = file.name.split('.').pop()?.toLowerCase();
    const videoPath = `${userId}/videos/${fileId}_original.${videoExtension}`;
    
    // Force the correct video MIME type
    const originalUrl = await uploadToSupabase(file, videoPath, 'uploads', file, videoMimeType);

    // Call edge function for server-side video watermarking
    const outputPath = `${userId}/videos/${fileId}_watermarked.${videoExtension}`;
    
    try {
      const { data, error } = await supabase.functions.invoke('watermark-video', {
        body: {
          videoPath: videoPath,
          watermarkSize: videoMeta.watermarkSize,
          outputPath,
          mimeType: videoMimeType
        }
      });

      if (error) {
        console.warn('Video watermarking service not yet fully implemented:', error);
        return originalUrl;
      }

      console.log('Video watermark processing result:', data);
      return originalUrl; // Return original until full implementation
    } catch (error) {
      console.error('Error calling video watermark service:', error);
      return originalUrl;
    }
  };

  const processFiles = useCallback(async (files: File[], onProgress?: (fileId: string, progress: number) => void): Promise<ProcessedFile[]> => {
    setIsProcessing(true);
    const results: ProcessedFile[] = [];

    try {
      // Refresh session to ensure valid token for uploads
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        throw new Error('Session refresh failed. Please login again.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      for (const file of files) {
        const fileId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
        
          const processedFile: ProcessedFile = {
          id: fileId,
          originalFile: file,
          type: file.type.startsWith('image/') ? 'image' : 
                file.type.startsWith('video/') ? 'video' : 
                file.type === 'application/pdf' ? 'document' : 'audio',
          status: 'processing'
        };

        results.push(processedFile);
        setProcessedFiles(prev => [...prev, processedFile]);

        try {
          let watermarkedUrl: string | undefined;
          let thumbnailUrl: string;
          let previewUrl: string | undefined;

          const fileExtension = file.name.split('.').pop()?.toLowerCase();
          let filePath: string;
          let bucketName = 'uploads';
          
          // Determine file path and bucket based on type
          if (file.type.startsWith('video/')) {
            filePath = `${user.id}/videos/${fileId}_original.${fileExtension}`;
          } else if (file.type.startsWith('audio/')) {
            filePath = `${user.id}/audio/${fileId}_original.${fileExtension}`;
            bucketName = 'Audio VisuStock';
          } else if (file.type.startsWith('image/')) {
            filePath = `${user.id}/images/${fileId}_original.${fileExtension}`;
          } else {
            filePath = `${user.id}/files/${fileId}_original.${fileExtension}`;
          }
          
          onProgress?.(fileId, 10);
          
          // Upload original file
          if (file.type.startsWith('video/')) {
            const result = await StreamingUploadHandler.uploadFile(file, (p) => {
              onProgress?.(fileId, Math.min(50, 10 + p * 0.4));
            }, filePath);
            if (!result.success || !result.fileUrl) {
              throw new Error(result.error || 'Streaming upload failed');
            }
            watermarkedUrl = result.fileUrl;
          } else {
            watermarkedUrl = await uploadToSupabase(file, filePath, bucketName, file, file.type, (progress) => {
              onProgress?.(fileId, Math.min(50, 10 + progress * 0.4));
            });
          }
          
          onProgress?.(fileId, 60);
          
          // Generate and upload thumbnail with watermark
          try {
            const thumbnailBlob = await generateThumbnail(file, {
              maxSize: 400,
              quality: 0.8,
              format: 'image/jpeg'
            });
            
            const thumbnailPath = `${user.id}/thumbnails/${fileId}_thumbnail.jpg`;
            thumbnailUrl = await uploadToSupabase(thumbnailBlob, thumbnailPath, 'thumbnails', undefined, 'image/jpeg', (progress) => {
              onProgress?.(fileId, 60 + progress * 0.2);
            });
            
            console.log(`✅ Thumbnail generated and uploaded: ${thumbnailUrl}`);
          } catch (thumbError) {
            console.warn('Thumbnail generation failed, using original:', thumbError);
            thumbnailUrl = watermarkedUrl; // Fallback to original
          }
          
          onProgress?.(fileId, 85);
          
          // Generate and upload preview for images
          if (file.type.startsWith('image/')) {
            try {
              const previewBlob = await createWebPreviewWithWatermark(file, {
                opacity: 0.3,
                spacing: 150,
                logoPath: 'https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/public/LOGO%20DE%20WATERMARKING/Blue%20Modern%20Sound%20Studio%20Logo%20(3).png'
              });
              
              const previewPath = `${user.id}/previews/${fileId}_preview.jpg`;
              previewUrl = await uploadToSupabase(previewBlob, previewPath, 'previews', undefined, 'image/jpeg', (progress) => {
                onProgress?.(fileId, 85 + progress * 0.15);
              });
              
              console.log(`✅ Preview generated and uploaded: ${previewUrl}`);
            } catch (previewError) {
              console.warn('Preview generation failed:', previewError);
            }
          }
          
          console.log(`✅ File processed with watermarked thumbnail: ${watermarkedUrl}`);

          // Update processed file with results
          const updatedFile = {
            ...processedFile,
            watermarkedUrl,
            thumbnailUrl,
            previewUrl,
            status: 'completed' as const
          };

          setProcessedFiles(prev => 
            prev.map(f => f.id === fileId ? updatedFile : f)
          );

          // Update results array
          const resultIndex = results.findIndex(f => f.id === fileId);
          if (resultIndex !== -1) {
            results[resultIndex] = updatedFile;
          }

        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          
          const errorFile = {
            ...processedFile,
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Processing failed'
          };

          setProcessedFiles(prev => 
            prev.map(f => f.id === fileId ? errorFile : f)
          );

          // Update results array
          const resultIndex = results.findIndex(f => f.id === fileId);
          if (resultIndex !== -1) {
            results[resultIndex] = errorFile;
          }

          toast.error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const successCount = results.filter(f => f.status === 'completed').length;
      const errorCount = results.filter(f => f.status === 'error').length;

      if (successCount > 0) {
        toast.success(`Successfully processed ${successCount} file(s)`);
      }

      if (errorCount > 0) {
        toast.error(`Failed to process ${errorCount} file(s)`);
      }

    } catch (error) {
      console.error('Error in processFiles:', error);
      toast.error('Failed to process files');
    } finally {
      setIsProcessing(false);
    }

    return results;
  }, []);

  const clearProcessedFiles = useCallback(() => {
    setProcessedFiles([]);
  }, []);

  return {
    processedFiles,
    isProcessing,
    processFiles,
    clearProcessedFiles
  };
};