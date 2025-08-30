import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProcessedFile {
  id: string;
  originalFile: File;
  watermarkedUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  type: 'image' | 'video' | 'audio';
  status: 'processing' | 'completed' | 'error';
  error?: string;
}

interface UseAutomaticWatermarkReturn {
  processedFiles: ProcessedFile[];
  isProcessing: boolean;
  processFiles: (files: File[]) => Promise<ProcessedFile[]>;
  clearProcessedFiles: () => void;
}

export const useAutomaticWatermark = (): UseAutomaticWatermarkReturn => {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Detect MIME type automatically
  const detectMimeType = (blob: Blob, originalFile?: File, forceType?: string): string => {
    if (forceType) return forceType;
    
    if (originalFile?.type && blob === originalFile) {
      return originalFile.type;
    }
    
    if (blob.type && blob.type !== 'application/octet-stream') {
      return blob.type;
    }
    
    // Fallback detection based on file extension
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
        // Videos  
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'webm': 'video/webm',
        'mkv': 'video/x-matroska',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        '3gp': 'video/3gpp',
        // Audio
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac',
        'flac': 'audio/flac'
      };
      return mimeMap[ext || ''] || 'application/octet-stream';
    }
    
    return 'application/octet-stream';
  };

  const uploadToSupabase = async (
    blob: Blob,
    path: string,
    bucket: string = 'uploads',
    originalFile?: File,
    forceContentType?: string
  ): Promise<string> => {
    // Auto-detect MIME type with proper handling
    const contentType = detectMimeType(blob, originalFile, forceContentType);
    
    console.log(`Uploading to ${bucket}/${path} with MIME type: ${contentType}`);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType
      });

    if (error) {
      console.error(`Upload failed for ${path}:`, error);
      throw new Error(`Upload failed: ${error.message}`);
    }

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

  const processFiles = useCallback(async (files: File[]): Promise<ProcessedFile[]> => {
    setIsProcessing(true);
    const results: ProcessedFile[] = [];

    try {
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
                file.type.startsWith('video/') ? 'video' : 'audio',
          status: 'processing'
        };

        results.push(processedFile);
        setProcessedFiles(prev => [...prev, processedFile]);

        try {
          let watermarkedUrl: string | undefined;
          let thumbnailUrl: string;
          let previewUrl: string | undefined;

          // Upload original files directly without thumbnail/preview generation
          const fileExtension = file.name.split('.').pop()?.toLowerCase();
          let filePath: string;
          let bucketName = 'uploads';
          
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
          
          // Upload original file only - no thumbnails or previews
          watermarkedUrl = await uploadToSupabase(file, filePath, bucketName, file, file.type);
          thumbnailUrl = watermarkedUrl; // Use original file as thumbnail
          
          console.log(`✅ File uploaded directly without thumbnails/previews: ${watermarkedUrl}`);

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