import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, Image, Film, Music, Eye, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addWatermarkToImage, addWatermarkToVideo, shouldWatermark, generateThumbnail } from "@/utils/watermark";

interface FileUploadProps {
  onFilesUploaded?: (fileUrls: { 
    url: string; 
    name: string; 
    type: string; 
    bucket: string;
    size: number;
    previewUrl?: string;
    thumbnailUrl?: string;
    isWatermarked?: boolean;
  }[]) => void;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
  maxFiles?: number;
  autoUpload?: boolean;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  url?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  isWatermarked?: boolean;
}

export const FileUpload = ({ 
  onFilesUploaded, 
  acceptedTypes = ['image/*', 'video/*', 'audio/*', 'model/*'],
  maxFileSize = 500, // Increased for 3D files
  maxFiles = 50, // Allow more files for bulk upload
  autoUpload = false
}: FileUploadProps) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      return `Le fichier dépasse ${maxFileSize}MB`;
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
      return 'Type de fichier non supporté';
    }

    return null;
  };

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadFile[] = [];
    const currentFileCount = files.length;

    for (let i = 0; i < fileList.length && newFiles.length + currentFileCount < maxFiles; i++) {
      const file = fileList[i];
      const error = validateFile(file);
      
      newFiles.push({
        file,
        id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2)}`,
        progress: 0,
        status: error ? 'error' : 'pending',
        error
      });
    }

    if (fileList.length + currentFileCount > maxFiles) {
      toast.error(`Maximum ${maxFiles} fichiers autorisés`);
    }

    setFiles(prev => [...prev, ...newFiles]);

    // Auto-upload if enabled
    if (autoUpload && newFiles.some(f => f.status === 'pending')) {
      // Small delay to let the UI update
      setTimeout(() => {
        uploadAllFiles();
      }, 500);
    }
  }, [files.length, maxFiles, acceptedTypes, maxFileSize, autoUpload]);

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f
      ));

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate unique filename
      const fileExt = uploadFile.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const basePath = `${user.id}/${fileName}`;

      // Upload original file to private bucket
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, progress: 30 } : f
      ));

      const { data: originalData, error: originalError } = await supabase.storage
        .from('original-files')
        .upload(basePath, uploadFile.file);

      if (originalError) throw originalError;

      let previewUrl: string | undefined;
      let thumbnailUrl: string | undefined;
      let isWatermarked = false;

      // Process watermark and thumbnail for images, videos, and audio
      if (shouldWatermark(uploadFile.file.type) || uploadFile.file.type.startsWith('audio/')) {
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, status: 'processing', progress: 50 } : f
        ));

        try {
          if (uploadFile.file.type.startsWith('image/')) {
            // Generate watermarked preview for images with enhanced settings
            const watermarkedBlob = await addWatermarkToImage(uploadFile.file, {
              opacity: 0.4,
              position: 'bottom-right',
              size: 12
            });

            const previewFileName = `preview_${fileName}`;
            const previewPath = `${user.id}/${previewFileName}`;

            const { data: previewData, error: previewError } = await supabase.storage
              .from('previews')
              .upload(previewPath, watermarkedBlob);

            if (!previewError && previewData) {
              previewUrl = previewData.path;
              isWatermarked = true;
            }
          } else if (uploadFile.file.type.startsWith('video/')) {
            // For videos, note that watermarking requires server-side processing
            // This marks the video as processed but doesn't apply watermark yet
            isWatermarked = false; // Will be true once server-side watermarking is implemented
          } else if (uploadFile.file.type.startsWith('audio/')) {
            // Audio files don't need watermarking, just processing
            isWatermarked = false;
          }

          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { ...f, progress: 70 } : f
          ));

          // Generate high-quality thumbnail for images, videos, and audio
          const thumbnailBlob = await generateThumbnail(uploadFile.file, {
            maxSize: 600,
            quality: 0.9,
            format: 'image/jpeg'
          });
          const thumbnailFileName = `thumb_${fileName}`;
          const thumbnailPath = `${user.id}/${thumbnailFileName}`;

          const { data: thumbData, error: thumbError } = await supabase.storage
            .from('thumbnails')
            .upload(thumbnailPath, thumbnailBlob);

          if (!thumbError && thumbData) {
            thumbnailUrl = thumbData.path;
          }

        } catch (watermarkError) {
          console.warn('Watermarking failed:', watermarkError);
          // Continue without watermark if it fails
        }
      }

      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, progress: 90 } : f
      ));

      // Final update
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'completed', 
              progress: 100, 
              url: originalData.path,
              previewUrl,
              thumbnailUrl,
              isWatermarked
            }
          : f
      ));

      return { 
        url: originalData.path, 
        name: uploadFile.file.name, 
        type: uploadFile.file.type,
        bucket: 'original-files',
        size: uploadFile.file.size,
        previewUrl,
        thumbnailUrl,
        isWatermarked
      };
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'upload';
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ));
      throw error;
    }
  };

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;
    
    toast.info(`Début de l'upload de ${pendingFiles.length} fichier(s)...`);
    
    try {
      // Process files in smaller batches to avoid overwhelming the server
      const batchSize = 5;
      const batches = [];
      for (let i = 0; i < pendingFiles.length; i += batchSize) {
        batches.push(pendingFiles.slice(i, i + batchSize));
      }

      const allResults = [];
      for (const batch of batches) {
        const batchPromises = batch.map(uploadFile);
        const batchResults = await Promise.allSettled(batchPromises);
        allResults.push(...batchResults);
        
        // Small delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successfulUploads = allResults
        .filter((result): result is PromiseFulfilledResult<{
          url: string; 
          name: string; 
          type: string; 
          bucket: string;
          size: number;
          previewUrl?: string;
          thumbnailUrl?: string;
          isWatermarked?: boolean;
        }> => result.status === 'fulfilled')
        .map(result => result.value);

      const failedCount = allResults.filter(result => result.status === 'rejected').length;

      if (successfulUploads.length > 0) {
        onFilesUploaded?.(successfulUploads);
        toast.success(`${successfulUploads.length} fichier(s) uploadé(s) avec succès${
          successfulUploads.filter(f => f.isWatermarked).length > 0 
            ? ' avec watermarking automatique' 
            : ''
        }`);
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} fichier(s) ont échoué lors de l'upload`);
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error('Erreur lors de l\'upload en masse');
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
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
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <Card 
        className={`border-2 border-dashed transition-all duration-200 ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center">
          <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
            isDragOver ? 'text-primary' : 'text-muted-foreground'
          }`} />
          <h3 className="text-lg font-medium mb-2">
            {isDragOver ? 'Déposez vos fichiers ici' : 'Glissez vos fichiers ici'}
          </h3>
          <p className="text-muted-foreground mb-4">
            ou cliquez pour sélectionner des fichiers
          </p>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
          >
            Choisir des fichiers
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            {acceptedTypes.join(', ')} jusqu'à {maxFileSize}MB - Maximum {maxFiles} fichiers
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      </Card>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Fichiers sélectionnés ({files.length})</h4>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setFiles([])}
              >
                Tout supprimer
              </Button>
              <Button 
                size="sm"
                onClick={uploadAllFiles}
                disabled={!files.some(f => f.status === 'pending')}
              >
                Uploader tout
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {files.map((uploadFile) => (
              <Card key={uploadFile.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getFileIcon(uploadFile.file.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </p>
                       <Badge variant={
                        uploadFile.status === 'completed' ? 'default' :
                        uploadFile.status === 'error' ? 'destructive' :
                        uploadFile.status === 'uploading' ? 'secondary' :
                        uploadFile.status === 'processing' ? 'secondary' : 'outline'
                      }>
                        {uploadFile.status === 'completed' && <Check className="h-3 w-3 mr-1" />}
                        {uploadFile.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {uploadFile.status === 'pending' && 'En attente'}
                        {uploadFile.status === 'uploading' && 'Upload...'}
                        {uploadFile.status === 'processing' && 'Traitement...'}
                        {uploadFile.status === 'completed' && (uploadFile.isWatermarked ? 'Terminé ✨' : 'Terminé')}
                        {uploadFile.status === 'error' && 'Erreur'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(uploadFile.file.size)}</span>
                      {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                        <span>{Math.round(uploadFile.progress)}%</span>
                      )}
                      {uploadFile.error && (
                        <span className="text-destructive">{uploadFile.error}</span>
                      )}
                      {uploadFile.isWatermarked && uploadFile.status === 'completed' && (
                        <span className="text-primary text-xs">Watermarqué</span>
                      )}
                    </div>

                    {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                      <Progress value={uploadFile.progress} className="mt-2 h-1" />
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {uploadFile.status === 'completed' && (
                      <Badge variant="outline" className="text-xs">
                        Uploadé
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(uploadFile.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};