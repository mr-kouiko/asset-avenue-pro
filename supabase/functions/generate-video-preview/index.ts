import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { videoPath, watermarkUrl = 'https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/sign/logo%20VisuStock%20%20transparent%20GRAND/Blue%20Modern%20Sound%20Studio%20Logo%20(3).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jZTIyNjk0My1iMWRhLTRlZTAtYjk3Yi00MjY2NzQ4M2VhMjAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvIFZpc3VTdG9jayAgdHJhbnNwYXJlbnQgR1JBTkQvQmx1ZSBNb2Rlcm4gU291bmQgU3R1ZGlvIExvZ28gKDMpLnBuZyIsImlhdCI6MTc1NTg2NjQ5NCwiZXhwIjoyNjE5NzgwMDk0fQ.ieysFR3HXq6ug4it-_v1JUVCv8eeyPDdziA37_CPwuw' } = await req.json()

    console.log('Processing video preview generation for:', videoPath)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Download the original video from Supabase storage
    const { data: videoBlob, error: videoError } = await supabase.storage
      .from('videos')
      .download(videoPath)

    if (videoError) {
      console.error('Error downloading video:', videoError)
      return new Response(
        JSON.stringify({ error: 'Failed to download video', details: videoError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Download the watermark image
    const watermarkResponse = await fetch(watermarkUrl)
    if (!watermarkResponse.ok) {
      console.error('Error downloading watermark:', watermarkResponse.statusText)
      return new Response(
        JSON.stringify({ error: 'Failed to download watermark' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    const watermarkBlob = await watermarkResponse.blob()

    // Create temporary files
    const videoFileName = `/tmp/input_${Date.now()}.mp4`
    const watermarkFileName = `/tmp/watermark_${Date.now()}.png`
    const outputFileName = `/tmp/output_${Date.now()}.mp4`

    // Write files to temporary directory
    await Deno.writeFile(videoFileName, new Uint8Array(await videoBlob.arrayBuffer()))
    await Deno.writeFile(watermarkFileName, new Uint8Array(await watermarkBlob.arrayBuffer()))

    console.log('Files written, starting FFmpeg processing...')

    // Use FFmpeg to add watermark to video
    const ffmpegCommand = [
      'ffmpeg',
      '-i', videoFileName,
      '-i', watermarkFileName,
      '-filter_complex', 
      `[1:v]scale=320:320[watermark];[0:v][watermark]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2:format=auto,format=yuv420p`,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-y', // Overwrite output file
      outputFileName
    ]

    console.log('Executing FFmpeg command:', ffmpegCommand.join(' '))

    const process = new Deno.Command('ffmpeg', {
      args: ffmpegCommand.slice(1),
      stdout: 'piped',
      stderr: 'piped'
    })

    const { code, stdout, stderr } = await process.output()

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr)
      console.error('FFmpeg error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Video processing failed', details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('FFmpeg processing completed successfully')

    // Read the processed video
    const processedVideo = await Deno.readFile(outputFileName)

    // Generate preview filename
    const originalPath = videoPath.replace(/\.[^/.]+$/, "")
    const previewPath = `${originalPath}_preview.mp4`

    // Upload the watermarked video as preview
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(previewPath, processedVideo, {
        contentType: 'video/mp4',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading preview:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload preview', details: uploadError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Clean up temporary files
    try {
      await Deno.remove(videoFileName)
      await Deno.remove(watermarkFileName)
      await Deno.remove(outputFileName)
    } catch (error) {
      console.warn('Error cleaning up temporary files:', error)
    }

    console.log('Preview generated successfully:', previewPath)

    return new Response(
      JSON.stringify({ 
        success: true, 
        previewPath,
        message: 'Video preview with watermark generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})