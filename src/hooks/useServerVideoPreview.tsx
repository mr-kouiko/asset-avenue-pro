import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PreviewOptions {
  videoPath: string;
  contentId?: string;
  duration?: number;
  resolution?: number;
}

interface PreviewState {
  isGenerating: boolean;
  progress: number;
  stage: 'idle' | 'requesting' | 'processing' | 'downloading' | 'done' | 'error';
  error?: string;
}

interface PreviewResult {
  previewUrl: string;
  previewPath: string;
  cached: boolean;
  processingTimeMs: number;
}

/**
 * Hook for server-side video preview generation
 * 
 * Uses the generate-video-preview edge function to create 720p watermarked MP4 previews.
 * Previews are cached in storage for instant subsequent downloads.
 */
export function useServerVideoPreview() {
  const [state, setState] = useState<PreviewState>({
    isGenerating: false,
    progress: 0,
    stage: 'idle',
  });

  const generate = useCallback(async (options: PreviewOptions): Promise<PreviewResult> => {
    const { videoPath, contentId, duration = 6, resolution = 720 } = options;

    setState({ isGenerating: true, progress: 10, stage: 'requesting' });

    try {
      // Call the edge function
      setState(prev => ({ ...prev, progress: 30, stage: 'processing' }));
      
      const { data, error } = await supabase.functions.invoke('generate-video-preview', {
        body: { videoPath, contentId, duration, resolution },
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate preview');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Preview generation failed');
      }

      setState(prev => ({ ...prev, progress: 90, stage: 'downloading' }));

      const result: PreviewResult = {
        previewUrl: data.previewUrl,
        previewPath: data.previewPath,
        cached: data.cached || false,
        processingTimeMs: data.processingTimeMs || 0,
      };

      setState({ isGenerating: false, progress: 100, stage: 'done' });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useServerVideoPreview] Error:', errorMessage);
      setState({ isGenerating: false, progress: 0, stage: 'error', error: errorMessage });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isGenerating: false, progress: 0, stage: 'idle' });
  }, []);

  return {
    ...state,
    generate,
    reset,
  };
}
