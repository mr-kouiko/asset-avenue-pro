import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { processFileWithWatermark } from '@/utils/automaticWatermark';
import { toast } from 'sonner';

interface ProcessedFile {
  id: string;
  originalFile: File;
  watermarkedUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  type: 'image' | 'video' | 'audio' | 'other';
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
  const detectMimeType = (blob: Blob, originalFile?: File): string => {
    if (blob.type) return blob.type;
    if (originalFile?.type) return originalFile.type;
    
    // Fallback detection based on file extension
    if (originalFile?.name) {
      const ext = originalFile.name.toLowerCase().split('.').pop();
      const mimeMap: { [key: string]: string } = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'webm': 'video/webm',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4'
      };
      return mimeMap[ext || ''] || 'application/octet-stream';
    }
    
    return 'application/octet-stream';
  };

  const uploadToSupabase = async (
    blob: Blob,
    path: string,
    bucket: string = 'uploads',
    originalFile?: File
  ): Promise<string> => {
    // Auto-detect MIME type
    const contentType = detectMimeType(blob, originalFile);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType
      });

    if (error) {
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
    // Upload original video first
    const videoPath = `${userId}/videos/${fileId}_original.${file.name.split('.').pop()}`;
    const originalUrl = await uploadToSupabase(file, videoPath);

    // Call edge function for server-side video watermarking
    const outputPath = `${userId}/videos/${fileId}_watermarked.${file.name.split('.').pop()}`;
    
    const { data, error } = await supabase.functions.invoke('watermark-video', {
      body: {
        videoPath,
        watermarkSize: videoMeta.watermarkSize,
        outputPath
      }
    });

    if (error) {
      console.warn('Video watermarking service not yet fully implemented:', error);
      // For now, return the original video URL as fallback
      return originalUrl;
    }

    console.log('Video watermark processing result:', data);
    
    // For now, return original URL until full FFmpeg implementation
    return originalUrl;
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
                file.type.startsWith('video/') ? 'video' : 
                file.type.startsWith('audio/') ? 'audio' : 'other',
          status: 'processing'
        };

        results.push(processedFile);
        setProcessedFiles(prev => [...prev, processedFile]);

        try {
          // Process file with automatic watermarking
          const processed = await processFileWithWatermark(file);

          let watermarkedUrl: string | undefined;
          let thumbnailUrl: string;
          let previewUrl: string | undefined;

          // Upload thumbnail (always generated)
          const thumbnailPath = `${user.id}/thumbnails/${fileId}_thumbnail.webp`;
          thumbnailUrl = await uploadToSupabase(processed.thumbnail, thumbnailPath, 'thumbnails');

          if (processed.type === 'image' && processed.watermarked) {
            // Upload watermarked image
            const watermarkedPath = `${user.id}/watermarked/${fileId}_watermarked.webp`;
            watermarkedUrl = await uploadToSupabase(processed.watermarked, watermarkedPath, 'uploads');

            // Upload preview if available
            if (processed.preview) {
              const previewPath = `${user.id}/previews/${fileId}_preview.webp`;
              previewUrl = await uploadToSupabase(processed.preview, previewPath, 'previews');
            }
          } else if (processed.type === 'video') {
            // Process video watermarking (server-side)
            watermarkedUrl = await processVideoWatermark(file, processed.videoMeta, user.id, fileId);
          } else if (processed.type === 'audio') {
            // For audio, upload original file as the main content with proper MIME type
            const audioPath = `${user.id}/audio/${fileId}_original.${file.name.split('.').pop()}`;
            watermarkedUrl = await uploadToSupabase(file, audioPath, 'Audio VisuStock', file);
          } else {
            // Fallback for unsupported file types - upload original with thumbnail
            const fallbackPath = `${user.id}/fallback/${fileId}_original.${file.name.split('.').pop()}`;
            watermarkedUrl = await uploadToSupabase(file, fallbackPath, 'uploads', file);
          }

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
        toast.success(`Successfully processed ${successCount} file(s) with watermarks and thumbnails`);
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