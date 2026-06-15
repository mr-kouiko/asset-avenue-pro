import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, FileText, Image, Film, Music, AlertCircle, Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAutomaticWatermark } from "@/hooks/useAutomaticWatermark";
import { detectProductType, type DetectedProductType } from "@/utils/contentTypeDetector";

// Session storage key for backup of active uploads
const ACTIVE_UPLOADS_KEY = 'activeUploads';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'checking-duplicate' | 'uploading' | 'processing' | 'completed' | 'error';
  url?: string;
  error?: string;
  isWatermarked?: boolean;
  isAiGenerated?: boolean;
  aiConfidence?: number;
  estimatedTimeRemaining?: number; // in seconds
  fileHash?: string;
  detectedCategory?: 'photo' | 'video' | 'audio' | 'ebook' | 'vfx' | 'vector' | 'other';
  detectedTags?: string[];
}

interface SimpleFileUploadProps {
  onFilesUploaded?: (files: {
    id: string;
    url: string;
    name: string;
    type: string;
    size: number;
    isWatermarked?: boolean;
    thumbnailUrl?: string;
    previewUrl?: string;
    isAiGenerated?: boolean;
    detectedCategory?: 'photo' | 'video' | 'audio' | 'ebook' | 'vfx' | 'vector' | 'other';
    detectedTags?: string[];
    fileHash?: string;
  }[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
}

export const SimpleFileUpload = ({ 
  onFilesUploaded, 
  maxFiles = 100, 
  maxFileSize = 1000 
}: SimpleFileUploadProps) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { processFiles, isProcessing } = useAutomaticWatermark();
  
  // ANTI-REMOUNT PROTECTION: Warn user ONLY if uploads were truly interrupted
  useEffect(() => {
    const checkInterruptedUploads = async () => {
      const saved = sessionStorage.getItem(ACTIVE_UPLOADS_KEY);
      if (!saved) return;
      
      try {
        const backupData = JSON.parse(saved);
        
        // Support both old format (array) and new format (object with timestamp)
        const activeUploads = Array.isArray(backupData) ? backupData : backupData.files || [];
        const backupTimestamp = backupData.timestamp || 0;
        
        if (activeUploads.length === 0) {
          sessionStorage.removeItem(ACTIVE_UPLOADS_KEY);
          return;
        }
        
        // Ignore backups older than 10 minutes (uploads likely completed or abandoned)
        const backupAge = Date.now() - backupTimestamp;
        if (backupTimestamp && backupAge > 10 * 60 * 1000) {
          console.log('[UPLOAD-RECOVERY] Backup too old, ignoring:', backupAge / 1000, 'seconds');
          sessionStorage.removeItem(ACTIVE_UPLOADS_KEY);
          return;
        }
        
        // CRITICAL: Check if these uploads actually completed in the database
        // If they exist in uploaded_files table, they weren't truly interrupted
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          sessionStorage.removeItem(ACTIVE_UPLOADS_KEY);
          return;
        }
        
        // Query recent uploads to see if these files completed (check BOTH tables)
        const recentTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // Last 10 mins
        const [{ data: recentUploaded }, { data: recentContent }] = await Promise.all([
          supabase
            .from('uploaded_files')
            .select('file_name')
            .eq('user_id', user.id)
            .gte('created_at', recentTime),
          supabase
            .from('content_files')
            .select('file_name')
            .gte('created_at', recentTime),
        ]);
        
        const completedNames = new Set([
          ...(recentUploaded || []).map(f => f.file_name),
          ...(recentContent || []).map(f => f.file_name),
        ]);
        const trulyInterrupted = activeUploads.filter(
          (u: { name: string }) => !completedNames.has(u.name)
        );
        
        if (trulyInterrupted.length > 0) {
          console.log('[UPLOAD-RECOVERY] Truly interrupted uploads:', trulyInterrupted.map((u: { name: string }) => u.name));
          toast.warning(`⚠️ ${trulyInterrupted.length} upload(s) interrupted - please try again`);
        } else {
          console.log('[UPLOAD-RECOVERY] All uploads completed successfully, no warning needed');
        }
      } catch (e) {
        console.error('Failed to verify interrupted uploads:', e);
      }
      
      // Always clear after checking
      sessionStorage.removeItem(ACTIVE_UPLOADS_KEY);
    };
    
    checkInterruptedUploads();
  }, []);
  
