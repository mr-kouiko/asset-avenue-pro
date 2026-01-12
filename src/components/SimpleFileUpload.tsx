import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, Image, Film, Music, AlertCircle, Check, Sparkles, Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAutomaticWatermark } from "@/hooks/useAutomaticWatermark";
import { useAIImageDetection } from "@/hooks/useAIImageDetection";
import { useAIVideoDetection } from "@/hooks/useAIVideoDetection";
import { useIllustrationDetection } from "@/hooks/useIllustrationDetection";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'checking-duplicate' | 'uploading' | 'processing' | 'detecting-ai' | 'detecting-category' | 'completed' | 'error';
  url?: string;
  error?: string;
  isWatermarked?: boolean;
  isAiGenerated?: boolean;
  aiConfidence?: number;
  estimatedTimeRemaining?: number; // in seconds
  fileHash?: string;
  detectedCategory?: 'photo' | 'illustration' | 'video' | 'audio' | 'ebook';
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
    detectedCategory?: 'photo' | 'illustration' | 'video' | 'audio' | 'ebook';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { processFiles, isProcessing } = useAutomaticWatermark();
  const { detectImage } = useAIImageDetection();
  const { detectVideo } = useAIVideoDetection();
  const { detectIllustration } = useIllustrationDetection();

  const acceptedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml',
    'video/mp4', // Only MP4 video files allowed
    'audio/mpeg', // Only MP3 audio files allowed
    'application/pdf',
    'model/*'
  ];

  const acceptAttribute = 'image/*,video/mp4,.mp4,.mp3,audio/mpeg,.pdf,application/pdf';

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Film className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
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
      'pdf': 'application/pdf'
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
  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  // Check if file is a duplicate using database function
  const checkDuplicate = async (fileHash: string): Promise<{ isDuplicate: boolean; fileName?: string }> => {
    try {
      const { data, error } = await supabase.rpc('check_file_duplicate', { hash_value: fileHash });
      
      if (error) {
        console.error('Duplicate check error:', error);
        return { isDuplicate: false };
      }
      
      if (data && data.length > 0) {
        const result = data[0];
        if (result.exists_in_content || result.exists_in_uploaded) {
          return { 
            isDuplicate: true, 
            fileName: result.duplicate_file_name 
          };
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
      // Step 1: Check for duplicates first
      setFiles(prev => prev.map(f => 
        f.id === uploadFileData.id ? { ...f, status: 'checking-duplicate', progress: 0 } : f
      ));

      console.log(`🔍 [DUPLICATE] Calculating hash for: ${uploadFileData.file.name}`);
      const fileHash = await calculateFileHash(uploadFileData.file);
      console.log(`🔍 [DUPLICATE] Hash: ${fileHash.substring(0, 16)}...`);

      const { isDuplicate, fileName } = await checkDuplicate(fileHash);
      
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

      // Update status to uploading
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
      
      // AUTOMATIC AI DETECTION - Only for images and videos
      let isAiGenerated = false;
      let aiConfidence = 0;
      
      if (isImage || isVideo) {
        // Update status to detecting AI
        setFiles(prev => prev.map(f => 
          f.id === uploadFileData.id ? { ...f, status: 'detecting-ai', progress: 100 } : f
        ));
        
        try {
          // For images: use watermarked or preview URL (these are IMAGES)
          // For videos: use watermarkedUrl which is the ORIGINAL VIDEO file (NOT the thumbnail which is a JPEG)
          // The SightEngine API requires the actual video file for video AI detection
          let urlToAnalyze: string | undefined;
          
          if (isVideo) {
            // CRITICAL: For video AI detection, we MUST use the actual video URL, not the thumbnail
            // processedFile.watermarkedUrl contains the original video URL for videos
            // processedFile.thumbnailUrl is a JPEG screenshot - NOT usable for video AI detection
            urlToAnalyze = processedFile.watermarkedUrl;
            console.log(`🎥 [AI-DETECTION] Video URL sources - watermarkedUrl: ${processedFile.watermarkedUrl}, thumbnailUrl: ${processedFile.thumbnailUrl}`);
          } else {
            urlToAnalyze = processedFile.watermarkedUrl || processedFile.thumbnailUrl!;
          }
          
          if (!urlToAnalyze) {
            console.warn(`🤖 [AI-DETECTION] No URL available for ${uploadFileData.file.name}, skipping detection`);
          } else {
            console.log(`🤖 [AI-DETECTION] Analyzing ${isImage ? 'image' : 'video'}: ${uploadFileData.file.name}, URL: ${urlToAnalyze}`);
            
            if (isImage) {
              const result = await detectImage(urlToAnalyze);
              if (result) {
                isAiGenerated = result.isAiGenerated;
                aiConfidence = result.confidence;
                console.log(`🤖 [AI-DETECTION] Image result: AI=${isAiGenerated}, confidence=${aiConfidence}`);
              }
            } else if (isVideo) {
              console.log(`🎥 [AI-DETECTION] Calling detectVideo with URL: ${urlToAnalyze}`);
              const result = await detectVideo(urlToAnalyze);
              console.log(`🎥 [AI-DETECTION] Video detection raw result:`, result);
              if (result) {
                isAiGenerated = result.isAiGenerated;
                aiConfidence = result.confidence;
                console.log(`🤖 [AI-DETECTION] Video result: AI=${isAiGenerated}, confidence=${aiConfidence}`);
              } else {
                console.warn(`🤖 [AI-DETECTION] Video detection returned null result`);
              }
            }
          }
          
          if (isAiGenerated) {
            toast.info(`🤖 AI content detected: ${uploadFileData.file.name} (${Math.round(aiConfidence * 100)}% confidence)`);
          }
        } catch (aiError) {
          console.error('🤖 [AI-DETECTION] Error:', aiError);
          // Continue without AI detection on error - don't block upload
        }
      }

      // AUTOMATIC CATEGORY DETECTION - Detect illustration vs photo for images
      let detectedCategory: 'photo' | 'illustration' | 'video' | 'audio' | 'ebook' | undefined;
      
      if (isVideo) {
        detectedCategory = 'video';
      } else if (isAudio) {
        detectedCategory = 'audio';
      } else if (isPDF) {
        detectedCategory = 'ebook';
      } else if (isImage) {
        // Update status to detecting category
        setFiles(prev => prev.map(f => 
          f.id === uploadFileData.id ? { ...f, status: 'detecting-category', progress: 100 } : f
        ));
        
        try {
          const urlToAnalyze = processedFile.watermarkedUrl || processedFile.thumbnailUrl;
          if (urlToAnalyze) {
            console.log(`🎨 [CATEGORY-DETECTION] Analyzing image: ${uploadFileData.file.name}`);
            const result = await detectIllustration(urlToAnalyze, uploadFileData.file.name);
            
            if (result) {
              detectedCategory = result.isIllustration ? 'illustration' : 'photo';
              console.log(`🎨 [CATEGORY-DETECTION] Result: ${detectedCategory} (confidence: ${result.confidence.toFixed(2)})`);
              
              if (result.isIllustration) {
                toast.info(`🎨 Illustration detected: ${uploadFileData.file.name} (${Math.round(result.confidence * 100)}% confidence)`);
              }
            } else {
              // Default to photo if detection fails
              detectedCategory = 'photo';
            }
          } else {
            detectedCategory = 'photo';
          }
        } catch (categoryError) {
          console.error('🎨 [CATEGORY-DETECTION] Error:', categoryError);
          detectedCategory = 'photo'; // Default to photo on error
        }
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
          detectedCategory
        } : f
      ));

      // Get file size for storage location message
      const fileSizeMB = uploadFileData.file.size / (1024 * 1024);
      const storageLocation = fileSizeMB >= 100 ? 'R2 Cloudflare' : 'Supabase Storage';
      const aiLabel = isAiGenerated ? ' 🤖 IA' : '';
      const categoryLabel = detectedCategory === 'illustration' ? ' 🎨' : '';
      toast.success(`✅ ${uploadFileData.file.name}${aiLabel}${categoryLabel} - Stocké dans ${storageLocation}`);

      // Notify parent component with correct file type, AI detection, and category result
      if (onFilesUploaded) {
        onFilesUploaded([{
          id: uploadFileData.id,
          url: processedFile.watermarkedUrl || processedFile.thumbnailUrl!,
          name: uploadFileData.file.name,
          type: detectedMimeType,
          size: uploadFileData.file.size,
          isWatermarked: !!processedFile.watermarkedUrl,
          // For videos and PDFs: use thumbnail, for images: use preview as thumbnail
          thumbnailUrl: (isVideo || isPDF) ? processedFile.thumbnailUrl : processedFile.previewUrl,
          previewUrl: processedFile.previewUrl,
          isAiGenerated, // AUTOMATIC - no user choice
          detectedCategory // AUTOMATIC - based on image analysis
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

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadFile[] = [];
    const currentFileCount = files.length;

    for (let i = 0; i < fileList.length && newFiles.length + currentFileCount < maxFiles; i++) {
      const file = fileList[i];
      const error = validateFile(file);
      
      const uploadFile: UploadFile = {
        file,
        id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2)}`,
        progress: 0,
        status: error ? 'error' : 'pending',
        error
      };

      newFiles.push(uploadFile);

      // Preview generation disabled - upload files without preview URLs
    }

    if (fileList.length + currentFileCount > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
    }

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, maxFiles]);

  const handleUploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    // Upload all files in parallel for maximum performance
    const uploadPromises = pendingFiles.map(file => uploadFile(file));
    await Promise.all(uploadPromises);
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [handleFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const pendingFilesCount = files.filter(f => f.status === 'pending').length;
  const completedFilesCount = files.filter(f => f.status === 'completed').length;
  const errorFilesCount = files.filter(f => f.status === 'error').length;

  return (
    <div className="space-y-4">
      {/* Drop Zone - Always visible */}
      <Card 
        className={`border-2 border-dashed transition-colors p-8 text-center cursor-pointer ${
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
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
                      src={URL.createObjectURL(file.file)} 
                      alt={file.file.name}
                      className="w-12 h-12 object-cover rounded"
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
                        Vérification des doublons...
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
                  
                  {file.status === 'detecting-category' && (
                    <div className="mt-2 flex items-center space-x-2">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">
                        🎨 Détection catégorie en cours...
                      </p>
                    </div>
                  )}
                  
                  {file.error && (
                    <p className="text-xs text-destructive mt-1">{file.error}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {(file.status === 'detecting-ai' || file.status === 'detecting-category') && (
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
                      {file.detectedCategory === 'illustration' && (
                        <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                          <Palette className="h-3 w-3 mr-1" />
                          Illustration
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