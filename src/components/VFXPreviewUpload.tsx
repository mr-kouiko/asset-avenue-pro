import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image, AlertTriangle, Video, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VFXPreviewUploadProps {
  previewImageUrl?: string;
  previewMediaType?: 'image' | 'video';
  onPreviewChange: (url: string | undefined, mediaType?: 'image' | 'video') => void;
  disabled?: boolean;
}

// Size limits
const IMAGE_MAX_SIZE = 2 * 1024 * 1024; // 2MB for images
const VIDEO_MAX_SIZE = 20 * 1024 * 1024; // 20MB for videos

// Accepted file types
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4'];
const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];

export const VFXPreviewUpload = ({
  previewImageUrl,
  previewMediaType = 'image',
  onPreviewChange,
  disabled = false
}: VFXPreviewUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentMediaType, setCurrentMediaType] = useState<'image' | 'video'>(previewMediaType);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync currentMediaType with prop
  useEffect(() => {
    setCurrentMediaType(previewMediaType);
  }, [previewMediaType]);

  // Generate thumbnail from video when URL changes
  useEffect(() => {
    if (previewImageUrl && currentMediaType === 'video') {
      extractVideoThumbnail(previewImageUrl);
    } else {
      setVideoThumbnail(null);
    }
  }, [previewImageUrl, currentMediaType]);

  const extractVideoThumbnail = (videoUrl: string) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    
    video.onloadeddata = () => {
      video.currentTime = 1; // Seek to 1 second for thumbnail
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setVideoThumbnail(canvas.toDataURL('image/jpeg', 0.8));
        }
      } catch (e) {
        console.error('Error extracting video thumbnail:', e);
      }
    };
    
    video.onerror = () => {
      console.error('Error loading video for thumbnail extraction');
    };
    
    video.src = videoUrl;
    video.load();
  };

  const isVideoFile = (file: File): boolean => {
    return ACCEPTED_VIDEO_TYPES.includes(file.type);
  };

  const isImageFile = (file: File): boolean => {
    return ACCEPTED_IMAGE_TYPES.includes(file.type);
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please select an image (JPG, PNG, WebP) or video (MP4) file");
      return;
    }

    const isVideo = isVideoFile(file);
    const maxSize = isVideo ? VIDEO_MAX_SIZE : IMAGE_MAX_SIZE;
    const maxSizeLabel = isVideo ? '20MB' : '2MB';

    // Validate file size
    if (file.size > maxSize) {
      toast.error(`${isVideo ? 'Video' : 'Image'} cannot exceed ${maxSizeLabel}`);
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `vfx-preview-${Date.now()}.${fileExt}`;
      const filePath = `previews/${fileName}`;

      setUploadProgress(40);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploadProgress(80);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      setUploadProgress(100);

      // Determine media type
      const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';
      setCurrentMediaType(mediaType);

      // Update parent component with URL and media type
      onPreviewChange(publicUrl, mediaType);
      toast.success(`Preview ${isVideo ? 'video' : 'image'} uploaded successfully`);

    } catch (error) {
      console.error('Preview upload error:', error);
      toast.error(`Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    onPreviewChange(undefined, undefined);
    setCurrentMediaType('image');
    setVideoThumbnail(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const renderPreview = () => {
    if (currentMediaType === 'video' && previewImageUrl) {
      return (
        <div className="relative w-24 h-24 rounded-lg border overflow-hidden bg-black">
          {videoThumbnail ? (
            <img 
              src={videoThumbnail} 
              alt="Video Preview Thumbnail" 
              className="w-full h-full object-cover"
            />
          ) : (
            <video 
              ref={videoRef}
              src={previewImageUrl} 
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
          )}
          {/* Play indicator overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-4 w-4 text-black ml-0.5" fill="currentColor" />
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <img 
        src={previewImageUrl} 
        alt="VFX Preview" 
        className="w-24 h-24 object-cover rounded-lg border"
      />
    );
  };

  return (
    <Card className="p-4">
      <Label className="text-sm font-medium mb-3 flex items-center gap-2">
        {currentMediaType === 'video' ? (
          <Video className="h-4 w-4 text-primary" />
        ) : (
          <Image className="h-4 w-4 text-primary" />
        )}
        Preview Media <span className="text-destructive">*</span>
      </Label>
      <p className="text-xs text-muted-foreground mb-3">
        Upload an image or short video clip to display in the marketplace
      </p>

      {previewImageUrl ? (
        <div className="flex items-center space-x-4">
          {renderPreview()}
          <div className="flex-1">
            <p className="text-sm font-medium text-green-600 flex items-center gap-1">
              {currentMediaType === 'video' ? (
                <>
                  <Video className="h-3 w-3" />
                  Video preview uploaded ✓
                </>
              ) : (
                <>Preview uploaded ✓</>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {currentMediaType === 'video' 
                ? 'Video will autoplay on hover in the catalog'
                : 'This image will be shown in search results and catalog'
              }
            </p>
            <div className="flex gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => inputRef.current?.click()}
                disabled={uploading || disabled}
              >
                Change {currentMediaType === 'video' ? 'video' : 'image'}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRemove}
                disabled={uploading || disabled}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            disabled || uploading 
              ? 'border-muted-foreground/25 bg-muted/20 cursor-not-allowed' 
              : 'border-orange-300 dark:border-orange-700 hover:border-primary/50 bg-orange-50/50 dark:bg-orange-950/20'
          }`}
        >
          {uploading ? (
            <div className="space-y-3">
              <Upload className="mx-auto h-8 w-8 text-primary animate-pulse" />
              <p className="text-sm font-medium">Uploading...</p>
              <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Click to upload a preview</p>
              <p className="text-xs text-muted-foreground mt-1">
                Image: JPG, PNG, WebP (max 2MB) • Video: MP4 (max 20MB)
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={uploading || disabled}
      />

      {!previewImageUrl && (
        <div className="mt-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
          <p className="text-xs text-orange-700 dark:text-orange-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Required:</strong> VFX/Archive products need a preview to be visible in the marketplace. 
              Upload an image or video that represents your product. Videos will autoplay on hover.
            </span>
          </p>
        </div>
      )}
    </Card>
  );
};
