import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectionResult {
  isAiGenerated: boolean;
  confidence: number;
  frames: FrameResult[];
  status: 'success' | 'error' | 'pending';
  message?: string;
  details?: {
    avgScore: number;
    maxScore: number;
    minScore: number;
    frameCount: number;
    videoDuration?: number;
  };
}

interface FrameResult {
  position: number;
  aiGeneratedScore: number;
}

// Timeout wrapper for fetch
const fetchWithTimeout = async (
  url: string, 
  options: RequestInit, 
  timeout = 60000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

serve(async (req) => {
  const startTime = Date.now();
  console.log('🎥 [DETECT-AI-VIDEO] Request received');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth verification
    const authHeader = req.headers.get('Authorization') ?? '';
    
    if (!authHeader.startsWith('Bearer ')) {
      console.error('🎥 [DETECT-AI-VIDEO] Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.slice('Bearer '.length);
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    console.log('🎥 [DETECT-AI-VIDEO] User authenticated:', userId);

    const { videoUrl, threshold = 0.5 } = await req.json();

    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎥 [DETECT-AI-VIDEO] Processing video:', videoUrl.substring(0, 80));

    const apiUser = Deno.env.get('SIGHTENGINE_API_USER');
    const apiSecret = Deno.env.get('SIGHTENGINE_API_SECRET');

    if (!apiUser || !apiSecret) {
      console.error('🎥 [DETECT-AI-VIDEO] SightEngine credentials missing');
      return new Response(
        JSON.stringify({ 
          error: 'AI detection service not configured',
          result: {
            isAiGenerated: false,
            confidence: 0,
            frames: [],
            status: 'error',
            message: 'Detection service not available'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Download video with timeout
    console.log('🎥 [DETECT-AI-VIDEO] Downloading video...');
    
    const videoResponse = await fetchWithTimeout(videoUrl, { method: 'GET' }, 45000);
    
    if (!videoResponse.ok) {
      console.error('🎥 [DETECT-AI-VIDEO] Failed to download video:', videoResponse.status);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to download video',
          result: {
            isAiGenerated: false,
            confidence: 0,
            frames: [],
            status: 'error',
            message: 'Could not access video file'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videoBlob = await videoResponse.blob();
    const videoSizeMB = videoBlob.size / (1024 * 1024);
    console.log('🎥 [DETECT-AI-VIDEO] Video downloaded:', videoSizeMB.toFixed(2), 'MB');

    // Size limit check
    const maxSizeMB = 100;
    if (videoSizeMB > maxSizeMB) {
      return new Response(
        JSON.stringify({ 
          error: 'Video too large',
          result: {
            isAiGenerated: false,
            confidence: 0,
            frames: [],
            status: 'error',
            message: `Video exceeds ${maxSizeMB}MB limit. Please use a smaller file.`
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Upload to SightEngine
    const sightEngineUrl = 'https://api.sightengine.com/1.0/video/check-sync.json';
    
    const formData = new FormData();
    formData.append('media', videoBlob, 'video.mp4');
    formData.append('models', 'genai');
    formData.append('api_user', apiUser);
    formData.append('api_secret', apiSecret);
    formData.append('interval', '1.5'); // Check every 1.5 seconds for better accuracy

    console.log('🎥 [DETECT-AI-VIDEO] Uploading to SightEngine...');
    
    const response = await fetchWithTimeout(
      sightEngineUrl, 
      { method: 'POST', body: formData },
      90000 // 90 second timeout for video processing
    );

    console.log('🎥 [DETECT-AI-VIDEO] SightEngine status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🎥 [DETECT-AI-VIDEO] SightEngine error:', response.status, errorText);
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: 'API quota exceeded',
            result: {
              isAiGenerated: false,
              confidence: 0,
              frames: [],
              status: 'error',
              message: 'Detection quota exceeded - please try again later'
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 403) {
        return new Response(
          JSON.stringify({
            error: 'API authentication failed',
            result: {
              isAiGenerated: false,
              confidence: 0,
              frames: [],
              status: 'error',
              message: 'Detection service authentication failed'
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Video analysis failed',
          result: {
            isAiGenerated: false,
            confidence: 0,
            frames: [],
            status: 'error',
            message: 'Failed to analyze video content'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;
    console.log(`🎥 [DETECT-AI-VIDEO] Response received in ${processingTime}ms`);

    let detectionResult: DetectionResult;

    if (data.status === 'success' && data.data?.frames) {
      const frames: FrameResult[] = data.data.frames.map((frame: any) => ({
        position: frame.info?.position || 0,
        aiGeneratedScore: frame.type?.ai_generated || 0,
      }));

      const frameCount = frames.length;
      
      if (frameCount === 0) {
        detectionResult = {
          isAiGenerated: false,
          confidence: 0,
          frames: [],
          status: 'error',
          message: 'No frames could be analyzed'
        };
      } else {
        // Calculate statistics
        const scores = frames.map(f => f.aiGeneratedScore);
        const avgScore = scores.reduce((sum, s) => sum + s, 0) / frameCount;
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        
        // Use weighted scoring: higher weight for max score to catch AI segments
        const weightedScore = avgScore * 0.6 + maxScore * 0.4;
        
        // Apply threshold
        const effectiveThreshold = Math.max(0.3, Math.min(0.9, threshold));
        const isAiGenerated = weightedScore > effectiveThreshold;

        // Generate detailed message
        let message: string;
        if (isAiGenerated) {
          if (maxScore > 0.9) {
            message = 'High confidence: This video contains AI-generated content';
          } else if (avgScore > 0.7) {
            message = 'This video appears to be AI-generated';
          } else {
            message = 'This video may contain AI-generated segments';
          }
        } else {
          if (avgScore < 0.2) {
            message = 'This video appears to be authentic footage';
          } else {
            message = 'This video appears to be primarily real content';
          }
        }

        detectionResult = {
          isAiGenerated,
          confidence: weightedScore,
          frames,
          status: 'success',
          message,
          details: {
            avgScore,
            maxScore,
            minScore,
            frameCount,
            videoDuration: data.data.duration
          }
        };

        console.log(`🎥 [DETECT-AI-VIDEO] ✅ Result: AI=${isAiGenerated}, avg=${(avgScore * 100).toFixed(1)}%, max=${(maxScore * 100).toFixed(1)}%`);
      }
    } else if (data.status === 'failure') {
      detectionResult = {
        isAiGenerated: false,
        confidence: 0,
        frames: [],
        status: 'error',
        message: data.error?.message || 'Failed to analyze video'
      };
    } else {
      detectionResult = {
        isAiGenerated: false,
        confidence: 0,
        frames: [],
        status: 'pending',
        message: 'Analysis in progress - please wait'
      };
    }

    return new Response(
      JSON.stringify({ 
        result: detectionResult,
        processingTime,
        raw: data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('🎥 [DETECT-AI-VIDEO] Exception:', error);
    
    let message = 'Detection service unavailable';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        message = 'Detection timed out - video may be too long or large';
      } else if (error.message.includes('fetch')) {
        message = 'Failed to connect to detection service';
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        result: {
          isAiGenerated: false,
          confidence: 0,
          frames: [],
          status: 'error',
          message
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
