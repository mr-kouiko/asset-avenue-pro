import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DetectionResult {
  isAiGenerated: boolean;
  confidence: number;
  status: 'success' | 'error';
  message?: string;
  detectionMethod?: string;
}

interface UseAIImageDetectionReturn {
  isDetecting: boolean;
  result: DetectionResult | null;
  detectImage: (imageUrl: string, options?: DetectionOptions) => Promise<DetectionResult | null>;
  reset: () => void;
}

interface DetectionOptions {
  threshold?: number; // 0-1, default 0.7
  skipCache?: boolean;
  timeout?: number; // ms, default 30000
}

// Simple in-memory cache for detection results
const detectionCache = new Map<string, { result: DetectionResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedResult = (url: string): DetectionResult | null => {
  const cached = detectionCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  detectionCache.delete(url);
  return null;
};

const setCachedResult = (url: string, result: DetectionResult): void => {
  detectionCache.set(url, { result, timestamp: Date.now() });
};

export const useAIImageDetection = (): UseAIImageDetectionReturn => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const detectImage = useCallback(async (
    imageUrl: string, 
    options: DetectionOptions = {}
  ): Promise<DetectionResult | null> => {
    const { threshold = 0.7, skipCache = false, timeout = 30000 } = options;

    if (!imageUrl) {
      toast.error('No image URL provided');
      return null;
    }

    // Check cache first
    if (!skipCache) {
      const cached = getCachedResult(imageUrl);
      if (cached) {
        console.log('📸 [AI-IMAGE] Using cached result');
        setResult(cached);
        return cached;
      }
    }

    // Cancel any pending detection
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsDetecting(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Please login to use AI detection');
        return null;
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Detection timeout')), timeout);
      });

      // Create fetch promise
      const fetchPromise = supabase.functions.invoke('detect-ai-image', {
        body: { imageUrl, threshold },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      // Race between fetch and timeout
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        console.error('📸 [AI-IMAGE] Detection error:', error);
        
        // Check for specific error types
        if (error.message?.includes('quota') || error.message?.includes('402')) {
          toast.error('AI detection quota exceeded', {
            description: 'Please try again later or contact support'
          });
        } else {
          toast.error('Failed to analyze image');
        }
        return null;
      }

      const detectionResult = data?.result as DetectionResult;
      
      if (detectionResult) {
        // Apply custom threshold if provided
        if (detectionResult.status === 'success' && threshold !== 0.7) {
          detectionResult.isAiGenerated = detectionResult.confidence > threshold;
        }
        
        detectionResult.detectionMethod = 'sightengine';
        setResult(detectionResult);
        setCachedResult(imageUrl, detectionResult);

        // Show appropriate feedback
        if (detectionResult.status === 'success') {
          const confidencePercent = Math.round(detectionResult.confidence * 100);
          
          if (detectionResult.isAiGenerated) {
            toast.warning(`🤖 AI-Generated (${confidencePercent}% confidence)`, {
              description: detectionResult.message || 'This image appears to be AI-generated',
              duration: 5000
            });
          } else {
            toast.success(`✅ Authentic (${100 - confidencePercent}% confidence)`, {
              description: 'This image appears to be a real photograph',
              duration: 4000
            });
          }
        } else if (detectionResult.status === 'error') {
          toast.error(detectionResult.message || 'Detection failed', {
            description: 'Try re-uploading or using a different image'
          });
        }
      }

      return detectionResult;
    } catch (err) {
      console.error('📸 [AI-IMAGE] Exception:', err);
      
      if (err instanceof Error && err.message === 'Detection timeout') {
        toast.error('Detection timed out', {
          description: 'The image may be too large. Try a smaller file.'
        });
      } else {
        toast.error('Failed to analyze image');
      }
      return null;
    } finally {
      setIsDetecting(false);
      abortControllerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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
