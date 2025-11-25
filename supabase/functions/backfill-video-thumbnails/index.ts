import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    console.log('🔍 Fetching video files without thumbnails or with broken thumbnails...');

    // Find all video content_files that either:
    // 1. Don't have thumbnails (thumbnail_path IS NULL)
    // 2. Have thumbnail_path but file doesn't exist in storage (we'll check this)
    const { data: videoFiles, error: fetchError } = await supabaseClient
      .from('content_files')
      .select('*')
      .eq('file_type', 'video');

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

    // Filter to only process videos that need thumbnails
    const videosNeedingThumbnails = [];
    for (const video of videoFiles) {
      // Skip if no thumbnail_path
      if (!video.thumbnail_path) {
        videosNeedingThumbnails.push(video);
        continue;
      }
      
      // Check if thumbnail actually exists in storage
      try {
        const thumbnailPath = video.thumbnail_path.replace(/^https:\/\/[^\/]+\/storage\/v1\/object\/public\/thumbnails\//, '');
        const { data: existsData, error: existsError } = await supabaseClient
          .storage
          .from('thumbnails')
          .download(thumbnailPath);
        
        if (existsError || !existsData) {
          console.log(`❌ Thumbnail missing for ${video.file_name}: ${video.thumbnail_path}`);
          videosNeedingThumbnails.push(video);
        }
      } catch (e) {
        // If check fails, assume thumbnail is missing
        console.log(`⚠️ Could not verify thumbnail for ${video.file_name}, will regenerate`);
        videosNeedingThumbnails.push(video);
      }
    }

    if (videosNeedingThumbnails.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'All videos already have valid thumbnails',
          checked: videoFiles.length,
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔧 ${videosNeedingThumbnails.length} video(s) need thumbnail generation`);

    const results = [];

    for (const videoFile of videosNeedingThumbnails) {
      try {
        console.log(`Processing video: ${videoFile.file_name}`);

        // Extract user ID and file ID from the file path
        // Example: uploads/25b8feb7-eaa1-4dbd-857c-0a3c21fd0d76/videos/1756991273476-75bmmdbp3oi_original.mp4
        const pathParts = videoFile.file_path.split('/');
        const userId = pathParts[pathParts.length - 3];
        const fileName = pathParts[pathParts.length - 1];
        const fileId = fileName.split('_')[0];

        // Extract storage path from file_path (remove bucket prefix if present)
        let storagePath = videoFile.file_path;
        if (storagePath.startsWith('https://')) {
          // Extract path from full URL
          const url = new URL(storagePath);
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/uploads\/(.+)/);
          if (pathMatch) {
            storagePath = pathMatch[1];
          }
        } else if (storagePath.startsWith('uploads/')) {
          storagePath = storagePath.substring('uploads/'.length);
        }
        
        const thumbnailPath = `${userId}/thumbnails/${fileId}_thumbnail.jpg`;
        
        console.log(`📸 Generating thumbnail for: ${videoFile.file_name}`);
        console.log(`   Video path: ${storagePath}`);
        console.log(`   Thumbnail path: ${thumbnailPath}`);

        // Call the generate-video-thumbnail edge function
        try {
          const { data: thumbnailData, error: thumbnailError } = await supabaseClient.functions.invoke(
            'generate-video-thumbnail',
            {
              body: {
                videoPath: storagePath,
                outputPath: thumbnailPath,
                timeOffset: 1
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

          // Update the content_files record with the actual thumbnail URL
          const { error: updateError } = await supabaseClient
            .from('content_files')
            .update({ 
              thumbnail_path: thumbnailData.thumbnailUrl,
              metadata: {
                ...(videoFile.metadata || {}),
                thumbnail_generated: true,
                thumbnail_generated_at: new Date().toISOString(),
                thumbnail_method: 'ffmpeg_server_side'
              }
            })
            .eq('id', videoFile.id);

          if (updateError) {
            console.error(`Failed to update video ${videoFile.id}:`, updateError);
            results.push({
              id: videoFile.id,
              file_name: videoFile.file_name,
              success: false,
              error: updateError.message
            });
          } else {
            console.log(`✅ Updated database for video ${videoFile.file_name}`);
            results.push({
              id: videoFile.id,
              file_name: videoFile.file_name,
              success: true,
              thumbnail_url: thumbnailData.thumbnailUrl
            });
          }
        } catch (thumbnailError) {
          console.error(`Thumbnail generation error for ${videoFile.file_name}:`, thumbnailError);
          results.push({
            id: videoFile.id,
            file_name: videoFile.file_name,
            success: false,
            error: thumbnailError instanceof Error ? thumbnailError.message : 'Thumbnail generation failed'
          });
        }
      } catch (error) {
        console.error(`Error processing video ${videoFile.id}:`, error);
        results.push({
          id: videoFile.id,
          file_name: videoFile.file_name,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

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
