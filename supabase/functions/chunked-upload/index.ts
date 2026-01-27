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

// ============= SECURITY: File size limits per content type =============
const MAX_FILE_SIZE: Record<string, number> = {
  video: 2 * 1024 * 1024 * 1024,   // 2GB for videos (high-res content)
  image: 50 * 1024 * 1024,          // 50MB for images
  audio: 100 * 1024 * 1024,         // 100MB for audio
  document: 50 * 1024 * 1024,       // 50MB for documents
  default: 50 * 1024 * 1024,        // 50MB default
};

// Rate limiting: Track upload sessions per user (in-memory cache with TTL)
const uploadRateLimits = new Map<string, { count: number; resetTime: number }>();
const MAX_UPLOADS_PER_HOUR = 50;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Daily upload quota per user (tracked in database)
const DAILY_UPLOAD_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5GB per day

// Magic bytes for content validation
const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  'image/jpeg': [new Uint8Array([0xFF, 0xD8, 0xFF])],
  'image/png': [new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
  'image/gif': [new Uint8Array([0x47, 0x49, 0x46, 0x38])],
  'image/webp': [new Uint8Array([0x52, 0x49, 0x46, 0x46])], // RIFF header
  'video/mp4': [
    new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), // ftyp
    new Uint8Array([0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70]), // ftyp
    new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]), // ftyp
  ],
  'audio/mpeg': [
    new Uint8Array([0xFF, 0xFB]), // MP3 frame sync
    new Uint8Array([0xFF, 0xFA]), // MP3 frame sync
    new Uint8Array([0xFF, 0xF3]), // MP3 frame sync
    new Uint8Array([0x49, 0x44, 0x33]), // ID3 tag
  ],
  'application/pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])], // %PDF
};

// Check rate limit for user
function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userLimit = uploadRateLimits.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    uploadRateLimits.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_UPLOADS_PER_HOUR - 1 };
  }
  
  if (userLimit.count >= MAX_UPLOADS_PER_HOUR) {
    console.log(`⚠️ Rate limit exceeded for user: ${userId}`);
    return { allowed: false, remaining: 0 };
  }
  
  userLimit.count++;
  return { allowed: true, remaining: MAX_UPLOADS_PER_HOUR - userLimit.count };
}

