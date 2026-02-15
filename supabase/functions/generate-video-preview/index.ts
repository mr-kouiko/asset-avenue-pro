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
  cached?: boolean;
  processingTimeMs?: number;
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
    console.log(`[generate-video-preview] Downloading source video...`);
    const { data: videoData, error: downloadError } = await supabase.storage
      .from('uploads')
      .download(videoPath);

    if (downloadError || !videoData) {
      console.error(`[generate-video-preview] Failed to download video:`, downloadError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to download source video: ${downloadError?.message || 'Unknown error'}` 
        } as PreviewResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`[generate-video-preview] Video downloaded: ${videoData.size} bytes`);

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
      console.log(`[generate-video-preview] Using external FFmpeg API...`);
      
      const videoArrayBuffer = await videoData.arrayBuffer();
      const videoBytes = new Uint8Array(videoArrayBuffer);
      
      const formData = new FormData();
      formData.append('video', new Blob([videoBytes], { type: 'video/mp4' }), 'input.mp4');
      if (duration) formData.append('duration', duration.toString());
      formData.append('resolution', resolution.toString());
      if (logoData) {
        formData.append('watermark', logoData, 'watermark.png');
      }
      
      const ffmpegResponse = await fetch(ffmpegApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ffmpegApiKey}`,
        },
        body: formData,
      });
      
      if (!ffmpegResponse.ok) {
        throw new Error(`FFmpeg API error: ${ffmpegResponse.status}`);
      }
      
      previewBlob = await ffmpegResponse.blob();
    } else {
      // No FFmpeg API configured — cannot generate a valid preview server-side.
      // Return an error so the client falls back to browser-based preview generation.
      console.warn(`[generate-video-preview] No FFMPEG_API_URL configured. Cannot generate server-side preview.`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server-side preview generation requires an FFmpeg processing API. Configure FFMPEG_API_URL and FFMPEG_API_KEY secrets, or use client-side preview generation instead.' 
        } as PreviewResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 501 }
      );
    }

    // Upload the preview
    console.log(`[generate-video-preview] Uploading preview to: ${previewPath}`);
    
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(previewPath, previewBlob, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      console.error(`[generate-video-preview] Failed to upload preview:`, uploadError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to upload preview: ${uploadError.message}` 
        } as PreviewResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

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
    console.log(`[generate-video-preview] Preview generated successfully in ${processingTimeMs}ms`);

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
    console.error('[generate-video-preview] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      } as PreviewResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
