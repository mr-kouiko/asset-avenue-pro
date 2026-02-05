import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// How many videos to process in parallel
const PARALLEL_BATCH_SIZE = 3;

interface VideoFile {
  id: string;
  file_name: string;
  file_path: string;
  thumbnail_path: string | null;
  metadata: Record<string, unknown> | null;
}

interface ProcessResult {
  id: string;
  file_name: string;
  success: boolean;
  thumbnail_url?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Check if thumbnail exists AND is valid (not empty/corrupt)
 * Returns true only if file exists and has substantial content
 */
async function thumbnailIsValid(
  supabaseClient: ReturnType<typeof createClient>,
  thumbnailPath: string | null
): Promise<boolean> {
  if (!thumbnailPath) return false;
  
  try {
    let storagePath = thumbnailPath;
    if (thumbnailPath.startsWith('https://')) {
      const url = new URL(thumbnailPath);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/thumbnails\/(.+)/);
      if (pathMatch) storagePath = pathMatch[1];
      else return false;
    }

    // Download and verify content exists and is valid
    const { data, error } = await supabaseClient
      .storage
      .from('thumbnails')
      .download(storagePath);

    if (error || !data) return false;
    
    // Must be at least 5KB for a real JPEG thumbnail
    // And less than 50KB is suspicious for a real frame
    const size = data.size;
    if (size < 5000) {
      console.log(`[Validation] Thumbnail too small: ${size} bytes - ${storagePath}`);
      return false;
    }
    
    return true;
  } catch (e) {
    console.log(`[Validation] Check failed: ${e}`);
    return false;
  }
}

/**
 * Process a single video - generate thumbnail
 */
async function processVideo(
  supabaseClient: ReturnType<typeof createClient>,
  video: VideoFile
): Promise<ProcessResult> {
  try {
    // Extract storage path
    let storagePath = video.file_path;
    if (storagePath.startsWith('https://')) {
      const url = new URL(storagePath);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/uploads\/(.+)/);
      if (pathMatch) storagePath = pathMatch[1];
    } else if (storagePath.startsWith('uploads/')) {
      storagePath = storagePath.substring('uploads/'.length);
    }

    // Build thumbnail path
    const pathParts = video.file_path.split('/');
    let userId = 'unknown';
    for (const part of pathParts) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) {
        userId = part;
        break;
      }
    }
    const fileId = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const thumbnailPath = `${userId}/thumbnails/${fileId}_thumb.jpg`;

    // Call thumbnail generator
    const { data, error } = await supabaseClient.functions.invoke(
      'generate-video-thumbnail',
      { body: { videoPath: storagePath, outputPath: thumbnailPath, smartDetection: true } }
    );

    if (error || !data?.thumbnailUrl) {
      throw new Error(error?.message || 'No thumbnail URL returned');
    }

    // Update database
    await supabaseClient
      .from('content_files')
      .update({ 
        thumbnail_path: data.thumbnailUrl,
        metadata: {
          ...(video.metadata || {}),
          thumbnail_regenerated_at: new Date().toISOString()
        }
      })
      .eq('id', video.id);

    return { id: video.id, file_name: video.file_name, success: true, thumbnail_url: data.thumbnailUrl };
  } catch (error) {
    return { 
      id: video.id, 
      file_name: video.file_name, 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { forceRegenerate = false, limit = 20, skipExisting = true } = await req.json().catch(() => ({}));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log(`🎬 Backfill: limit=${limit}, force=${forceRegenerate}, skipExisting=${skipExisting}`);

    // Fetch video files - always get all videos and validate individually
    const { data: videoFiles, error: fetchError } = await supabaseClient
      .from('content_files')
      .select('id, file_name, file_path, thumbnail_path, metadata')
      .ilike('file_type', 'video%')
      .limit(limit);

    if (fetchError) throw new Error(`Fetch failed: ${fetchError.message}`);
    if (!videoFiles?.length) {
      return new Response(
        JSON.stringify({ success: true, message: 'No videos to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📹 Found ${videoFiles.length} video(s)`);

    // Validate ALL thumbnails - check if they actually exist and are valid
    let videosToProcess: VideoFile[] = [];
    
    if (forceRegenerate) {
      // Force mode: process everything
      videosToProcess = videoFiles;
      console.log(`🔄 Force mode: will regenerate all ${videoFiles.length} thumbnails`);
    } else {
      // Smart mode: validate each thumbnail exists and is valid
      console.log(`🔍 Validating thumbnails...`);
      
      const validationResults = await Promise.all(
        videoFiles.map(async (v) => ({
          video: v,
          isValid: await thumbnailIsValid(supabaseClient, v.thumbnail_path)
        }))
      );
      
      videosToProcess = validationResults.filter(r => !r.isValid).map(r => r.video);
      const validCount = validationResults.filter(r => r.isValid).length;
      
      console.log(`✅ Valid: ${validCount}, ❌ Need regeneration: ${videosToProcess.length}`);
    }

    if (!videosToProcess.length) {
      return new Response(
        JSON.stringify({ success: true, message: 'All videos have thumbnails', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process in parallel batches
    const results: ProcessResult[] = [];
    
    for (let i = 0; i < videosToProcess.length; i += PARALLEL_BATCH_SIZE) {
      const batch = videosToProcess.slice(i, i + PARALLEL_BATCH_SIZE);
      console.log(`⚡ Processing batch ${Math.floor(i / PARALLEL_BATCH_SIZE) + 1}/${Math.ceil(videosToProcess.length / PARALLEL_BATCH_SIZE)}`);
      
      const batchResults = await Promise.all(
        batch.map(video => processVideo(supabaseClient, video))
      );
      
      results.push(...batchResults);
      
      // Log progress
      const successCount = batchResults.filter(r => r.success).length;
      console.log(`   Batch done: ${successCount}/${batch.length} succeeded`);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`\n✅ Complete: ${successCount} succeeded, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${videosToProcess.length} videos`,
        successful: successCount,
        failed: failCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
