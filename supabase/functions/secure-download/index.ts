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
    
    // New secure token-based access
    if (token) {
      return await handleTokenBasedDownload(supabaseClient, token, req);
    }
    
    // Legacy access for backward compatibility (less secure)
    return await handleLegacyDownload(supabaseClient, req);
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

// New secure token-based download handler
async function handleTokenBasedDownload(supabaseClient: any, token: string, req: Request) {
  // Verify the secure download token
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
    return new Response(
      JSON.stringify({ error: "Invalid or expired download token" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Check if token has expired
  if (new Date(secureDownload.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: "Download token has expired" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const contentFile = secureDownload.content_files as any;
  
  // Verify this is an original file and content is approved
  if (!contentFile.is_original || contentFile.content_submissions?.status !== "approved") {
    return new Response(
      JSON.stringify({ error: "File not available for download" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Determine the correct bucket
  const bucket = contentFile.metadata?.bucket || "original-files";

  // Generate signed URL (valid for 1 hour)
  const { data: signedUrlData, error: signedUrlError } = await supabaseClient
    .storage
    .from(bucket)
    .createSignedUrl(contentFile.file_path, 3600);

  if (signedUrlError || !signedUrlData) {
    return new Response(
      JSON.stringify({ error: "Failed to generate download URL" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Mark token as used (optional: for single-use tokens)
  const clientIP = req.headers.get("x-forwarded-for") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  
  await supabaseClient
    .from("secure_downloads")
    .update({
      downloaded_at: new Date().toISOString(),
      ip_address: clientIP,
      user_agent: userAgent,
    })
    .eq("id", secureDownload.id);

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

  return new Response(
    JSON.stringify({
      download_url: signedUrlData.signedUrl,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      file_name: contentFile.file_name,
      file_type: contentFile.file_type,
      file_size: contentFile.file_size,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Legacy download handler for backward compatibility
async function handleLegacyDownload(supabaseClient: any, req: Request) {
  // Get the authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Authorization header required" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const token = authHeader.replace("Bearer ", "");

  // Verify the user's JWT token
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const url = new URL(req.url);
  const submissionId = url.searchParams.get("submission_id");
  const fileId = url.searchParams.get("file_id");

  if (!submissionId || !fileId) {
    return new Response(
      JSON.stringify({ error: "Missing submission_id or file_id parameter" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Check if user has access to this content (using the new restrictive policies)
  const { data: file, error: fileError } = await supabaseClient
    .from("content_files")
    .select(`
      *,
      content_submissions!inner(
        id,
        creator_id,
        status
      )
    `)
    .eq("id", fileId)
    .eq("submission_id", submissionId)
    .single();

  if (fileError || !file) {
    return new Response(
      JSON.stringify({ error: "File not found or access denied" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const submission = file.content_submissions;

  // Check access permissions
  let hasAccess = false;

  // Creator can always access their own files
  if (submission.creator_id === user.id) {
    hasAccess = true;
  }

  // Check if user is admin
  const { data: userRole } = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (userRole?.role === "admin") {
    hasAccess = true;
  }

  // Check if user has purchased this content (using downloads table)
  if (submission.status === "approved" && !hasAccess) {
    const { data: download } = await supabaseClient
      .from("downloads")
      .select("id")
      .eq("user_id", user.id)
      .eq("submission_id", submissionId)
      .single();

    if (download) {
      hasAccess = true;
    }
  }

  // For preview files, allow access if content is approved
  if (file.is_preview && submission.status === "approved") {
    hasAccess = true;
  }

  if (!hasAccess) {
    return new Response(
      JSON.stringify({ 
        error: "Access denied. Purchase required for this content.",
        requiresPurchase: true 
      }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Determine bucket from file metadata or file path
  const bucket = file.metadata?.bucket || (file.is_original ? "original-files" : "seller-content");

  // Generate signed URL (valid for 1 hour)
  const { data: signedUrlData, error: signedUrlError } = await supabaseClient
    .storage
    .from(bucket)
    .createSignedUrl(file.file_path, 3600);

  if (signedUrlError || !signedUrlData) {
    return new Response(
      JSON.stringify({ error: "Failed to generate download URL" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Log download activity if this is an original file
  if (file.is_original) {
    await supabaseClient
      .from("downloads")
      .upsert({
        user_id: user.id,
        submission_id: submissionId,
        downloaded_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,submission_id"
      });
  }

  return new Response(
    JSON.stringify({
      download_url: signedUrlData.signedUrl,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      file_name: file.file_name,
      file_type: file.file_type,
      file_size: file.file_size,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}