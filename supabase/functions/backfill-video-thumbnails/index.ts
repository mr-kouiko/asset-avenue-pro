import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Thresholds for detecting invalid existing thumbnails
const BRIGHTNESS_THRESHOLD_HIGH = 250;
const BRIGHTNESS_THRESHOLD_LOW = 5;
const CONTRAST_THRESHOLD = 10;

interface ThumbnailValidation {
  isValid: boolean;
  brightness?: number;
  contrast?: number;
  reason?: string;
}

/**
 * Validate an existing thumbnail by downloading and analyzing it
 */
async function validateExistingThumbnail(
  supabaseClient: ReturnType<typeof createClient>,
  thumbnailPath: string
): Promise<ThumbnailValidation> {
  try {
    // Extract path from full URL if needed
    let storagePath = thumbnailPath;
    if (thumbnailPath.startsWith('https://')) {
      const url = new URL(thumbnailPath);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/thumbnails\/(.+)/);
      if (pathMatch) {
        storagePath = pathMatch[1];
      } else {
        return { isValid: false, reason: 'Could not parse thumbnail URL' };
      }
    }

    // Download thumbnail
    const { data: thumbnailData, error: downloadError } = await supabaseClient
      .storage
      .from('thumbnails')
      .download(storagePath);

    if (downloadError || !thumbnailData) {
      return { isValid: false, reason: `Download failed: ${downloadError?.message}` };
    }

    // Check file size (very small files might be empty/corrupt)
    if (thumbnailData.size < 1000) {
      return { isValid: false, reason: `File too small: ${thumbnailData.size} bytes` };
    }

    // Save to temp file for FFmpeg analysis
    const tempPath = `/tmp/validate_${Date.now()}.jpg`;
    const bytes = new Uint8Array(await thumbnailData.arrayBuffer());
    await Deno.writeFile(tempPath, bytes);

    try {
      // Analyze the thumbnail for brightness/contrast
      const statsCommand = new Deno.Command("ffmpeg", {
        args: [
          "-i", tempPath,
          "-vf", "signalstats,metadata=print:file=-",
          "-f", "null",
          "-"
        ],
        stdout: "piped",
        stderr: "piped",
      });

      const { stderr } = await statsCommand.output();
      const output = new TextDecoder().decode(stderr);

      // Parse statistics
      const yavgMatch = output.match(/lavfi\.signalstats\.YAVG=(\d+\.?\d*)/);
      const yminMatch = output.match(/lavfi\.signalstats\.YMIN=(\d+)/);
      const ymaxMatch = output.match(/lavfi\.signalstats\.YMAX=(\d+)/);

      const brightness = yavgMatch ? parseFloat(yavgMatch[1]) : 128;
      const ymin = yminMatch ? parseInt(yminMatch[1]) : 0;
      const ymax = ymaxMatch ? parseInt(ymaxMatch[1]) : 255;
      const contrast = ymax - ymin;

      // Check validity
      if (brightness > BRIGHTNESS_THRESHOLD_HIGH) {
        return { 
          isValid: false, 
          brightness, 
          contrast, 
          reason: `Too bright (${brightness.toFixed(1)} > ${BRIGHTNESS_THRESHOLD_HIGH})` 
        };
      }
      if (brightness < BRIGHTNESS_THRESHOLD_LOW) {
        return { 
          isValid: false, 
          brightness, 
          contrast, 
          reason: `Too dark (${brightness.toFixed(1)} < ${BRIGHTNESS_THRESHOLD_LOW})` 
        };
      }
      if (contrast < CONTRAST_THRESHOLD) {
        return { 
          isValid: false, 
          brightness, 
          contrast, 
          reason: `Low contrast (${contrast} < ${CONTRAST_THRESHOLD})` 
        };
      }

      return { isValid: true, brightness, contrast };
    } finally {
      // Clean up temp file
      try {
        await Deno.remove(tempPath);
      } catch {}
    }
  } catch (error) {
    console.error('[Validation] Error:', error);
    return { isValid: false, reason: `Validation error: ${error.message}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { validateExisting = true, forceRegenerate = false, limit = 50 } = await req.json().catch(() => ({}));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🔍 Fetching video files...');
    console.log(`   Options: validateExisting=${validateExisting}, forceRegenerate=${forceRegenerate}, limit=${limit}`);

    // Find all video content_files
    const { data: videoFiles, error: fetchError } = await supabaseClient
      .from('content_files')
      .select('*')
      .ilike('file_type', 'video%')
      .limit(limit);

    if (fetchError) {
      throw new Error(`Failed to fetch video files: ${fetchError.message}`);
    }

    if (!videoFiles || videoFiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No video files found',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📹 Found ${videoFiles.length} video file(s) to check`);

    const videosNeedingThumbnails: typeof videoFiles = [];
    const validationResults: Record<string, ThumbnailValidation> = {};

    for (const video of videoFiles) {
      // Always regenerate if flag is set
      if (forceRegenerate) {
        console.log(`🔄 Force regenerate: ${video.file_name}`);
        videosNeedingThumbnails.push(video);
        continue;
      }

      // No thumbnail at all
      if (!video.thumbnail_path) {
        console.log(`❌ No thumbnail: ${video.file_name}`);
        videosNeedingThumbnails.push(video);
        continue;
      }

      // Validate existing thumbnail if enabled
      if (validateExisting) {
        console.log(`🔬 Validating thumbnail for: ${video.file_name}`);
        const validation = await validateExistingThumbnail(supabaseClient, video.thumbnail_path);
        validationResults[video.id] = validation;

        if (!validation.isValid) {
          console.log(`⚠️ Invalid thumbnail for ${video.file_name}: ${validation.reason}`);
          videosNeedingThumbnails.push(video);
        } else {
          console.log(`✅ Valid thumbnail for ${video.file_name}`);
        }
      }
    }

    if (videosNeedingThumbnails.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'All videos have valid thumbnails',
          checked: videoFiles.length,
          processed: 0,
          validationResults
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔧 ${videosNeedingThumbnails.length} video(s) need thumbnail generation/regeneration`);

    const results: Array<{
      id: string;
      file_name: string;
      success: boolean;
      thumbnail_url?: string;
      error?: string;
      previousValidation?: ThumbnailValidation;
    }> = [];

    for (const videoFile of videosNeedingThumbnails) {
      try {
        console.log(`\n📸 Processing: ${videoFile.file_name}`);

        // Extract storage path from file_path
        let storagePath = videoFile.file_path;
        if (storagePath.startsWith('https://')) {
          const url = new URL(storagePath);
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/uploads\/(.+)/);
          if (pathMatch) {
            storagePath = pathMatch[1];
          }
        } else if (storagePath.startsWith('uploads/')) {
          storagePath = storagePath.substring('uploads/'.length);
        }

        // Extract user ID and file ID for thumbnail path
        const pathParts = videoFile.file_path.split('/');
        let userId = 'unknown';
        let fileId = Date.now().toString();
        
        // Try to extract userId from path
        for (let i = 0; i < pathParts.length; i++) {
          const part = pathParts[i];
          // UUID pattern
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) {
            userId = part;
            break;
          }
        }
        
        const fileName = pathParts[pathParts.length - 1];
        const fileIdMatch = fileName.match(/^(\d+)/);
        if (fileIdMatch) {
          fileId = fileIdMatch[1];
        }

        const thumbnailPath = `${userId}/thumbnails/${fileId}_smart_thumbnail.jpg`;

        console.log(`   Video path: ${storagePath}`);
        console.log(`   Thumbnail path: ${thumbnailPath}`);

        // Call the smart thumbnail generator
        const { data: thumbnailData, error: thumbnailError } = await supabaseClient.functions.invoke(
          'generate-video-thumbnail',
          {
            body: {
              videoPath: storagePath,
              outputPath: thumbnailPath,
              smartDetection: true // Enable smart frame detection
            }
          }
        );

        if (thumbnailError) {
          throw new Error(`Thumbnail generation failed: ${thumbnailError.message}`);
        }

        if (!thumbnailData?.thumbnailUrl) {
          throw new Error('No thumbnail URL returned');
        }

        console.log(`✅ Thumbnail generated: ${thumbnailData.thumbnailUrl}`);

        // Update the content_files record
        const { error: updateError } = await supabaseClient
          .from('content_files')
          .update({ 
            thumbnail_path: thumbnailData.thumbnailUrl,
            metadata: {
              ...(videoFile.metadata || {}),
              thumbnail_generated: true,
              thumbnail_generated_at: new Date().toISOString(),
              thumbnail_method: 'smart_detection',
              thumbnail_metadata: thumbnailData.metadata,
              previous_validation: validationResults[videoFile.id]
            }
          })
          .eq('id', videoFile.id);

        if (updateError) {
          console.error(`Failed to update video ${videoFile.id}:`, updateError);
          results.push({
            id: videoFile.id,
            file_name: videoFile.file_name,
            success: false,
            error: updateError.message,
            previousValidation: validationResults[videoFile.id]
          });
        } else {
          console.log(`✅ Database updated for: ${videoFile.file_name}`);
          results.push({
            id: videoFile.id,
            file_name: videoFile.file_name,
            success: true,
            thumbnail_url: thumbnailData.thumbnailUrl,
            previousValidation: validationResults[videoFile.id]
          });
        }
      } catch (error) {
        console.error(`Error processing video ${videoFile.id}:`, error);
        results.push({
          id: videoFile.id,
          file_name: videoFile.file_name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          previousValidation: validationResults[videoFile.id]
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`\n📊 Summary: ${successCount} succeeded, ${failCount} failed out of ${videosNeedingThumbnails.length} processed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${videosNeedingThumbnails.length} videos. Success: ${successCount}, Failed: ${failCount}`,
        checked: videoFiles.length,
        processed: videosNeedingThumbnails.length,
        successful: successCount,
        failed: failCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in backfill-video-thumbnails:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
