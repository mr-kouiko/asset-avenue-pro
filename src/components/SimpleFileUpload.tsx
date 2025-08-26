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
  previewUrl?: string;
  error?: string;
  isWatermarked?: boolean;
}

interface SimpleFileUploadProps {
  onFilesUploaded?: (files: {
    id: string;
    url: string;
    name: string;
    type: string;
    size: number;
    previewUrl?: string;
    isWatermarked?: boolean;
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

  const acceptedTypes = ['image/*', 'video/*', 'audio/*', 'model/*'];

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

  // Enhanced MIME type detection with WebP priority
  const detectMimeType = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // ✅ Forcer le bon type MIME pour WebP
    if (extension === 'webp') {
      return 'image/webp';
    }
    
    // Standard MIME types mapping
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
      // Videos
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'm4a': 'audio/mp4',
      'aac': 'audio/aac'
    };
    
    // Priority 1: Extension-based detection
    if (extension && mimeMap[extension]) {
      return mimeMap[extension];
    }
    
    // Priority 2: Browser file.type if reliable
    if (file.type && file.type !== 'application/octet-stream') {
      return file.type;
    }
    
    return 'application/octet-stream';
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File exceeds ${maxFileSize}MB limit`;
    }

    // Use enhanced MIME type detection
    const detectedMimeType = detectMimeType(file);
    
    // Check file type with enhanced detection
    const isValidType = acceptedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return detectedMimeType.startsWith(baseType);
      }
      return detectedMimeType === type;
    });

    if (!isValidType) {
      return `File type not supported (detected: ${detectedMimeType})`;
    }

    return null;
  };

  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f
      ));

      // Process with automatic watermarking
      const processedResults = await processFiles([uploadFile.file]);
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
          previewUrl: processedFile.previewUrl || processedFile.thumbnailUrl!,
          isWatermarked: !!processedFile.watermarkedUrl
        } : f
      ));

      // Notify parent component
      if (onFilesUploaded) {
        onFilesUploaded([{
          id: uploadFile.id,
          url: processedFile.watermarkedUrl || processedFile.thumbnailUrl!,
          name: uploadFile.file.name,
          type: uploadFile.file.type,
          size: uploadFile.file.size,
          previewUrl: processedFile.previewUrl || processedFile.thumbnailUrl!,
          isWatermarked: !!processedFile.watermarkedUrl
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

      // Generate preview for images
      if (file.type.startsWith('image/') && !error) {
        uploadFile.previewUrl = URL.createObjectURL(file);
      }
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
      if (fileToRemove?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
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
            Supported: Images, Videos, Audio, 3D Models (max {formatFileSize(maxFileSize * 1024 * 1024)} each)
          </p>
          <p className="text-xs text-muted-foreground">
            Maximum {maxFiles} files • All files automatically watermarked & optimized
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
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
                  {file.previewUrl && file.file.type.startsWith('image/') ? (
                    <img 
                      src={file.previewUrl} 
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
                    <div className="mt-2">
                      <Progress value={file.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {file.status === 'uploading' ? 'Uploading...' : 'Processing...'}
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