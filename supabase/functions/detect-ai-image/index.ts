import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectionResult {
  isAiGenerated: boolean;
  confidence: number;
  status: 'success' | 'error';
  message?: string;
  details?: {
    aiScore: number;
    photoScore?: number;
    artScore?: number;
  };
}

// Timeout helper for fetch requests
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 25000): Promise<Response> => {
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { imageUrl, threshold = 0.7 } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📸 [DETECT-AI-IMAGE] Starting detection for:', imageUrl.substring(0, 100));

    const apiUser = Deno.env.get('SIGHTENGINE_API_USER');
    const apiSecret = Deno.env.get('SIGHTENGINE_API_SECRET');

    if (!apiUser || !apiSecret) {
      console.error('📸 [DETECT-AI-IMAGE] SightEngine API credentials not configured');
      return new Response(
        JSON.stringify({ 
          error: 'AI detection service not configured',
          result: {
            isAiGenerated: false,
            confidence: 0,
            status: 'error',
            message: 'Detection service not available'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use multiple models for better detection accuracy
    const sightEngineUrl = `https://api.sightengine.com/1.0/check.json`;
    
    const params = new URLSearchParams({
      url: imageUrl,
      models: 'genai,type', // genai for AI detection, type for image classification
      api_user: apiUser,
      api_secret: apiSecret,
    });

    const response = await fetchWithTimeout(
      `${sightEngineUrl}?${params}`,
      { method: 'GET' },
      25000
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📸 [DETECT-AI-IMAGE] SightEngine error:', response.status, errorText);
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: 'API quota exceeded',
            result: {
              isAiGenerated: false,
              confidence: 0,
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
              status: 'error',
              message: 'Detection service authentication failed'
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to analyze image',
          result: {
            isAiGenerated: false,
            confidence: 0,
            status: 'error',
            message: 'Image analysis failed'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;
    console.log(`📸 [DETECT-AI-IMAGE] Response received in ${processingTime}ms`);

    let detectionResult: DetectionResult;

    if (data.status === 'success' && data.type) {
      const aiScore = data.type.ai_generated || 0;
      const photoScore = data.type.photo || 0;
      const artScore = data.type.illustration || data.type.art || 0;
      
      // Use provided threshold or default to 0.7
      const effectiveThreshold = Math.max(0.3, Math.min(0.95, threshold));
      const isAiGenerated = aiScore > effectiveThreshold;

      // Generate detailed message based on scores
      let message: string;
      if (isAiGenerated) {
        if (aiScore > 0.9) {
          message = 'High confidence: This image is likely AI-generated';
        } else if (aiScore > 0.7) {
          message = 'This image appears to be AI-generated';
        } else {
          message = 'This image may contain AI-generated elements';
        }
      } else {
        if (photoScore > 0.7) {
          message = 'This appears to be an authentic photograph';
        } else if (artScore > 0.5) {
          message = 'This appears to be human-created artwork';
        } else {
          message = 'This image appears to be authentic';
        }
      }

      detectionResult = {
        isAiGenerated,
        confidence: aiScore,
        status: 'success',
        message,
        details: {
          aiScore,
          photoScore,
          artScore
        }
      };

      console.log(`📸 [DETECT-AI-IMAGE] ✅ Result: AI=${isAiGenerated}, confidence=${(aiScore * 100).toFixed(1)}%`);
    } else {
      console.error('📸 [DETECT-AI-IMAGE] Unexpected response:', data);
      detectionResult = {
        isAiGenerated: false,
        confidence: 0,
        status: 'error',
        message: data.error?.message || 'Failed to analyze image - unexpected response'
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
    console.error('📸 [DETECT-AI-IMAGE] Exception:', error);
    
    let message = 'Detection service unavailable';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        message = 'Detection timed out - image may be too large';
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
          status: 'error',
          message
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
