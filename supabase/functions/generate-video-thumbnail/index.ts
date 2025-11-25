import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { videoPath, outputPath, timeOffset = 1 } = await req.json()
    
    if (!videoPath || !outputPath) {
      return new Response(
        JSON.stringify({ error: 'Missing videoPath or outputPath' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`[Thumbnail] Downloading video from: ${videoPath}`)

    // Download video from Supabase storage
    const { data: videoData, error: downloadError } = await supabaseClient
      .storage
      .from('uploads')
      .download(videoPath)

    if (downloadError) {
      console.error('[Thumbnail] Download error:', downloadError)
      return new Response(
        JSON.stringify({ error: `Failed to download video: ${downloadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Thumbnail] Video downloaded, size: ${videoData.size} bytes`)

    // Save video to temporary file
    const videoBytes = new Uint8Array(await videoData.arrayBuffer())
    const tempVideoPath = `/tmp/video_${Date.now()}.mov`
    const tempThumbnailPath = `/tmp/thumbnail_${Date.now()}.jpg`
    
    await Deno.writeFile(tempVideoPath, videoBytes)
    console.log(`[Thumbnail] Video saved to: ${tempVideoPath}`)

    // Use FFmpeg to extract thumbnail
    // -ss 1: seek to 1 second
    // -i: input file
    // -vframes 1: extract one frame
    // -q:v 2: high quality
    // -vf scale=1280:-1: scale to max width 1280px, maintain aspect ratio
    const ffmpegCommand = new Deno.Command("ffmpeg", {
      args: [
        "-ss", timeOffset.toString(),
        "-i", tempVideoPath,
        "-vframes", "1",
        "-q:v", "2",
        "-vf", "scale=1280:-1",
        "-y",
        tempThumbnailPath
      ],
      stdout: "piped",
      stderr: "piped",
    })

    console.log(`[Thumbnail] Running FFmpeg...`)
    const { code, stdout, stderr } = await ffmpegCommand.output()
    
    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr)
      console.error('[Thumbnail] FFmpeg error:', errorText)
      return new Response(
        JSON.stringify({ error: 'FFmpeg thumbnail extraction failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Thumbnail] Thumbnail extracted successfully`)

    // Read the generated thumbnail
    const thumbnailBytes = await Deno.readFile(tempThumbnailPath)
    console.log(`[Thumbnail] Thumbnail size: ${thumbnailBytes.length} bytes`)

    // Upload thumbnail to Supabase storage
    const { error: uploadError } = await supabaseClient
      .storage
      .from('thumbnails')
      .upload(outputPath, thumbnailBytes, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      console.error('[Thumbnail] Upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: `Failed to upload thumbnail: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean up temp files
    try {
      await Deno.remove(tempVideoPath)
      await Deno.remove(tempThumbnailPath)
    } catch (cleanupError) {
      console.warn('[Thumbnail] Cleanup warning:', cleanupError)
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('thumbnails')
      .getPublicUrl(outputPath)

    console.log(`[Thumbnail] Success! Thumbnail URL: ${publicUrl}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        thumbnailUrl: publicUrl,
        message: 'Thumbnail generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Thumbnail] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
