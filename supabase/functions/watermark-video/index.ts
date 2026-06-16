import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { videoPath, watermarkSize, outputPath, mimeType } = await req.json();

    if (!videoPath || !watermarkSize || !outputPath) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: videoPath, watermarkSize, outputPath' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing video watermark: ${videoPath}, MIME: ${mimeType || 'unknown'}`);

    // Validate video MIME type - only MP4 allowed
    if (mimeType && mimeType !== 'video/mp4') {
      console.error(`Rejected video - only MP4 allowed: ${mimeType}`);
      return new Response(
        JSON.stringify({ error: 'Only MP4 video format is accepted', mimeType }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get the video file from Supabase Storage
    const { data: videoData, error: downloadError } = await supabase.storage
      .from('uploads')
      .download(videoPath);

    if (downloadError) {
      console.error('Failed to download video:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download video', details: downloadError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get the watermark logo (hosted on Imgur)
    const logoResp = await fetch('https://i.imgur.com/UsTmDOl.png');
    if (!logoResp.ok) {
      console.error('Failed to download watermark logo:', logoResp.status);
      return new Response(
        JSON.stringify({ error: 'Failed to download watermark logo', details: `HTTP ${logoResp.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    const logoData = new Blob([await logoResp.arrayBuffer()], { type: 'image/png' });

    // For now, we'll implement a placeholder response
    // In production, you would use FFmpeg to apply watermark to video
    // This requires server-side video processing capabilities
    
    console.log('Video watermarking process initiated');
    console.log(`Video size: ${videoData.size} bytes`);
    console.log(`Logo size: ${logoData.size} bytes`);
    console.log(`Watermark size: ${watermarkSize}px`);
    
    // Placeholder: Return success with information about the process
    // In real implementation, you would:
    // 1. Use FFmpeg to overlay the logo on the video
    // 2. Position the logo at center with the specified size (25-35% of video width)
    // 3. Apply appropriate opacity (0.6)
    // 4. Upload the watermarked video back to storage with correct MIME type
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Video watermarking initiated. Server-side FFmpeg processing required for full implementation.',
        videoPath,
        outputPath,
        watermarkSize,
        mimeType: mimeType || 'unknown',
        videoSizeBytes: videoData.size,
        logoSizeBytes: logoData.size,
        note: 'This is a placeholder. Implement FFmpeg processing for production use.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in watermark-video function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});