  // BACKUP: Save active uploads to sessionStorage with timestamp for crash recovery
  useEffect(() => {
    const activeUploads = files.filter(f => 
      f.status === 'uploading' || f.status === 'processing' || 
      f.status === 'checking-duplicate'
    );
    
    if (activeUploads.length > 0) {
      sessionStorage.setItem(ACTIVE_UPLOADS_KEY, JSON.stringify({
        timestamp: Date.now(),
        files: activeUploads.map(f => ({
          id: f.id,
          name: f.file.name,
          progress: f.progress,
          status: f.status
        }))
      }));
    } else {
      // Clear backup when no active uploads
      sessionStorage.removeItem(ACTIVE_UPLOADS_KEY);
    }
  }, [files]);
  

  const acceptedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml',
    'video/mp4', // Only MP4 video files allowed
    'audio/mpeg', // Only MP3 audio files allowed
    'application/pdf',
    'model/*',
    // VFX archives
    'application/x-rar-compressed', 'application/vnd.rar', 'application/rar'
  ];

  const acceptAttribute = 'image/*,video/mp4,.mp4,.mp3,audio/mpeg,.pdf,application/pdf,.rar,application/x-rar-compressed';

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Film className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    if (type.includes('rar') || type === 'application/x-rar-compressed') return <Sparkles className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Enhanced extension-based MIME type detection - prioritizes video files
  const detectMimeType = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Comprehensive MIME type mapping with video priority
    const mimeMap: { [key: string]: string } = {
      // Videos - ALWAYS use extension-based detection for videos
      'mp4': 'video/mp4',
      'm4v': 'video/mp4',
      'mov': 'video/quicktime',
      'qt': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska',
      'ogv': 'video/ogg',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      '3gp': 'video/3gpp',
      'asf': 'video/x-ms-asf',
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'svg': 'image/svg+xml',
      // Audio - Only MP3 allowed
      'mp3': 'audio/mpeg',
      // Documents
      'pdf': 'application/pdf',
      // Archives (VFX)
      'rar': 'application/x-rar-compressed'
    };
    
    // For ALL video extensions: ONLY use extension mapping, never browser type
    const videoExtensions = ['mp4', 'm4v', 'mov', 'qt', 'avi', 'webm', 'mkv', 'ogv', 'wmv', 'flv', '3gp', 'asf'];
    if (extension && videoExtensions.includes(extension)) {
      const videoType = mimeMap[extension];
      console.log(`🎥 Video MIME detection - File: ${file.name}, Extension: ${extension}, Type: ${videoType}`);
      return videoType;
    }
    
    // For other files: Use extension mapping if available
    if (extension && mimeMap[extension]) {
      const detectedType = mimeMap[extension];
      console.log(`📄 File MIME detection - File: ${file.name}, Extension: ${extension}, Type: ${detectedType}`);
      return detectedType;
    }
    
    // Fallback only for non-videos (and log for debugging)
    console.log(`⚠️ MIME detection fallback - File: ${file.name}, Extension: ${extension}, Browser type: ${file.type}`);
    return file.type || 'application/octet-stream';
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File exceeds ${maxFileSize}MB limit`;
    }

    // Validate file type
    const detectedMimeType = detectMimeType(file);
    
    // Videos: ONLY MP4 allowed
    if (detectedMimeType.startsWith('video/')) {
      if (detectedMimeType !== 'video/mp4') {
        console.error(`❌ Video format rejected - File: ${file.name}, Type: ${detectedMimeType}. Only MP4 allowed.`);
        return `Only MP4 video format is accepted (detected: ${detectedMimeType})`;
      }
      console.log(`✅ MP4 video validated - File: ${file.name}`);
      return null;
    }
    
    // Non-video files follow standard validation
    const isValidType = acceptedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return detectedMimeType.startsWith(baseType);
      }
      return detectedMimeType === type;
    });

    if (!isValidType) {
      console.error(`❌ File type validation failed - File: ${file.name}, Detected: ${detectedMimeType}, Browser: ${file.type}`);
      return `File type not supported (detected: ${detectedMimeType})`;
    }

    console.log(`✅ File type validation passed - File: ${file.name}, Type: ${detectedMimeType}`);
    return null;
  };

  // Calculate SHA-256 hash of file for duplicate detection
  // For large files: hash first 1MB + last 1MB + file size for consistency with useEnhancedUpload
  const calculateFileHash = async (file: File): Promise<string> => {
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
  };

  // Check if file is a duplicate using database function + size fallback
  // Now includes file_type to allow same content in different formats (e.g., image source + video from image)
  const checkDuplicate = async (fileHash: string, fileSize: number, fileType: string): Promise<{ isDuplicate: boolean; fileName?: string }> => {
    try {
      // Normalize file type to category (image, video, audio, document)
      const normalizedType = fileType.startsWith('image/') ? 'image' 
        : fileType.startsWith('video/') ? 'video'
        : fileType.startsWith('audio/') ? 'audio'
        : 'document';
      
      console.log(`🔍 [DUPLICATE-CHECK] Hash: ${fileHash.substring(0, 16)}..., Size: ${fileSize}, Type: ${normalizedType}`);
      
      // First: Check by hash + type (most reliable)
      const { data: hashData, error: hashError } = await supabase.rpc('check_file_duplicate', { 
        hash_value: fileHash,
        file_type_param: normalizedType
      });
      
      if (hashError) {
        console.error('Hash duplicate check error:', hashError);
      } else if (hashData && hashData.length > 0) {
        const result = hashData[0];
        if (result.exists_in_content || result.exists_in_uploaded) {
          console.log(`🔍 [DUPLICATE] Found by HASH+TYPE: ${result.duplicate_file_name}`);
          return { 
            isDuplicate: true, 
            fileName: result.duplicate_file_name 
          };
        }
      }
      
      // Second: Check by exact file size + type (fallback for old files without hash)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: sizeData, error: sizeError } = await supabase.rpc('check_file_duplicate_by_size', { 
          p_file_size: fileSize,
          p_user_id: user.id,
          p_file_type: normalizedType
        });
        
        if (sizeError) {
          console.error('Size duplicate check error:', sizeError);
        } else if (sizeData && sizeData.length > 0) {
          const result = sizeData[0];
          if (result.exists_in_content || result.exists_in_uploaded) {
            console.log(`🔍 [DUPLICATE] Found by SIZE+TYPE (${fileSize} bytes, ${normalizedType}): ${result.duplicate_file_name}`);
            return { 
              isDuplicate: true, 
              fileName: result.duplicate_file_name 
            };
          }
        }
      }
      
      return { isDuplicate: false };
    } catch (error) {
      console.error('Duplicate check failed:', error);
      return { isDuplicate: false };
    }
  };

  const uploadFile = async (uploadFileData: UploadFile): Promise<void> => {
    const startTime = Date.now();
    
    try {
      // Use pre-calculated hash from early detection, or calculate if not available
      let fileHash = uploadFileData.fileHash;
      
      if (!fileHash) {
        // Fallback: calculate hash if not already done (shouldn't happen with early detection)
        setFiles(prev => prev.map(f => 
          f.id === uploadFileData.id ? { ...f, status: 'checking-duplicate', progress: 0 } : f
        ));

        console.log(`🔍 [DUPLICATE-FALLBACK] Calculating hash for: ${uploadFileData.file.name}`);
        fileHash = await calculateFileHash(uploadFileData.file);
        console.log(`🔍 [DUPLICATE-FALLBACK] Hash: ${fileHash.substring(0, 16)}...`);

        const { isDuplicate, fileName } = await checkDuplicate(fileHash, uploadFileData.file.size, detectMimeType(uploadFileData.file));
        
        if (isDuplicate) {
          console.warn(`🚫 [DUPLICATE] File rejected: ${uploadFileData.file.name} matches ${fileName}`);
          setFiles(prev => prev.map(f => 
            f.id === uploadFileData.id ? { 
              ...f, 
              status: 'error', 
              error: `Duplicate detected: This file already exists${fileName ? ` (${fileName})` : ''}`,
              fileHash
            } : f
          ));
          toast.error(`🚫 Duplicate rejected: ${uploadFileData.file.name}`);
          return;
        }
      }

      // Update status to uploading (hash already verified in early detection)
      setFiles(prev => prev.map(f => 
        f.id === uploadFileData.id ? { ...f, status: 'uploading', progress: 0, fileHash } : f
      ));

      // Enhanced progress callback with estimated time
      const onProgress = (fileId: string, progress: number) => {
        const elapsed = Date.now() - startTime;
        const estimatedTotal = progress > 0 ? (elapsed / progress) * 100 : 0;
        const estimatedRemaining = estimatedTotal - elapsed;
        
        setFiles(prev => prev.map(f => 
          f.id === uploadFileData.id ? { 
            ...f, 
            progress,
            estimatedTimeRemaining: Math.round(estimatedRemaining / 1000) // in seconds
          } : f
        ));
      };

      const processedResults = await processFiles([uploadFileData.file], onProgress);
      const processedFile = processedResults[0];

      if (processedFile.status === 'error') {
        throw new Error(processedFile.error || 'Processing failed');
      }

      // Get file type for AI detection
      const detectedMimeType = detectMimeType(uploadFileData.file);
      const isImage = detectedMimeType.startsWith('image/');
      const isVideo = detectedMimeType.startsWith('video/');
      const isAudio = detectedMimeType.startsWith('audio/');
      const isPDF = detectedMimeType === 'application/pdf';
      
      // Automatic AI detection disabled — admins review content manually.
      const isAiGenerated = false;
      const aiConfidence = 0;

      // AUTOMATIC CATEGORY DETECTION — centralized detector (extension + MIME + zip inspection)
      let detectedCategory: 'photo' | 'video' | 'audio' | 'ebook' | 'vfx' | 'vector' | 'other' | undefined;
      let detectedTags: string[] = [];
      try {
        const detection = await detectProductType(uploadFileData.file);
        // Map detector type → existing UI category names
        const map: Record<DetectedProductType, typeof detectedCategory> = {
          image: 'photo',
          video: 'video',
          audio: 'audio',
          ebook: 'ebook',
          vector: 'vector',
          vfx: 'vfx',
          other: 'other',
        };
        detectedCategory = map[detection.type];
        detectedTags = detection.tags;
        console.log(`🎯 [TYPE-DETECT] ${uploadFileData.file.name} → ${detection.type} (${detection.confidence}) — ${detection.reason}`);
        if (detection.type === 'other') {
          toast.info(`⚠️ Could not auto-detect type for ${uploadFileData.file.name}. Please pick a category manually.`);
        }
      } catch (e) {
        console.warn('🎯 [TYPE-DETECT] failed, falling back to MIME:', e);
        if (isVideo) detectedCategory = 'video';
        else if (isAudio) detectedCategory = 'audio';
        else if (isPDF) detectedCategory = 'ebook';
        else if (isImage) detectedCategory = 'photo';
      }

      // Reuse the file hash calculated at the beginning (line 244) for storage
      // This ensures consistency and avoids double calculation
      const fileHashForStorage = fileHash;

      // CRITICAL: Save file to database IMMEDIATELY after storage upload
      // This ensures file record exists even if page refreshes before parent callback completes
      let dbFileId = uploadFileData.id;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const fileRecord = {
            user_id: user.id,
            file_name: uploadFileData.file.name,
            file_type: detectedMimeType,
            file_url: processedFile.watermarkedUrl || processedFile.thumbnailUrl!,
            file_size: uploadFileData.file.size,
            preview_url: processedFile.previewUrl || null,
            thumbnail_url: (isVideo || isPDF) ? processedFile.thumbnailUrl : processedFile.previewUrl || null,
            is_watermarked: !!processedFile.watermarkedUrl,
            file_hash: fileHashForStorage || null,
            draft_id: null, // Will be linked later by parent
            status: 'completed'
          };
          
          console.log('💾 [IMMEDIATE-SAVE] Saving file to database:', uploadFileData.file.name);
          
          const { data: insertedFile, error: insertError } = await supabase
            .from('uploaded_files')
            .insert(fileRecord)
            .select('id')
            .single();
          
          if (insertError) {
            console.error('❌ [IMMEDIATE-SAVE] Database insert failed:', insertError);
            // Don't fail the upload - file is in storage and can be recovered
          } else if (insertedFile) {
            dbFileId = insertedFile.id;
            console.log('✅ [IMMEDIATE-SAVE] File saved to DB with ID:', dbFileId);
          }
        }
      } catch (dbError) {
        console.error('❌ [IMMEDIATE-SAVE] Database save error:', dbError);
        // Don't fail the upload - file is in storage
      }

      // Update file as completed with AI detection and category result
      setFiles(prev => prev.map(f => 
        f.id === uploadFileData.id ? { 
          ...f, 
          status: 'completed', 
          progress: 100,
          url: processedFile.watermarkedUrl || processedFile.thumbnailUrl!,
          isWatermarked: !!processedFile.watermarkedUrl,
          isAiGenerated,
          aiConfidence,
          detectedCategory,
          detectedTags,
          fileHash: fileHashForStorage
        } : f
      ));

      // Get file size for storage location message
      const fileSizeMB = uploadFileData.file.size / (1024 * 1024);
      const storageLocation = fileSizeMB >= 100 ? 'R2 Cloudflare' : 'Supabase Storage';
      const aiLabel = isAiGenerated ? ' 🤖 IA' : '';
      toast.success(`✅ ${uploadFileData.file.name}${aiLabel} - Stocké dans ${storageLocation}`);

      // Notify parent component with correct file type, AI detection, and category result
      // Use the database ID if available (ensures proper linking to drafts)
      if (onFilesUploaded) {
        onFilesUploaded([{
          id: dbFileId, // Use DB ID for proper draft linking
          url: processedFile.watermarkedUrl || processedFile.thumbnailUrl!,
          name: uploadFileData.file.name,
          type: detectedMimeType,
          size: uploadFileData.file.size,
          isWatermarked: !!processedFile.watermarkedUrl,
          // For videos and PDFs: use thumbnail, for images: use preview as thumbnail
          thumbnailUrl: (isVideo || isPDF) ? processedFile.thumbnailUrl : processedFile.previewUrl,
          previewUrl: processedFile.previewUrl,
          isAiGenerated, // AUTOMATIC - no user choice
          detectedCategory, // AUTOMATIC - based on extension/MIME/zip inspection
          detectedTags, // AUTOMATIC - keyword-based tag suggestions
          fileHash: fileHashForStorage // CRITICAL: Pass hash for duplicate detection
        }]);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setFiles(prev => prev.map(f => 
        f.id === uploadFileData.id ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        } : f
      ));
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // EARLY DUPLICATE DETECTION - Check duplicates BEFORE adding to queue
  const handleFiles = useCallback(async (fileList: FileList) => {
    const currentFileCount = files.length;
    const filesToProcess = Array.from(fileList).slice(0, maxFiles - currentFileCount);
    
    if (fileList.length + currentFileCount > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
    }

    if (filesToProcess.length === 0) return;

    // Show checking state
    setIsCheckingDuplicates(true);
    
    try {
      const newFiles: UploadFile[] = [];
      let duplicatesRejected = 0;

      // Process all files in parallel for speed
      const checkResults = await Promise.all(
        filesToProcess.map(async (file, i) => {
          // First validate file type/size
          const validationError = validateFile(file);
          if (validationError) {
            return { file, error: validationError, isDuplicate: false, hash: undefined };
          }

          // Calculate hash and check duplicate
          try {
            console.log(`🔍 [EARLY-CHECK] Calculating hash for: ${file.name}`);
            const hash = await calculateFileHash(file);
            console.log(`🔍 [EARLY-CHECK] Hash: ${hash.substring(0, 16)}...`);
            
            const { isDuplicate, fileName } = await checkDuplicate(hash, file.size, detectMimeType(file));
            
            if (isDuplicate) {
              console.warn(`🚫 [EARLY-CHECK] Duplicate rejected: ${file.name} matches ${fileName}`);
              return { 
                file, 
                error: `Duplicate: already exists${fileName ? ` (${fileName})` : ''}`,
                isDuplicate: true,
                hash,
                existingFileName: fileName
              };
            }
            
            return { file, error: undefined, isDuplicate: false, hash };
          } catch (hashError) {
            console.error(`Hash calculation failed for ${file.name}:`, hashError);
            // Allow upload if hash check fails
            return { file, error: undefined, isDuplicate: false, hash: undefined };
          }
        })
      );

      // Process results
      checkResults.forEach((result, i) => {
        if (result.isDuplicate) {
          duplicatesRejected++;
          toast.error(`🚫 Duplicate rejected: ${result.file.name}`);
          return; // Skip duplicates entirely
        }

        const uploadFile: UploadFile = {
          file: result.file,
          id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2)}`,
          progress: 0,
          status: result.error ? 'error' : 'pending',
          error: result.error,
          fileHash: result.hash
        };

        newFiles.push(uploadFile);
      });

      // Summary toast for multiple files
      if (duplicatesRejected > 0 && filesToProcess.length > 1) {
        const accepted = filesToProcess.length - duplicatesRejected;
        toast.info(`${accepted} file(s) ready, ${duplicatesRejected} duplicate(s) rejected`);
      }

      if (newFiles.length > 0) {
        setFiles(prev => [...prev, ...newFiles]);
      }
    } finally {
      setIsCheckingDuplicates(false);
    }
  }, [files.length, maxFiles, validateFile, calculateFileHash, checkDuplicate]);

  const handleUploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;
    
    // Upload with concurrency limit to prevent overwhelming browser/server
    const CONCURRENCY = 3;
    const results: void[] = [];
    let index = 0;
    
    const worker = async () => {
      while (index < pendingFiles.length) {
        const currentIndex = index++;
        await uploadFile(pendingFiles[currentIndex]);
      }
    };
    
    const workers = Array.from(
      { length: Math.min(CONCURRENCY, pendingFiles.length) }, 
      () => worker()
    );
    await Promise.all(workers);
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      // Preview URL cleanup is no longer needed as previews are disabled
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      await handleFiles(droppedFiles);
    }
  }, [handleFiles]);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFiles(e.target.files);
    }
  };

  const pendingFilesCount = files.filter(f => f.status === 'pending').length;
  const completedFilesCount = files.filter(f => f.status === 'completed').length;
  const errorFilesCount = files.filter(f => f.status === 'error').length;

  return (
    <div className="space-y-4">
      {/* Drop Zone - Always visible */}
      <Card 
        className={`border-2 border-dashed transition-colors p-8 text-center cursor-pointer relative ${
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        } ${isCheckingDuplicates ? 'pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isCheckingDuplicates && fileInputRef.current?.click()}
      >
        {/* Loading overlay when checking duplicates */}
        {isCheckingDuplicates && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-lg z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Checking for duplicates...</p>
          </div>
        )}
        
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Supported: Images, Videos (MP4 only), Audio (MP3 only), PDF/Ebooks, 3D Models (max {formatFileSize(maxFileSize * 1024 * 1024)} each)
          </p>
          <p className="text-xs text-muted-foreground">
            Maximum {maxFiles} files • All files automatically watermarked & optimized
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptAttribute}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Files ({completedFilesCount}/{files.length})
            </h3>
            {pendingFilesCount > 0 && (
              <Button onClick={handleUploadAll}>
                Upload {pendingFilesCount} files
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  {file.file.type.startsWith('image/') ? (
                    <img
                      src={file.url || URL.createObjectURL(file.file)} 
                      alt={file.file.name}
                      className="w-12 h-12 object-cover rounded"
                      onLoad={(e) => {
                        // Cleanup object URL after image loads to prevent memory leak
                        const src = (e.target as HTMLImageElement).src;
                        if (src.startsWith('blob:') && file.url) {
                          URL.revokeObjectURL(src);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                      {getFileIcon(file.file.type)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file.size)} • {file.file.type}
                  </p>
                  
                  {file.status === 'checking-duplicate' && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Checking for duplicates...
                      </p>
                    </div>
                  )}

                  {(file.status === 'uploading' || file.status === 'processing') && (
                    <div className="mt-2 space-y-1">
                      <Progress value={file.progress} className="h-2" />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          {file.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                        </p>
                        {file.estimatedTimeRemaining && file.estimatedTimeRemaining > 0 && (
                          <p className="text-xs text-muted-foreground">
                            ~{file.estimatedTimeRemaining > 60 
                              ? `${Math.round(file.estimatedTimeRemaining / 60)} min`
                              : `${file.estimatedTimeRemaining} sec`} restant
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(file.progress)}% • {formatFileSize((file.file.size * file.progress) / 100)} / {formatFileSize(file.file.size)}
                      </p>
                    </div>
                  )}
                  
                  {file.status === 'detecting-ai' && (
                    <div className="mt-2 flex items-center space-x-2">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">
                        🤖 Détection IA en cours...
                      </p>
                    </div>
                  )}
                  
                  
                  {file.error && (
                    <p className="text-xs text-destructive mt-1">{file.error}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {file.status === 'detecting-ai' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {file.status === 'completed' && (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      {file.isAiGenerated && (
                        <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                          <Sparkles className="h-3 w-3 mr-1" />
                          IA
                        </Badge>
                      )}
                      {file.isWatermarked && (
                        <Badge variant="secondary" className="text-xs">
                          Watermarked
                        </Badge>
                      )}
                    </>
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {errorFilesCount > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive">
                {errorFilesCount} file(s) failed to upload. Please check the errors above and try again.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};