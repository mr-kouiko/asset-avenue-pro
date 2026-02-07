import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// R2 configuration helper
function getR2Config() {
  const accountId = Deno.env.get('R2_ACCOUNT_ID');
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
  const bucketName = Deno.env.get('R2_BUCKET_NAME') || 'visustock';
  
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 credentials in environment');
  }
  
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`
  };
}

// AWS v4 signature helpers
const encoder = new TextEncoder();

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === 'string' ? encoder.encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? encoder.encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  let kDate = await hmac(`AWS4${secretKey}`, dateStamp);
  let kRegion = await hmac(kDate, region);
  let kService = await hmac(kRegion, service);
  let kSigning = await hmac(kService, 'aws4_request');
  return kSigning;
}

// Generate presigned URL for a specific operation
async function generatePresignedUrl(
  method: string,
  path: string,
  queryParams: Record<string, string>,
  expiresIn: number = 3600
): Promise<string> {
  const config = getR2Config();
  const region = 'auto';
  const service = 's3';
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${config.accessKeyId}/${credentialScope}`;
  
  // Add required presigned URL parameters
  const presignParams: Record<string, string> = {
    ...queryParams,
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  };
  
  // Sort and encode query string
  const sortedKeys = Object.keys(presignParams).sort();
  const canonicalQueryString = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(presignParams[k])}`)
    .join('&');
  
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  
  // For presigned URLs, payload hash is UNSIGNED-PAYLOAD
  const payloadHash = 'UNSIGNED-PAYLOAD';
  
  const canonicalRequest = [
    method,
    path,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');
  
  const signingKey = await getSignatureKey(config.secretAccessKey, dateStamp, region, service);
  const signatureBytes = await hmac(signingKey, stringToSign);
  const signature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Build final URL
  const finalQueryString = `${canonicalQueryString}&X-Amz-Signature=${signature}`;
  return `${config.endpoint}${path}?${finalQueryString}`;
}

// Initiate multipart upload and return uploadId
async function initiateMultipartUpload(objectKey: string): Promise<string> {
  const config = getR2Config();
  const path = `/${config.bucketName}/${objectKey}`;
  const region = 'auto';
  const service = 's3';
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  const payloadHash = await sha256Hex('');
  
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n') + '\n';
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  
  const canonicalRequest = [
    'POST',
    path,
    'uploads=',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');
  
  const signingKey = await getSignatureKey(config.secretAccessKey, dateStamp, region, service);
  const signatureBytes = await hmac(signingKey, stringToSign);
  const signature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  const response = await fetch(`${config.endpoint}${path}?uploads`, {
    method: 'POST',
    headers: {
      'Authorization': authorization,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('InitiateMultipartUpload failed:', response.status, errorText);
    throw new Error(`Failed to initiate multipart upload: ${response.statusText}`);
  }
  
  const xml = await response.text();
  const uploadIdMatch = xml.match(/<UploadId>(.+?)<\/UploadId>/);
  if (!uploadIdMatch) {
    throw new Error('UploadId not found in response');
  }
  
  console.log(`✅ Initiated multipart upload: ${uploadIdMatch[1]}`);
  return uploadIdMatch[1];
}

// Complete multipart upload
async function completeMultipartUpload(
  objectKey: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[]
): Promise<string> {
  const config = getR2Config();
  const path = `/${config.bucketName}/${objectKey}`;
  const region = 'auto';
  const service = 's3';
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  
  // Build XML body
  const partsXml = parts
    .sort((a, b) => a.PartNumber - b.PartNumber)
    .map(p => {
      const etag = p.ETag.startsWith('"') ? p.ETag : `"${p.ETag}"`;
      return `<Part><PartNumber>${p.PartNumber}</PartNumber><ETag>${etag}</ETag></Part>`;
    })
    .join('');
  const body = `<CompleteMultipartUpload>${partsXml}</CompleteMultipartUpload>`;
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  const payloadHash = await sha256Hex(body);
  
  const canonicalQueryString = `uploadId=${encodeURIComponent(uploadId)}`;
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n') + '\n';
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  
  const canonicalRequest = [
    'POST',
    path,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');
  
  const signingKey = await getSignatureKey(config.secretAccessKey, dateStamp, region, service);
  const signatureBytes = await hmac(signingKey, stringToSign);
  const signature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  const response = await fetch(`${config.endpoint}${path}?uploadId=${encodeURIComponent(uploadId)}`, {
    method: 'POST',
    body,
    headers: {
      'Authorization': authorization,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'Content-Type': 'application/xml',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('CompleteMultipartUpload failed:', response.status, errorText);
    throw new Error(`Failed to complete multipart upload: ${response.statusText}`);
  }
  
  await response.text(); // consume
  console.log(`✅ Completed multipart upload for ${objectKey}`);
  
  // Return public CDN URL
  return `https://cdn.visustock.com/${objectKey}`;
}

