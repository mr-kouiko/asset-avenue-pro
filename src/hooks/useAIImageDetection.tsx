import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DetectionResult {
  isAiGenerated: boolean;
  confidence: number;
  status: 'success' | 'error';
  message?: string;
  detectionMethod?: string;
  details?: {
    aiScore: number;
    reasoning?: string;
    indicators?: string[];
    deepfakeScore?: number;
    qualityScore?: number;
    textureAnalysis?: {
      hasArtifacts: boolean;
      smoothnessScore: number;
    };
    modelBreakdown?: {
      genai: number;
      deepfake: number;
      quality: number;
    };
  };
}

interface UseAIImageDetectionReturn {
  isDetecting: boolean;
  result: DetectionResult | null;
  detectImage: (imageUrl: string, options?: DetectionOptions) => Promise<DetectionResult | null>;
  detectBatch: (imageUrls: string[], options?: DetectionOptions) => Promise<Map<string, DetectionResult | null>>;
  reset: () => void;
}

interface DetectionOptions {
  threshold?: number; // 0-1, default 0.60
  skipCache?: boolean;
  timeout?: number; // ms, default 45000
  showDetailedToast?: boolean;
  silent?: boolean; // Don't show toasts
}

// Simple in-memory cache for detection results
const detectionCache = new Map<string, { result: DetectionResult; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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
    const { 
      threshold = 0.60, 
      skipCache = false, 
      timeout = 45000, 
      showDetailedToast = false,
      silent = false 
    } = options;

    if (!imageUrl) {
      if (!silent) toast.error('No image URL provided');
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
        if (!silent) toast.error('Please login to use AI detection');
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
        
        if (!silent) {
          if (error.message?.includes('quota') || error.message?.includes('402')) {
            toast.error('AI detection quota exceeded', {
              description: 'Please try again later or contact support'
            });
          } else if (error.message?.includes('429')) {
            toast.error('Rate limit exceeded', {
              description: 'Please wait a moment before retrying'
            });
          } else {
            toast.error('Failed to analyze image');
          }
        }
        return null;
      }

      const detectionResult = data?.result as DetectionResult;
      
      if (detectionResult) {
        // Ensure detection method is set correctly
        if (!detectionResult.detectionMethod) {
          detectionResult.detectionMethod = 'gemini-3-flash-vision';
        }
        
        setResult(detectionResult);
        setCachedResult(imageUrl, detectionResult);

        // Show appropriate feedback
        if (!silent && detectionResult.status === 'success') {
          const confidencePercent = Math.round(detectionResult.confidence * 100);
          const details = detectionResult.details;
          
          // Build detailed description if requested
          let description = detectionResult.message || '';
          if (showDetailedToast && details?.modelBreakdown) {
            const breakdown = details.modelBreakdown;
            description += ` | GenAI: ${Math.round(breakdown.genai * 100)}%`;
            if (breakdown.deepfake > 0) {
              description += `, Deepfake: ${Math.round(breakdown.deepfake * 100)}%`;
            }
          }
          
          if (detectionResult.isAiGenerated) {
            const icon = confidencePercent > 85 ? '🚨' : confidencePercent > 70 ? '🤖' : '⚠️';
            toast.warning(`${icon} AI-Generated (${confidencePercent}% confidence)`, {
              description,
              duration: 6000
            });
          } else {
            const icon = confidencePercent < 25 ? '✅' : '📷';
            toast.success(`${icon} Authentic (${100 - confidencePercent}% confidence)`, {
              description: detectionResult.message || 'This image appears to be authentic',
              duration: 4000
            });
          }
        } else if (!silent && detectionResult.status === 'error') {
          toast.error(detectionResult.message || 'Detection failed', {
            description: 'Try re-uploading or using a different image'
          });
        }
      }

      return detectionResult;
    } catch (err) {
      console.error('📸 [AI-IMAGE] Exception:', err);
      
      if (!silent) {
        if (err instanceof Error && err.message === 'Detection timeout') {
          toast.error('Detection timed out', {
            description: 'The image may be too large. Try a smaller file.'
          });
        } else {
          toast.error('Failed to analyze image');
        }
      }
      return null;
    } finally {
      setIsDetecting(false);
      abortControllerRef.current = null;
    }
  }, []);

  // Batch detection for multiple images
  const detectBatch = useCallback(async (
    imageUrls: string[],
    options: DetectionOptions = {}
  ): Promise<Map<string, DetectionResult | null>> => {
    const results = new Map<string, DetectionResult | null>();
    
    if (imageUrls.length === 0) return results;

    setIsDetecting(true);
    
    // Process in parallel with concurrency limit
    const concurrencyLimit = 3;
    const chunks: string[][] = [];
    
    for (let i = 0; i < imageUrls.length; i += concurrencyLimit) {
      chunks.push(imageUrls.slice(i, i + concurrencyLimit));
    }

    try {
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(url => detectImage(url, { ...options, silent: true }))
        );
        
        chunk.forEach((url, index) => {
          results.set(url, chunkResults[index]);
        });
      }

      // Show summary toast
      const successCount = Array.from(results.values()).filter(r => r?.status === 'success').length;
      const aiCount = Array.from(results.values()).filter(r => r?.isAiGenerated).length;
      
      if (successCount > 0) {
        toast.info(`Analyzed ${successCount} images`, {
          description: aiCount > 0 ? `${aiCount} appear to be AI-generated` : 'All appear authentic'
        });
      }
    } finally {
      setIsDetecting(false);
    }

    return results;
  }, [detectImage]);

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
    detectBatch,
    reset
  };
};
