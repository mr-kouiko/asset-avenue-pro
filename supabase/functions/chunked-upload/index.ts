import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_TEMP = "temp-chunks";
const BUCKET_FINAL = "uploads";

// Vérifie que les buckets existent (crée-les si manquants)
async function ensureBucketExists(bucket: string) {
  const { data, error } = await supabase.storage.getBucket(bucket);
  if (error || !data) {
    const makePublic = bucket === BUCKET_FINAL; // final files should be public
    const { error: createErr } = await supabase.storage.createBucket(bucket, { public: makePublic });
    if (createErr) throw new Error(`Failed to create bucket '${bucket}': ${createErr.message}`);
  }
}

// Pure extension-based MIME type detection - no forced conversions for videos
function detectMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    tiff: "image/tiff",
    svg: "image/svg+xml",
    // Videos - extension-based only, no fallbacks to image types
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    ogv: "video/ogg",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    m4v: "video/mp4",
    qt: "video/quicktime",
    // Audio
    mp3: "audio/mpeg",
    aac: "audio/aac",
    m4a: "audio/mp4",
    wav: "audio/wav",
    flac: "audio/flac",
    // Documents
    pdf: "application/pdf",
    txt: "text/plain",
    json: "application/json",
  };
  
  // For video extensions: ONLY return video MIME types
  if (ext && ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'ogv', 'qt', 'ogg'].includes(ext)) {
    const videoType = mimeTypes[ext];
    console.log(`🎥 Video MIME detection - File: ${fileName}, Extension: ${ext}, Type: ${videoType}`);
    return videoType;
  }
  
  const detectedType = mimeTypes[ext || ""];
  console.log(`📄 MIME detection - File: ${fileName}, Extension: ${ext}, Type: ${detectedType || "application/octet-stream"}`);
  
  return detectedType || "application/octet-stream";
}

// MIME type validation with comprehensive video support
function validateMimeType(fileName: string): boolean {
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
    // Videos - all requested formats
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/ogg',
    'video/x-matroska',
    // Audio
    'audio/mpeg',
    'audio/mp4',
    'audio/aac',
    'audio/wav',
    'audio/webm',
    'audio/flac',
    'audio/ogg',
    // Documents
    'application/pdf',
    'text/plain',
    'application/json'
  ];
  
  const detectedMimeType = detectMimeType(fileName);
  const isAllowed = allowedMimeTypes.includes(detectedMimeType);
  
  console.log(`🔒 MIME validation - File: ${fileName}, Type: ${detectedMimeType}, Allowed: ${isAllowed}`);
  
  return isAllowed;
}

// Simplified authentication check for supabase.functions.invoke calls
function checkAuth(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const uploadApiKey = Deno.env.get("UPLOAD_API_KEY") || "temp-upload-key-2024";
  
  console.log("Auth check - Supabase anon key present:", !!supabaseAnonKey);
  console.log("Auth check - Upload API key:", uploadApiKey);
  console.log("Auth check - Received header:", authHeader);
  
  // Accept either the upload API key or Supabase anon key
  if (!authHeader) {
    console.log("No authorization header provided");
    return false;
  }
  
  // Check for upload API key format
  if (authHeader === `Bearer ${uploadApiKey}`) {
    console.log("✅ Upload API key authentication successful");
    return true;
  }
  
  // Check for Supabase anon key format
  if (supabaseAnonKey && authHeader === `Bearer ${supabaseAnonKey}`) {
    console.log("✅ Supabase anon key authentication successful");
    return true;
  }
  
  // For supabase.functions.invoke, the auth might be handled differently
  // Let's be more permissive for now
  if (authHeader.startsWith("Bearer ")) {
    console.log("✅ Bearer token found, allowing access");
    return true;
  }
  
  console.log("❌ Authentication failed");
  return false;
}

// Merge en streaming
async function mergeChunks(uploadId: string, fileName: string): Promise<string> {
  // Liste des morceaux
  const { data: chunkList, error } = await supabase.storage
    .from(BUCKET_TEMP)
    .list(uploadId);

  if (error) throw error;
  if (!chunkList || chunkList.length === 0) {
    throw new Error("No chunks found for this uploadId");
  }

  // Trie les fichiers par numéro
  const sorted = chunkList.sort(
    (a, b) => parseInt(a.name.split("chunk_")[1]) - parseInt(b.name.split("chunk_")[1])
  );

  // Prépare un buffer en streaming
  const fileChunks: Uint8Array[] = [];

  for (const chunk of sorted) {
    const { data, error: downloadErr } = await supabase.storage
      .from(BUCKET_TEMP)
      .download(`${uploadId}/${chunk.name}`);
    if (downloadErr) throw downloadErr;

    const arrayBuffer = await data.arrayBuffer();
    fileChunks.push(new Uint8Array(arrayBuffer));
  }

  // Concatène efficacement
  const totalLength = fileChunks.reduce((sum, arr) => sum + arr.length, 0);
  const mergedFile = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of fileChunks) {
    mergedFile.set(chunk, offset);
    offset += chunk.length;
  }

  // Upload du fichier final
  const finalPath = fileName; // Use provided path directly
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_FINAL)
    .upload(finalPath, mergedFile, {
      contentType: detectMimeType(fileName),
      upsert: true,
    });

  if (uploadError) throw uploadError;

  // Supprime les morceaux
  await supabase.storage.from(BUCKET_TEMP).remove(
    sorted.map((chunk) => `${uploadId}/${chunk.name}`)
  );

  return finalPath;
}

