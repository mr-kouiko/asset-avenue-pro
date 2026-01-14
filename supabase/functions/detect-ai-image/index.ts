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
    const response = await fetchWithTimeout(imageUrl, {}, 15000);
    if (!response.ok) return null;
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    return { base64, mimeType: contentType };
  } catch (error) {
    console.error('📸 [DETECT-AI-IMAGE] Failed to fetch image:', error);
    return null;
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

    console.log('📸 [DETECT-AI-IMAGE] Starting Gemini detection for:', imageUrl.substring(0, 80));

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

    // Call Gemini via Lovable AI Gateway with vision
    const response = await fetchWithTimeout(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this image and determine if it is AI-generated or human-created.

Look for these AI indicators:
- Unnatural smoothness or plastic-like textures
- Inconsistent lighting or shadows
- Anatomical errors (extra fingers, distorted limbs, asymmetric features)
- Blurred or merged background elements
- Text that is distorted or nonsensical
- Repeating patterns or artifacts
- Overly perfect or idealized features
- Unnatural hair or fabric textures
- Inconsistent perspective or depth

Respond with ONLY a JSON object in this exact format:
{
  "isAiGenerated": true or false,
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation",
  "indicators": ["indicator1", "indicator2"]
}

Be strict: if you see clear AI artifacts, mark it as AI-generated. If the image looks authentically photographed or hand-drawn with natural imperfections, mark it as not AI-generated.`
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
          max_tokens: 500
        }),
      },
      45000
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
    console.log('📸 [DETECT-AI-IMAGE] Raw response:', content.substring(0, 300));

    // Parse JSON from response (handle markdown code blocks)
    let analysisResult: {
      isAiGenerated: boolean;
      confidence: number;
      reasoning: string;
      indicators: string[];
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
    } catch (parseError) {
      console.error('📸 [DETECT-AI-IMAGE] Failed to parse Gemini response:', parseError);
      // Fallback: try to interpret the response
      const lowerContent = content.toLowerCase();
      analysisResult = {
        isAiGenerated: lowerContent.includes('ai-generated') || lowerContent.includes('ai generated'),
        confidence: 0.5,
        reasoning: 'Could not parse detailed analysis',
        indicators: []
      };
    }

    // Apply threshold
    const effectiveThreshold = Math.max(0.3, Math.min(0.9, threshold));
    const isAiGenerated = analysisResult.confidence >= effectiveThreshold && analysisResult.isAiGenerated;

    // Generate message
    let message: string;
    if (!isAiGenerated) {
      if (analysisResult.confidence < 0.3) {
        message = 'Very likely authentic - no AI markers detected';
      } else {
        message = 'This image appears to be authentic';
      }
    } else {
      if (analysisResult.confidence > 0.9) {
        message = 'Very high confidence AI-generated content detected';
      } else if (analysisResult.confidence > 0.75) {
        message = 'High confidence: This image is likely AI-generated';
      } else if (analysisResult.confidence > 0.5) {
        message = 'This image appears to be AI-generated';
      } else {
        message = 'This image may contain AI-generated elements';
      }
    }

    const detectionResult: DetectionResult = {
      isAiGenerated,
      confidence: analysisResult.confidence,
      status: 'success',
      message,
      detectionMethod: 'gemini-vision',
      details: {
        aiScore: analysisResult.confidence,
        reasoning: analysisResult.reasoning,
        indicators: analysisResult.indicators || []
      }
    };

    console.log(`📸 [DETECT-AI-IMAGE] ✅ Result: AI=${isAiGenerated}, confidence=${(analysisResult.confidence * 100).toFixed(1)}%, method=gemini-vision`);
    console.log(`📸 [DETECT-AI-IMAGE] Reasoning: ${analysisResult.reasoning}`);

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
          detectionMethod: 'gemini-vision'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
