import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

/**
 * Generate Video Thumbnail (Edge Function)
 *
 * NO local ffmpeg/ffprobe — Edge Runtime forbids subprocesses.
 * Instead, this function calls the external Dockerized FFmpeg API at
 * `${FFMPEG_API_URL%/process}/thumbnail` to extract a single JPG frame.
 *
 * Input (any one source must resolve to a downloadable URL):
 *   - videoUrl: string         (preferred — direct HTTP(S) URL, e.g. preview URL)
 *   - videoPath: string        (Supabase storage path — bucket selectable via `bucket`)
 *   - bucket: string           (defaults to 'uploads')
 *   - outputPath: string       (target path in `thumbnails` bucket)
 *   - position?: number        (0-1, default 0.2)
 *   - width?: number           (default 480)
 *   - videoId?: string         (for log traceability)
 *   - usePreviewIfAvailable?: boolean  (currently advisory — caller should pass preview URL)
 */

interface ThumbReq {
  videoUrl?: string
  videoPath?: string
  bucket?: string
  outputPath: string
  position?: number
  width?: number
  videoId?: string
}

async function resolveSourceUrl(
  supabase: ReturnType<typeof createClient>,
  body: ThumbReq,
): Promise<{ url: string; source: string } | { error: string }> {
  if (body.videoUrl && /^https?:\/\//i.test(body.videoUrl)) {
    return { url: body.videoUrl, source: 'videoUrl' }
  }
  if (!body.videoPath) {
    return { error: 'Must provide videoUrl or videoPath' }
  }

  // Strip URL prefix if a full URL was passed in videoPath
  let storagePath = body.videoPath
  let bucket = body.bucket || 'uploads'

  if (/^https?:\/\//i.test(storagePath)) {
    try {
      const u = new URL(storagePath)
      const m = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/)
      if (m) {
        bucket = m[1]
        storagePath = decodeURIComponent(m[2].split('?')[0])
      } else {
        // External URL (e.g. R2/CDN) — use as-is
        return { url: body.videoPath, source: 'externalUrl' }
      }
    } catch {
      return { error: 'Invalid videoPath URL' }
    }
  } else if (storagePath.startsWith(`${bucket}/`)) {
    storagePath = storagePath.substring(bucket.length + 1)
  }

  // Create a signed URL the FFmpeg API can fetch
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60 * 10) // 10 min

  if (error || !data?.signedUrl) {
    return { error: `Could not sign storage URL (bucket=${bucket}, path=${storagePath}): ${error?.message || 'unknown'}` }
  }
  return { url: data.signedUrl, source: `signed:${bucket}` }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as ThumbReq
    const { outputPath, position, width, videoId } = body

    if (!outputPath) {
      return new Response(
        JSON.stringify({ error: 'Missing outputPath' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const FFMPEG_API_URL = Deno.env.get('FFMPEG_API_URL')
    const FFMPEG_API_KEY = Deno.env.get('FFMPEG_API_KEY') || ''
    if (!FFMPEG_API_URL) {
      console.error(`[Thumbnail] FFMPEG_API_URL not configured | videoId=${videoId}`)
      return new Response(
        JSON.stringify({ error: 'FFMPEG_API_URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build /thumbnail endpoint URL (FFMPEG_API_URL typically points at /process)
    const baseUrl = FFMPEG_API_URL.replace(/\/process\/?$/, '').replace(/\/$/, '')
    const thumbnailEndpoint = `${baseUrl}/thumbnail`

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Resolve a fetchable URL for the FFmpeg API
    const resolved = await resolveSourceUrl(supabase, body)
    if ('error' in resolved) {
      console.error(`[Thumbnail] resolve_error videoId=${videoId} reason=${resolved.error}`)
      return new Response(
        JSON.stringify({ error: resolved.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log(`[Thumbnail] videoId=${videoId} source=${resolved.source} -> calling ${thumbnailEndpoint}`)

    // Call FFmpeg API
    const ffStart = Date.now()
    let ffResp: Response
    try {
      ffResp = await fetch(thumbnailEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(FFMPEG_API_KEY ? { Authorization: `Bearer ${FFMPEG_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          videoUrl: resolved.url,
          position: position ?? 0.2,
          width: width ?? 480,
          videoId,
        }),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[Thumbnail] network_error videoId=${videoId} err=${msg}`)
      return new Response(
        JSON.stringify({ error: `network_error: ${msg}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const ffMs = Date.now() - ffStart

    if (!ffResp.ok) {
      const text = await ffResp.text().catch(() => '')
      console.error(`[Thumbnail] ffmpeg_api_error videoId=${videoId} status=${ffResp.status} ms=${ffMs} body=${text.slice(0, 400)}`)
      return new Response(
        JSON.stringify({ error: `FFmpeg API ${ffResp.status}: ${text.slice(0, 300)}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const thumbBytes = new Uint8Array(await ffResp.arrayBuffer())
    console.log(`[Thumbnail] videoId=${videoId} got ${thumbBytes.byteLength}B in ${ffMs}ms`)

    if (thumbBytes.byteLength < 2000) {
      console.error(`[Thumbnail] invalid_output videoId=${videoId} size=${thumbBytes.byteLength}`)
      return new Response(
        JSON.stringify({ error: `Invalid thumbnail output: ${thumbBytes.byteLength}B` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Upload to thumbnails bucket
    const { error: uploadError } = await supabase
      .storage
      .from('thumbnails')
      .upload(outputPath, thumbBytes, { contentType: 'image/jpeg', upsert: true })

    if (uploadError) {
      console.error(`[Thumbnail] upload_error videoId=${videoId} path=${outputPath} err=${uploadError.message}`)
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { publicUrl } } = supabase.storage.from('thumbnails').getPublicUrl(outputPath)

    console.log(`[Thumbnail] ✅ videoId=${videoId} -> ${publicUrl}`)

    return new Response(
      JSON.stringify({ success: true, thumbnailUrl: publicUrl, source: resolved.source, ffmpegMs: ffMs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[Thumbnail] internal_error err=${msg}`)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
