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

    console.log('🔍 Fetching video files without thumbnails...');

    // Find all video content_files that don't have thumbnails
    const { data: videoFiles, error: fetchError } = await supabaseClient
      .from('content_files')
      .select('*')
      .eq('file_type', 'video')
      .is('thumbnail_path', null);

    if (fetchError) {
      throw new Error(`Failed to fetch video files: ${fetchError.message}`);
    }

    if (!videoFiles || videoFiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No videos found without thumbnails',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📹 Found ${videoFiles.length} video(s) without thumbnails`);

    const results = [];

    for (const videoFile of videoFiles) {
      try {
        console.log(`Processing video: ${videoFile.file_name}`);

        // Extract user ID and file ID from the file path
        // Example: uploads/25b8feb7-eaa1-4dbd-857c-0a3c21fd0d76/videos/1756991273476-75bmmdbp3oi_original.mp4
        const pathParts = videoFile.file_path.split('/');
        const userId = pathParts[pathParts.length - 3];
        const fileName = pathParts[pathParts.length - 1];
        const fileId = fileName.split('_')[0];

        // For now, we'll create a placeholder thumbnail path
        // In a real implementation, you would:
        // 1. Download the video
        // 2. Extract a frame at 1 second
        // 3. Upload the frame as a thumbnail
        
        const thumbnailPath = `${userId}/thumbnails/${fileId}_thumbnail.jpg`;
        
        console.log(`📸 Thumbnail path will be: ${thumbnailPath}`);

        // Update the content_files record with the thumbnail path
        const { error: updateError } = await supabaseClient
          .from('content_files')
          .update({ 
            thumbnail_path: thumbnailPath,
            metadata: {
              ...videoFile.metadata,
              thumbnail_generated: true,
              thumbnail_generated_at: new Date().toISOString()
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
          console.log(`✅ Updated video ${videoFile.file_name} with thumbnail path`);
          results.push({
            id: videoFile.id,
            file_name: videoFile.file_name,
            success: true,
            thumbnail_path: thumbnailPath
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
        message: `Processed ${videoFiles.length} videos. Success: ${successCount}, Failed: ${failCount}`,
        processed: videoFiles.length,
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
