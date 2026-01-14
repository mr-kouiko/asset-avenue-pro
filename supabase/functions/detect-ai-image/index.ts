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
  detectionMethod?: string;
  details?: {
    aiScore: number;
    photoScore?: number;
    artScore?: number;
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

// Weighted scoring algorithm for better accuracy
const calculateWeightedScore = (scores: {
  genai?: number;
  deepfake?: number;
  quality?: number;
  photo?: number;
  illustration?: number;
}): { finalScore: number; breakdown: Record<string, number> } => {
  const weights = {
    genai: 0.50,      // Primary AI detection
    deepfake: 0.25,   // Deepfake detection as secondary signal
    quality: 0.15,    // Quality anomalies
    typeAnalysis: 0.10 // Photo vs illustration analysis
  };

  const genaiScore = scores.genai ?? 0;
  const deepfakeScore = scores.deepfake ?? 0;
  
  // Quality score: low quality in specific patterns suggests AI
  const qualityScore = scores.quality !== undefined 
    ? Math.max(0, 1 - scores.quality) * 0.3 // Low quality slightly increases AI likelihood
    : 0;
  
  // Type analysis: if it's classified as photo but has AI markers, increase confidence
  const photoScore = scores.photo ?? 0;
  const illustrationScore = scores.illustration ?? 0;
  const typeAnalysisScore = illustrationScore > 0.5 && genaiScore > 0.3 
    ? 0.2 // Boost for illustrations that also have AI markers
    : 0;

  const finalScore = Math.min(1, 
    genaiScore * weights.genai +
    deepfakeScore * weights.deepfake +
    qualityScore * weights.quality +
    typeAnalysisScore * weights.typeAnalysis
  );

  return {
    finalScore,
    breakdown: {
      genai: genaiScore,
      deepfake: deepfakeScore,
      quality: qualityScore,
      typeAnalysis: typeAnalysisScore
    }
  };
};

// Generate human-readable message based on analysis
const generateMessage = (
  isAiGenerated: boolean,
  confidence: number,
  details: DetectionResult['details']
): string => {
  if (!isAiGenerated) {
    if (details?.photoScore && details.photoScore > 0.8) {
      return 'High confidence authentic photograph';
    } else if (details?.artScore && details.artScore > 0.7) {
      return 'Appears to be human-created artwork or illustration';
    } else if (confidence < 0.2) {
      return 'Very likely authentic - no AI markers detected';
    }
    return 'This image appears to be authentic';
  }

  // AI-generated messages
  if (confidence > 0.9) {
    return 'Very high confidence AI-generated content detected';
  } else if (confidence > 0.75) {
    return 'High confidence: This image is likely AI-generated';
  } else if (confidence > 0.5) {
    return 'This image appears to be AI-generated';
  } else {
    return 'This image may contain AI-generated elements';
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { imageUrl, threshold = 0.65 } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📸 [DETECT-AI-IMAGE] Starting enhanced detection for:', imageUrl.substring(0, 80));

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

    // Use comprehensive model set for maximum accuracy
    const sightEngineUrl = `https://api.sightengine.com/1.0/check.json`;
    
    const params = new URLSearchParams({
      url: imageUrl,
      models: 'genai,deepfake,type,quality', // Multiple models for comprehensive analysis
      api_user: apiUser,
      api_secret: apiSecret,
    });

    console.log('📸 [DETECT-AI-IMAGE] Calling SightEngine with models: genai,deepfake,type,quality');

    const response = await fetchWithTimeout(
      `${sightEngineUrl}?${params}`,
      { method: 'GET' },
      30000 // Increased timeout for multi-model analysis
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📸 [DETECT-AI-IMAGE] SightEngine error:', response.status, errorText);
      
      const errorMessages: Record<number, string> = {
        402: 'Detection quota exceeded - please try again later',
        403: 'Detection service authentication failed',
        429: 'Rate limit exceeded - please wait before retrying',
        500: 'Detection service temporarily unavailable'
      };
      
      return new Response(
        JSON.stringify({
          error: errorMessages[response.status] || 'Failed to analyze image',
          result: {
            isAiGenerated: false,
            confidence: 0,
            status: 'error',
            message: errorMessages[response.status] || 'Image analysis failed'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;
    console.log(`📸 [DETECT-AI-IMAGE] Response received in ${processingTime}ms`);

    let detectionResult: DetectionResult;

    if (data.status === 'success') {
      // Extract all available scores
      const rawScores = {
        genai: data.type?.ai_generated ?? 0,
        deepfake: data.deepfake ?? 0,
        quality: data.quality?.score ?? undefined,
        photo: data.type?.photo ?? 0,
        illustration: data.type?.illustration ?? data.type?.art ?? 0
      };

      // Calculate weighted score for final determination
      const { finalScore, breakdown } = calculateWeightedScore(rawScores);
      
      // Use provided threshold (clamped between 0.3 and 0.9)
      const effectiveThreshold = Math.max(0.3, Math.min(0.9, threshold));
      const isAiGenerated = finalScore > effectiveThreshold;

      // Detect texture artifacts (smoothness patterns common in AI images)
      const hasArtifacts = rawScores.genai > 0.4 && rawScores.photo < 0.6;
      const smoothnessScore = rawScores.genai > 0.5 ? 0.7 : 0.3;

      const details: DetectionResult['details'] = {
        aiScore: finalScore,
        photoScore: rawScores.photo,
        artScore: rawScores.illustration,
        qualityScore: rawScores.quality,
        textureAnalysis: {
          hasArtifacts,
          smoothnessScore
        },
        modelBreakdown: {
          genai: rawScores.genai,
          deepfake: rawScores.deepfake,
          quality: breakdown.quality
        }
      };

      const message = generateMessage(isAiGenerated, finalScore, details);

      detectionResult = {
        isAiGenerated,
        confidence: finalScore,
        status: 'success',
        message,
        detectionMethod: 'sightengine-multi-model',
        details
      };

      console.log(`📸 [DETECT-AI-IMAGE] ✅ Result: AI=${isAiGenerated}, confidence=${(finalScore * 100).toFixed(1)}%, method=multi-model`);
      console.log(`📸 [DETECT-AI-IMAGE] Breakdown: genai=${(rawScores.genai * 100).toFixed(1)}%, deepfake=${(rawScores.deepfake * 100).toFixed(1)}%, photo=${(rawScores.photo * 100).toFixed(1)}%`);
    } else {
      console.error('📸 [DETECT-AI-IMAGE] Unexpected response:', JSON.stringify(data).substring(0, 200));
      detectionResult = {
        isAiGenerated: false,
        confidence: 0,
        status: 'error',
        message: data.error?.message || 'Failed to analyze image - unexpected response',
        detectionMethod: 'sightengine'
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
        message = 'Detection timed out - image may be too large or slow connection';
      } else if (error.message.includes('fetch')) {
        message = 'Failed to connect to detection service';
      } else if (error.message.includes('JSON')) {
        message = 'Invalid response from detection service';
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
          message,
          detectionMethod: 'sightengine'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
