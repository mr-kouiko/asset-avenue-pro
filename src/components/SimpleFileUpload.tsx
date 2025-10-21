import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, Image, Film, Music, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAutomaticWatermark } from "@/hooks/useAutomaticWatermark";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  url?: string;
  error?: string;
  isWatermarked?: boolean;
  estimatedTimeRemaining?: number; // in seconds
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

  const acceptedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/ogg',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac',
    'application/pdf',
    'model/*'
  ];

  const acceptAttribute = 'image/*,video/*,audio/*,.pdf,application/pdf';

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
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'm4a': 'audio/mp4',
      'aac': 'audio/aac',
      'flac': 'audio/flac',
      'wma': 'audio/x-ms-wma',
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

    // Validate file type - videos skip image processing entirely
    const detectedMimeType = detectMimeType(file);
    
    // Videos are validated separately and bypass image pipelines
    if (detectedMimeType.startsWith('video/')) {
      console.log(`✅ Video file validated - File: ${file.name}, Type: ${detectedMimeType}`);
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

  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    const startTime = Date.now();
    
    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      // Enhanced progress callback with estimated time
      const onProgress = (fileId: string, progress: number) => {
        const elapsed = Date.now() - startTime;
        const estimatedTotal = progress > 0 ? (elapsed / progress) * 100 : 0;
        const estimatedRemaining = estimatedTotal - elapsed;
        
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { 
            ...f, 
            progress,
            estimatedTimeRemaining: Math.round(estimatedRemaining / 1000) // in seconds
          } : f
        ));
      };

      // Process with automatic watermarking and real-time progress
      const processedResults = await processFiles([uploadFile.file], onProgress);
      const processedFile = processedResults[0];

      if (processedFile.status === 'error') {
        throw new Error(processedFile.error || 'Processing failed');
      }

      // Update file as completed
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          status: 'completed', 
          progress: 100,
          url: processedFile.watermarkedUrl || processedFile.thumbnailUrl!,
          isWatermarked: !!processedFile.watermarkedUrl
        } : f
      ));

      // Notify parent component with correct file type and separate thumbnail URL
      if (onFilesUploaded) {
        const detectedMimeType = detectMimeType(uploadFile.file);
        const isVideo = detectedMimeType.startsWith('video/');
        const isPDF = detectedMimeType === 'application/pdf';
        
        onFilesUploaded([{
          id: uploadFile.id,
          url: processedFile.watermarkedUrl || processedFile.thumbnailUrl!,
          name: uploadFile.file.name,
          type: detectedMimeType,
          size: uploadFile.file.size,
          isWatermarked: !!processedFile.watermarkedUrl,
          // For videos and PDFs: use thumbnail, for images: use preview as thumbnail
          thumbnailUrl: (isVideo || isPDF) ? processedFile.thumbnailUrl : processedFile.previewUrl,
          previewUrl: processedFile.previewUrl
        }]);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
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

  const handleUploadAll = () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    pendingFiles.forEach(file => {
      uploadFile(file);
    });
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
            Supported: Images, Videos, Audio, PDF/Ebooks, 3D Models (max {formatFileSize(maxFileSize * 1024 * 1024)} each)
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
                  
                  {file.status === 'uploading' || file.status === 'processing' ? (
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
                  ) : null}
                  
                  {file.error && (
                    <p className="text-xs text-destructive mt-1">{file.error}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {file.status === 'completed' && (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
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