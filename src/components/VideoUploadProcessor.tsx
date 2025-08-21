import React, { useState, useCallback } from 'react';
import { Upload, FileVideo, Image, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';
import { 
  addWatermarkToImage, 
  generateThumbnail, 
  generateVideoThumbnail, 
  shouldWatermark 
} from '@/utils/watermark';

interface ProcessedFile {
  original: File;
  watermarked?: File;
  thumbnail?: File;
  previewUrl?: string;
}

interface VideoUploadProcessorProps {
  onFilesProcessed: (files: ProcessedFile[]) => void;
  maxFiles?: number;
  acceptedFormats?: string[];
}

export const VideoUploadProcessor: React.FC<VideoUploadProcessorProps> = ({
  onFilesProcessed,
  maxFiles = 10,
  acceptedFormats = ['video/mp4', 'video/mov', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelection = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    
    // Validate file types
    const invalidFiles = fileArray.filter(file => !acceptedFormats.includes(file.type));
    if (invalidFiles.length > 0) {
      setError(`Formats non supportés: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Check file count
    if (fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} fichiers autorisés`);
      return;
    }

    setFiles(fileArray);
    setError(null);
    toast.success(`${fileArray.length} fichier(s) sélectionné(s)`);
  }, [acceptedFormats, maxFiles]);

  const processFiles = useCallback(async () => {
    if (files.length === 0) return;

    setProcessing(true);
    setProgress(0);
    const processed: ProcessedFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result: ProcessedFile = { original: file };

        // Update progress
        setProgress((i / files.length) * 100);

        try {
          // Generate thumbnail for all files
          if (file.type.startsWith('image/')) {
            const thumbnailBlob = await generateThumbnail(file, {
              maxSize: 400,
              quality: 0.9,
              format: 'image/jpeg'
            });
            result.thumbnail = new File([thumbnailBlob], `thumb_${file.name}`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
          } else if (file.type.startsWith('video/')) {
            const thumbnailBlob = await generateVideoThumbnail(file, {
              maxSize: 400,
              quality: 0.9,
              format: 'image/jpeg'
            });
            result.thumbnail = new File([thumbnailBlob], `thumb_${file.name}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
          }

          // Apply watermark if needed
          if (shouldWatermark(file.type)) {
            if (file.type.startsWith('image/')) {
              const watermarkedBlob = await addWatermarkToImage(file, {
                opacity: 0.7,
                position: 'center',
                size: 20,
                text: 'VISUSTOCK'
              });
              result.watermarked = new File([watermarkedBlob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
            }
            // Note: Video watermarking requires server-side processing
          }

          // Create preview URL
          result.previewUrl = URL.createObjectURL(result.thumbnail || file);

          processed.push(result);
          
          toast.success(`Traitement terminé: ${file.name}`);
        } catch (fileError) {
          console.error(`Erreur lors du traitement de ${file.name}:`, fileError);
          toast.error(`Erreur: ${file.name}`);
          // Still add the file with original only
          result.previewUrl = URL.createObjectURL(file);
          processed.push(result);
        }
      }

      setProcessedFiles(processed);
      onFilesProcessed(processed);
      setProgress(100);
      toast.success('Tous les fichiers ont été traités avec succès !');
      
    } catch (error) {
      console.error('Erreur lors du traitement:', error);
      setError('Une erreur est survenue lors du traitement des fichiers');
      toast.error('Erreur lors du traitement des fichiers');
    } finally {
      setProcessing(false);
    }
  }, [files, onFilesProcessed]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const resetUpload = useCallback(() => {
    setFiles([]);
    setProcessedFiles([]);
    setProgress(0);
    setError(null);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
        <input
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={(e) => handleFileSelection(e.target.files)}
          className="hidden"
          id="file-upload"
          disabled={processing}
        />
        <label 
          htmlFor="file-upload" 
          className="cursor-pointer flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Glissez vos fichiers ici ou cliquez pour parcourir
            </h3>
            <p className="text-muted-foreground">
              Formats supportés: MP4, MOV, WebM, JPEG, PNG, WebP
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Maximum {maxFiles} fichiers
            </p>
          </div>
        </label>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Fichiers sélectionnés ({files.length})
            </h3>
            <div className="flex gap-2">
              <Button 
                onClick={processFiles} 
                disabled={processing}
                className="flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  'Traiter les fichiers'
                )}
              </Button>
              <Button variant="outline" onClick={resetUpload}>
                Réinitialiser
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {processing && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Traitement en cours... {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* File List */}
          <div className="grid gap-3">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0">
                  {file.type.startsWith('video/') ? (
                    <FileVideo className="h-8 w-8 text-primary" />
                  ) : (
                    <Image className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB • {file.type}
                  </p>
                </div>
                {processedFiles[index] && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {!processing && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Results */}
      {processedFiles.length > 0 && !processing && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Traitement terminé
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedFiles.map((processed, index) => (
              <div key={index} className="bg-card border rounded-lg p-4">
                <div className="aspect-video bg-muted rounded-md mb-3 overflow-hidden">
                  {processed.previewUrl && (
                    <img 
                      src={processed.previewUrl} 
                      alt={processed.original.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <p className="font-medium text-sm truncate mb-2">
                  {processed.original.name}
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>✓ Fichier original</div>
                  {processed.thumbnail && <div>✓ Miniature générée</div>}
                  {processed.watermarked && <div>✓ Watermark appliqué</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};