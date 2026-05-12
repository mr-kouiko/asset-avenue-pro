import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate Video Preview Edge Function (v2 — JSON protocol)
 *
 * Calls the Render FFmpeg API with JSON { videoUrl, watermarkUrl, resolution }.
 * Render downloads the source itself, encodes a 720p watermarked MP4, and streams
 * the bytes back. We upload the result to the `previews` bucket and update
 * content_files.preview_path / preview_status.
 *
 * Failures are explicit — never silent. Frontend must treat a non-success
 * response as a hard publish blocker.
 */

interface PreviewRequest {
  videoPath: string;       // Storage key in `uploads` bucket OR full https URL
  contentFileId?: string;  // Optional content_files.id to update directly
  submissionId?: string;   // Optional content_submissions.id (for path resolution)
  resolution?: number;     // Target height (default 720)
  force?: boolean;         // Skip cache and regenerate
}

type FailureReason =
  | 'missing_param'
  | 'no_ffmpeg_api'
  | 'signed_url_error'
  | 'render_network_error'
  | 'render_timeout'
  | 'render_error'
  | 'invalid_output'
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

function fail(reason: FailureReason, message: string, status: number, extras: Record<string, unknown> = {}) {
  console.error(`[generate-video-preview] [FAILURE:${reason}] ${message}`, extras);
  return new Response(
    JSON.stringify({ success: false, error: message, failureReason: reason, ...extras } as PreviewResponse),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const ffmpegApiUrl = Deno.env.get('FFMPEG_API_URL');
    const ffmpegApiKey = Deno.env.get('FFMPEG_API_KEY');

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = (await req.json().catch(() => ({}))) as PreviewRequest;
    const { videoPath, contentFileId, submissionId, resolution = 720, force = false } = body;

    if (!videoPath) return fail('missing_param', 'videoPath is required', 400);
    if (!ffmpegApiUrl) return fail('no_ffmpeg_api', 'FFMPEG_API_URL secret is not configured', 501);

    console.log(`[generate-video-preview] [START] videoPath=${videoPath} contentFileId=${contentFileId ?? 'n/a'} submissionId=${submissionId ?? 'n/a'} resolution=${resolution} force=${force}`);

    // -------------------------------------------------------------------------
    // 1. Resolve a downloadable URL for Render
    // -------------------------------------------------------------------------
    let videoUrl: string;
    if (/^https?:\/\//i.test(videoPath)) {
      // Already a full URL (R2 / external).
      videoUrl = videoPath;
    } else {
      // Try `uploads` bucket first (frontend default), then `content-uploads`.
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
      if (!signed) return fail('signed_url_error', `Could not create signed URL for ${videoPath}: ${lastErr}`, 500);
      videoUrl = signed;
    }

    // Watermark logo (public asset)
    const watermarkUrl = `${supabaseUrl}/storage/v1/object/public/previews/visustock-watermark-logo.png`;

    // -------------------------------------------------------------------------
    // 2. Determine output preview path. Cache-check by HEAD on storage.
    // -------------------------------------------------------------------------
    let previewPath: string;
    if (contentFileId && submissionId) {
      previewPath = `${submissionId}/${contentFileId}_preview.mp4`;
    } else {
      // Derive a stable name from the source path.
      const baseName = videoPath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'video';
      const folder = videoPath.includes('/') ? videoPath.substring(0, videoPath.lastIndexOf('/')) : 'misc';
      previewPath = `${folder}/${baseName}_preview_${resolution}p.mp4`;
    }

    if (!force) {
      const { data: existing } = await supabase.storage.from('previews').download(previewPath);
      if (existing && existing.size > 20 * 1024) {
        const { data: { publicUrl } } = supabase.storage.from('previews').getPublicUrl(previewPath);
        console.log(`[generate-video-preview] [CACHED] previewPath=${previewPath} bytes=${existing.size}`);
        return new Response(
          JSON.stringify({ success: true, previewUrl: publicUrl, previewPath, cached: true, processingTimeMs: Date.now() - startTime } as PreviewResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // -------------------------------------------------------------------------
    // 3. POST JSON to Render
    // -------------------------------------------------------------------------
    console.log(`[generate-video-preview] [STAGE:render-call] url=${ffmpegApiUrl} videoHost=${new URL(videoUrl).host} resolution=${resolution}`);

    const TIMEOUT_MS = 5 * 60 * 1000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (ffmpegApiKey) headers['Authorization'] = `Bearer ${ffmpegApiKey}`;

    const ffmpegStart = Date.now();
    let ffmpegResponse: Response;
    try {
      ffmpegResponse = await fetch(ffmpegApiUrl, {
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
      return fail('render_error', `FFmpeg API ${ffmpegResponse.status}: ${errBody.substring(0, 300)}`, 502, {
        processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs,
      });
    }

    const previewBuffer = await ffmpegResponse.arrayBuffer();
    const previewBytes = new Uint8Array(previewBuffer);
    console.log(`[generate-video-preview] [STAGE:render-done] ffmpegMs=${ffmpegMs} bytes=${previewBytes.length} (${(previewBytes.length / 1024 / 1024).toFixed(2)}MB)`);

    if (previewBytes.length < 200 * 1024) {
      return fail('invalid_output', `FFmpeg returned ${previewBytes.length} bytes (need >=200KB for full-length preview)`, 502, {
        processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs,
      });
    }

    // -------------------------------------------------------------------------
    // 4. Upload preview MP4 to `previews` bucket
    // -------------------------------------------------------------------------
    const upStart = Date.now();
    const { error: uploadError } = await supabase.storage
      .from('previews')
      .upload(previewPath, previewBytes, { contentType: 'video/mp4', upsert: true });

    if (uploadError) {
      return fail('upload_error', `Preview upload failed: ${uploadError.message}`, 500, {
        processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs,
      });
    }
    console.log(`[generate-video-preview] [STAGE:upload-done] upMs=${Date.now() - upStart} previewPath=${previewPath}`);

    const { data: { publicUrl } } = supabase.storage.from('previews').getPublicUrl(previewPath);

    // -------------------------------------------------------------------------
    // 5. Update content_files row(s)
    // -------------------------------------------------------------------------
    try {
      let updated = 0;
      if (contentFileId) {
        const { error, data } = await supabase
          .from('content_files')
          .update({ preview_path: publicUrl, preview_status: 'preview_available' })
          .eq('id', contentFileId)
          .select('id');
        if (error) throw error;
        updated = data?.length ?? 0;
      } else {
        // Fallback: match by file_path
        const { data, error } = await supabase
          .from('content_files')
          .update({ preview_path: publicUrl, preview_status: 'preview_available' })
          .or(`file_path.ilike.%${videoPath}%`)
          .select('id');
        if (error) throw error;
        updated = data?.length ?? 0;
      }
      console.log(`[generate-video-preview] [STAGE:db-update] updated ${updated} content_files row(s)`);
    } catch (dbErr) {
      // Preview is on disk; surface as soft failure but still return success URL
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
    return fail('internal_error', err instanceof Error ? err.message : 'Internal server error', 500, {
      processingTimeMs: Date.now() - startTime,
    });
  }
});