// Abort multipart upload (cleanup on failure)
async function abortMultipartUpload(objectKey: string, uploadId: string): Promise<void> {
  const config = getR2Config();
  const path = `/${config.bucketName}/${objectKey}`;
  const region = 'auto';
  const service = 's3';
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  const payloadHash = await sha256Hex('');
  
  const canonicalQueryString = `uploadId=${encodeURIComponent(uploadId)}`;
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n') + '\n';
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  
  const canonicalRequest = [
    'DELETE',
    path,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');
  
  const signingKey = await getSignatureKey(config.secretAccessKey, dateStamp, region, service);
  const signatureBytes = await hmac(signingKey, stringToSign);
  const signature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  try {
    const response = await fetch(`${config.endpoint}${path}?uploadId=${encodeURIComponent(uploadId)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authorization,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      },
    });
    await response.text(); // consume
    console.log(`🧹 Aborted multipart upload: ${uploadId}`);
  } catch (err) {
    console.warn('Failed to abort multipart upload:', err);
  }
}

// Save file metadata to database
async function saveFileMetadata(
  userId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  publicUrl: string
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from('file_uploads')
    .insert({
      user_id: userId,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
      storage_location: 'r2',
      public_url: publicUrl,
      bucket_name: Deno.env.get('R2_BUCKET_NAME') || 'visustock',
      file_path: fileName
    })
    .select()
    .single();
  
  if (error) {
    console.error('Failed to save file metadata:', error);
    throw error;
  }
  
  console.log(`✅ Saved file metadata: ${fileName}`);
  return data;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    
    const body = await req.json();
    const { action } = body;
    
    console.log(`📤 [R2 Presigned] Action: ${action}, User: ${user.id}`);
    
    // ACTION: initiate - Start a new multipart upload
    // JIT mode (recommended): only returns uploadId and objectKey, client fetches URLs per-part
    // Legacy mode: pre-generates all URLs (for backward compatibility)
    if (action === 'initiate') {
      const { fileName, fileType, fileSize, totalParts, jitMode = false } = body;
      
      if (!fileName || !totalParts) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing fileName or totalParts' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Generate unique object key
      const timestamp = Date.now();
      const ext = fileName.split('.').pop() || '';
      const objectKey = `${user.id}/${timestamp}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      
      console.log(`📦 Initiating multipart for: ${objectKey} (${totalParts} parts, JIT mode: ${jitMode})`);
      
      // Initiate multipart upload
      const uploadId = await initiateMultipartUpload(objectKey);
      
      // JIT mode: Don't pre-generate URLs - client will request them one by one
      // This prevents TTL expiration on long uploads
      if (jitMode) {
        console.log(`🔑 JIT mode: URLs will be generated per-part on demand`);
        return new Response(
          JSON.stringify({
            success: true,
            uploadId,
            objectKey,
            jitMode: true,
            expiresIn: 21600 // 6 hours for the entire upload session
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Legacy mode: Generate presigned URLs for all parts (6 hour TTL for safety)
      const config = getR2Config();
      const presignedUrls: { partNumber: number; url: string }[] = [];
      const TTL_SECONDS = 21600; // 6 hours to handle slow connections
      
      for (let i = 1; i <= totalParts; i++) {
        const url = await generatePresignedUrl(
          'PUT',
          `/${config.bucketName}/${objectKey}`,
          { partNumber: i.toString(), uploadId },
          TTL_SECONDS
        );
        presignedUrls.push({ partNumber: i, url });
      }
      
      console.log(`🔑 Legacy mode: Generated ${presignedUrls.length} presigned URLs (TTL: ${TTL_SECONDS}s)`);
      
      return new Response(
        JSON.stringify({
          success: true,
          uploadId,
          objectKey,
          presignedUrls,
          expiresIn: TTL_SECONDS
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ACTION: get-part-url - Get a fresh presigned URL for a specific part (JIT mode / retries)
    if (action === 'get-part-url') {
      const { uploadId, objectKey, partNumber } = body;
      
      if (!uploadId || !objectKey || !partNumber) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing uploadId, objectKey, or partNumber' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const config = getR2Config();
      const TTL_SECONDS = 21600; // 6 hours
      const url = await generatePresignedUrl(
        'PUT',
        `/${config.bucketName}/${objectKey}`,
        { partNumber: partNumber.toString(), uploadId },
        TTL_SECONDS
      );
      
      console.log(`🔑 JIT: Generated fresh URL for part ${partNumber} (TTL: ${TTL_SECONDS}s)`);
      
      return new Response(
        JSON.stringify({ success: true, url, expiresIn: TTL_SECONDS }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ACTION: complete - Complete the multipart upload
    if (action === 'complete') {
      const { uploadId, objectKey, parts, fileName, fileType, fileSize } = body;
      
      if (!uploadId || !objectKey || !parts || !Array.isArray(parts)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing uploadId, objectKey, or parts' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`🧩 Completing multipart: ${objectKey} (${parts.length} parts)`);
      
      const publicUrl = await completeMultipartUpload(objectKey, uploadId, parts);
      
      // Save metadata to database
      const metadata = await saveFileMetadata(
        user.id,
        objectKey,
        fileSize || 0,
        fileType || 'application/octet-stream',
        publicUrl
      );
      
      return new Response(
        JSON.stringify({
          success: true,
          publicUrl,
          metadata,
          message: 'File uploaded successfully to Cloudflare R2'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ACTION: abort - Abort a failed multipart upload
    if (action === 'abort') {
      const { uploadId, objectKey } = body;
      
      if (!uploadId || !objectKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing uploadId or objectKey' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      await abortMultipartUpload(objectKey, uploadId);
      
      return new Response(
        JSON.stringify({ success: true, message: 'Multipart upload aborted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ R2 presigned error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
