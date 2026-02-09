import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateThumbnail, addWatermarkToImage, createWebPreviewWithWatermark } from '@/utils/watermark';
import { StreamingUploadHandler } from '@/components/media/StreamingUploadHandler';
import { getProxiedVideoUrl } from '@/utils/videoProxy';
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
    
    // Only MP4 videos are accepted
    const supportedVideoFormats = ['video/mp4'];
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
      // IMPORTANT: Use getSession() instead of refreshSession() to avoid triggering
      // onAuthStateChange events that would cause component re-renders and data loss
      // during active uploads. Supabase auto-refreshes tokens in the background.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Session expired. Please login again.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Increased concurrency for maximum performance
      const CONCURRENCY = 6;

      const processSingle = async (file: File) => {
        const fileId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
        
        // Detect file type with extension fallback for RAR/archives
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const isRar = fileExtension === 'rar' || file.type.includes('rar');
        const isZip = fileExtension === 'zip' || file.type.includes('zip');
        const isArchive = isRar || isZip;

        const processedFile: ProcessedFile = {
          id: fileId,
          originalFile: file,
          type: file.type.startsWith('image/') ? 'image' : 
                file.type.startsWith('video/') ? 'video' : 
                file.type === 'application/pdf' ? 'document' : 
                isArchive ? 'document' : // RAR/ZIP files are treated as documents
                file.type.startsWith('audio/') ? 'audio' : 'document',
          status: 'processing'
        };

        results.push(processedFile);
        setProcessedFiles(prev => [...prev, processedFile]);

        try {
          let watermarkedUrl: string | undefined;
          let thumbnailUrl: string;
          let previewUrl: string | undefined;

          let filePath: string;
          let bucketName = 'uploads';
          
          // Determine file path and bucket based on type
          if (file.type.startsWith('video/')) {
            filePath = `${user.id}/videos/${fileId}_original.${fileExtension}`;
          } else if (file.type.startsWith('audio/')) {
            filePath = `${user.id}/audio/${fileId}_original.${fileExtension}`;
            bucketName = 'uploads';
          } else if (file.type.startsWith('image/')) {
            filePath = `${user.id}/images/${fileId}_original.${fileExtension}`;
          } else if (isArchive) {
            filePath = `${user.id}/archives/${fileId}_original.${fileExtension}`;
          } else {
            filePath = `${user.id}/files/${fileId}_original.${fileExtension}`;
          }
          
          onProgress?.(fileId, 10);
          
          // Upload original file using StreamingUploadHandler (intelligent routing: Supabase < 100MB, R2 >= 100MB)
          const result = await StreamingUploadHandler.uploadFile(file, (p) => {
            onProgress?.(fileId, Math.min(50, 10 + p * 0.4));
          }, filePath);
          
          if (!result.success || !result.fileUrl) {
            throw new Error(result.error || 'Upload failed');
          }
          
          watermarkedUrl = result.fileUrl;
          
          // Show storage location message if available
          if (result.message) {
            console.log(`📦 ${result.message} - ${file.name}`);
          }
          
          onProgress?.(fileId, 60);
          
          // Generate and upload thumbnail with watermark
          try {
            // For archive files (RAR, ZIP), skip thumbnail generation - they need manual preview upload
            if (isArchive) {
              console.log(`📦 Archive file detected: ${file.name} - thumbnail will be set via Product Management`);
              thumbnailUrl = watermarkedUrl!; // Use file URL as placeholder
            }
            // For video files, try server-side thumbnail generation first (more reliable for .mov)
            else if (file.type.startsWith('video/')) {
              console.log(`🎬 Generating server-side thumbnail for video: ${file.name}`);
              
              try {
                const { data, error } = await supabase.functions.invoke('generate-video-thumbnail', {
                  body: {
                    videoPath: filePath,
                    outputPath: `${user.id}/thumbnails/${fileId}_thumbnail.jpg`,
                    timeOffset: 1
                  }
                });

                if (error) throw error;
                if (data?.thumbnailUrl) {
                  thumbnailUrl = data.thumbnailUrl;
                  console.log(`✅ Server-side thumbnail generated: ${thumbnailUrl}`);
                } else {
                  throw new Error('No thumbnail URL returned from server');
                }
              } catch (serverError) {
                console.warn('Server-side thumbnail failed, trying browser fallback:', serverError);
                // Fall through to browser-based thumbnail generation
                const thumbnailBlob = await generateThumbnail(file, {
                  maxSize: 400,
                  quality: 0.8,
                  format: 'image/jpeg'
                });
                
                const thumbnailPath = `${user.id}/thumbnails/${fileId}_thumbnail.jpg`;
                thumbnailUrl = await uploadToSupabase(thumbnailBlob, thumbnailPath, 'thumbnails', undefined, 'image/jpeg', (progress) => {
                  onProgress?.(fileId, 60 + progress * 0.2);
                });
              }
            } else {
              // For non-video/non-archive files, use browser-based thumbnail generation
              const thumbnailBlob = await generateThumbnail(file, {
                maxSize: 400,
                quality: 0.8,
                format: 'image/jpeg'
              });
              
              const thumbnailPath = `${user.id}/thumbnails/${fileId}_thumbnail.jpg`;
              thumbnailUrl = await uploadToSupabase(thumbnailBlob, thumbnailPath, 'thumbnails', undefined, 'image/jpeg', (progress) => {
                onProgress?.(fileId, 60 + progress * 0.2);
              });
            }
            
            console.log(`✅ Thumbnail generated and uploaded: ${thumbnailUrl}`);
          } catch (thumbError) {
            console.warn('Thumbnail generation failed, using original:', thumbError);
            thumbnailUrl = watermarkedUrl!; // Fallback to original
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
              
              console.log(`✅ Image preview generated and uploaded: ${previewUrl}`);
            } catch (previewError) {
              console.warn('Image preview generation failed:', previewError);
            }
          }
          
          // Generate and upload preview for videos (watermarked short clip)
          if (file.type.startsWith('video/')) {
            let clientPreviewFailed = false;
            
            try {
              console.log(`🎬 Generating video preview with watermark for: ${file.name}`);
              
              // Create video element to generate preview
              const video = document.createElement('video');
              video.muted = true;
              video.playsInline = true;
              video.preload = 'auto';
              video.crossOrigin = 'anonymous';
              
              // Use proxied URL to bypass CORS and prevent tainted canvas
              video.src = getProxiedVideoUrl(watermarkedUrl!);
              console.log(`🔗 Using proxied URL for video preview generation`);
              
              // Wait for video metadata to load
              await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Video preview load timeout')), 30000);
                video.onloadedmetadata = () => {
                  clearTimeout(timeout);
                  resolve();
                };
                video.onerror = () => {
                  clearTimeout(timeout);
                  reject(new Error('Failed to load video for preview'));
                };
              });
              
              // Validate video dimensions
              if (video.videoWidth === 0 || video.videoHeight === 0) {
                throw new Error('Invalid video dimensions for preview');
              }
              
              // Setup canvas for recording
              const width = video.videoWidth;
              const height = video.videoHeight;
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              
              if (!ctx) throw new Error('Canvas context not available');
              
              // Load watermark logo
              const watermarkLogo = new Image();
              watermarkLogo.crossOrigin = 'anonymous';
              let watermarkLoaded = false;
              
              await new Promise<void>((resolve) => {
                watermarkLogo.onload = () => { watermarkLoaded = true; resolve(); };
                watermarkLogo.onerror = () => resolve();
                watermarkLogo.src = 'https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/public/LOGO%20DE%20WATERMARKING/Blue%20Modern%20Sound%20Studio%20Logo%20(3).png';
              });
              
              // Calculate watermark dimensions (50% width, centered)
              let watermarkWidth = width * 0.5;
              let watermarkHeight = watermarkLoaded ? (watermarkLogo.height / watermarkLogo.width) * watermarkWidth : 0;
              if (watermarkHeight > height * 0.8) {
                watermarkHeight = height * 0.8;
                watermarkWidth = (watermarkLogo.width / watermarkLogo.height) * watermarkHeight;
              }
              const watermarkX = (width - watermarkWidth) / 2;
              const watermarkY = (height - watermarkHeight) / 2;
              
              // Setup MediaRecorder
              const stream = (canvas as any).captureStream(24);
              if (!stream) throw new Error('Canvas captureStream not supported');
              
              const chunks: BlobPart[] = [];
              const mimeTypes = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
              let selectedMimeType = 'video/webm';
              for (const mime of mimeTypes) {
                if (MediaRecorder.isTypeSupported(mime)) {
                  selectedMimeType = mime;
                  break;
                }
              }
              
              const recorder = new MediaRecorder(stream, {
                mimeType: selectedMimeType,
                videoBitsPerSecond: 4_000_000
              });
              
              recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
              };
              
              const recordPromise = new Promise<void>((resolve) => {
                recorder.onstop = () => resolve();
              });
              
              recorder.start(1000);
              
              // Draw frames with watermark
              let animId = 0;
              let drawErrors = 0;
              const draw = () => {
                try {
                  ctx.drawImage(video, 0, 0, width, height);
                  if (watermarkLoaded) {
                    ctx.save();
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 12;
                    ctx.globalAlpha = 0.95;
                    ctx.drawImage(watermarkLogo, watermarkX, watermarkY, watermarkWidth, watermarkHeight);
                    ctx.restore();
                  }
                } catch (drawError) {
                  drawErrors++;
                  if (drawErrors === 1) {
                    console.warn('Canvas draw error (possible CORS taint):', drawError);
                  }
                }
                animId = requestAnimationFrame(draw);
              };
              
              await video.play();
              draw();
              
              // Record 6 seconds or video duration (whichever is less)
              const recordDuration = Math.min(6, isFinite(video.duration) ? video.duration : 6);
              await new Promise<void>((resolve) => setTimeout(resolve, recordDuration * 1000));
              
              cancelAnimationFrame(animId);
              video.pause();
              recorder.stop();
              await recordPromise;
              
              if (chunks.length === 0) throw new Error('No video preview data recorded');
              
              // Check for high draw error rate - indicates CORS issues
              if (drawErrors > 10) {
                throw new Error('Canvas tainted by CORS - falling back to server-side');
              }
              
              const outputMimeType = selectedMimeType.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
              const previewBlob = new Blob(chunks, { type: outputMimeType });
              
              if (previewBlob.size < 1000) throw new Error('Preview too small');
              
              const previewExtension = outputMimeType === 'video/mp4' ? 'mp4' : 'webm';
              const previewPath = `${user.id}/previews/${fileId}_preview.${previewExtension}`;
              previewUrl = await uploadToSupabase(previewBlob, previewPath, 'previews', undefined, outputMimeType, (progress) => {
                onProgress?.(fileId, 85 + progress * 0.15);
              });
              
              console.log(`✅ Video preview generated (client-side) and uploaded: ${previewUrl}`);
            } catch (previewError) {
              console.warn('Client-side video preview generation failed:', previewError);
              clientPreviewFailed = true;
            }
            
            // Server-side fallback if client-side failed
            if (clientPreviewFailed && !previewUrl) {
              try {
                console.log(`🔄 Falling back to server-side video preview generation for: ${file.name}`);
                
                const { data, error } = await supabase.functions.invoke('generate-video-preview', {
                  body: {
                    videoPath: filePath,
                    duration: 6,
                    resolution: 720
                  }
                });
                
                if (error) throw error;
                
                if (data?.previewUrl) {
                  previewUrl = data.previewUrl;
                  console.log(`✅ Video preview generated (server-side): ${previewUrl}`);
                } else {
                  console.warn('Server-side preview generation returned no URL');
                }
              } catch (serverError) {
                console.warn('Server-side video preview also failed:', serverError);
                // Video preview is optional - continue without it
              }
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
      };

      for (let i = 0; i < files.length; i += CONCURRENCY) {
        const batch = files.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map((f) => processSingle(f)));
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