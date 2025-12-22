import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DetectionResult {
  isAiGenerated: boolean;
  confidence: number;
  status: 'success' | 'error';
  message?: string;
}

interface UseAIImageDetectionReturn {
  isDetecting: boolean;
  result: DetectionResult | null;
  detectImage: (imageUrl: string) => Promise<DetectionResult | null>;
  reset: () => void;
}

export const useAIImageDetection = (): UseAIImageDetectionReturn => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);

  const detectImage = useCallback(async (imageUrl: string): Promise<DetectionResult | null> => {
    if (!imageUrl) {
      toast.error('No image URL provided');
      return null;
    }

    setIsDetecting(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please login to use AI detection');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('detect-ai-image', {
        body: { imageUrl }
      });

      if (error) {
        console.error('AI detection error:', error);
        toast.error('Failed to analyze image');
        return null;
      }

      const detectionResult = data?.result as DetectionResult;
      setResult(detectionResult);

      if (detectionResult?.status === 'success') {
        if (detectionResult.isAiGenerated) {
          toast.warning(`AI-Generated Detected (${Math.round(detectionResult.confidence * 100)}%)`, {
            description: detectionResult.message
          });
        } else {
          toast.success('Image appears authentic', {
            description: `Confidence: ${Math.round((1 - detectionResult.confidence) * 100)}%`
          });
        }
      } else if (detectionResult?.status === 'error') {
        toast.error(detectionResult.message || 'Detection failed');
      }

      return detectionResult;
    } catch (err) {
      console.error('Detection error:', err);
      toast.error('Failed to analyze image');
      return null;
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setIsDetecting(false);
  }, []);

  return {
    isDetecting,
    result,
    detectImage,
    reset
  };
};
