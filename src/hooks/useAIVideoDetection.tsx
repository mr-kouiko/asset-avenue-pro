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
    console.log('🎥 [AI-VIDEO-DETECTION] Starting detection for:', videoUrl);
    
    if (!videoUrl) {
      console.error('🎥 [AI-VIDEO-DETECTION] No video URL provided');
      toast.error('No video URL provided');
      return null;
    }

    setIsDetecting(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🎥 [AI-VIDEO-DETECTION] Session exists:', !!session);

      if (!session?.access_token) {
        console.error('🎥 [AI-VIDEO-DETECTION] No access token available');
        toast.error('Please login to use AI detection');
        return null;
      }

      const token = session.access_token;
      console.log('🎥 [AI-VIDEO-DETECTION] Token available, length:', token.length);

      const invokeOnce = async (): Promise<DetectionResult | null> => {
        console.log('🎥 [AI-VIDEO-DETECTION] Calling Edge Function with videoUrl:', videoUrl);
        
        try {
          const response = await fetch(
            `https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/detect-ai-video`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2Zwb3BocG9xdWd0dXZmeHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQzMzEsImV4cCI6MjA3MDE2MDMzMX0.m8KZCGvdZm2v6jBiQnv6LQqM2DPhuaVlcVWrTc0dMp8'
              },
              body: JSON.stringify({ videoUrl })
            }
          );
          
          console.log('🎥 [AI-VIDEO-DETECTION] Response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('🎥 [AI-VIDEO-DETECTION] Error response:', errorText);
            return null;
          }
          
          const data = await response.json();
          console.log('🎥 [AI-VIDEO-DETECTION] Response data:', data);
          
          return (data?.result as DetectionResult) ?? null;
        } catch (fetchError) {
          console.error('🎥 [AI-VIDEO-DETECTION] Fetch error:', fetchError);
          return null;
        }
      };

      let detectionResult = await invokeOnce();
      console.log('🎥 [AI-VIDEO-DETECTION] Initial result:', detectionResult);

      // SightEngine can return "pending"; retry a few times to make this feel automatic.
      for (let attempt = 0; detectionResult?.status === 'pending' && attempt < 5; attempt++) {
        console.log(`🎥 [AI-VIDEO-DETECTION] Status pending, retry ${attempt + 1}/5...`);
        await new Promise((r) => setTimeout(r, 3000));
        detectionResult = await invokeOnce();
        if (!detectionResult) break;
      }

      if (!detectionResult) {
        console.error('🎥 [AI-VIDEO-DETECTION] No result after retries');
        toast.error('Failed to analyze video');
        return null;
      }

      console.log('🎥 [AI-VIDEO-DETECTION] Final result:', detectionResult);
      setResult(detectionResult);

      // Show appropriate toast based on result
      if (detectionResult.status === 'success') {
        if (detectionResult.isAiGenerated) {
          console.log('🎥 [AI-VIDEO-DETECTION] ✅ AI-Generated video detected!');
          toast.warning(`AI-Generated Detected (${Math.round(detectionResult.confidence * 100)}% confidence)`, {
            description: detectionResult.message
          });
        } else {
          console.log('🎥 [AI-VIDEO-DETECTION] ✅ Video appears authentic');
          toast.success('Video appears authentic', {
            description: `Confidence: ${Math.round((1 - detectionResult.confidence) * 100)}%`
          });
        }
      } else if (detectionResult.status === 'pending') {
        console.log('🎥 [AI-VIDEO-DETECTION] ⏳ Still pending after retries');
        toast.info('AI analysis in progress', {
          description: detectionResult.message || 'Please wait a moment and try again.'
        });
      } else if (detectionResult.status === 'error') {
        console.error('🎥 [AI-VIDEO-DETECTION] ❌ Detection error:', detectionResult.message);
        toast.error(detectionResult.message || 'Detection failed');
      }

      return detectionResult;
    } catch (err) {
      console.error('🎥 [AI-VIDEO-DETECTION] Exception:', err);
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
