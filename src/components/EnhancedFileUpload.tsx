import React, { useCallback, useState, useRef } from 'react';
import { useEnhancedUpload, UploadProgress, UploadResult } from '@/hooks/useEnhancedUpload';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Upload, X, Pause, Play, RefreshCw, Check, AlertCircle, 
  Image, Video, Music, FileText, Wifi, WifiOff, Clock, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedFileUploadProps {
  onFilesUploaded?: (results: UploadResult[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  className?: string;
}

export function EnhancedFileUpload({
  onFilesUploaded,
  maxFiles = 20,
  maxFileSize = 2 * 1024 * 1024 * 1024, // 2GB
  acceptedTypes = ['image/*', 'video/*', 'audio/*', 'application/pdf'],
  className,
}: EnhancedFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFilesRef = useRef<File[]>([]);

  const {
    uploads,
    isUploading,
    uploadFiles,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    cancelAllUploads,
    clearCompleted,
  } = useEnhancedUpload({
    maxFileSize,
    onComplete: onFilesUploaded,
  });

  // Network status monitoring
  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-resume paused uploads when back online
      if (pendingFilesRef.current.length > 0) {
        uploadFiles(pendingFilesRef.current);
        pendingFilesRef.current = [];
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      // Pause all active uploads
      uploads.filter(u => u.status === 'uploading').forEach(u => pauseUpload(u.fileId));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [uploads, pauseUpload, uploadFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).slice(0, maxFiles);
    if (files.length > 0) {
      if (!isOnline) {
        pendingFilesRef.current = files;
      } else {
        setIsCheckingDuplicates(true);
        try {
          await uploadFiles(files);
        } finally {
          setIsCheckingDuplicates(false);
        }
      }
    }
  }, [maxFiles, isOnline, uploadFiles]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, maxFiles);
    if (files.length > 0) {
      if (!isOnline) {
        pendingFilesRef.current = files;
      } else {
        setIsCheckingDuplicates(true);
        try {
          await uploadFiles(files);
        } finally {
          setIsCheckingDuplicates(false);
        }
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [maxFiles, isOnline, uploadFiles]);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    }
    if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext || '')) {
      return <Video className="h-5 w-5 text-purple-500" />;
    }
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext || '')) {
      return <Music className="h-5 w-5 text-green-500" />;
    }
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusIcon = (upload: UploadProgress) => {
    switch (upload.status) {
      case 'complete':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'retrying':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return null;
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const activeUploads = uploads.filter(u => u.status !== 'complete' && u.status !== 'error');
  const completedUploads = uploads.filter(u => u.status === 'complete');
  const failedUploads = uploads.filter(u => u.status === 'error');

  return (
    <div className={cn("space-y-4", className)}>
      {/* Network Status Banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm">You're offline. Uploads will resume when connected.</span>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isCheckingDuplicates && fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 sm:p-10 text-center cursor-pointer transition-all duration-200",
          isDragOver 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          (isUploading || isCheckingDuplicates) && "pointer-events-none opacity-50"
        )}
      >
        {/* Loading overlay when checking duplicates */}
        {isCheckingDuplicates && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-xl z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Checking for duplicates...</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "p-4 rounded-full transition-colors",
            isDragOver ? "bg-primary/10" : "bg-muted"
          )}>
            <Upload className={cn(
              "h-8 w-8 transition-colors",
              isDragOver ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          
          <div>
            <p className="font-medium text-foreground">
              {isDragOver ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse • Max {formatSize(maxFileSize)} per file
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mt-2">
            <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full">
              <Image className="h-3 w-3" /> Images
            </span>
            <span className="inline-flex items-center gap-1 text-xs bg-purple-500/10 text-purple-600 px-2 py-1 rounded-full">
              <Video className="h-3 w-3" /> Videos
            </span>
            <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">
              <Music className="h-3 w-3" /> Audio
            </span>
            <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
              <FileText className="h-3 w-3" /> PDF
            </span>
          </div>
        </div>
      </div>

      {/* Upload Progress List */}
      {uploads.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* Header with actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm font-medium">
                  {activeUploads.length > 0 
                    ? `Uploading ${activeUploads.length} file${activeUploads.length > 1 ? 's' : ''}`
                    : `${completedUploads.length} completed, ${failedUploads.length} failed`
                  }
                </span>
              </div>
              
              <div className="flex gap-2">
                {activeUploads.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={cancelAllUploads}>
                    Cancel All
                  </Button>
                )}
                {(completedUploads.length > 0 || failedUploads.length > 0) && (
                  <Button variant="ghost" size="sm" onClick={clearCompleted}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* File list */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {uploads.map((upload) => (
                <div
                  key={upload.fileId}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-colors",
                    upload.status === 'error' ? "bg-destructive/5" : "bg-muted/50"
                  )}
                >
                  {/* File icon */}
                  {getFileIcon(upload.fileName)}

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {upload.fileName}
                      </span>
                      {getStatusIcon(upload)}
                    </div>
                    
                    {upload.status === 'uploading' && (
                      <div className="mt-1.5 space-y-1">
                        <Progress value={upload.progress} className="h-1.5" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{upload.progress}%</span>
                          <div className="flex items-center gap-2">
                            <span>{formatSpeed(upload.speed)}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(upload.remainingTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {upload.status === 'processing' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Processing file...
                      </p>
                    )}

                    {upload.status === 'retrying' && (
                      <p className="text-xs text-yellow-600 mt-1">
                        Retrying... (attempt {upload.retryCount + 1})
                      </p>
                    )}

                    {upload.status === 'error' && upload.error && (
                      <p className="text-xs text-destructive mt-1 truncate">
                        {upload.error}
                      </p>
                    )}

                    {upload.status === 'paused' && (
                      <p className="text-xs text-yellow-600 mt-1">
                        Paused at {upload.progress}%
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {upload.status === 'uploading' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => pauseUpload(upload.fileId)}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {upload.status === 'paused' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => resumeUpload(upload.fileId)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {(upload.status !== 'complete') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => cancelUpload(upload.fileId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
