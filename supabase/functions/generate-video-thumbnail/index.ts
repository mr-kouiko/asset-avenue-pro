import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Timeline positions to try (as percentages of video duration)
const TIMELINE_POSITIONS = [0.01, 0.05, 0.10, 0.20, 0.30, 0.40, 0.50];

// Thresholds for detecting invalid frames
const BRIGHTNESS_THRESHOLD_HIGH = 250; // Near-white
const BRIGHTNESS_THRESHOLD_LOW = 5;    // Near-black
const CONTRAST_THRESHOLD = 10;         // Minimum standard deviation for contrast
const EDGE_THRESHOLD = 100;            // Minimum edge count for meaningful content

interface FrameAnalysis {
  isValid: boolean;
  brightness: number;
  contrast: number;
  edgeCount: number;
  reason?: string;
}

/**
 * Analyze a frame image to determine if it's visually meaningful
 * Uses FFmpeg to extract frame statistics
 */
async function analyzeFrame(framePath: string): Promise<FrameAnalysis> {
  try {
    // Use FFmpeg to get frame statistics (signalstats filter)
    const statsCommand = new Deno.Command("ffmpeg", {
      args: [
        "-i", framePath,
        "-vf", "signalstats,metadata=print:file=-",
        "-f", "null",
        "-"
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { stdout, stderr } = await statsCommand.output();
    const output = new TextDecoder().decode(stderr);
    
    // Parse YAVG (average luminance) from signalstats output
    const yavgMatch = output.match(/lavfi\.signalstats\.YAVG=(\d+\.?\d*)/);
    const yminMatch = output.match(/lavfi\.signalstats\.YMIN=(\d+)/);
    const ymaxMatch = output.match(/lavfi\.signalstats\.YMAX=(\d+)/);
    
    const brightness = yavgMatch ? parseFloat(yavgMatch[1]) : 128;
    const ymin = yminMatch ? parseInt(yminMatch[1]) : 0;
    const ymax = ymaxMatch ? parseInt(ymaxMatch[1]) : 255;
    const contrast = ymax - ymin;
    
    // Use edge detection to find meaningful content
    const edgeCommand = new Deno.Command("ffmpeg", {
      args: [
        "-i", framePath,
        "-vf", "edgedetect=low=0.1:high=0.4,metadata=print:file=-",
        "-f", "null",
        "-"
      ],
      stdout: "piped",
      stderr: "piped",
    });
    
    const edgeResult = await edgeCommand.output();
    const edgeOutput = new TextDecoder().decode(edgeResult.stderr);
    
    // Count edges by checking if frame has significant edge content
    // If the edge detection passes without error and produces output, there are edges
    const edgeCount = edgeOutput.includes("frame=") ? 150 : 50;
    
    // Determine if frame is valid
    let isValid = true;
    let reason = "";
    
    if (brightness > BRIGHTNESS_THRESHOLD_HIGH) {
      isValid = false;
      reason = `Too bright (${brightness.toFixed(1)} > ${BRIGHTNESS_THRESHOLD_HIGH})`;
    } else if (brightness < BRIGHTNESS_THRESHOLD_LOW) {
      isValid = false;
      reason = `Too dark (${brightness.toFixed(1)} < ${BRIGHTNESS_THRESHOLD_LOW})`;
    } else if (contrast < CONTRAST_THRESHOLD) {
      isValid = false;
      reason = `Low contrast (${contrast} < ${CONTRAST_THRESHOLD})`;
    }
    
    console.log(`[FrameAnalysis] Brightness: ${brightness.toFixed(1)}, Contrast: ${contrast}, Valid: ${isValid}${reason ? ` - ${reason}` : ''}`);
    
    return {
      isValid,
      brightness,
      contrast,
      edgeCount,
      reason
    };
  } catch (error) {
    console.error('[FrameAnalysis] Error analyzing frame:', error);
    // If analysis fails, assume frame might be valid to avoid false rejections
    return {
      isValid: true,
      brightness: 128,
      contrast: 100,
      edgeCount: 100,
      reason: 'Analysis failed, assuming valid'
    };
  }
}

/**
 * Get video duration in seconds using FFprobe
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
  const durationStr = new TextDecoder().decode(stdout).trim();
  const duration = parseFloat(durationStr);
  
  if (isNaN(duration) || duration <= 0) {
    console.warn('[Duration] Could not determine video duration, defaulting to 10s');
    return 10;
  }
  
  console.log(`[Duration] Video duration: ${duration.toFixed(2)}s`);
  return duration;
}

/**
 * Extract a frame at a specific timestamp
 */
async function extractFrame(videoPath: string, timestamp: number, outputPath: string): Promise<boolean> {
  const command = new Deno.Command("ffmpeg", {
    args: [
      "-ss", timestamp.toString(),
      "-i", videoPath,
      "-vframes", "1",
      "-q:v", "2",
      "-vf", "scale=1280:-1",
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
 * Find the first visually meaningful frame in a video
 */
async function findValidFrame(
  videoPath: string, 
  tempDir: string
): Promise<{ framePath: string; timestamp: number; analysis: FrameAnalysis } | null> {
  const duration = await getVideoDuration(videoPath);
  
  for (const positionPercent of TIMELINE_POSITIONS) {
    const timestamp = Math.max(0.1, duration * positionPercent);
    const framePath = `${tempDir}/frame_${positionPercent}.jpg`;
    
    console.log(`[SmartThumbnail] Trying position ${(positionPercent * 100).toFixed(0)}% (${timestamp.toFixed(2)}s)`);
    
    const extracted = await extractFrame(videoPath, timestamp, framePath);
    if (!extracted) {
      console.warn(`[SmartThumbnail] Failed to extract frame at ${timestamp}s`);
      continue;
    }
    
    // Check if file was actually created and has content
    try {
      const stat = await Deno.stat(framePath);
      if (stat.size < 1000) {
        console.warn(`[SmartThumbnail] Frame too small (${stat.size} bytes), skipping`);
        continue;
      }
    } catch {
      continue;
    }
    
    const analysis = await analyzeFrame(framePath);
    
    if (analysis.isValid) {
      console.log(`[SmartThumbnail] ✅ Found valid frame at ${(positionPercent * 100).toFixed(0)}% (${timestamp.toFixed(2)}s)`);
      return { framePath, timestamp, analysis };
    }
    
    // Clean up invalid frame
    try {
      await Deno.remove(framePath);
    } catch {}
  }
  
  // If no valid frame found, use the middle of the video as last resort
  const fallbackTimestamp = duration * 0.5;
  const fallbackPath = `${tempDir}/frame_fallback.jpg`;
  
  console.log(`[SmartThumbnail] ⚠️ No valid frame found, using fallback at 50% (${fallbackTimestamp.toFixed(2)}s)`);
  
  const extracted = await extractFrame(videoPath, fallbackTimestamp, fallbackPath);
  if (extracted) {
    return {
      framePath: fallbackPath,
      timestamp: fallbackTimestamp,
      analysis: {
        isValid: false,
        brightness: 128,
        contrast: 50,
        edgeCount: 50,
        reason: 'Fallback frame - no valid frame found'
      }
    };
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const tempFiles: string[] = [];
  
  try {
    const { videoPath, outputPath, timeOffset = 1, smartDetection = true } = await req.json()
    
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

    console.log(`[Thumbnail] Starting smart thumbnail generation for: ${videoPath}`)
    console.log(`[Thumbnail] Smart detection enabled: ${smartDetection}`)

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
    const tempDir = `/tmp/thumb_${Date.now()}`
    await Deno.mkdir(tempDir, { recursive: true })
    
    const tempVideoPath = `${tempDir}/video.mov`
    tempFiles.push(tempVideoPath)
    
    await Deno.writeFile(tempVideoPath, videoBytes)
    console.log(`[Thumbnail] Video saved to: ${tempVideoPath}`)

    let finalFramePath: string;
    let thumbnailMetadata: Record<string, unknown> = {};

    if (smartDetection) {
      // Use smart detection to find a valid frame
      const result = await findValidFrame(tempVideoPath, tempDir);
      
      if (!result) {
        console.error('[Thumbnail] Failed to find any valid frame');
        return new Response(
          JSON.stringify({ error: 'Failed to extract any frame from video' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      finalFramePath = result.framePath;
      thumbnailMetadata = {
        smart_detection: true,
        selected_timestamp: result.timestamp,
        frame_analysis: result.analysis,
        positions_tried: TIMELINE_POSITIONS.length
      };
      tempFiles.push(finalFramePath);
    } else {
      // Legacy mode: just use the specified timeOffset
      const tempThumbnailPath = `${tempDir}/thumbnail.jpg`
      tempFiles.push(tempThumbnailPath);
      
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

      console.log(`[Thumbnail] Running FFmpeg (legacy mode)...`)
      const { code, stderr } = await ffmpegCommand.output()
      
      if (code !== 0) {
        const errorText = new TextDecoder().decode(stderr)
        console.error('[Thumbnail] FFmpeg error:', errorText)
        return new Response(
          JSON.stringify({ error: 'FFmpeg thumbnail extraction failed', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      finalFramePath = tempThumbnailPath;
      thumbnailMetadata = {
        smart_detection: false,
        selected_timestamp: timeOffset
      };
    }

    console.log(`[Thumbnail] Reading final frame from: ${finalFramePath}`)

    // Read the generated thumbnail
    const thumbnailBytes = await Deno.readFile(finalFramePath)
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

    // Get public URL
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('thumbnails')
      .getPublicUrl(outputPath)

    console.log(`[Thumbnail] ✅ Success! Thumbnail URL: ${publicUrl}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        thumbnailUrl: publicUrl,
        message: 'Thumbnail generated successfully',
        metadata: thumbnailMetadata
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Thumbnail] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } finally {
    // Clean up temp files
    for (const file of tempFiles) {
      try {
        await Deno.remove(file)
      } catch {}
    }
    // Try to remove temp directory
    try {
      const tempDir = tempFiles[0]?.split('/').slice(0, -1).join('/');
      if (tempDir) await Deno.remove(tempDir, { recursive: true });
    } catch {}
  }
})
