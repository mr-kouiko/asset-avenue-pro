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
}

interface FrameResult {
  position: number;
  aiGeneratedScore: number;
}

serve(async (req) => {
  console.log('🎥 [DETECT-AI-VIDEO] Request received');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth (signing-keys compatible): verify JWT manually using getClaims()
    const authHeader = req.headers.get('Authorization') ?? '';
    console.log('🎥 [DETECT-AI-VIDEO] Auth header present:', authHeader.startsWith('Bearer '));
    
    if (!authHeader.startsWith('Bearer ')) {
      console.error('🎥 [DETECT-AI-VIDEO] Missing or invalid Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('🎥 [DETECT-AI-VIDEO] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
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
      console.error('🎥 [DETECT-AI-VIDEO] Auth claims error:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🎥 [DETECT-AI-VIDEO] User authenticated:', claimsData.claims.sub);

    const { videoUrl, mode = 'sync' } = await req.json();
    console.log('🎥 [DETECT-AI-VIDEO] Video URL:', videoUrl);

    if (!videoUrl) {
      console.error('🎥 [DETECT-AI-VIDEO] No video URL provided');
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUser = Deno.env.get('SIGHTENGINE_API_USER');
    const apiSecret = Deno.env.get('SIGHTENGINE_API_SECRET');

    if (!apiUser || !apiSecret) {
      console.error('🎥 [DETECT-AI-VIDEO] SightEngine API credentials not configured');
      return new Response(
        JSON.stringify({ error: 'AI detection service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎥 [DETECT-AI-VIDEO] Starting AI video detection with SightEngine...');

    // Use SightEngine's AI-generated content detection for videos
    // SYNC API: https://api.sightengine.com/1.0/video/check-sync.json (for videos < 60s)
    const sightEngineUrl = 'https://api.sightengine.com/1.0/video/check-sync.json';
    
    const formData = new FormData();
    formData.append('url', videoUrl);
    formData.append('models', 'genai');  // AI-generated content detection model
    formData.append('api_user', apiUser);
    formData.append('api_secret', apiSecret);
    formData.append('interval', '2');  // Check every 2 seconds

    console.log('🎥 [DETECT-AI-VIDEO] Calling SightEngine sync API...');
    
    const response = await fetch(sightEngineUrl, {
      method: 'POST',
      body: formData,
    });

    console.log('🎥 [DETECT-AI-VIDEO] SightEngine response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🎥 [DETECT-AI-VIDEO] SightEngine API error:', response.status, errorText);
      
      // Return a fallback response for demo/testing
      if (response.status === 402 || response.status === 403) {
        console.warn('🎥 [DETECT-AI-VIDEO] API quota exceeded or authentication failed');
        return new Response(
          JSON.stringify({
            error: 'API quota exceeded or authentication failed',
            fallback: true,
            result: {
              isAiGenerated: false,
              confidence: 0,
              frames: [],
              status: 'error',
              message: 'Unable to verify - API limit reached'
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to analyze video', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('🎥 [DETECT-AI-VIDEO] SightEngine response:', JSON.stringify(data, null, 2));

    // Process the response
    let detectionResult: DetectionResult;

    if (data.status === 'success' && data.data?.frames) {
      console.log('🎥 [DETECT-AI-VIDEO] Processing frames:', data.data.frames.length);
      
      const frames = data.data.frames.map((frame: any) => ({
        position: frame.info?.position || 0,
        aiGeneratedScore: frame.type?.ai_generated || 0,
      }));

      // Calculate average AI-generated score across all frames
      const avgScore = frames.length > 0
        ? frames.reduce((sum: number, f: FrameResult) => sum + f.aiGeneratedScore, 0) / frames.length
        : 0;

      console.log('🎥 [DETECT-AI-VIDEO] Average AI score:', avgScore);

      // Threshold: if average score > 0.5, likely AI-generated (lowered from 0.7 for better detection)
      const isAiGenerated = avgScore > 0.5;

      detectionResult = {
        isAiGenerated,
        confidence: avgScore,
        frames,
        status: 'success',
        message: isAiGenerated 
          ? 'This video appears to be AI-generated'
          : 'This video appears to be authentic'
      };
      
      console.log('🎥 [DETECT-AI-VIDEO] ✅ Detection result: AI=' + isAiGenerated + ', confidence=' + avgScore);
    } else if (data.status === 'failure') {
      console.error('🎥 [DETECT-AI-VIDEO] SightEngine failure:', data.error);
      detectionResult = {
        isAiGenerated: false,
        confidence: 0,
        frames: [],
        status: 'error',
        message: data.error?.message || 'Failed to analyze video'
      };
    } else {
      console.log('🎥 [DETECT-AI-VIDEO] Analysis pending or unknown status:', data.status);
      detectionResult = {
        isAiGenerated: false,
        confidence: 0,
        frames: [],
        status: 'pending',
        message: 'Analysis in progress'
      };
    }

    return new Response(
      JSON.stringify({ 
        result: detectionResult,
        raw: data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🎥 [DETECT-AI-VIDEO] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        result: {
          isAiGenerated: false,
          confidence: 0,
          frames: [],
          status: 'error',
          message: 'Detection service unavailable'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
