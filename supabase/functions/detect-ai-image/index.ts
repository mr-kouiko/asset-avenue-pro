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

// Timeout helper for fetch requests
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 30000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Convert image URL to base64 for Gemini
const imageUrlToBase64 = async (imageUrl: string): Promise<{ base64: string; mimeType: string } | null> => {
  try {
    const response = await fetchWithTimeout(imageUrl, {}, 20000);
    if (!response.ok) return null;
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    
    // Check file size (max 20MB for base64)
    if (arrayBuffer.byteLength > 20 * 1024 * 1024) {
      console.error('📸 [DETECT-AI-IMAGE] Image too large:', arrayBuffer.byteLength);
      return null;
    }
    
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    return { base64, mimeType: contentType };
  } catch (error) {
    console.error('📸 [DETECT-AI-IMAGE] Failed to fetch image:', error);
    return null;
  }
};

// Enhanced multi-aspect AI detection prompt
const getDetectionPrompt = () => `You are an expert AI image forensics analyst. Analyze this image thoroughly for AI-generation indicators.

## Analysis Criteria

### 1. Texture Analysis
- Check for unnaturally smooth skin, plastic-like surfaces
- Look for repeating micro-patterns typical of diffusion models
- Identify overly uniform gradients or color transitions

### 2. Anatomical Accuracy
- Count fingers, limbs, facial features carefully
- Check symmetry - AI often creates asymmetric faces/bodies
- Look for merged or missing body parts
- Verify proportions are anatomically correct

### 3. Lighting & Physics
- Check shadow consistency with light sources
- Verify reflections match the scene
- Look for impossible lighting conditions
- Check if specular highlights are realistic

### 4. Detail Consistency
- Examine text/symbols for distortion or nonsense
- Check background coherence and depth
- Look for resolution inconsistencies between regions
- Verify edges are natural, not over-sharpened

### 5. Deepfake Indicators
- Facial blending artifacts around edges
- Inconsistent skin texture vs. background
- Unnatural eye reflections or gaze
- Temporal consistency issues (if apparent)

### 6. Generation Artifacts
- JPEG-like artifacts in non-JPEG regions
- Color banding in smooth gradients
- Checkerboard patterns at edges
- Hallucinated or merged objects

## Response Format
Return ONLY valid JSON:
{
  "isAiGenerated": boolean,
  "confidence": 0.0 to 1.0,
  "deepfakeScore": 0.0 to 1.0,
  "qualityScore": 0.0 to 1.0 (how confident in analysis),
  "reasoning": "2-3 sentence explanation",
  "indicators": ["specific indicator 1", "specific indicator 2"],
  "textureAnalysis": {
    "hasArtifacts": boolean,
    "smoothnessScore": 0.0 to 1.0
  }
}

Be strict but fair:
- High confidence AI: Clear artifacts, anatomical errors, texture issues
- Medium confidence: Some suspicious elements but could be editing/filters
- Low confidence AI / Authentic: Natural imperfections, consistent physics, coherent details`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { imageUrl, threshold = 0.60 } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📸 [DETECT-AI-IMAGE] Starting enhanced Gemini detection for:', imageUrl.substring(0, 80));

    const apiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!apiKey) {
      console.error('📸 [DETECT-AI-IMAGE] LOVABLE_API_KEY not configured');
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

    // Fetch and convert image to base64
    const imageData = await imageUrlToBase64(imageUrl);
    if (!imageData) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch image',
          result: {
            isAiGenerated: false,
            confidence: 0,
            status: 'error',
            message: 'Could not download image for analysis'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📸 [DETECT-AI-IMAGE] Image loaded, calling Gemini 3 Flash...');

    // Call Gemini 3 Flash via Lovable AI Gateway with enhanced prompt
    const response = await fetchWithTimeout(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: getDetectionPrompt()
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${imageData.mimeType};base64,${imageData.base64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 800,
          temperature: 0.1 // Low temperature for more consistent analysis
        }),
      },
      50000
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📸 [DETECT-AI-IMAGE] Gemini error:', response.status, errorText);
      
      const errorMessages: Record<number, string> = {
        402: 'AI detection quota exceeded',
        429: 'Rate limit exceeded - please wait before retrying',
        500: 'AI detection service temporarily unavailable'
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
    console.log(`📸 [DETECT-AI-IMAGE] Gemini response received in ${processingTime}ms`);

    // Extract Gemini's response
    const content = data.choices?.[0]?.message?.content || '';
    console.log('📸 [DETECT-AI-IMAGE] Raw response:', content.substring(0, 400));

    // Parse JSON from response (handle markdown code blocks)
    let analysisResult: {
      isAiGenerated: boolean;
      confidence: number;
      deepfakeScore?: number;
      qualityScore?: number;
      reasoning: string;
      indicators: string[];
      textureAnalysis?: {
        hasArtifacts: boolean;
        smoothnessScore: number;
      };
    };

    try {
      // Try to extract JSON from response
      let jsonStr = content;
      
      // Handle markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      } else {
        // Try to find raw JSON
        const braceMatch = content.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          jsonStr = braceMatch[0];
        }
      }
      
      analysisResult = JSON.parse(jsonStr);
      
      // Validate required fields
      if (typeof analysisResult.isAiGenerated !== 'boolean') {
        throw new Error('Missing isAiGenerated field');
      }
      if (typeof analysisResult.confidence !== 'number') {
        analysisResult.confidence = analysisResult.isAiGenerated ? 0.7 : 0.3;
      }
    } catch (parseError) {
      console.error('📸 [DETECT-AI-IMAGE] Failed to parse Gemini response:', parseError);
      // Fallback: try to interpret the response
      const lowerContent = content.toLowerCase();
      const hasAiKeywords = lowerContent.includes('ai-generated') || 
                           lowerContent.includes('ai generated') ||
                           lowerContent.includes('artificially created');
      const hasAuthenticKeywords = lowerContent.includes('authentic') || 
                                   lowerContent.includes('real photograph') ||
                                   lowerContent.includes('not ai');
      
      analysisResult = {
        isAiGenerated: hasAiKeywords && !hasAuthenticKeywords,
        confidence: 0.5,
        reasoning: 'Analysis result parsed from text response',
        indicators: []
      };
    }

    // Clamp confidence to valid range
    analysisResult.confidence = Math.max(0, Math.min(1, analysisResult.confidence));
    
    // Calculate weighted final score using multiple signals
    const deepfakeWeight = 0.15;
    const qualityWeight = 0.1;
    const baseWeight = 0.75;
    
    let finalConfidence = analysisResult.confidence * baseWeight;
    
    if (analysisResult.deepfakeScore !== undefined) {
      finalConfidence += analysisResult.deepfakeScore * deepfakeWeight;
    } else {
      finalConfidence += analysisResult.confidence * deepfakeWeight;
    }
    
    // Quality score inversely affects confidence (low quality = less certain)
    const qualityFactor = analysisResult.qualityScore ?? 0.8;
    finalConfidence = finalConfidence * (0.5 + qualityFactor * 0.5);
    
    // Clamp final confidence
    finalConfidence = Math.max(0, Math.min(1, finalConfidence));

    // Apply threshold
    const effectiveThreshold = Math.max(0.25, Math.min(0.9, threshold));
    const isAiGenerated = finalConfidence >= effectiveThreshold && analysisResult.isAiGenerated;

    // Generate descriptive message
    let message: string;
    if (!isAiGenerated) {
      if (finalConfidence < 0.25) {
        message = 'Very likely authentic - no AI markers detected';
      } else if (finalConfidence < 0.4) {
        message = 'Appears authentic with minor uncertainties';
      } else {
        message = 'This image appears to be authentic';
      }
    } else {
      if (finalConfidence > 0.9) {
        message = 'Very high confidence: AI-generated content detected';
      } else if (finalConfidence > 0.75) {
        message = 'High confidence: This image is likely AI-generated';
      } else if (finalConfidence > 0.6) {
        message = 'This image appears to be AI-generated';
      } else {
        message = 'This image may contain AI-generated elements';
      }
    }

    // Build model breakdown for detailed analysis
    const modelBreakdown = {
      genai: analysisResult.confidence,
      deepfake: analysisResult.deepfakeScore ?? 0,
      quality: analysisResult.qualityScore ?? 0.8
    };

    const detectionResult: DetectionResult = {
      isAiGenerated,
      confidence: finalConfidence,
      status: 'success',
      message,
      detectionMethod: 'gemini-3-flash-vision',
      details: {
        aiScore: analysisResult.confidence,
        reasoning: analysisResult.reasoning,
        indicators: analysisResult.indicators || [],
        deepfakeScore: analysisResult.deepfakeScore,
        qualityScore: analysisResult.qualityScore,
        textureAnalysis: analysisResult.textureAnalysis,
        modelBreakdown
      }
    };

    console.log(`📸 [DETECT-AI-IMAGE] ✅ Result: AI=${isAiGenerated}, confidence=${(finalConfidence * 100).toFixed(1)}%, method=gemini-3-flash-vision`);
    console.log(`📸 [DETECT-AI-IMAGE] Reasoning: ${analysisResult.reasoning}`);
    if (analysisResult.indicators?.length > 0) {
      console.log(`📸 [DETECT-AI-IMAGE] Indicators: ${analysisResult.indicators.join(', ')}`);
    }

    return new Response(
      JSON.stringify({ 
        result: detectionResult, 
        processingTime
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
          detectionMethod: 'gemini-3-flash-vision'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
