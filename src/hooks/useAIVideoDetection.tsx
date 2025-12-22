import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FrameResult {
  position: number;
  aiGeneratedScore: number;
}

interface DetectionResult {
  isAiGenerated: boolean;
  confidence: number;
  frames: FrameResult[];
  status: 'success' | 'error' | 'pending';
  message?: string;
}

interface UseAIVideoDetectionReturn {
  isDetecting: boolean;
  result: DetectionResult | null;
  detectVideo: (videoUrl: string) => Promise<DetectionResult | null>;
  reset: () => void;
}

export const useAIVideoDetection = (): UseAIVideoDetectionReturn => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);

  const detectVideo = useCallback(async (videoUrl: string): Promise<DetectionResult | null> => {
    if (!videoUrl) {
      toast.error('No video URL provided');
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

      const { data, error } = await supabase.functions.invoke('detect-ai-video', {
        body: { videoUrl }
      });

      if (error) {
        console.error('AI detection error:', error);
        toast.error('Failed to analyze video');
        return null;
      }

      const detectionResult = data?.result as DetectionResult;
      setResult(detectionResult);

      // Show appropriate toast based on result
      if (detectionResult?.status === 'success') {
        if (detectionResult.isAiGenerated) {
          toast.warning(`AI-Generated Detected (${Math.round(detectionResult.confidence * 100)}% confidence)`, {
            description: detectionResult.message
          });
        } else {
          toast.success('Video appears authentic', {
            description: `Confidence: ${Math.round((1 - detectionResult.confidence) * 100)}%`
          });
        }
      } else if (detectionResult?.status === 'error') {
        toast.error(detectionResult.message || 'Detection failed');
      }

      return detectionResult;
    } catch (err) {
      console.error('Detection error:', err);
      toast.error('Failed to analyze video');
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
    detectVideo,
    reset
  };
};
