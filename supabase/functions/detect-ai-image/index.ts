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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUser = Deno.env.get('SIGHTENGINE_API_USER');
    const apiSecret = Deno.env.get('SIGHTENGINE_API_SECRET');

    if (!apiUser || !apiSecret) {
      console.error('SightEngine API credentials not configured');
      return new Response(
        JSON.stringify({ error: 'AI detection service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting AI image detection for:', imageUrl);

    // Use SightEngine's AI-generated content detection for images
    const sightEngineUrl = `https://api.sightengine.com/1.0/check.json`;
    
    const params = new URLSearchParams({
      url: imageUrl,
      models: 'genai',
      api_user: apiUser,
      api_secret: apiSecret,
    });

    const response = await fetch(`${sightEngineUrl}?${params}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SightEngine API error:', response.status, errorText);
      
      if (response.status === 402 || response.status === 403) {
        return new Response(
          JSON.stringify({
            error: 'API quota exceeded',
            result: {
              isAiGenerated: false,
              confidence: 0,
              status: 'error',
              message: 'Unable to verify - API limit reached'
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to analyze image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('SightEngine response:', JSON.stringify(data, null, 2));

    let detectionResult: DetectionResult;

    if (data.status === 'success' && data.type) {
      const aiScore = data.type.ai_generated || 0;
      const isAiGenerated = aiScore > 0.7;

      detectionResult = {
        isAiGenerated,
        confidence: aiScore,
        status: 'success',
        message: isAiGenerated 
          ? 'This image appears to be AI-generated'
          : 'This image appears to be authentic'
      };
    } else {
      detectionResult = {
        isAiGenerated: false,
        confidence: 0,
        status: 'error',
        message: data.error?.message || 'Failed to analyze image'
      };
    }

    return new Response(
      JSON.stringify({ result: detectionResult, raw: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI detection error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        result: {
          isAiGenerated: false,
          confidence: 0,
          status: 'error',
          message: 'Detection service unavailable'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
