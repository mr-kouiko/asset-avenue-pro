import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, Image, Film, Music, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addWatermarkToImage, shouldWatermark } from "@/utils/watermark";

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

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File exceeds ${maxFileSize}MB limit`;
    }

    // Check file type
    const isValidType = acceptedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      return file.type === type;
    });

    if (!isValidType) {
      return 'File type not supported';
    }

    return null;
  };

  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f
      ));

      // Create file path with user folder structure
      const fileExtension = uploadFile.file.name.split('.').pop();
      const fileName = `${uploadFile.id}.${fileExtension}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to uploads bucket
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filePath, uploadFile.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        // Try with a different name if file exists
        if (error.message.includes('already exists')) {
          const timestamp = Date.now();
          const newFilePath = `${user.id}/${uploadFile.id}_${timestamp}.${fileExtension}`;
          
          const { data: retryData, error: retryError } = await supabase.storage
            .from('uploads')
            .upload(newFilePath, uploadFile.file, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (retryError) throw retryError;
          
          // Get public URL for retry data
          const { data: { publicUrl: retryPublicUrl } } = supabase.storage
            .from('uploads')
            .getPublicUrl(retryData.path);

          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { 
              ...f, 
              status: 'processing', 
              progress: 60, 
              url: retryPublicUrl 
            } : f
          ));
          
          return; // Exit early since we handled the retry case
        } else {
          throw error;
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(data.path);

      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          status: 'processing', 
          progress: 60, 
          url: publicUrl 
        } : f
      ));

      // Handle watermarking for images
      let watermarkedUrl = publicUrl;
      let isWatermarked = false;

      if (shouldWatermark(uploadFile.file.type)) {
        try {
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { ...f, progress: 80 } : f
          ));

          const watermarkedBlob = await addWatermarkToImage(uploadFile.file, {
            opacity: 0.7,
            position: 'center'
          });
          const watermarkedFileName = `${uploadFile.id}_watermarked.${fileExtension}`;
          const watermarkedPath = `${user.id}/watermarked/${watermarkedFileName}`;

          const { data: watermarkData, error: watermarkError } = await supabase.storage
            .from('uploads')
            .upload(watermarkedPath, watermarkedBlob, {
              cacheControl: '3600',
              upsert: true
            });

          if (!watermarkError) {
            const { data: { publicUrl: watermarkedPublicUrl } } = supabase.storage
              .from('uploads')
              .getPublicUrl(watermarkData.path);
            
            watermarkedUrl = watermarkedPublicUrl;
            isWatermarked = true;
          }
        } catch (watermarkError) {
          console.warn('Watermarking failed:', watermarkError);
        }
      }

      // Generate preview URL for images
      let previewUrl = watermarkedUrl;
      if (uploadFile.file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(uploadFile.file);
      }

      // Update file as completed
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          status: 'completed', 
          progress: 100,
          url: watermarkedUrl,
          previewUrl,
          isWatermarked
        } : f
      ));

      // Notify parent component
      if (onFilesUploaded) {
        onFilesUploaded([{
          id: uploadFile.id,
          url: watermarkedUrl,
          name: uploadFile.file.name,
          type: uploadFile.file.type,
          size: uploadFile.file.size,
          previewUrl,
          isWatermarked
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
            Maximum {maxFiles} files • Images will be automatically watermarked
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