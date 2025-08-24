import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { processFileWithWatermark } from '@/utils/automaticWatermark';
import { toast } from 'sonner';

interface ExistingFile {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  thumbnail_path?: string;
  preview_path?: string;
  created_at: string;
}

interface ProcessingResult {
  processed: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export const useExistingFilesProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const detectMimeType = (fileName: string): string => {
    const ext = fileName.toLowerCase().split('.').pop();
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
  };

  const uploadToSupabase = async (
    blob: Blob,
    path: string,
    bucket: string = 'uploads',
    contentType?: string
  ): Promise<string> => {
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

  const downloadFileFromSupabase = async (filePath: string): Promise<File> => {
    const { data, error } = await supabase.storage
      .from('uploads')
      .download(filePath);

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }

    const fileName = filePath.split('/').pop() || 'file';
    const mimeType = detectMimeType(fileName);
    
    return new File([data], fileName, { type: mimeType });
  };

  const processExistingFile = async (existingFile: ExistingFile, userId: string): Promise<boolean> => {
    try {
      // Skip if already has thumbnail and preview/watermark
      if (existingFile.thumbnail_path && existingFile.preview_path) {
        return false; // Skipped
      }

      // Download original file
      const file = await downloadFileFromSupabase(existingFile.file_path);
      
      // Process with watermarking
      const processed = await processFileWithWatermark(file);
      
      const fileId = existingFile.id;
      let thumbnailUrl: string | undefined;
      let watermarkedUrl: string | undefined;
      let previewUrl: string | undefined;

      // Upload thumbnail if missing
      if (!existingFile.thumbnail_path) {
        const thumbnailPath = `${userId}/thumbnails/${fileId}_thumbnail.webp`;
        thumbnailUrl = await uploadToSupabase(processed.thumbnail, thumbnailPath, 'thumbnails', 'image/webp');
      }

      // Process based on file type
      if (processed.type === 'image' && processed.watermarked) {
        const watermarkedPath = `${userId}/watermarked/${fileId}_watermarked.webp`;
        watermarkedUrl = await uploadToSupabase(processed.watermarked, watermarkedPath, 'uploads', 'image/webp');

        if (processed.preview) {
          const previewPath = `${userId}/previews/${fileId}_preview.webp`;
          previewUrl = await uploadToSupabase(processed.preview, previewPath, 'previews', 'image/webp');
        }
      } else if (processed.type === 'video') {
        // For now, use original video file until server-side watermarking is implemented
        watermarkedUrl = supabase.storage.from('uploads').getPublicUrl(existingFile.file_path).data.publicUrl;
      } else if (processed.type === 'audio') {
        // For audio, use original file
        watermarkedUrl = supabase.storage.from('uploads').getPublicUrl(existingFile.file_path).data.publicUrl;
      }

      // Update content_files table
      const { error: updateError } = await supabase
        .from('content_files')
        .update({
          thumbnail_path: thumbnailUrl || existingFile.thumbnail_path,
          preview_path: previewUrl || watermarkedUrl || existingFile.preview_path,
        })
        .eq('id', existingFile.id);

      if (updateError) {
        throw new Error(`Failed to update database: ${updateError.message}`);
      }

      return true; // Processed
    } catch (error) {
      console.error(`Error processing file ${existingFile.file_name}:`, error);
      throw error;
    }
  };

  const processAllExistingFiles = useCallback(async (): Promise<ProcessingResult> => {
    setIsProcessing(true);
    setProgress(0);

    const result: ProcessingResult = {
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get all files that need processing (missing thumbnail or preview)
      const { data: files, error } = await supabase
        .from('content_files')
        .select('*')
        .or('thumbnail_path.is.null,preview_path.is.null')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch files: ${error.message}`);
      }

      if (!files || files.length === 0) {
        toast.success('No files need processing');
        return result;
      }

      toast.info(`Processing ${files.length} files...`);

      // Process files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(Math.round((i / files.length) * 100));

        try {
          const wasProcessed = await processExistingFile(file, user.id);
          if (wasProcessed) {
            result.processed++;
          } else {
            result.skipped++;
          }
        } catch (error) {
          result.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`${file.file_name}: ${errorMsg}`);
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setProgress(100);
      
      if (result.processed > 0) {
        toast.success(`Successfully processed ${result.processed} files`);
      }
      if (result.failed > 0) {
        toast.error(`Failed to process ${result.failed} files`);
      }
      if (result.skipped > 0) {
        toast.info(`Skipped ${result.skipped} files (already processed)`);
      }

    } catch (error) {
      console.error('Error processing existing files:', error);
      toast.error(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }

    return result;
  }, []);

  const processUserFiles = useCallback(async (userId: string): Promise<ProcessingResult> => {
    setIsProcessing(true);
    setProgress(0);

    const result: ProcessingResult = {
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    try {
      // Get files for specific user
      const { data: files, error } = await supabase
        .from('content_files')
        .select('*, content_submissions!inner(creator_id)')
        .eq('content_submissions.creator_id', userId)
        .or('thumbnail_path.is.null,preview_path.is.null');

      if (error) {
        throw new Error(`Failed to fetch user files: ${error.message}`);
      }

      if (!files || files.length === 0) {
        return result;
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(Math.round((i / files.length) * 100));

        try {
          const wasProcessed = await processExistingFile(file, userId);
          if (wasProcessed) {
            result.processed++;
          } else {
            result.skipped++;
          }
        } catch (error) {
          result.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`${file.file_name}: ${errorMsg}`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error('Error processing user files:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }

    return result;
  }, []);

  return {
    isProcessing,
    progress,
    processAllExistingFiles,
    processUserFiles
  };
};