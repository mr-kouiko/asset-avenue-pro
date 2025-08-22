import { useState, useEffect } from 'react';
import { createWebPreviewWithWatermark } from '@/utils/watermark';

interface UseWatermarkedPreviewProps {
  imageUrl?: string;
  enabled?: boolean;
}

export const useWatermarkedPreview = ({ imageUrl, enabled = true }: UseWatermarkedPreviewProps) => {
  const [watermarkedUrl, setWatermarkedUrl] = useState<string | undefined>(imageUrl);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl || !enabled) {
      setWatermarkedUrl(imageUrl);
      return;
    }

    const createWatermarkedPreview = async () => {
      try {
        setIsProcessing(true);
        setError(null);

        // Fetch the image
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Failed to fetch image');
        
        const blob = await response.blob();
        
        // Create a File object from the blob
        const file = new File([blob], 'preview.jpg', { type: blob.type });
        
        // Generate watermarked preview
        const watermarkedBlob = await createWebPreviewWithWatermark(file, {
          opacity: 0.3,
          spacing: 180,
          text: 'VisuStock'
        });
        
        // Create object URL for the watermarked image
        const watermarkedObjectUrl = URL.createObjectURL(watermarkedBlob);
        setWatermarkedUrl(watermarkedObjectUrl);
        
        // Clean up previous object URL
        return () => {
          if (watermarkedObjectUrl !== imageUrl) {
            URL.revokeObjectURL(watermarkedObjectUrl);
          }
        };
      } catch (err) {
        console.error('Failed to create watermarked preview:', err);
        setError(err instanceof Error ? err.message : 'Failed to create preview');
        setWatermarkedUrl(imageUrl); // Fallback to original
      } finally {
        setIsProcessing(false);
      }
    };

    createWatermarkedPreview();
  }, [imageUrl, enabled]);

  // Cleanup object URL when component unmounts
  useEffect(() => {
    return () => {
      if (watermarkedUrl && watermarkedUrl !== imageUrl && watermarkedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(watermarkedUrl);
      }
    };
  }, [watermarkedUrl, imageUrl]);

  return {
    watermarkedUrl,
    isProcessing,
    error
  };
};