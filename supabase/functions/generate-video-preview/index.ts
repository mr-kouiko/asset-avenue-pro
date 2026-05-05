import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate Video Preview Edge Function
 * 
 * Creates a 720p, 6-second watermarked MP4 preview of a video.
 * Uses server-side FFmpeg processing via external API for reliable output.
 * 
 * Flow:
 * 1. Download source video from Supabase storage
 * 2. Process video: resize to 720p, trim to 6 seconds, add watermark
 * 3. Upload generated preview to storage
 * 4. Return preview URL
 */

interface PreviewRequest {
  videoPath: string;      // Path in Supabase storage (e.g., "user-id/video.mp4")
  contentId?: string;     // Content ID to update preview_path
  duration?: number;      // Preview duration in seconds (default: 6)
  resolution?: number;    // Target height (default: 720)
}

interface PreviewResponse {
  success: boolean;
  previewUrl?: string;
  previewPath?: string;
  error?: string;
  failureReason?: 'timeout' | 'file_too_large' | 'ffmpeg_error' | 'network_error' | 'download_error' | 'upload_error' | 'no_ffmpeg_api' | 'missing_param' | 'internal_error';
  cached?: boolean;
  processingTimeMs?: number;
  ffmpegTimeMs?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { videoPath, contentId, duration, resolution = 720 }: PreviewRequest = await req.json();

    if (!videoPath) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameter: videoPath' } as PreviewResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[generate-video-preview] Starting preview generation for: ${videoPath}`);
    console.log(`[generate-video-preview] Settings: duration=${duration}s, resolution=${resolution}p`);

    // Generate preview path
    const pathParts = videoPath.split('/');
    const fileName = pathParts.pop() || 'video';
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    const previewFileName = `${fileNameWithoutExt}_preview_${resolution}p.mp4`;
    const previewPath = `previews/${pathParts.join('/')}/${previewFileName}`;

    // Check if preview already exists (caching)
    const { data: existingPreview } = await supabase.storage
      .from('uploads')
      .download(previewPath);

