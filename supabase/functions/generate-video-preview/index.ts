import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate Video Preview Edge Function (v3 — header-validated)
 *
 * Calls the Render FFmpeg API which encodes a 720p watermarked MP4 and streams
 * the bytes back along with X-Preview-* metadata headers. We re-validate the
 * headers + MP4 magic bytes before uploading. Every attempt (success or
 * failure) persists outcome columns on `content_files` so the admin panel and
 * retry system can see real state.
 */

interface PreviewRequest {
  videoPath: string;
  contentFileId?: string;
  submissionId?: string;
  resolution?: number;
  force?: boolean;
}

type FailureReason =
  | 'missing_param'
  | 'no_ffmpeg_api'
  | 'signed_url_error'
  | 'render_network_error'
  | 'render_timeout'
  | 'render_error'
  | 'invalid_output'
  | 'single_frame_output'
  | 'wrong_codec'
  | 'scaling_failed'
  | 'wrapped_avframe_output'
  | 'duration_too_short'
  | 'not_mp4'
  | 'upload_error'
  | 'db_update_error'
  | 'internal_error';

interface PreviewResponse {
  success: boolean;
  previewUrl?: string;
  previewPath?: string;
  cached?: boolean;
  processingTimeMs?: number;
  ffmpegTimeMs?: number;
  error?: string;
  failureReason?: FailureReason;
}

let supabaseRef: ReturnType<typeof createClient> | null = null;

async function recordOutcome(
  contentFileId: string | undefined,
  outcome: { ok: boolean; reason?: FailureReason | null; message?: string | null }
) {
  if (!contentFileId || !supabaseRef) return;
  try {
    await supabaseRef.from('content_files').update({
      preview_status: outcome.ok ? 'ready' : 'preview_failed',
      preview_failure_reason: outcome.ok ? null : (outcome.reason ?? 'unknown'),
      preview_last_error: outcome.ok ? null : (outcome.message?.slice(0, 500) ?? null),
      preview_last_attempt_at: new Date().toISOString(),
    }).eq('id', contentFileId);
    await supabaseRef.rpc('increment_preview_attempts', { _id: contentFileId });
  } catch (e) {
    console.error('[generate-video-preview] recordOutcome failed:', e);
  }
}

function failResp(reason: FailureReason, message: string, status: number, extras: Record<string, unknown> = {}) {
  console.error(`[generate-video-preview] [FAILURE:${reason}] ${message}`, extras);
  return new Response(
    JSON.stringify({ success: false, error: message, failureReason: reason, ...extras } as PreviewResponse),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
  );
}

async function fail(
  contentFileId: string | undefined,
  reason: FailureReason,
  message: string,
  status: number,
  extras: Record<string, unknown> = {}
) {
  await recordOutcome(contentFileId, { ok: false, reason, message });
  return failResp(reason, message, status, extras);
}

