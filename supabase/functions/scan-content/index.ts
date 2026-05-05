import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Trusted domains for media URLs ──
const TRUSTED_DOMAINS = [
  'kdgfpophpoqugtuvfxqx.supabase.co',
  'supabase.co',
  'supabase.in',
];

const isUrlTrusted = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return TRUSTED_DOMAINS.some(d => parsed.hostname.endsWith(d));
  } catch {
    return false;
  }
};

// ── Rate limiting (in-memory, per-user) ──
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max scans per minute
const RATE_WINDOW = 60_000;

const checkRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const entry = rateLimits.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
};

// ── Fetch with timeout ──
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 30000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

// ── Image to base64 (max 15MB to prevent memory abuse) ──
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

const imageUrlToBase64 = async (imageUrl: string): Promise<{ base64: string; mimeType: string } | null> => {
  try {
    const response = await fetchWithTimeout(imageUrl, {}, 20000);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    
    if (contentLength > MAX_IMAGE_SIZE) {
      console.error('[SCAN] Image too large (content-length):', contentLength);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
      console.error('[SCAN] Image too large (actual):', arrayBuffer.byteLength);
      return null;
    }
    
    // Chunked base64 encoding to avoid stack overflow on large images
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
    }
    const base64 = btoa(binary);
    return { base64, mimeType: contentType };
  } catch (error) {
    console.error('[SCAN] Failed to fetch image:', error);
    return null;
  }
};

// ── Detection prompt ──
const DETECTION_PROMPT = `You are an expert AI image forensics analyst. Analyze this image for AI-generation indicators.

Evaluate: texture smoothness, anatomical accuracy, lighting consistency, detail coherence, generation artifacts, deepfake markers.

Return ONLY valid JSON:
{
  "isAiGenerated": boolean,
  "confidence": 0.0 to 1.0,
  "deepfakeScore": 0.0 to 1.0,
  "qualityScore": 0.0 to 1.0,
  "reasoning": "2-3 sentence explanation",
  "indicators": ["indicator1", "indicator2"]
}

Be strict but fair. High confidence AI requires clear artifacts or anatomical errors.`;

