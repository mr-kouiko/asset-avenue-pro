import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate Video Preview Edge Function
 * 
 * Creates a 720p, watermarked MP4 preview using an external FFmpeg API.
 * The original HD file is stored in the private 'original-files' bucket
 * and is NEVER exposed to the frontend.
 * 
 * Supported external APIs:
 * - Custom FFmpeg API (FFMPEG_API_URL + FFMPEG_API_KEY)
 * - Falls back to storing original as preview if no API configured (dev only)
 */

interface PreviewRequest {
  videoPath: string;       // Path in storage (e.g., "user-id/video.mp4")
  bucket?: string;         // Source bucket (default: "original-files")
  contentId?: string;      // Content ID to update preview_path
  duration?: number;       // Preview duration in seconds (default: 10)
  resolution?: number;     // Target height (default: 720)
}

interface PreviewResponse {
  success: boolean;
  previewUrl?: string;
  previewPath?: string;
  error?: string;
  cached?: boolean;
  processingTimeMs?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: PreviewRequest = await req.json();
    const { 
      videoPath, 
      bucket = 'original-files',
      contentId, 
      duration = 10, 
      resolution = 720 
    } = body;

    if (!videoPath) {
      return jsonResponse({ success: false, error: 'Missing required parameter: videoPath' }, 400);
    }

    console.log(`[preview] Starting: ${videoPath} from bucket=${bucket}, duration=${duration}s, res=${resolution}p`);

    // Build preview output path in the PUBLIC uploads bucket
    const pathParts = videoPath.split('/');
    const fileName = pathParts.pop() || 'video';
    const fileBase = fileName.replace(/\.[^/.]+$/, '');
    const previewFileName = `${fileBase}_preview_${resolution}p.mp4`;
    const previewPath = `previews/${pathParts.join('/')}/${previewFileName}`;

    // Check cache - if preview already exists, return it
    const { data: existing } = await supabase.storage.from('uploads').download(previewPath);
    if (existing && existing.size > 1000) {
      console.log(`[preview] Cached preview found (${existing.size} bytes)`);
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(previewPath);
      await updateContentRecords(supabase, videoPath, contentId, publicUrl);
      return jsonResponse({
        success: true, previewUrl: publicUrl, previewPath, cached: true,
        processingTimeMs: Date.now() - startTime,
      });
    }

    // Download source video from PRIVATE bucket (service role has access)
    console.log(`[preview] Downloading from private bucket: ${bucket}/${videoPath}`);
    const { data: videoData, error: dlError } = await supabase.storage.from(bucket).download(videoPath);
    if (dlError || !videoData) {
      console.error(`[preview] Download failed:`, dlError);
      return jsonResponse({ success: false, error: `Download failed: ${dlError?.message}` }, 500);
    }
    console.log(`[preview] Downloaded: ${videoData.size} bytes`);

    // Download watermark logo
    const { data: logoData } = await supabase.storage
      .from('LOGO DE WATERMARKING')
      .download('Blue Modern Sound Studio Logo (3).png');

    // Process via external FFmpeg API
    const ffmpegApiUrl = Deno.env.get('FFMPEG_API_URL');
    const ffmpegApiKey = Deno.env.get('FFMPEG_API_KEY');

    let previewBlob: Blob;

    if (ffmpegApiUrl && ffmpegApiKey) {
      console.log(`[preview] Processing via FFmpeg API...`);
      previewBlob = await processWithFFmpegAPI(
        ffmpegApiUrl, ffmpegApiKey, videoData, logoData, duration, resolution
      );
      console.log(`[preview] FFmpeg output: ${previewBlob.size} bytes`);
    } else {
      // DEV FALLBACK ONLY - In production, configure FFMPEG_API_URL
      console.warn(`[preview] ⚠️ No FFMPEG_API configured - using raw fallback (NOT for production)`);
      const videoBytes = new Uint8Array(await videoData.arrayBuffer());
      const maxPreviewSize = 10 * 1024 * 1024; // 10MB cap
      const sliced = videoBytes.length > maxPreviewSize 
        ? videoBytes.slice(0, maxPreviewSize) 
        : videoBytes;
      previewBlob = new Blob([sliced], { type: 'video/mp4' });
    }

    // Upload preview to PUBLIC uploads bucket
    console.log(`[preview] Uploading preview to: uploads/${previewPath}`);
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(previewPath, previewBlob, { contentType: 'video/mp4', upsert: true });

    if (uploadError) {
      console.error(`[preview] Upload failed:`, uploadError);
      return jsonResponse({ success: false, error: `Upload failed: ${uploadError.message}` }, 500);
    }

    const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(previewPath);

    // Update database records
    await updateContentRecords(supabase, videoPath, contentId, publicUrl);

    const processingTimeMs = Date.now() - startTime;
    console.log(`[preview] Done in ${processingTimeMs}ms: ${publicUrl}`);

    return jsonResponse({
      success: true, previewUrl: publicUrl, previewPath,
      cached: false, processingTimeMs,
    });

  } catch (error) {
    console.error('[preview] Error:', error);
    return jsonResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, 500);
  }
});

// ─── Helpers ────────────────────────────────────────────────────

function jsonResponse(body: PreviewResponse, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function processWithFFmpegAPI(
  apiUrl: string, apiKey: string, 
  videoBlob: Blob, logoBlob: Blob | null,
  duration: number, resolution: number
): Promise<Blob> {
  const formData = new FormData();
  formData.append('video', videoBlob, 'input.mp4');
  formData.append('duration', duration.toString());
  formData.append('resolution', resolution.toString());
  formData.append('codec', 'h264');
  formData.append('watermark_opacity', '0.6');
  formData.append('watermark_position', 'center');
  if (logoBlob) {
    formData.append('watermark', logoBlob, 'watermark.png');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`FFmpeg API error ${response.status}: ${errText}`);
  }

  return await response.blob();
}

async function updateContentRecords(
  supabase: any, videoPath: string, contentId: string | undefined, publicUrl: string
) {
  try {
    // Update content_files by matching file path patterns
    const { data: { publicUrl: origUrl } } = supabase.storage
      .from('original-files')
      .getPublicUrl(videoPath);

    // Try matching by various path patterns
    const { data: updated, error } = await supabase
      .from('content_files')
      .update({ preview_path: publicUrl })
      .or(`file_path.eq.${origUrl},file_path.ilike.%${videoPath}`)
      .select('id');

    if (error) console.warn(`[preview] DB update warning:`, error);
    else if (updated?.length) console.log(`[preview] Updated ${updated.length} content_files records`);

    // Also update by contentId if provided
    if (contentId) {
      await supabase
        .from('content')
        .update({ preview_path: publicUrl })
        .eq('id', contentId);
    }
  } catch (e) {
    console.warn(`[preview] DB update error:`, e);
  }
}
