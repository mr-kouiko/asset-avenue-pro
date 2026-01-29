import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  platform?: string;
  format?: string;
  batchSize?: number; // Max videos per export (default 25)
}

interface VideoPreview {
  id: string;
  submission_id: string;
  file_name: string;
  preview_path: string;
  file_size: number;
  created_at: string;
}

// Parallel download helper with concurrency limit
async function downloadFilesInParallel(
  videos: VideoPreview[],
  supabase: any,
  maxConcurrent: number = 5
): Promise<{ video: VideoPreview; data: ArrayBuffer | null; error?: string }[]> {
  const results: { video: VideoPreview; data: ArrayBuffer | null; error?: string }[] = [];
  
  for (let i = 0; i < videos.length; i += maxConcurrent) {
    const batch = videos.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(async (video) => {
        try {
          if (!video.preview_path) {
            return { video, data: null, error: 'No preview path' };
          }

          let fileUrl = video.preview_path;
          
          // If it's a relative path, construct full URL
          if (!fileUrl.startsWith('http')) {
            const pathParts = fileUrl.split('/');
            const bucketName = pathParts[0];
            const filePath = pathParts.slice(1).join('/');
            
            const { data: signedData, error: signedError } = await supabase
              .storage
              .from(bucketName)
              .createSignedUrl(filePath, 3600);
            
            if (signedError || !signedData?.signedUrl) {
              const { data: publicData } = supabase
                .storage
                .from(bucketName)
                .getPublicUrl(filePath);
              
              fileUrl = publicData?.publicUrl || '';
            } else {
              fileUrl = signedData.signedUrl;
            }
          }

          if (!fileUrl) {
            return { video, data: null, error: 'Could not resolve file URL' };
          }

          const response = await fetch(fileUrl);
          if (!response.ok) {
            return { video, data: null, error: `HTTP ${response.status}` };
          }

          const arrayBuffer = await response.arrayBuffer();
          return { video, data: arrayBuffer };
        } catch (err) {
          return { video, data: null, error: String(err) };
        }
      })
    );
    results.push(...batchResults);
  }
  
  return results;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleError || roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let platform = 'bulk_export';
    let format = 'mp4';
    let batchSize = 25; // Default batch size to avoid CPU timeout
    
    try {
      const body: ExportRequest = await req.json();
      platform = body.platform || 'bulk_export';
      format = body.format || 'mp4';
      batchSize = Math.min(body.batchSize || 25, 50); // Max 50 per batch
    } catch {
      // Use defaults if no body
    }

    console.log(`[bulk-export] Starting export for admin: ${user.id}, batchSize: ${batchSize}`);

    // Get unexported watermarked previews using the secure function
    const { data: previews, error: previewsError } = await supabase
      .rpc('get_unexported_watermarked_previews');

    if (previewsError) {
      console.error('[bulk-export] Error fetching previews:', previewsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch unexported previews', details: previewsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allVideos = (previews as VideoPreview[]) || [];
    
    if (allVideos.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No new watermarked previews to export',
          count: 0,
          remaining: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Take only batchSize videos to avoid CPU timeout
    const videoList = allVideos.slice(0, batchSize);
    const remaining = allVideos.length - batchSize;

    console.log(`[bulk-export] Processing ${videoList.length} of ${allVideos.length} unexported previews`);

    // Generate batch ID
    const batchId = crypto.randomUUID();
    
    // Create ZIP file
    const zip = new JSZip();
    const successfulIds: string[] = [];
    const errors: { id: string; error: string }[] = [];

    // Download files in parallel with concurrency limit
    const downloadResults = await downloadFilesInParallel(videoList, supabase, 5);

    for (const result of downloadResults) {
      if (result.data) {
        const safeFileName = `${result.video.id}_${result.video.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        zip.file(safeFileName, result.data);
        successfulIds.push(result.video.id);
        console.log(`[bulk-export] Added: ${safeFileName}`);
      } else {
        errors.push({ id: result.video.id, error: result.error || 'Unknown error' });
        console.error(`[bulk-export] Failed: ${result.video.id} - ${result.error}`);
      }
    }

    if (successfulIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No videos could be exported',
          details: errors 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[bulk-export] Generating ZIP with ${successfulIds.length} files`);

    // Generate ZIP blob with faster compression
    const zipBlob = await zip.generateAsync({ 
      type: 'arraybuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 1 } // Fastest compression
    });

    // Log the export
    const { error: logError } = await supabase
      .rpc('log_watermark_export', {
        p_video_ids: successfulIds,
        p_batch_id: batchId,
        p_platform: platform,
        p_format: format
      });

    if (logError) {
      console.error('[bulk-export] Error logging export:', logError);
    }

    console.log(`[bulk-export] Export complete. Batch ID: ${batchId}, Files: ${successfulIds.length}, Remaining: ${remaining}`);

    // Return the ZIP file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `watermarked-previews-${timestamp}.zip`;

    return new Response(zipBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Batch-Id': batchId,
        'X-Export-Count': String(successfulIds.length),
        'X-Error-Count': String(errors.length),
        'X-Remaining-Count': String(remaining > 0 ? remaining : 0),
      }
    });

  } catch (error) {
    console.error('[bulk-export] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