// ── Main handler ──
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // ── AUTH: Require valid JWT ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = authHeader.replace('Bearer ', '');
    const isServiceRole = token === serviceRoleKey;

    // Use service-role client for internal calls (bypass RLS), anon+JWT otherwise
    const supabase = isServiceRole
      ? createClient(supabaseUrl, serviceRoleKey)
      : createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });

    let userId: string;
    if (isServiceRole) {
      userId = 'service_role';
    } else {
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData?.user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      userId = userData.user.id;
    }

    // ── Rate limit (skip for service role) ──
    if (!isServiceRole && !checkRateLimit(userId)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── Parse body ──
    const { submissionId, imageUrl, aiDeclaration } = await req.json();

    if (!submissionId) {
      return new Response(JSON.stringify({ error: 'submissionId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── Validate URL ──
    if (imageUrl && !isUrlTrusted(imageUrl)) {
      return new Response(JSON.stringify({ error: 'Untrusted media URL' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[SCAN] Starting scan for submission=${submissionId}, user=${userId}`);

    // ── Verify ownership ──
    const { data: submission, error: subError } = await supabase
      .from('content_submissions')
      .select('id, creator_id, status, ai_declaration')
      .eq('id', submissionId)
      .single();

    if (subError || !submission) {
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Only creator or admin can trigger scan
    const isAdmin = isServiceRole;
    if (submission.creator_id !== userId && !isAdmin) {
      // Check admin role in DB
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (roleData?.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Not authorized to scan this submission' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── Set status to pending_scan ──
    await supabase
      .from('content_submissions')
      .update({ 
        status: 'pending_scan',
        ai_declaration: aiDeclaration || submission.ai_declaration
      })
      .eq('id', submissionId);

    // ── Get the file URL if not provided ──
    let mediaUrl = imageUrl;
    if (!mediaUrl) {
      const { data: files } = await supabase
        .from('content_files')
        .select('file_path, file_type, preview_path, thumbnail_path')
        .eq('submission_id', submissionId)
        .eq('is_original', true)
        .limit(1);

      if (files && files.length > 0) {
        const file = files[0];
        // For images, use the file_path or preview
        if (file.file_type === 'image') {
          mediaUrl = file.file_path || file.preview_path || file.thumbnail_path;
        } else if (file.file_type === 'video') {
          // For videos, use thumbnail for analysis
          mediaUrl = file.thumbnail_path || file.preview_path;
        } else {
          // For other types (audio, document), skip detection
          console.log('[SCAN] Non-visual content, skipping AI detection');
          
          const effectiveDeclaration = aiDeclaration || submission.ai_declaration || 'no_ai_used';
          let skipStatus = 'approved';
          if (effectiveDeclaration === 'fully_ai_generated') skipStatus = 'approved_ai';
          else if (effectiveDeclaration === 'ai_assisted') skipStatus = 'approved_ai_assisted';

          // Store skipped result
          await supabase.from('detection_results').insert({
            content_submission_id: submissionId,
            model_used: 'skipped',
            detection_score: 0,
            final_confidence: 0,
            detection_status: 'skipped',
            reasoning: 'Non-visual content type - detection skipped, using declaration'
          });

          await supabase
            .from('content_submissions')
            .update({ status: skipStatus })
            .eq('id', submissionId);

          return new Response(JSON.stringify({
            status: skipStatus,
            detection_score: 0,
            message: 'Non-visual content - using seller declaration'
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
    }

    if (!mediaUrl) {
      // No media to scan — mark as scan_failed
      await supabase.from('detection_results').insert({
        content_submission_id: submissionId,
        model_used: 'none',
        detection_score: 0,
        final_confidence: 0,
        detection_status: 'failed',
        reasoning: 'No media URL available for scanning'
      });

      await supabase
        .from('content_submissions')
        .update({ status: 'scan_failed' })
        .eq('id', submissionId);

      return new Response(JSON.stringify({
        status: 'scan_failed',
        error: 'No media available to scan'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Run AI detection via Gemini ──
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      await supabase.from('detection_results').insert({
        content_submission_id: submissionId,
        model_used: 'none',
        detection_score: 0,
        final_confidence: 0,
        detection_status: 'failed',
        reasoning: 'AI detection service not configured (missing API key)'
      });

      await supabase
        .from('content_submissions')
        .update({ status: 'scan_failed' })
        .eq('id', submissionId);

      return new Response(JSON.stringify({
        status: 'scan_failed',
        error: 'Detection service not configured'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch image
    const imageData = await imageUrlToBase64(mediaUrl);
    if (!imageData) {
      await supabase.from('detection_results').insert({
        content_submission_id: submissionId,
        model_used: 'gemini-3-flash-vision',
        detection_score: 0,
        final_confidence: 0,
        detection_status: 'failed',
        reasoning: 'Failed to download media for analysis'
      });

      await supabase
        .from('content_submissions')
        .update({ status: 'scan_failed' })
        .eq('id', submissionId);

      return new Response(JSON.stringify({
        status: 'scan_failed',
        error: 'Could not download media for analysis'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('[SCAN] Calling Gemini for analysis...');

    const geminiResponse = await fetchWithTimeout(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: DETECTION_PROMPT },
              { type: 'image_url', image_url: { url: `data:${imageData.mimeType};base64,${imageData.base64}` } }
            ]
          }],
          max_tokens: 600,
          temperature: 0.1
        }),
      },
      50000
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('[SCAN] Gemini error:', geminiResponse.status, errText);

      await supabase.from('detection_results').insert({
        content_submission_id: submissionId,
        model_used: 'gemini-3-flash-vision',
        detection_score: 0,
        final_confidence: 0,
        detection_status: 'failed',
        reasoning: `Gemini API error: ${geminiResponse.status}`,
        raw_response: { status: geminiResponse.status, error: errText.substring(0, 500) }
      });

      await supabase
        .from('content_submissions')
        .update({ status: 'scan_failed' })
        .eq('id', submissionId);

      return new Response(JSON.stringify({
        status: 'scan_failed',
        error: `Detection API error (${geminiResponse.status})`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.choices?.[0]?.message?.content || '';

    // ── Parse response ──
    let analysisResult: {
      isAiGenerated: boolean;
      confidence: number;
      deepfakeScore?: number;
      qualityScore?: number;
      reasoning: string;
      indicators: string[];
    };

    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      } else {
        const braceMatch = content.match(/\{[\s\S]*\}/);
        if (braceMatch) jsonStr = braceMatch[0];
      }
      analysisResult = JSON.parse(jsonStr);
      if (typeof analysisResult.isAiGenerated !== 'boolean') {
        throw new Error('Missing isAiGenerated');
      }
      if (typeof analysisResult.confidence !== 'number') {
        analysisResult.confidence = analysisResult.isAiGenerated ? 0.7 : 0.3;
      }
    } catch {
      console.error('[SCAN] Failed to parse Gemini response');
      
      await supabase.from('detection_results').insert({
        content_submission_id: submissionId,
        model_used: 'gemini-3-flash-vision',
        detection_score: 0,
        final_confidence: 0,
        detection_status: 'failed',
        reasoning: 'Failed to parse detection model response',
        raw_response: { content: content.substring(0, 1000) }
      });

      await supabase
        .from('content_submissions')
        .update({ status: 'scan_failed' })
        .eq('id', submissionId);

      return new Response(JSON.stringify({
        status: 'scan_failed',
        error: 'Detection model returned unparseable response'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Calculate weighted score (server-side, fixed threshold) ──
    analysisResult.confidence = Math.max(0, Math.min(1, analysisResult.confidence));
    
    const baseWeight = 0.75;
    const deepfakeWeight = 0.15;
    const qualityWeight = 0.10;
    
    let finalConfidence = analysisResult.confidence * baseWeight;
    finalConfidence += (analysisResult.deepfakeScore ?? analysisResult.confidence) * deepfakeWeight;
    const qualityFactor = analysisResult.qualityScore ?? 0.8;
    finalConfidence = finalConfidence * (0.5 + qualityFactor * 0.5);
    finalConfidence = Math.max(0, Math.min(1, finalConfidence));

    // If model says not AI but score is high, use score
    const detectionScore = analysisResult.isAiGenerated 
      ? Math.max(finalConfidence, 0.55) 
      : finalConfidence;

    console.log(`[SCAN] Result: score=${detectionScore.toFixed(3)}, modelSaysAI=${analysisResult.isAiGenerated}`);

    // ── Store immutable detection result ──
    await supabase.from('detection_results').insert({
      content_submission_id: submissionId,
      model_used: 'gemini-3-flash-vision',
      detection_score: detectionScore,
      ai_score: analysisResult.confidence,
      deepfake_score: analysisResult.deepfakeScore ?? null,
      quality_score: analysisResult.qualityScore ?? null,
      final_confidence: finalConfidence,
      detection_status: 'completed',
      reasoning: analysisResult.reasoning,
      indicators: analysisResult.indicators || [],
      raw_response: { 
        isAiGenerated: analysisResult.isAiGenerated,
        confidence: analysisResult.confidence,
        deepfakeScore: analysisResult.deepfakeScore,
        qualityScore: analysisResult.qualityScore
      }
    });

    // ── Process result via DB function ──
    const effectiveDeclaration = aiDeclaration || submission.ai_declaration || 'no_ai_used';
    
    const { data: newStatus, error: processError } = await supabase.rpc('process_scan_result', {
      p_submission_id: submissionId,
      p_detection_score: detectionScore,
      p_ai_declaration: effectiveDeclaration
    });

    if (processError) {
      console.error('[SCAN] process_scan_result error:', processError);
      // Fallback: set scan_failed
      await supabase
        .from('content_submissions')
        .update({ status: 'scan_failed' })
        .eq('id', submissionId);
    }

    const processingTime = Date.now() - startTime;
    console.log(`[SCAN] Complete: status=${newStatus}, score=${detectionScore.toFixed(3)}, time=${processingTime}ms`);

    return new Response(JSON.stringify({
      status: newStatus || 'scan_failed',
      detection_score: detectionScore,
      ai_score: analysisResult.confidence,
      deepfake_score: analysisResult.deepfakeScore,
      quality_score: analysisResult.qualityScore,
      reasoning: analysisResult.reasoning,
      indicators: analysisResult.indicators,
      is_mismatch: effectiveDeclaration === 'no_ai_used' && detectionScore >= 0.70,
      processingTime
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[SCAN] Exception:', error);

    return new Response(JSON.stringify({
      status: 'scan_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