    if (existingPreview && existingPreview.size > 0) {
      console.log(`[generate-video-preview] Preview already exists, returning cached version`);
      
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(previewPath);

      return new Response(
        JSON.stringify({
          success: true,
          previewUrl: publicUrl,
          previewPath,
          cached: true,
          processingTimeMs: Date.now() - startTime
        } as PreviewResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the source video
    const dlStart = Date.now();
    console.log(`[generate-video-preview] [STAGE:download] path=${videoPath}`);
    const { data: videoData, error: downloadError } = await supabase.storage
      .from('uploads')
      .download(videoPath);

    if (downloadError || !videoData) {
      const dlMs = Date.now() - dlStart;
      console.error(`[generate-video-preview] [FAILURE:download_error] dlMs=${dlMs} path=${videoPath} err=${downloadError?.message || 'no data'}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to download source video: ${downloadError?.message || 'Unknown error'}`,
          failureReason: 'download_error',
          processingTimeMs: Date.now() - startTime,
        } as PreviewResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const dlMs = Date.now() - dlStart;
    console.log(`[generate-video-preview] [STAGE:download-done] dlMs=${dlMs} bytes=${videoData.size} (${(videoData.size / 1024 / 1024).toFixed(1)}MB)`);

    // Download the watermark logo
    const { data: logoData, error: logoError } = await supabase.storage
      .from('LOGO DE WATERMARKING')
      .download('Blue Modern Sound Studio Logo (3).png');

    if (logoError) {
      console.warn(`[generate-video-preview] Could not download watermark logo:`, logoError);
      // Continue without watermark if logo fails
    }

    // For now, we need an external FFmpeg API for proper video processing.
    // Deno Deploy doesn't have FFmpeg, so we cannot process video server-side without one.
    
    // Check if we have an FFmpeg processing API configured
    const ffmpegApiUrl = Deno.env.get('FFMPEG_API_URL');
    const ffmpegApiKey = Deno.env.get('FFMPEG_API_KEY');
    
    let previewBlob: Blob;
    
    if (ffmpegApiUrl && ffmpegApiKey) {
      // Use external FFmpeg API for processing
      const sizeMB = videoData.size / 1024 / 1024;
      console.log(`[generate-video-preview] [STAGE:ffmpeg-call] Using external FFmpeg API (input=${sizeMB.toFixed(1)}MB)`);

      // Reject early if file is over a hard limit (FFmpeg API has memory/time limits)
      const MAX_INPUT_MB = 500;
      if (sizeMB > MAX_INPUT_MB) {
        const reason = `FILE_TOO_LARGE: input ${sizeMB.toFixed(1)}MB exceeds limit ${MAX_INPUT_MB}MB`;
        console.error(`[generate-video-preview] [FAILURE:file_too_large] ${reason} | path=${videoPath} | elapsedMs=${Date.now() - startTime}`);
        return new Response(
          JSON.stringify({ success: false, error: reason, failureReason: 'file_too_large', processingTimeMs: Date.now() - startTime } as PreviewResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 413 }
        );
      }

      const videoArrayBuffer = await videoData.arrayBuffer();
      const videoBytes = new Uint8Array(videoArrayBuffer);

      const formData = new FormData();
      formData.append('video', new Blob([videoBytes], { type: 'video/mp4' }), 'input.mp4');
      if (duration) formData.append('duration', duration.toString());
      formData.append('resolution', resolution.toString());
      if (logoData) {
        formData.append('watermark', logoData, 'watermark.png');
      }

      const ffmpegStart = Date.now();
      // Apply a generous timeout (5 min) to detect hangs vs slow processing
      const TIMEOUT_MS = 5 * 60 * 1000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let ffmpegResponse: Response;
      try {
        ffmpegResponse = await fetch(ffmpegApiUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${ffmpegApiKey}` },
          body: formData,
          signal: controller.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        const isAbort = fetchErr instanceof Error && fetchErr.name === 'AbortError';
        const reason = isAbort ? 'timeout' : 'network_error';
        const ffmpegMs = Date.now() - ffmpegStart;
        console.error(`[generate-video-preview] [FAILURE:${reason}] FFmpeg fetch failed after ${ffmpegMs}ms | path=${videoPath} | size=${sizeMB.toFixed(1)}MB | err=${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`);
        return new Response(
          JSON.stringify({ success: false, error: isAbort ? `FFmpeg API timed out after ${TIMEOUT_MS}ms` : 'FFmpeg API network error', failureReason: reason, processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs } as PreviewResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 504 }
        );
      }
      clearTimeout(timeoutId);
      const ffmpegMs = Date.now() - ffmpegStart;

      if (!ffmpegResponse.ok) {
        const errBody = await ffmpegResponse.text().catch(() => '');
        console.error(`[generate-video-preview] [FAILURE:ffmpeg_error] status=${ffmpegResponse.status} ffmpegMs=${ffmpegMs} path=${videoPath} size=${sizeMB.toFixed(1)}MB body=${errBody.substring(0, 300)}`);
        return new Response(
          JSON.stringify({ success: false, error: `FFmpeg API error ${ffmpegResponse.status}: ${errBody.substring(0, 200)}`, failureReason: 'ffmpeg_error', processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs } as PreviewResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
        );
      }

      previewBlob = await ffmpegResponse.blob();
      console.log(`[generate-video-preview] [STAGE:ffmpeg-done] ffmpegMs=${ffmpegMs} outputBytes=${previewBlob.size} (${(previewBlob.size / 1024 / 1024).toFixed(1)}MB)`);

      if (previewBlob.size < 1000) {
        console.error(`[generate-video-preview] [FAILURE:ffmpeg_error] Output too small (${previewBlob.size} bytes) | path=${videoPath}`);
        return new Response(
          JSON.stringify({ success: false, error: `FFmpeg returned invalid output (${previewBlob.size} bytes)`, failureReason: 'ffmpeg_error', processingTimeMs: Date.now() - startTime, ffmpegTimeMs: ffmpegMs } as PreviewResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
        );
      }
    } else {
      // No FFmpeg API configured — cannot generate a valid preview server-side.
      console.error(`[generate-video-preview] [FAILURE:no_ffmpeg_api] FFMPEG_API_URL/KEY not configured | path=${videoPath} | elapsedMs=${Date.now() - startTime}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server-side preview generation requires FFMPEG_API_URL and FFMPEG_API_KEY secrets.',
          failureReason: 'no_ffmpeg_api',
          processingTimeMs: Date.now() - startTime,
        } as PreviewResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 501 }
      );
    }

    // Upload the preview
    const upStart = Date.now();
    console.log(`[generate-video-preview] [STAGE:upload] path=${previewPath} bytes=${previewBlob.size}`);

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(previewPath, previewBlob, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      const upMs = Date.now() - upStart;
      console.error(`[generate-video-preview] [FAILURE:upload_error] upMs=${upMs} path=${previewPath} err=${uploadError.message}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to upload preview: ${uploadError.message}`,
          failureReason: 'upload_error',
          processingTimeMs: Date.now() - startTime,
        } as PreviewResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    const upMs = Date.now() - upStart;
    console.log(`[generate-video-preview] [STAGE:upload-done] upMs=${upMs}`);

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(previewPath);

    // Update content_files record if we can find it by file_path
    // This handles cases where contentId is not provided but we can match by path
    try {
      // Build the original file URL to match
      const { data: { publicUrl: originalFileUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(videoPath);
      
      // Try to update by matching the file_path
      const { data: updatedFiles, error: updateError } = await supabase
        .from('content_files')
        .update({ preview_path: publicUrl })
        .or(`file_path.eq.${originalFileUrl},file_path.ilike.%${videoPath}`)
        .select('id');

      if (updateError) {
        console.warn(`[generate-video-preview] Failed to update content_files:`, updateError);
      } else if (updatedFiles && updatedFiles.length > 0) {
        console.log(`[generate-video-preview] Updated ${updatedFiles.length} content_files record(s) with preview path`);
      } else {
        console.log(`[generate-video-preview] No matching content_files found for path: ${videoPath}`);
      }
    } catch (dbError) {
      console.warn(`[generate-video-preview] DB update error:`, dbError);
    }

    // Also update content record if contentId provided (original behavior)
    if (contentId) {
      const { error: updateError } = await supabase
        .from('content')
        .update({ preview_path: publicUrl })
        .eq('id', contentId);

      if (updateError) {
        console.warn(`[generate-video-preview] Failed to update content record:`, updateError);
        // Don't fail the request, preview was still generated
      } else {
        console.log(`[generate-video-preview] Updated content record with preview path`);
      }
    }

    const processingTimeMs = Date.now() - startTime;
    console.log(`[generate-video-preview] [SUCCESS] path=${videoPath} previewPath=${previewPath} totalMs=${processingTimeMs} sizeOut=${previewBlob.size}`);

    return new Response(
      JSON.stringify({
        success: true,
        previewUrl: publicUrl,
        previewPath,
        cached: false,
        processingTimeMs
      } as PreviewResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error(`[generate-video-preview] [FAILURE:internal_error] elapsedMs=${elapsedMs} err=${msg}`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: msg,
        failureReason: 'internal_error',
        processingTimeMs: elapsedMs,
      } as PreviewResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
