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
 * Quick check if thumbnail exists and is accessible
 */
async function thumbnailExists(
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

    // Just check if file exists with a HEAD-like operation
    const { data, error } = await supabaseClient
      .storage
      .from('thumbnails')
      .download(storagePath);

    // If downloadable and has content, it exists
    return !error && data && data.size > 1000;
  } catch {
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

    // Fetch video files
    let query = supabaseClient
      .from('content_files')
      .select('id, file_name, file_path, thumbnail_path, metadata')
      .ilike('file_type', 'video%')
      .limit(limit);

    // If not forcing, only get videos without thumbnails
    if (!forceRegenerate && skipExisting) {
      query = query.is('thumbnail_path', null);
    }

    const { data: videoFiles, error: fetchError } = await query;

    if (fetchError) throw new Error(`Fetch failed: ${fetchError.message}`);
    if (!videoFiles?.length) {
      return new Response(
        JSON.stringify({ success: true, message: 'No videos to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📹 Found ${videoFiles.length} video(s)`);

    // Filter out videos with existing valid thumbnails (if not forcing)
    let videosToProcess: VideoFile[] = videoFiles;
    
    if (!forceRegenerate && !skipExisting) {
      const validChecks = await Promise.all(
        videoFiles.map(async (v) => ({
          video: v,
          exists: await thumbnailExists(supabaseClient, v.thumbnail_path)
        }))
      );
      videosToProcess = validChecks.filter(c => !c.exists).map(c => c.video);
      console.log(`🔍 After validation: ${videosToProcess.length} need processing`);
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
