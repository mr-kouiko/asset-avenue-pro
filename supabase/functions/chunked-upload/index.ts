import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_TEMP = "temp-chunks";
const BUCKET_FINAL = "original-files";

// Vérifie que les buckets existent
async function ensureBucketExists(bucket: string) {
  const { data, error } = await supabase.storage.getBucket(bucket);
  if (error || !data) {
    throw new Error(`Bucket '${bucket}' is missing. Please create it in Supabase.`);
  }
}

// Détection MIME
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
    // Videos
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    ogv: "video/ogg",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    m4v: "video/mp4",
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
  
  const detectedType = mimeTypes[ext || ""];
  console.log(`🔍 MIME detection - File: ${fileName}, Extension: ${ext}, Type: ${detectedType || "application/octet-stream"}`);
  
  return detectedType || "application/octet-stream";
}

// Vérification auth simple
function checkAuth(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  // Exemple : Authorization: Bearer SECRET123
  const expected = Deno.env.get("UPLOAD_API_KEY");
  return expected ? authHeader === `Bearer ${expected}` : true;
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
  const finalPath = `${uploadId}/${fileName}`;
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
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (!checkAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    await ensureBucketExists(BUCKET_TEMP);
    await ensureBucketExists(BUCKET_FINAL);

    // Init upload
    if (action === "init-upload" && req.method === "POST") {
      const { uploadId } = await req.json();
      return new Response(
        JSON.stringify({ success: true, uploadId }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Upload chunk
    if (action === "upload-chunk" && req.method === "POST") {
      const uploadId = url.searchParams.get("uploadId");
      const chunkIndex = url.searchParams.get("chunkIndex");
      if (!uploadId || !chunkIndex) {
        return new Response(JSON.stringify({ error: "Missing params" }), { status: 400 });
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
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Merge chunks
    if (action === "merge-chunks" && req.method === "POST") {
      const { uploadId, fileName } = await req.json();
      if (!uploadId || !fileName) {
        return new Response(JSON.stringify({ error: "Missing uploadId or fileName" }), { status: 400 });
      }

      const finalPath = await mergeChunks(uploadId, fileName);

      return new Response(
        JSON.stringify({ success: true, path: finalPath }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (err) {
    console.error("Upload error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
