import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VFXPreviewUploadProps {
  previewImageUrl?: string;
  onPreviewChange: (url: string | undefined) => void;
  disabled?: boolean;
}

export const VFXPreviewUpload = ({
  previewImageUrl,
  onPreviewChange,
  disabled = false
}: VFXPreviewUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file (JPG, PNG, WebP)");
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Preview image cannot exceed 2MB");
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

      // Update parent component
      onPreviewChange(publicUrl);
      toast.success("Preview image uploaded successfully");

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
    onPreviewChange(undefined);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <Card className="p-4">
      <Label className="text-sm font-medium mb-3 flex items-center gap-2">
        <Image className="h-4 w-4 text-primary" />
        Preview Image <span className="text-destructive">*</span>
      </Label>
      <p className="text-xs text-muted-foreground mb-3">
        Upload an image to display as the product thumbnail in the marketplace
      </p>

      {previewImageUrl ? (
        <div className="flex items-center space-x-4">
          <img 
            src={previewImageUrl} 
            alt="VFX Preview" 
            className="w-24 h-24 object-cover rounded-lg border"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-600">Preview uploaded ✓</p>
            <p className="text-xs text-muted-foreground mt-1">
              This image will be shown in search results and catalog
            </p>
            <div className="flex gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => inputRef.current?.click()}
                disabled={uploading || disabled}
              >
                Change image
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
              <p className="text-sm font-medium">Click to upload a preview image</p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG or WebP • Max 2MB
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleInputChange}
        className="hidden"
        disabled={uploading || disabled}
      />

      {!previewImageUrl && (
        <div className="mt-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
          <p className="text-xs text-orange-700 dark:text-orange-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Required:</strong> VFX/Archive products need a preview image to be visible in the marketplace. 
              Upload an image or video screenshot that represents your product.
            </span>
          </p>
        </div>
      )}
    </Card>
  );
};