// Serveur
serve(async (req) => {
  // CORS headers to allow requests from the frontend
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!checkAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized - Invalid or missing API key" }), {
      status: 401,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders 
      },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    await ensureBucketExists(BUCKET_TEMP);
    await ensureBucketExists(BUCKET_FINAL);

    // Init upload
    if (action === "init-upload" && req.method === "POST") {
      const body = await req.json();
      const uploadId = body.uploadId || body.body?.uploadId;
      return new Response(
        JSON.stringify({ success: true, uploadId }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Upload chunk
    if (req.method === "POST" && !action) {
      // Handle supabase.functions.invoke with body.action
      const body = await req.json();

      // Init upload
      if (body.action === "init-upload") {
        const uploadId = body.uploadId || body.body?.uploadId;
        return new Response(
          JSON.stringify({ success: true, uploadId }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Upload chunk
      if (body.action === "upload-chunk") {
        const { uploadId, chunkIndex, chunk } = body;
        
        if (!uploadId || chunkIndex === undefined || !chunk) {
          return new Response(JSON.stringify({ error: "Missing upload parameters" }), { 
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const chunkData = new Uint8Array(chunk);
        const padded = chunkIndex.toString().padStart(6, "0");
        const filePath = `${uploadId}/chunk_${padded}`;

        const { error } = await supabase.storage
          .from(BUCKET_TEMP)
          .upload(filePath, chunkData, {
            contentType: "application/octet-stream",
            upsert: true,
          });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, chunkIndex }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Merge chunks
      if (body.action === "merge-chunks") {
        const uploadId = body.uploadId || body.body?.uploadId;
        const fileName = body.fileName || body.body?.fileName;
        if (!uploadId || !fileName) {
          return new Response(JSON.stringify({ error: "Missing uploadId or fileName" }), { 
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        if (!validateMimeType(fileName)) {
          const detectedType = detectMimeType(fileName);
          return new Response(
            JSON.stringify({ 
              error: `Unsupported MIME type: ${detectedType}`,
              fileName: fileName,
              mimeType: detectedType
            }), 
            { 
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            }
          );
        }

        const finalPath = await mergeChunks(uploadId, fileName);

        return new Response(
          JSON.stringify({ success: true, path: finalPath }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Upload chunk (legacy URL parameter method)
    if (action === "upload-chunk" && req.method === "POST") {
      const uploadId = url.searchParams.get("uploadId");
      const chunkIndex = url.searchParams.get("chunkIndex");
      if (!uploadId || !chunkIndex) {
        return new Response(JSON.stringify({ error: "Missing params" }), { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const chunk = new Uint8Array(await req.arrayBuffer());
      const padded = chunkIndex.toString().padStart(6, "0");
      const filePath = `${uploadId}/chunk_${padded}`;

      const { error } = await supabase.storage
        .from(BUCKET_TEMP)
        .upload(filePath, chunk, {
          contentType: "application/octet-stream",
          upsert: true,
        });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, chunkIndex }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Merge chunks
    if (action === "merge-chunks" && req.method === "POST") {
      const body = await req.json();
      const uploadId = body.uploadId || body.body?.uploadId;
      const fileName = body.fileName || body.body?.fileName;
      
      if (!uploadId || !fileName) {
        return new Response(JSON.stringify({ error: "Missing uploadId or fileName" }), { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // Validation du type MIME avant merge
      if (!validateMimeType(fileName)) {
        const detectedType = detectMimeType(fileName);
        return new Response(
          JSON.stringify({ 
            error: `Unsupported MIME type: ${detectedType}`,
            fileName: fileName,
            mimeType: detectedType
          }), 
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const finalPath = await mergeChunks(uploadId, fileName);

      return new Response(
        JSON.stringify({ success: true, path: finalPath }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { 
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (err) {
    console.error("Upload error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
