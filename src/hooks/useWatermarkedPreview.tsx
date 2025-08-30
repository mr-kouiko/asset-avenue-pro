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
    // Watermarked preview generation is disabled
    // Always return the original image URL
    setWatermarkedUrl(imageUrl);
    setIsProcessing(false);
    setError(null);
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