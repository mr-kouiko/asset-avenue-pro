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
}

interface VideoPreview {
  id: string;
  submission_id: string;
  file_name: string;
  preview_path: string;
  file_size: number;
  created_at: string;
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
    
    try {
      const body: ExportRequest = await req.json();
      platform = body.platform || 'bulk_export';
      format = body.format || 'mp4';
    } catch {
      // Use defaults if no body
    }

    console.log(`[bulk-export] Starting export for admin: ${user.id}`);

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

    const videoList = (previews as VideoPreview[]) || [];
    
    if (videoList.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No new watermarked previews to export',
          count: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[bulk-export] Found ${videoList.length} unexported previews`);

    // Generate batch ID
    const batchId = crypto.randomUUID();
    
    // Create ZIP file
    const zip = new JSZip();
    const successfulIds: string[] = [];
    const errors: { id: string; error: string }[] = [];

    // Fetch and add each video to the ZIP
    for (const video of videoList) {
      try {
        if (!video.preview_path) {
          errors.push({ id: video.id, error: 'No preview path' });
          continue;
        }

        // Handle different path formats
        let fileUrl = video.preview_path;
        
        // If it's a relative path, construct full URL
        if (!fileUrl.startsWith('http')) {
          // Extract bucket and path from storage path
          const pathParts = fileUrl.split('/');
          const bucketName = pathParts[0];
          const filePath = pathParts.slice(1).join('/');
          
          const { data: signedData, error: signedError } = await supabase
            .storage
            .from(bucketName)
            .createSignedUrl(filePath, 3600); // 1 hour expiry
          
          if (signedError || !signedData?.signedUrl) {
            // Try public URL instead
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
          errors.push({ id: video.id, error: 'Could not resolve file URL' });
          continue;
        }

        console.log(`[bulk-export] Downloading: ${video.file_name}`);
        
        // Fetch the video file
        const response = await fetch(fileUrl);
        if (!response.ok) {
          errors.push({ id: video.id, error: `HTTP ${response.status}` });
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        
        // Generate safe filename
        const safeFileName = `${video.id}_${video.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        
        // Add to ZIP
        zip.file(safeFileName, arrayBuffer);
        successfulIds.push(video.id);
        
        console.log(`[bulk-export] Added to ZIP: ${safeFileName}`);
      } catch (err) {
        console.error(`[bulk-export] Error processing video ${video.id}:`, err);
        errors.push({ id: video.id, error: String(err) });
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

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ 
      type: 'arraybuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Log the export
    const { data: logResult, error: logError } = await supabase
      .rpc('log_watermark_export', {
        p_video_ids: successfulIds,
        p_batch_id: batchId,
        p_platform: platform,
        p_format: format
      });

    if (logError) {
      console.error('[bulk-export] Error logging export:', logError);
      // Continue anyway - the ZIP was generated successfully
    }

    console.log(`[bulk-export] Export complete. Batch ID: ${batchId}, Files: ${successfulIds.length}`);

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
