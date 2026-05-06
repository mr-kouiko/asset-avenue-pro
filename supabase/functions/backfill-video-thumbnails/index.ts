import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// How many videos to process in parallel
const PARALLEL_BATCH_SIZE = 3;
// How many thumbnails to validate in parallel (download-based)
const VALIDATION_BATCH_SIZE = 10;

interface VideoFile {
  id: string;
  file_name: string;
  file_path: string;
  preview_path?: string | null;
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

function extractStoragePathFromThumbnailUrl(thumbnailPath: string): string | null {
  if (!thumbnailPath) return null;

  // If it's already a bucket-relative path
  if (!thumbnailPath.startsWith('http')) return thumbnailPath;

  try {
    const url = new URL(thumbnailPath);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/thumbnails\/(.+)/);
    if (!pathMatch) return null;
    return pathMatch[1];
  } catch {
    return null;
  }
}

/**
 * Check if thumbnail exists AND is valid (not empty/corrupt)
 * Returns true only if file exists and has substantial content.
 */
async function thumbnailIsValid(
  supabaseClient: ReturnType<typeof createClient>,
  thumbnailPath: string | null
): Promise<boolean> {
  if (!thumbnailPath) return false;

  const storagePath = extractStoragePathFromThumbnailUrl(thumbnailPath);
  if (!storagePath) return false;

  try {
    const { data, error } = await supabaseClient
      .storage
      .from('thumbnails')
      .download(storagePath);

    if (error || !data) return false;

    // Must be at least 5KB for a real JPEG thumbnail
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

function extractUploadStoragePath(filePath: string): string {
  let storagePath = filePath;

  if (storagePath.startsWith('https://')) {
    try {
      const url = new URL(storagePath);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/uploads\/(.+)/);
      if (pathMatch) storagePath = pathMatch[1];
    } catch {
      // ignore and keep as-is
    }
  } else if (storagePath.startsWith('uploads/')) {
    storagePath = storagePath.substring('uploads/'.length);
  }

  return storagePath;
}

function extractUserIdFromPath(path: string): string {
  const pathParts = path.split('/');
  for (const part of pathParts) {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) {
      return part;
    }
  }
  return 'unknown';
}

/**
 * Process a single video - generate thumbnail
 */
async function processVideo(
  supabaseClient: ReturnType<typeof createClient>,
  video: VideoFile
): Promise<ProcessResult> {
  try {
    const storagePath = extractUploadStoragePath(video.file_path);

    // Build thumbnail path
    const userId = extractUserIdFromPath(video.file_path);
    const fileId = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const thumbnailPath = `${userId}/thumbnails/${fileId}_thumb.jpg`;

    // Prefer preview URL when available — faster + cheaper for FFmpeg API
    const useUrl = video.preview_path && /^https?:\/\//i.test(video.preview_path)
      ? video.preview_path
      : undefined;

    // Call thumbnail generator (HTTP -> Docker FFmpeg API)
    const { data, error } = await supabaseClient.functions.invoke(
      'generate-video-thumbnail',
      {
        body: {
          videoUrl: useUrl,
          videoPath: useUrl ? undefined : storagePath,
          bucket: 'uploads',
          outputPath: thumbnailPath,
          videoId: video.id,
          position: 0.2,
          width: 480,
        },
      }
    );

    if (error || !data?.thumbnailUrl) {
      throw new Error(error?.message || data?.error || 'No thumbnail URL returned');
    }

    // Update database
    await supabaseClient
      .from('content_files')
      .update({
        thumbnail_path: data.thumbnailUrl,
        metadata: {
          ...(video.metadata || {}),
          thumbnail_regenerated_at: new Date().toISOString(),
        },
      })
      .eq('id', video.id);

    return { id: video.id, file_name: video.file_name, success: true, thumbnail_url: data.thumbnailUrl };
  } catch (error) {
    return {
      id: video.id,
      file_name: video.file_name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      forceRegenerate = false,
      limit = 20,
      offset = 0,
      skipExisting = true,
    } = await req.json().catch(() => ({}));

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 1000);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log(
      `🎬 Backfill: limit=${safeLimit}, offset=${safeOffset}, force=${forceRegenerate}, skipExisting=${skipExisting}`
    );

    // Fetch video files
    let query = supabaseClient
      .from('content_files')
      .select('id, file_name, file_path, thumbnail_path, metadata')
      .ilike('file_type', 'video%')
      .order('created_at', { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    // Fast path: only videos without a thumbnail_path
    if (!forceRegenerate && skipExisting) {
      query = query.is('thumbnail_path', null);
    }

    const { data: videoFiles, error: fetchError } = await query;

    if (fetchError) throw new Error(`Fetch failed: ${fetchError.message}`);
    if (!videoFiles?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No videos to process',
          scanned: 0,
          processed: 0,
          offset: safeOffset,
          limit: safeLimit,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scanned = videoFiles.length;
    const deepValidateExisting = !forceRegenerate && !skipExisting;

    console.log(`📹 Found ${scanned} video(s) in this page`);

    // Decide which videos to process
    let videosToProcess: VideoFile[] = [];

    if (forceRegenerate) {
      videosToProcess = videoFiles;
      console.log(`🔄 Force mode: will regenerate all ${videoFiles.length} thumbnails`);
    } else if (skipExisting) {
      // Missing-only mode: anything returned needs processing
      videosToProcess = videoFiles;
      console.log(`🧹 Missing-only mode: ${videosToProcess.length} to generate`);
    } else {
      // Smart mode: validate each thumbnail exists and is valid (batched downloads)
      console.log(`🔍 Deep-validating thumbnails (${VALIDATION_BATCH_SIZE} at a time)...`);

      const invalid: VideoFile[] = [];
      let validCount = 0;

      for (let i = 0; i < videoFiles.length; i += VALIDATION_BATCH_SIZE) {
        const batch = videoFiles.slice(i, i + VALIDATION_BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (v) => ({
            video: v,
            isValid: await thumbnailIsValid(supabaseClient, v.thumbnail_path),
          }))
        );

        for (const r of batchResults) {
          if (r.isValid) validCount += 1;
          else invalid.push(r.video);
        }
      }

      videosToProcess = invalid;
      console.log(`✅ Valid: ${validCount}, ❌ Need regeneration: ${videosToProcess.length}`);
    }

    if (!videosToProcess.length) {
      return new Response(
        JSON.stringify({
          success: true,
          message: skipExisting
            ? 'All videos in this page already have thumbnails'
            : 'All videos in this page have valid thumbnails',
          scanned,
          processed: 0,
          offset: safeOffset,
          limit: safeLimit,
          deepValidateExisting,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process in parallel batches
    const results: ProcessResult[] = [];

    for (let i = 0; i < videosToProcess.length; i += PARALLEL_BATCH_SIZE) {
      const batch = videosToProcess.slice(i, i + PARALLEL_BATCH_SIZE);
      console.log(
        `⚡ Processing batch ${Math.floor(i / PARALLEL_BATCH_SIZE) + 1}/${Math.ceil(videosToProcess.length / PARALLEL_BATCH_SIZE)}`
      );

      const batchResults = await Promise.all(
        batch.map((video) => processVideo(supabaseClient, video))
      );

      results.push(...batchResults);

      const successCount = batchResults.filter((r) => r.success).length;
      console.log(`   Batch done: ${successCount}/${batch.length} succeeded`);
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`\n✅ Complete: ${successCount} succeeded, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${videosToProcess.length} videos`,
        scanned,
        offset: safeOffset,
        limit: safeLimit,
        deepValidateExisting,
        successful: successCount,
        failed: failCount,
        results,
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
