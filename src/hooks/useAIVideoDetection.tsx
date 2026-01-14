import { useState, useCallback, useRef } from 'react';
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
  detectionMethod?: string;
}

interface UseAIVideoDetectionReturn {
  isDetecting: boolean;
  result: DetectionResult | null;
  progress: number;
  detectVideo: (videoUrl: string, options?: DetectionOptions) => Promise<DetectionResult | null>;
  reset: () => void;
  cancel: () => void;
}

interface DetectionOptions {
  threshold?: number; // 0-1, default 0.5
  maxRetries?: number; // default 5
  skipCache?: boolean;
}

// Simple in-memory cache for video detection results
const videoDetectionCache = new Map<string, { result: DetectionResult; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes for videos (longer processing time)

const getCachedResult = (url: string): DetectionResult | null => {
  const cached = videoDetectionCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  videoDetectionCache.delete(url);
  return null;
};

const setCachedResult = (url: string, result: DetectionResult): void => {
  videoDetectionCache.set(url, { result, timestamp: Date.now() });
};

// Exponential backoff helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const getBackoffDelay = (attempt: number, baseDelay = 2000): number => {
  return Math.min(baseDelay * Math.pow(1.5, attempt), 15000); // Max 15 seconds
};

export const useAIVideoDetection = (): UseAIVideoDetectionReturn => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef(false);

  const detectVideo = useCallback(async (
    videoUrl: string,
    options: DetectionOptions = {}
  ): Promise<DetectionResult | null> => {
    const { threshold = 0.5, maxRetries = 5, skipCache = false } = options;
    
    console.log('🎥 [AI-VIDEO] Starting detection for:', videoUrl);
    
    if (!videoUrl) {
      toast.error('No video URL provided');
      return null;
    }

    // Check cache first
    if (!skipCache) {
      const cached = getCachedResult(videoUrl);
      if (cached) {
        console.log('🎥 [AI-VIDEO] Using cached result');
        setResult(cached);
        return cached;
      }
    }

    // Cancel any pending detection
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    isCancelledRef.current = false;

    setIsDetecting(true);
    setResult(null);
    setProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error('Please login to use AI detection');
        return null;
      }

      const token = session.access_token;
      setProgress(20);

      const invokeOnce = async (): Promise<DetectionResult | null> => {
        if (isCancelledRef.current) return null;
        
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-ai-video`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
              },
              body: JSON.stringify({ videoUrl, threshold }),
              signal: abortControllerRef.current?.signal
            }
          );
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('🎥 [AI-VIDEO] Error response:', response.status, errorText);
            
            // Handle specific error codes
            if (response.status === 429) {
              throw new Error('Rate limit exceeded');
            }
            if (response.status === 402) {
              throw new Error('API quota exceeded');
            }
            return null;
          }
          
          const data = await response.json();
          return (data?.result as DetectionResult) ?? null;
        } catch (fetchError) {
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            console.log('🎥 [AI-VIDEO] Detection cancelled');
            return null;
          }
          throw fetchError;
        }
      };

      let detectionResult = await invokeOnce();
      setProgress(40);

      // Retry with exponential backoff for pending status
      for (let attempt = 0; detectionResult?.status === 'pending' && attempt < maxRetries; attempt++) {
        if (isCancelledRef.current) break;
        
        const delay = getBackoffDelay(attempt);
        console.log(`🎥 [AI-VIDEO] Status pending, retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        
        setProgress(40 + ((attempt + 1) / maxRetries) * 40);
        await sleep(delay);
        
        if (isCancelledRef.current) break;
        detectionResult = await invokeOnce();
      }

      setProgress(90);

      if (!detectionResult) {
        if (!isCancelledRef.current) {
          toast.error('Failed to analyze video', {
            description: 'The video may be too large or in an unsupported format'
          });
        }
        return null;
      }

      // Apply custom threshold if result is success
      if (detectionResult.status === 'success') {
        detectionResult.isAiGenerated = detectionResult.confidence > threshold;
        detectionResult.detectionMethod = 'sightengine';
      }

      setResult(detectionResult);
      setCachedResult(videoUrl, detectionResult);
      setProgress(100);

      // Show appropriate feedback with more detail
      if (detectionResult.status === 'success') {
        const confidencePercent = Math.round(detectionResult.confidence * 100);
        const framesAnalyzed = detectionResult.frames?.length || 0;
        
        if (detectionResult.isAiGenerated) {
          toast.warning(`🤖 AI-Generated Video (${confidencePercent}% confidence)`, {
            description: `Analyzed ${framesAnalyzed} frames. ${detectionResult.message || ''}`,
            duration: 6000
          });
        } else {
          toast.success(`✅ Authentic Video (${100 - confidencePercent}% confidence)`, {
            description: `Analyzed ${framesAnalyzed} frames. Video appears to be real footage.`,
            duration: 5000
          });
        }
      } else if (detectionResult.status === 'pending') {
        toast.info('⏳ Analysis still processing', {
          description: 'Try again in a few seconds',
          duration: 4000
        });
      } else if (detectionResult.status === 'error') {
        toast.error(detectionResult.message || 'Detection failed', {
          description: 'Try re-uploading or using a different video format'
        });
      }

      return detectionResult;
    } catch (err) {
      console.error('🎥 [AI-VIDEO] Exception:', err);
      
      if (err instanceof Error) {
        if (err.message === 'Rate limit exceeded') {
          toast.error('Rate limit exceeded', {
            description: 'Please wait a moment and try again'
          });
        } else if (err.message === 'API quota exceeded') {
          toast.error('AI detection quota exceeded', {
            description: 'Please contact support for more credits'
          });
        } else if (!isCancelledRef.current) {
          toast.error('Failed to analyze video');
        }
      }
      return null;
    } finally {
      setIsDetecting(false);
      setProgress(0);
      abortControllerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    isCancelledRef.current = true;
    setResult(null);
    setIsDetecting(false);
    setProgress(0);
  }, []);

  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsDetecting(false);
    setProgress(0);
    toast.info('Detection cancelled');
  }, []);

  return {
    isDetecting,
    result,
    progress,
    detectVideo,
    reset,
    cancel
  };
};