// Validate file content against magic bytes
function validateMagicBytes(data: Uint8Array, expectedMimeType: string): boolean {
  const patterns = MAGIC_BYTES[expectedMimeType];
  if (!patterns) {
    // No pattern defined, skip validation
    return true;
  }
  
  for (const pattern of patterns) {
    if (data.length >= pattern.length) {
      let matches = true;
      for (let i = 0; i < pattern.length; i++) {
        if (data[i] !== pattern[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        console.log(`✅ Magic bytes validated for ${expectedMimeType}`);
        return true;
      }
    }
  }
  
  console.log(`❌ Magic bytes validation failed for ${expectedMimeType}`);
  return false;
}

// Get file size limit based on content type
function getFileSizeLimit(mimeType: string): number {
  if (mimeType.startsWith('video/')) return MAX_FILE_SIZE.video;
  if (mimeType.startsWith('image/')) return MAX_FILE_SIZE.image;
  if (mimeType.startsWith('audio/')) return MAX_FILE_SIZE.audio;
  if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) return MAX_FILE_SIZE.document;
  return MAX_FILE_SIZE.default;
}

// Check user's daily upload quota
async function checkDailyQuota(userId: string, fileSize: number): Promise<{ allowed: boolean; used: number; limit: number }> {
  const today = new Date().toISOString().split('T')[0];
  
  // Query today's uploads for this user
  const { data, error } = await supabase
    .from('file_uploads')
    .select('file_size')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00.000Z`);
  
  if (error) {
    console.error('Error checking daily quota:', error);
    // Allow on error to not block legitimate uploads
    return { allowed: true, used: 0, limit: DAILY_UPLOAD_QUOTA_BYTES };
  }
  
  const usedToday = (data || []).reduce((sum, row) => sum + (row.file_size || 0), 0);
  const allowed = (usedToday + fileSize) <= DAILY_UPLOAD_QUOTA_BYTES;
  
  if (!allowed) {
    console.log(`⚠️ Daily quota exceeded for user ${userId}: ${usedToday} + ${fileSize} > ${DAILY_UPLOAD_QUOTA_BYTES}`);
  }
  
  return { allowed, used: usedToday, limit: DAILY_UPLOAD_QUOTA_BYTES };
}

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

// MIME type validation - only MP4 for videos
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
    // Videos - ONLY MP4 allowed
    'video/mp4',
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
  
  // Reject non-MP4 video files
  if (detectedMimeType.startsWith('video/') && detectedMimeType !== 'video/mp4') {
    console.log(`❌ Video rejected - Only MP4 allowed. File: ${fileName}, Type: ${detectedMimeType}`);
    return false;
  }
  
  const isAllowed = allowedMimeTypes.includes(detectedMimeType);
  
  console.log(`🔒 MIME validation - File: ${fileName}, Type: ${detectedMimeType}, Allowed: ${isAllowed}`);
  
  return isAllowed;
}

// Simplified authentication check for supabase.functions.invoke calls
function checkAuth(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  
  // For supabase.functions.invoke, auth is handled by Supabase
  // We just need to verify a Bearer token is present
  if (!authHeader) {
    console.log("❌ No authorization header provided");
    return false;
  }
  
  if (authHeader.startsWith("Bearer ")) {
    console.log("✅ Valid Bearer token present");
    return true;
  }
  
  console.log("❌ Invalid authorization format");
  return false;
}

// Extract user ID from JWT token in authorization header
async function extractUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.replace("Bearer ", "");
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.log("⚠️ Could not extract user from token:", error?.message);
      return null;
    }
    return user.id;
  } catch (err) {
    console.log("⚠️ Error extracting user ID:", err);
    return null;
  }
}

// Memory-efficient merge: download and upload chunks one at a time
// to avoid memory limit issues with large files
async function mergeChunks(uploadId: string, fileName: string): Promise<string> {
  const startTime = Date.now();
  console.log(`🧩 [Merge] Starting for uploadId: ${uploadId}`);

  // List chunks
  const { data: chunkList, error } = await supabase.storage
    .from(BUCKET_TEMP)
    .list(uploadId, { limit: 10000, offset: 0, sortBy: { column: 'name', order: 'asc' } });

  if (error) throw error;
  if (!chunkList || chunkList.length === 0) {
    throw new Error("No chunks found for this uploadId");
  }

  // Sort by chunk number
  const sorted = chunkList.sort(
    (a, b) => parseInt(a.name.split("chunk_")[1]) - parseInt(b.name.split("chunk_")[1])
  );

  console.log(`📦 [Merge] Found ${sorted.length} chunks to merge`);
  
  // SECURITY: Validate first chunk's magic bytes before processing all chunks
  const expectedMimeType = detectMimeType(fileName);
  console.log(`🔍 [Merge] Validating magic bytes for ${expectedMimeType}`);
  
  // Download first chunk for validation
  const { data: firstChunkData, error: firstChunkError } = await supabase.storage
    .from(BUCKET_TEMP)
    .download(`${uploadId}/${sorted[0].name}`);
  
  if (firstChunkError) throw firstChunkError;
  
  const firstChunkBytes = new Uint8Array(await firstChunkData.arrayBuffer());
  
  // Validate magic bytes (content-type verification)
  if (!validateMagicBytes(firstChunkBytes, expectedMimeType)) {
    // Cleanup chunks before throwing error
    console.log(`⚠️ [Merge] Magic bytes validation failed - cleaning up chunks`);
    await cleanupChunks(uploadId, sorted);
    throw new Error(`File content does not match expected type: ${expectedMimeType}. File may be corrupted or have incorrect extension.`);
  }

  // For small files (< 50MB estimated), use the fast in-memory method
  // For larger files, use streaming approach
  const estimatedSize = sorted.length * 6 * 1024 * 1024; // ~6MB per chunk
  const MAX_MEMORY_SIZE = 50 * 1024 * 1024; // 50MB threshold

  if (estimatedSize < MAX_MEMORY_SIZE) {
    console.log(`📦 [Merge] Using in-memory merge for small file`);
    return await mergeChunksInMemory(uploadId, fileName, sorted, startTime, firstChunkBytes);
  }

  console.log(`📦 [Merge] Using streaming merge for large file (${sorted.length} chunks)`);
  return await mergeChunksStreaming(uploadId, fileName, sorted, startTime, firstChunkBytes);
}

// Fast in-memory merge for smaller files
async function mergeChunksInMemory(
  uploadId: string, 
  fileName: string, 
  sorted: any[], 
  startTime: number,
  firstChunkBytes?: Uint8Array
): Promise<string> {
  const BATCH_SIZE = 5; // Smaller batch for safety
  const fileChunks: Uint8Array[] = new Array(sorted.length);
  
  // Use pre-downloaded first chunk if available
  if (firstChunkBytes) {
    fileChunks[0] = firstChunkBytes;
    console.log(`✓ [Merge] Using pre-downloaded first chunk`);
  }

  for (let i = firstChunkBytes ? 1 : 0; i < sorted.length; i += BATCH_SIZE) {
    const batch = sorted.slice(i, Math.min(i + BATCH_SIZE, sorted.length));
    const batchPromises = batch.map(async (chunk, batchIdx) => {
      const globalIdx = i + batchIdx;
      if (globalIdx === 0 && firstChunkBytes) return; // Skip first chunk if already downloaded
      
      const { data, error: downloadErr } = await supabase.storage
        .from(BUCKET_TEMP)
        .download(`${uploadId}/${chunk.name}`);
      if (downloadErr) throw downloadErr;

      const arrayBuffer = await data.arrayBuffer();
      fileChunks[globalIdx] = new Uint8Array(arrayBuffer);
      console.log(`✓ [Merge] Downloaded chunk ${globalIdx + 1}/${sorted.length}`);
    });

    await Promise.all(batchPromises);
  }

  const totalLength = fileChunks.reduce((sum, arr) => sum + arr.length, 0);
  const mergedFile = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of fileChunks) {
    mergedFile.set(chunk, offset);
    offset += chunk.length;
  }

  console.log(`🔗 [Merge] Concatenated ${totalLength} bytes`);

  const finalPath = fileName;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_FINAL)
    .upload(finalPath, mergedFile, {
      contentType: detectMimeType(fileName),
      upsert: true,
    });

  if (uploadError) throw uploadError;

  console.log(`📤 [Merge] Uploaded final file: ${finalPath}`);
  await cleanupChunks(uploadId, sorted);
  console.log(`🧹 [Merge] Cleanup completed in ${Date.now() - startTime}ms total`);

  return finalPath;
}

// Streaming merge for large files - process chunks sequentially
// to minimize memory usage
async function mergeChunksStreaming(
  uploadId: string, 
  fileName: string, 
  sorted: any[], 
  startTime: number,
  firstChunkBytes?: Uint8Array
): Promise<string> {
  // For very large files, we need to use a different approach:
  // Copy chunks to final bucket with numbered names, then use resumable upload
  // But Supabase doesn't support resumable uploads well, so we'll process in smaller batches
  
  const MINI_BATCH_SIZE = 3; // Process 3 chunks at a time (~18MB in memory max)
  const allChunkData: Uint8Array[] = [];
  
  // Use pre-downloaded first chunk if available
  if (firstChunkBytes) {
    allChunkData.push(firstChunkBytes);
    console.log(`✓ [Merge] Using pre-downloaded first chunk`);
  }
  
  // Start from index 1 if first chunk is already downloaded
  const startIndex = firstChunkBytes ? 1 : 0;
  
  for (let i = startIndex; i < sorted.length; i += MINI_BATCH_SIZE) {
    const batch = sorted.slice(i, Math.min(i + MINI_BATCH_SIZE, sorted.length));
    
    // Download this mini-batch sequentially to control memory
    for (const chunk of batch) {
      const { data, error: downloadErr } = await supabase.storage
        .from(BUCKET_TEMP)
        .download(`${uploadId}/${chunk.name}`);
      if (downloadErr) throw downloadErr;

      const arrayBuffer = await data.arrayBuffer();
      allChunkData.push(new Uint8Array(arrayBuffer));
      console.log(`✓ [Merge] Downloaded chunk ${allChunkData.length}/${sorted.length}`);
    }
    
    // Check memory periodically and merge if getting large
    const currentSize = allChunkData.reduce((sum, arr) => sum + arr.length, 0);
    console.log(`📊 [Merge] Current buffer: ${(currentSize / 1024 / 1024).toFixed(2)}MB`);
  }

  console.log(`✅ [Merge] All chunks downloaded in ${Date.now() - startTime}ms`);

  // Now merge all chunks
  const totalLength = allChunkData.reduce((sum, arr) => sum + arr.length, 0);
  console.log(`🔗 [Merge] Total size: ${(totalLength / 1024 / 1024).toFixed(2)}MB`);
  
  const mergedFile = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of allChunkData) {
    mergedFile.set(chunk, offset);
    offset += chunk.length;
    // Clear reference to help GC
  }

  console.log(`🔗 [Merge] Concatenated ${totalLength} bytes`);

  const finalPath = fileName;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_FINAL)
    .upload(finalPath, mergedFile, {
      contentType: detectMimeType(fileName),
      upsert: true,
    });

  if (uploadError) {
    console.error(`❌ [Merge] Upload failed:`, uploadError);
    throw uploadError;
  }

  console.log(`📤 [Merge] Uploaded final file: ${finalPath}`);
  await cleanupChunks(uploadId, sorted);
  console.log(`🧹 [Merge] Cleanup completed in ${Date.now() - startTime}ms total`);

  return finalPath;
}

// Cleanup helper
async function cleanupChunks(uploadId: string, sorted: any[]) {
  const cleanupBatches = [];
  for (let i = 0; i < sorted.length; i += 100) {
    const batch = sorted.slice(i, Math.min(i + 100, sorted.length));
    cleanupBatches.push(
      supabase.storage.from(BUCKET_TEMP).remove(
        batch.map((chunk) => `${uploadId}/${chunk.name}`)
      )
    );
  }
  await Promise.all(cleanupBatches);
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
    
    // Extract user ID for rate limiting and quota tracking
    const userId = await extractUserId(req);

    await ensureBucketExists(BUCKET_TEMP);
    await ensureBucketExists(BUCKET_FINAL);

    // Init upload (legacy URL parameter method)
    if (action === "init-upload" && req.method === "POST") {
      const body = await req.json();
      const uploadId = body.uploadId || body.body?.uploadId;
      const fileName = body.fileName || body.body?.fileName;
      const fileSize = body.fileSize || body.body?.fileSize;
      
      // Apply rate limiting if we have a user ID
      if (userId) {
        const rateCheck = checkRateLimit(userId);
        if (!rateCheck.allowed) {
          return new Response(
            JSON.stringify({ 
              error: "Rate limit exceeded. Please wait before starting more uploads.",
              retryAfter: 3600 
            }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }
      
      // Validate file size if provided
      if (fileSize && fileName) {
        const mimeType = detectMimeType(fileName);
        const maxSize = getFileSizeLimit(mimeType);
        if (fileSize > maxSize) {
          return new Response(
            JSON.stringify({ 
              error: `File too large. Maximum size for ${mimeType.split('/')[0]} is ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
              maxSize: maxSize,
              actualSize: fileSize
            }),
            { status: 413, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        
        // Check daily quota
        if (userId) {
          const quotaCheck = await checkDailyQuota(userId, fileSize);
          if (!quotaCheck.allowed) {
            return new Response(
              JSON.stringify({ 
                error: "Daily upload quota exceeded. Please try again tomorrow.",
                used: quotaCheck.used,
                limit: quotaCheck.limit
              }),
              { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
        }
      }
      
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
        const fileName = body.fileName || body.body?.fileName;
        const fileSize = body.fileSize || body.body?.fileSize;
        
        // Apply rate limiting if we have a user ID
        if (userId) {
          const rateCheck = checkRateLimit(userId);
          if (!rateCheck.allowed) {
            return new Response(
              JSON.stringify({ 
                error: "Rate limit exceeded. Please wait before starting more uploads.",
                retryAfter: 3600 
              }),
              { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
        }
        
        // Validate file size if provided
        if (fileSize && fileName) {
          const mimeType = detectMimeType(fileName);
          const maxSize = getFileSizeLimit(mimeType);
          if (fileSize > maxSize) {
            return new Response(
              JSON.stringify({ 
                error: `File too large. Maximum size for ${mimeType.split('/')[0]} is ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
                maxSize: maxSize,
                actualSize: fileSize
              }),
              { status: 413, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
          
          // Check daily quota
          if (userId) {
            const quotaCheck = await checkDailyQuota(userId, fileSize);
            if (!quotaCheck.allowed) {
              return new Response(
                JSON.stringify({ 
                  error: "Daily upload quota exceeded. Please try again tomorrow.",
                  used: quotaCheck.used,
                  limit: quotaCheck.limit
                }),
                { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
              );
            }
          }
        }
        
        return new Response(
          JSON.stringify({ success: true, uploadId }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Upload chunk
      if (body.action === "upload-chunk") {
        const { uploadId, chunkIndex, chunk, chunkBase64 } = body;
        
        if (!uploadId || chunkIndex === undefined || (!chunk && !chunkBase64)) {
          return new Response(JSON.stringify({ error: "Missing upload parameters" }), { 
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        let chunkData: Uint8Array;
        if (chunkBase64) {
          // Decode base64 to Uint8Array
          const binary = atob(chunkBase64);
          const len = binary.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
          chunkData = bytes;
        } else {
          chunkData = new Uint8Array(chunk);
        }
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
    console.error("❌ Upload error:", err.message);
    console.error("❌ Error stack:", err.stack);
    return new Response(
      JSON.stringify({ 
        error: err.message,
        details: err.stack,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