// Check MP4 magic bytes: bytes 4..8 must be "ftyp"
function isMp4(buf: Uint8Array): boolean {
  if (buf.length < 12) return false;
  return buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  let contentFileId: string | undefined;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const ffmpegApiUrl = Deno.env.get('FFMPEG_API_URL');
    const ffmpegApiKey = Deno.env.get('FFMPEG_API_KEY');

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    supabaseRef = supabase;

    const body = (await req.json().catch(() => ({}))) as PreviewRequest;
    const { videoPath, submissionId, resolution = 720, force = false } = body;
    contentFileId = body.contentFileId;

    if (!videoPath) return failResp('missing_param', 'videoPath is required', 400);
    if (!ffmpegApiUrl) return fail(contentFileId, 'no_ffmpeg_api', 'FFMPEG_API_URL secret is not configured', 501);

    console.log(`[generate-video-preview] [START] videoPath=${videoPath} contentFileId=${contentFileId ?? 'n/a'} submissionId=${submissionId ?? 'n/a'} resolution=${resolution} force=${force}`);

    // -------------------------------------------------------------------------
    // 1. Resolve a downloadable URL for Render
    // -------------------------------------------------------------------------
    let videoUrl: string;
    if (/^https?:\/\//i.test(videoPath)) {
      videoUrl = videoPath;
    } else {
      const candidateBuckets = ['uploads', 'content-uploads'];
      let signed: string | null = null;
      let lastErr = '';
      for (const bucket of candidateBuckets) {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(videoPath, 3600);
        if (data?.signedUrl) {
          signed = data.signedUrl;
          console.log(`[generate-video-preview] [STAGE:signed-url] bucket=${bucket}`);
          break;
        }
        lastErr = error?.message || 'unknown';
      }
      if (!signed) return fail(contentFileId, 'signed_url_error', `Could not create signed URL for ${videoPath}: ${lastErr}`, 500);
      videoUrl = signed;
    }

    const watermarkUrl = `${supabaseUrl}/storage/v1/object/public/previews/visustock-watermark-logo.png`;

    // -------------------------------------------------------------------------
    // 2. Determine output preview path. Cache-check by HEAD on storage.
    // -------------------------------------------------------------------------
    let previewPath: string;
    if (contentFileId && submissionId) {
      previewPath = `${submissionId}/${contentFileId}_preview.mp4`;
    } else {
      const baseName = videoPath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'video';
      const folder = videoPath.includes('/') ? videoPath.substring(0, videoPath.lastIndexOf('/')) : 'misc';
      previewPath = `${folder}/${baseName}_preview_${resolution}p.mp4`;
    }

    if (!force) {
      const { data: existing } = await supabase.storage.from('previews').download(previewPath);
      // Only treat cache as valid when sized like a real full-length preview (>=250KB)
      if (existing && existing.size > 250 * 1024) {
        const { data: { publicUrl } } = supabase.storage.from('previews').getPublicUrl(previewPath);
        console.log(`[generate-video-preview] [CACHED] previewPath=${previewPath} bytes=${existing.size}`);
        await recordOutcome(contentFileId, { ok: true });
        return new Response(
          JSON.stringify({ success: true, previewUrl: publicUrl, previewPath, cached: true, processingTimeMs: Date.now() - startTime } as PreviewResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // -------------------------------------------------------------------------
    // 3. POST JSON to Render
    // -------------------------------------------------------------------------
    const processUrl = /\/process(\?|$)/.test(ffmpegApiUrl) ? ffmpegApiUrl : ffmpegApiUrl.replace(/\/$/, '') + '/process';
    console.log(`[generate-video-preview] [STAGE:render-call] url=${processUrl} videoHost=${new URL(videoUrl).host} resolution=${resolution}`);

    const TIMEOUT_MS = 5 * 60 * 1000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (ffmpegApiKey) headers['Authorization'] = `Bearer ${ffmpegApiKey}`;

    const ffmpegStart = Date.now();
    let ffmpegResponse: Response;
    try {
      ffmpegResponse = await fetch(processUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ videoUrl, watermarkUrl, resolution }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const ffmpegMs = Date.now() - ffmpegStart;
      return fail(
        contentFileId,
        isAbort ? 'render_timeout' : 'render_network_error',
        isAbort ? `FFmpeg API timed out after ${TIMEOUT_MS}ms` : `FFmpeg API network error: ${err instanceof Error ? err.message : String(err)}`,
        504,
        { processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs }
      );
    }
    clearTimeout(timeoutId);
    const ffmpegMs = Date.now() - ffmpegStart;

    if (!ffmpegResponse.ok) {
      const errBody = await ffmpegResponse.text().catch(() => '');
      return fail(contentFileId, 'render_error', `FFmpeg API ${ffmpegResponse.status}: ${errBody.substring(0, 300)}`, 502, {
        processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs,
      });
    }

    // -------------------------------------------------------------------------
    // 3b. Hard validation BEFORE upload (defense in depth)
    // -------------------------------------------------------------------------
    const renderFrameCount = parseInt(ffmpegResponse.headers.get('x-preview-frame-count') || '0', 10) || 0;
    const renderDuration = parseFloat(ffmpegResponse.headers.get('x-preview-duration') || '0') || 0;
    const renderWidth = parseInt(ffmpegResponse.headers.get('x-preview-width') || '0', 10) || 0;
    const renderHeight = parseInt(ffmpegResponse.headers.get('x-preview-height') || '0', 10) || 0;
    const renderCodec = (ffmpegResponse.headers.get('x-preview-codec') || '').toLowerCase();

    const previewBuffer = await ffmpegResponse.arrayBuffer();
    const previewBytes = new Uint8Array(previewBuffer);
    console.log(`[generate-video-preview] [STAGE:render-done] ffmpegMs=${ffmpegMs} bytes=${previewBytes.length} dur=${renderDuration} frames=${renderFrameCount} ${renderWidth}x${renderHeight} codec=${renderCodec}`);

    if (previewBytes.length < 250 * 1024) {
      return fail(contentFileId, 'invalid_output', `FFmpeg returned ${previewBytes.length} bytes (need >=250KB)`, 502,
        { processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs });
    }
    if (!isMp4(previewBytes)) {
      return fail(contentFileId, 'not_mp4', `FFmpeg response is not a valid MP4 (no ftyp box)`, 502,
        { processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs });
    }
    // Only enforce header gates when Render actually sent them (older deploys may not).
    if (renderFrameCount > 0 && renderFrameCount < 30) {
      return fail(contentFileId, 'single_frame_output', `frames=${renderFrameCount}`, 502,
        { processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs });
    }
    if (renderCodec && renderCodec !== 'h264') {
      return fail(contentFileId, 'wrong_codec', `codec=${renderCodec}`, 502,
        { processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs });
    }
    if (renderHeight > 0 && (renderHeight > resolution + 16 || renderWidth > resolution * 2 + 64)) {
      return fail(contentFileId, 'scaling_failed', `${renderWidth}x${renderHeight}`, 502,
        { processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs });
    }
    if (renderDuration > 0 && renderDuration < 3) {
      return fail(contentFileId, 'duration_too_short', `${renderDuration}s`, 502,
        { processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs });
    }

    // -------------------------------------------------------------------------
    // 4. Upload preview MP4 to `previews` bucket
    // -------------------------------------------------------------------------
    const upStart = Date.now();
    const { error: uploadError } = await supabase.storage
      .from('previews')
      .upload(previewPath, previewBytes, { contentType: 'video/mp4', upsert: true });

    if (uploadError) {
      return fail(contentFileId, 'upload_error', `Preview upload failed: ${uploadError.message}`, 500, {
        processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs,
      });
    }
    console.log(`[generate-video-preview] [STAGE:upload-done] upMs=${Date.now() - upStart} previewPath=${previewPath}`);

    const { data: { publicUrl } } = supabase.storage.from('previews').getPublicUrl(previewPath);

    // -------------------------------------------------------------------------
    // 5. Update content_files row(s) + persist success outcome
    // -------------------------------------------------------------------------
    try {
      let updated = 0;
      if (contentFileId) {
        const { error, data } = await supabase
          .from('content_files')
          .update({ preview_path: publicUrl, preview_status: 'ready', preview_failure_reason: null, preview_last_error: null })
          .eq('id', contentFileId)
          .select('id');
        if (error) throw error;
        updated = data?.length ?? 0;
        // bump attempt counter for success too
        await supabase.rpc('increment_preview_attempts', { _id: contentFileId });
        await supabase.from('content_files').update({ preview_last_attempt_at: new Date().toISOString() }).eq('id', contentFileId);
      } else {
        const { data, error } = await supabase
          .from('content_files')
          .update({ preview_path: publicUrl, preview_status: 'ready' })
          .or(`file_path.ilike.%${videoPath}%`)
          .select('id');
        if (error) throw error;
        updated = data?.length ?? 0;
      }
      console.log(`[generate-video-preview] [STAGE:db-update] updated ${updated} content_files row(s)`);
    } catch (dbErr) {
      console.error(`[generate-video-preview] [WARN:db_update_error]`, dbErr);
    }

    const totalMs = Date.now() - startTime;
    console.log(`[generate-video-preview] [SUCCESS] previewPath=${previewPath} totalMs=${totalMs} ffmpegMs=${ffmpegMs}`);

    return new Response(
      JSON.stringify({
        success: true,
        previewUrl: publicUrl,
        previewPath,
        cached: false,
        processingTimeMs: totalMs,
        ffmpegTimeMs: ffmpegMs,
      } as PreviewResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return fail(contentFileId, 'internal_error', err instanceof Error ? err.message : 'Internal server error', 500, {
      processingTimeMs: Date.now() - startTime,
    });
  }
});
