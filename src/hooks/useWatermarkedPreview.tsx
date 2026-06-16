import { useState, useEffect } from 'react';
import { createWebPreviewWithWatermark } from '@/utils/watermark';

interface UseWatermarkedPreviewProps {
  imageUrl?: string;
  enabled?: boolean;
}

export const useWatermarkedPreview = ({ imageUrl, enabled = false }: UseWatermarkedPreviewProps) => {
  const [watermarkedUrl, setWatermarkedUrl] = useState<string | undefined>(imageUrl);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl || !enabled) {
      setWatermarkedUrl(imageUrl);
      setIsProcessing(false);
      setError(null);
      return;
    }

    const generateWatermarkedPreview = async () => {
      try {
        setIsProcessing(true);
        setError(null);
        
        // Fetch the image file
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'preview.jpg', { type: blob.type });
        
        // Generate watermarked preview
        const watermarkedBlob = await createWebPreviewWithWatermark(file, {
          opacity: 0.3,
          spacing: 150,
          logoPath: 'https://i.imgur.com/UsTmDOl.png'
        });
        
        const watermarkedUrl = URL.createObjectURL(watermarkedBlob);
        setWatermarkedUrl(watermarkedUrl);
      } catch (err) {
        console.error('Failed to generate watermarked preview:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate preview');
        setWatermarkedUrl(imageUrl); // Fallback to original
      } finally {
        setIsProcessing(false);
      }
    };

    generateWatermarkedPreview();
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