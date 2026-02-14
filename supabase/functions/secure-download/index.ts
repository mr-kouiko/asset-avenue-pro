import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    
    // Only handle secure token-based downloads
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Download token required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    return await handleTokenBasedDownload(supabaseClient, token, req);
  } catch (error) {
    console.error("Error in secure-download function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Secure token-based download handler
async function handleTokenBasedDownload(supabaseClient: any, token: string, req: Request) {
  try {
    console.log('Processing secure download with token:', token.substring(0, 10) + '...');
    
    // First, mark the token as used (single-use tokens)
    const { data: markUsedResult, error: markUsedError } = await supabaseClient.rpc('mark_download_token_used', {
      token_param: token
    });

    if (markUsedError || !markUsedResult) {
      console.error('Invalid, expired, or already used download token');
      return new Response(
        JSON.stringify({ error: 'Invalid, expired, or already used download token' }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the download record and file info
    const { data: secureDownload, error: tokenError } = await supabaseClient
      .from("secure_downloads")
      .select(`
        id,
        user_id,
        content_file_id,
        expires_at,
        downloaded_at,
        content_files (
          id,
          file_path,
          file_name,
          file_type,
          file_size,
          is_original,
          submission_id,
          metadata,
          content_submissions (
            id,
            title,
            status
          )
        )
      `)
      .eq("download_token", token)
      .single();

    if (tokenError || !secureDownload) {
      console.error('Download record not found:', tokenError);
      return new Response(
        JSON.stringify({ error: "Download record not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const contentFile = secureDownload.content_files as any;
    
    // Verify this is an original file and content is approved
    if (!contentFile?.is_original || contentFile.content_submissions?.status !== "approved") {
      console.error('File not available for download');
      return new Response(
        JSON.stringify({ error: "File not available for download" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine the correct bucket and extract relative path
    // file_path may be a full URL or a relative path
    // Default to 'original-files' (private bucket) for originals
    let bucket = contentFile.metadata?.bucket || "original-files";
    let relativePath = contentFile.file_path;
    
    // If file_path is a full URL, extract the bucket and relative path
    if (contentFile.file_path.startsWith('http')) {
      try {
        const urlObj = new URL(contentFile.file_path);
        const pathParts = urlObj.pathname.split('/');
        // Format: /storage/v1/object/public/{bucket}/{...relativePath}
        const storageIndex = pathParts.indexOf('storage');
        if (storageIndex !== -1 && pathParts.length > storageIndex + 4) {
          bucket = pathParts[storageIndex + 4]; // e.g., "uploads" or "original-files"
          relativePath = pathParts.slice(storageIndex + 5).join('/'); // Everything after bucket
        }
        console.log('Extracted bucket:', bucket, 'relativePath:', relativePath);
      } catch (e) {
        console.error('Failed to parse file_path URL:', e);
      }
    }
    
    console.log(`Generating signed URL from bucket: ${bucket}, path: ${relativePath}`);

    // Generate signed URL (valid for 5 minutes for security)
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient
      .storage
      .from(bucket)
      .createSignedUrl(relativePath, 300); // 5 minutes

    if (signedUrlError || !signedUrlData) {
      console.error('Failed to generate signed URL:', signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate download URL" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log the download for audit purposes
    await supabaseClient
      .from("downloads")
      .upsert({
        user_id: secureDownload.user_id,
        submission_id: contentFile.submission_id,
        downloaded_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,submission_id"
      });

    // Log security event
    await supabaseClient.rpc('log_security_event', {
      event_type_param: 'secure_download_success',
      details_param: {
        content_file_id: contentFile.id,
        user_id: secureDownload.user_id,
        file_name: contentFile.file_name,
        file_type: contentFile.file_type
      }
    });

    console.log('Successfully generated signed URL for file:', contentFile.file_name);

    return new Response(
      JSON.stringify({
        downloadUrl: signedUrlData.signedUrl,
        fileName: contentFile.file_name,
        fileType: contentFile.file_type,
        fileSize: contentFile.file_size,
        expiresIn: 300
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error in handleTokenBasedDownload:', error);
    return new Response(
      JSON.stringify({ error: "Failed to process download" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}