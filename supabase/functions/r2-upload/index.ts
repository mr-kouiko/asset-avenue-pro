import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AWS SDK v3 compatible S3 client for Cloudflare R2
async function createR2Client() {
  const accountId = Deno.env.get('R2_ACCOUNT_ID');
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
  
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 credentials');
  }
  
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`
  };
}

// Generate presigned URL for R2 upload
async function generatePresignedUrl(
  fileName: string,
  fileType: string,
  expiresIn: number = 3600
): Promise<string> {
  const r2Config = await createR2Client();
  const bucketName = Deno.env.get('R2_BUCKET_NAME') || 'visustock';
  
  // Create AWS signature v4 for presigned URL
  const region = 'auto'; // R2 uses 'auto' region
  const service = 's3';
  const host = `${bucketName}.${r2Config.accountId}.r2.cloudflarestorage.com`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  // Canonical request
  const canonicalUri = `/${encodeURIComponent(fileName)}`;
  const canonicalQuerystring = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(`${r2Config.accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`)}`,
    `X-Amz-Date=${amzDate}`,
    `X-Amz-Expires=${expiresIn}`,
    `X-Amz-SignedHeaders=host`
  ].join('&');
  
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';
  
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
  // String to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  
  const encoder = new TextEncoder();
  const canonicalRequestHash = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(canonicalRequest)
  );
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHashHex
  ].join('\n');
  
  // Calculate signature
  const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
    const kDate = await hmac(`AWS4${key}`, dateStamp);
    const kRegion = await hmac(kDate, regionName);
    const kService = await hmac(kRegion, serviceName);
    const kSigning = await hmac(kService, 'aws4_request');
    return kSigning;
  };
  
  const hmac = async (key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> => {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      typeof key === 'string' ? encoder.encode(key) : key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  };
  
  const signingKey = await getSignatureKey(
    r2Config.secretAccessKey,
    dateStamp,
    region,
    service
  );
  
  const signature = await hmac(signingKey, stringToSign);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Construct presigned URL
  const presignedUrl = `https://${host}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signatureHex}`;
  
  console.log(`✅ Generated presigned URL for: ${fileName}`);
  return presignedUrl;
}

// Save file metadata to Supabase
async function saveFileMetadata(
  userId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  storageLocation: 'supabase' | 'r2',
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
      storage_location: storageLocation,
      public_url: publicUrl,
      bucket_name: storageLocation === 'r2' ? Deno.env.get('R2_BUCKET_NAME') : 'uploads',
      file_path: fileName
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Failed to save file metadata:', error);
    throw error;
  }
  
  console.log(`✅ Saved file metadata to database:`, data);
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
      global: {
        headers: { Authorization: authHeader }
      }
    });
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    
    const { action, fileName, fileType, fileSize } = await req.json();
    
    console.log(`📤 [R2 Upload] Action: ${action}, File: ${fileName}`);
    
    if (action === 'generate-presigned-url') {
      // Generate presigned URL for client-side upload
      const presignedUrl = await generatePresignedUrl(fileName, fileType);
      const cdnUrl = `https://cdn.visustock.com/${fileName}`;
      
      return new Response(
        JSON.stringify({
          success: true,
          presignedUrl,
          publicUrl: cdnUrl,
          fileName
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'save-metadata') {
      // Save metadata after successful upload
      const { publicUrl, storageLocation } = await req.json();
      
      const metadata = await saveFileMetadata(
        user.id,
        fileName,
        fileSize,
        fileType,
        storageLocation,
        publicUrl
      );
      
      return new Response(
        JSON.stringify({
          success: true,
          metadata,
          message: storageLocation === 'r2' 
            ? 'Fichier stocké avec succès dans R2 Cloudflare'
            : 'Fichier stocké avec succès dans Supabase Storage'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Error(`Unknown action: ${action}`);
    
  } catch (error) {
    console.error('❌ R2 Upload error:', error);
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
