import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// FAST PATH: Only 3 positions (much faster than 7)
const FAST_POSITIONS = [0.10, 0.25, 0.50];
// Extended positions only if fast path fails completely
const EXTENDED_POSITIONS = [0.05, 0.15, 0.35, 0.40];

// Thresholds for detecting invalid frames (simplified)
const BRIGHTNESS_THRESHOLD_HIGH = 245; // Near-white
const BRIGHTNESS_THRESHOLD_LOW = 10;   // Near-black

interface FrameAnalysis {
  isValid: boolean;
  brightness: number;
  reason?: string;
}

/**
 * FAST frame analysis - single FFmpeg call, minimal processing
 */
async function analyzeFrameFast(framePath: string): Promise<FrameAnalysis> {
  try {
    // Single FFmpeg call to get basic stats
    const command = new Deno.Command("ffmpeg", {
      args: [
        "-i", framePath,
        "-vf", "signalstats",
        "-f", "null",
        "-"
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { stderr } = await command.output();
    const output = new TextDecoder().decode(stderr);
    
    // Parse YAVG (average luminance)
    const yavgMatch = output.match(/YAVG:(\d+\.?\d*)/);
    const brightness = yavgMatch ? parseFloat(yavgMatch[1]) : 128;
    
    // Simple valid/invalid check
    if (brightness > BRIGHTNESS_THRESHOLD_HIGH) {
      return { isValid: false, brightness, reason: 'too bright' };
    }
    if (brightness < BRIGHTNESS_THRESHOLD_LOW) {
      return { isValid: false, brightness, reason: 'too dark' };
    }
    
    return { isValid: true, brightness };
  } catch {
    // If analysis fails, check file size as fallback
    try {
      const stat = await Deno.stat(framePath);
      // Larger files typically have more content
      return { isValid: stat.size > 5000, brightness: 128 };
    } catch {
      return { isValid: true, brightness: 128 }; // Assume valid if we can't check
    }
  }
}

/**
 * Get video duration (with caching-friendly fast probe)
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  const command = new Deno.Command("ffprobe", {
    args: [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      videoPath
    ],
    stdout: "piped",
    stderr: "piped",
  });
  
  const { stdout } = await command.output();
  const duration = parseFloat(new TextDecoder().decode(stdout).trim());
  return isNaN(duration) || duration <= 0 ? 10 : duration;
}

/**
 * Extract frame with optimized FFmpeg settings
 */
async function extractFrame(videoPath: string, timestamp: number, outputPath: string): Promise<boolean> {
  const command = new Deno.Command("ffmpeg", {
    args: [
      "-ss", timestamp.toFixed(2),
      "-i", videoPath,
      "-vframes", "1",
      "-q:v", "3", // Slightly lower quality = faster
      "-vf", "scale=960:-1", // Smaller = faster
      "-y",
      outputPath
    ],
    stdout: "piped",
    stderr: "piped",
  });
  
  const { code } = await command.output();
  return code === 0;
}

/**
 * Find valid frame using fast-path strategy
 */
async function findValidFrameFast(
  videoPath: string, 
  tempDir: string
): Promise<{ framePath: string; timestamp: number } | null> {
  const duration = await getVideoDuration(videoPath);
  
  // FAST PATH: Try 3 strategic positions
  for (const pos of FAST_POSITIONS) {
    const timestamp = Math.max(0.1, duration * pos);
    const framePath = `${tempDir}/frame_${Math.round(pos * 100)}.jpg`;
    
    if (!await extractFrame(videoPath, timestamp, framePath)) continue;
    
    // Check file exists and has content
    try {
      const stat = await Deno.stat(framePath);
      if (stat.size < 2000) continue;
    } catch { continue; }
    
    const analysis = await analyzeFrameFast(framePath);
    if (analysis.isValid) {
      console.log(`[Thumbnail] ✓ Valid frame at ${(pos * 100)}%`);
      return { framePath, timestamp };
    }
    
    try { await Deno.remove(framePath); } catch {}
  }
  
  // EXTENDED PATH: Only if fast path completely fails
  console.log('[Thumbnail] Fast path failed, trying extended positions...');
  for (const pos of EXTENDED_POSITIONS) {
    const timestamp = Math.max(0.1, duration * pos);
    const framePath = `${tempDir}/frame_ext_${Math.round(pos * 100)}.jpg`;
    
    if (!await extractFrame(videoPath, timestamp, framePath)) continue;
    
    try {
      const stat = await Deno.stat(framePath);
      if (stat.size < 2000) continue;
    } catch { continue; }
    
    const analysis = await analyzeFrameFast(framePath);
    if (analysis.isValid) {
      console.log(`[Thumbnail] ✓ Valid frame at ${(pos * 100)}% (extended)`);
      return { framePath, timestamp };
    }
    
    try { await Deno.remove(framePath); } catch {}
  }
  
  // FALLBACK: Just use 25% regardless of analysis
  const fallbackTs = duration * 0.25;
  const fallbackPath = `${tempDir}/frame_fallback.jpg`;
  if (await extractFrame(videoPath, fallbackTs, fallbackPath)) {
    console.log(`[Thumbnail] ⚠ Using fallback at 25%`);
    return { framePath: fallbackPath, timestamp: fallbackTs };
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const tempDir = `/tmp/thumb_${Date.now()}`;
  
  try {
    const { videoPath, outputPath, smartDetection = true } = await req.json()
    
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

    console.log(`[Thumbnail] Processing: ${videoPath}`)

    // Download video
    const { data: videoData, error: downloadError } = await supabaseClient
      .storage
      .from('uploads')
      .download(videoPath)

    if (downloadError) {
      console.error('[Thumbnail] Download error:', downloadError)
      return new Response(
        JSON.stringify({ error: `Download failed: ${downloadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Save to temp
    await Deno.mkdir(tempDir, { recursive: true })
    const tempVideoPath = `${tempDir}/video.mov`
    await Deno.writeFile(tempVideoPath, new Uint8Array(await videoData.arrayBuffer()))

    // Find valid frame (fast path)
    const result = smartDetection 
      ? await findValidFrameFast(tempVideoPath, tempDir)
      : null;

    let finalFramePath: string;
    
    if (result) {
      finalFramePath = result.framePath;
    } else {
      // Direct extraction at 1s as absolute fallback
      finalFramePath = `${tempDir}/thumb_direct.jpg`;
      await extractFrame(tempVideoPath, 1, finalFramePath);
    }

    // Read and upload
    const thumbnailBytes = await Deno.readFile(finalFramePath);
    
    const { error: uploadError } = await supabaseClient
      .storage
      .from('thumbnails')
      .upload(outputPath, thumbnailBytes, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('thumbnails')
      .getPublicUrl(outputPath)

    console.log(`[Thumbnail] ✅ Done: ${publicUrl}`)

    return new Response(
      JSON.stringify({ success: true, thumbnailUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Thumbnail] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } finally {
    try { await Deno.remove(tempDir, { recursive: true }); } catch {}
  }
})
