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
  detectionMethod?: string;
  details?: {
    avgScore: number;
    maxScore: number;
    minScore: number;
    frameCount: number;
    videoDuration?: number;
    analysisType?: 'sightengine' | 'gemini-fallback';
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

// Extract a frame from video URL and convert to base64 for Gemini fallback
const extractVideoFrame = async (videoUrl: string): Promise<{ base64: string; mimeType: string } | null> => {
  try {
    // For fallback, we'll analyze the video thumbnail/first frame if available
    // This is a simplified approach - for full video we'd need FFmpeg
    const response = await fetchWithTimeout(videoUrl, { method: 'GET' }, 30000);
    if (!response.ok) return null;
    
    // Check content type
    const contentType = response.headers.get('content-type') || '';
    
    // If it's already an image (thumbnail), use it directly
    if (contentType.startsWith('image/')) {
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 10 * 1024 * 1024) return null;
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return { base64, mimeType: contentType };
    }
    
    return null;
  } catch (error) {
    console.error('🎥 [DETECT-AI-VIDEO] Frame extraction failed:', error);
    return null;
  }
};

// Gemini-based video frame analysis (fallback)
const analyzeWithGemini = async (
  imageData: { base64: string; mimeType: string },
  apiKey: string
): Promise<{ score: number; reasoning: string } | null> => {
  try {
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
                  text: `Analyze this video frame/thumbnail for AI-generation indicators.

Look for:
- Unnatural motion blur or frame interpolation artifacts
- Face/body distortions typical of deepfakes
- Inconsistent lighting across the frame
- AI texture patterns (too smooth, plastic-like)
- Background anomalies or impossible physics

Return ONLY JSON:
{
  "aiScore": 0.0 to 1.0,
  "isLikelyAI": boolean,
  "reasoning": "brief explanation"
}`
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
          max_tokens: 300,
          temperature: 0.1
        }),
      },
      40000
    );

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: parsed.aiScore ?? (parsed.isLikelyAI ? 0.7 : 0.3),
        reasoning: parsed.reasoning || 'Analysis completed'
      };
    }
    
    return null;
  } catch (error) {
    console.error('🎥 [DETECT-AI-VIDEO] Gemini fallback failed:', error);
    return null;
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
    const { data: claimsData, error: claimsError } = await supabase.auth.getSession();
    
    if (claimsError || !claimsData?.session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.session.user.id;
    console.log('🎥 [DETECT-AI-VIDEO] User authenticated:', userId);

    const { videoUrl, threshold = 0.5, thumbnailUrl } = await req.json();

    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎥 [DETECT-AI-VIDEO] Processing video:', videoUrl.substring(0, 80));

    const apiUser = Deno.env.get('SIGHTENGINE_API_USER');
    const apiSecret = Deno.env.get('SIGHTENGINE_API_SECRET');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    // Try SightEngine first if credentials available
    let useSightEngine = !!(apiUser && apiSecret);
    let detectionResult: DetectionResult | null = null;

    if (useSightEngine) {
      try {
        // Step 1: Download video with timeout
        console.log('🎥 [DETECT-AI-VIDEO] Downloading video for SightEngine...');
        
        const videoResponse = await fetchWithTimeout(videoUrl, { method: 'GET' }, 45000);
        
        if (!videoResponse.ok) {
          console.error('🎥 [DETECT-AI-VIDEO] Failed to download video:', videoResponse.status);
          useSightEngine = false;
        } else {
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
          formData.append('api_user', apiUser!);
          formData.append('api_secret', apiSecret!);
          formData.append('interval', '1.0'); // Check every second for better accuracy

          console.log('🎥 [DETECT-AI-VIDEO] Uploading to SightEngine...');
          
          const response = await fetchWithTimeout(
            sightEngineUrl, 
            { method: 'POST', body: formData },
            120000 // 2 minute timeout for video processing
          );

          console.log('🎥 [DETECT-AI-VIDEO] SightEngine status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('🎥 [DETECT-AI-VIDEO] SightEngine error:', response.status, errorText);
            
            if (response.status === 402) {
              // Quota exceeded - fall back to Gemini
              useSightEngine = false;
            } else if (response.status === 403) {
              useSightEngine = false;
            } else {
              useSightEngine = false;
            }
          } else {
            const data = await response.json();

            if (data.status === 'success' && data.data?.frames) {
              const frames: FrameResult[] = data.data.frames.map((frame: any) => ({
                position: frame.info?.position || 0,
                aiGeneratedScore: frame.type?.ai_generated || 0,
              }));

              const frameCount = frames.length;
              
              if (frameCount > 0) {
                // Calculate statistics
                const scores = frames.map(f => f.aiGeneratedScore);
                const avgScore = scores.reduce((sum, s) => sum + s, 0) / frameCount;
                const maxScore = Math.max(...scores);
                const minScore = Math.min(...scores);
                
                // Use weighted scoring: higher weight for max score to catch AI segments
                // Also consider consistency - AI videos often have consistent high scores
                const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / frameCount;
                const consistencyBonus = variance < 0.1 ? 0.05 : 0; // Low variance = more consistent = slightly higher confidence
                
                const weightedScore = (avgScore * 0.55 + maxScore * 0.35 + (1 - minScore) * 0.05 + consistencyBonus) * 0.95;
                
                // Apply threshold
                const effectiveThreshold = Math.max(0.3, Math.min(0.9, threshold));
                const isAiGenerated = weightedScore > effectiveThreshold;

                // Generate detailed message
                let message: string;
                if (isAiGenerated) {
                  if (maxScore > 0.9) {
                    message = 'Very high confidence: This video contains AI-generated content';
                  } else if (avgScore > 0.7) {
                    message = 'High confidence: This video is likely AI-generated';
                  } else if (avgScore > 0.5) {
                    message = 'This video appears to be AI-generated';
                  } else {
                    message = 'This video may contain AI-generated segments';
                  }
                } else {
                  if (avgScore < 0.15) {
                    message = 'Very likely authentic footage - no AI markers detected';
                  } else if (avgScore < 0.3) {
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
                  detectionMethod: 'sightengine-genai',
                  details: {
                    avgScore,
                    maxScore,
                    minScore,
                    frameCount,
                    videoDuration: data.data.duration,
                    analysisType: 'sightengine'
                  }
                };

                console.log(`🎥 [DETECT-AI-VIDEO] ✅ SightEngine Result: AI=${isAiGenerated}, avg=${(avgScore * 100).toFixed(1)}%, max=${(maxScore * 100).toFixed(1)}%, frames=${frameCount}`);
              }
            } else if (data.status === 'failure') {
              console.error('🎥 [DETECT-AI-VIDEO] SightEngine failure:', data.error?.message);
              useSightEngine = false;
            }
          }
        }
      } catch (sightEngineError) {
        console.error('🎥 [DETECT-AI-VIDEO] SightEngine exception:', sightEngineError);
        useSightEngine = false;
      }
    }

    // Fallback to Gemini if SightEngine failed or not available
    if (!detectionResult && lovableApiKey) {
      console.log('🎥 [DETECT-AI-VIDEO] Falling back to Gemini analysis...');
      
      // Try to use thumbnail URL if provided, otherwise try video URL
      const urlToAnalyze = thumbnailUrl || videoUrl;
      const frameData = await extractVideoFrame(urlToAnalyze);
      
      if (frameData) {
        const geminiResult = await analyzeWithGemini(frameData, lovableApiKey);
        
        if (geminiResult) {
          const isAiGenerated = geminiResult.score > threshold;
          
          detectionResult = {
            isAiGenerated,
            confidence: geminiResult.score,
            frames: [{ position: 0, aiGeneratedScore: geminiResult.score }],
            status: 'success',
            message: geminiResult.reasoning,
            detectionMethod: 'gemini-3-flash-vision',
            details: {
              avgScore: geminiResult.score,
              maxScore: geminiResult.score,
              minScore: geminiResult.score,
              frameCount: 1,
              analysisType: 'gemini-fallback'
            }
          };

          console.log(`🎥 [DETECT-AI-VIDEO] ✅ Gemini fallback Result: AI=${isAiGenerated}, score=${(geminiResult.score * 100).toFixed(1)}%`);
        }
      }
    }

    // Return error if no detection method succeeded
    if (!detectionResult) {
      const processingTime = Date.now() - startTime;
      return new Response(
        JSON.stringify({ 
          error: 'Video analysis failed',
          processingTime,
          result: {
            isAiGenerated: false,
            confidence: 0,
            frames: [],
            status: 'error',
            message: 'Could not analyze video - no detection service available'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({ 
        result: detectionResult,
        processingTime
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
