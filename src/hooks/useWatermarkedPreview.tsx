import { useState, useEffect } from 'react';
import { createWebPreviewWithWatermark } from '@/utils/watermark';

interface UseWatermarkedPreviewProps {
  imageUrl?: string;
  enabled?: boolean;
}

/**
 * Image-only watermarked preview generator (videos use a CSS overlay in the player).
 */
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

    let cancelled = false;
    const run = async () => {
      try {
        setIsProcessing(true);
        setError(null);
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
          setWatermarkedUrl(imageUrl);
          return;
        }
        const file = new File([blob], 'preview.jpg', { type: blob.type });
        const wmBlob = await createWebPreviewWithWatermark(file, {
          opacity: 0.3,
          spacing: 150,
          logoPath: 'https://i.imgur.com/UsTmDOl.png',
        });
        if (cancelled) return;
        setWatermarkedUrl(URL.createObjectURL(wmBlob));
      } catch (err) {
        console.error('Failed to generate watermarked preview:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate preview');
        setWatermarkedUrl(imageUrl);
      } finally {
        if (!cancelled) setIsProcessing(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [imageUrl, enabled]);

  useEffect(() => {
    return () => {
      if (watermarkedUrl && watermarkedUrl !== imageUrl && watermarkedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(watermarkedUrl);
      }
    };
  }, [watermarkedUrl, imageUrl]);

  return { watermarkedUrl, isProcessing, error };
};
