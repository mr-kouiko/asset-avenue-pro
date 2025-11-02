import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// R2 configuration helper
async function getR2Config() {
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

// Upload file directly to R2
async function uploadToR2(
  fileData: Uint8Array,
  fileName: string,
  contentType: string
): Promise<string> {
  const config = await getR2Config();
  const url = `${config.endpoint}/${config.bucketName}/${fileName}`;
  
  console.log(`📤 Uploading to R2: ${fileName} (${(fileData.length / 1024 / 1024).toFixed(2)}MB)`);
  
  // Create AWS v4 signature for authentication
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  
  // Calculate content hash
  const encoder = new TextEncoder();
  const payloadHash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', fileData))
  ).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Build canonical request
  const canonicalUri = `/${config.bucketName}/${fileName}`;
  const canonicalHeaders = [
    `host:${config.accountId}.r2.cloudflarestorage.com`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`
  ].join('\n') + '\n';
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
  // Create string to sign
  const canonicalRequestHash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest)))
  ).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n');
  
  // Calculate signature
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
  
  let signingKey = await hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  signingKey = await hmac(signingKey, region);
  signingKey = await hmac(signingKey, service);
  signingKey = await hmac(signingKey, 'aws4_request');
  
  const signature = Array.from(
    new Uint8Array(await hmac(signingKey, stringToSign))
  ).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Make authenticated PUT request
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    body: fileData,
    headers: {
      'Authorization': authorization,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'Content-Type': contentType
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ R2 upload failed: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`R2 upload failed: ${response.statusText}`);
  }
  
  console.log(`✅ R2 upload successful: ${fileName}`);
  
  // Return CDN URL
  return `https://cdn.visustock.com/${fileName}`;
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
    
    const body = await req.json();
    const { action, fileName, fileType, fileSize, totalChunks } = body;
    
    console.log(`📤 [R2] Action: ${action}, File: ${fileName}`);
    
    if (action === 'finalize-upload') {
      console.log(`🔄 Finalizing upload: ${fileName} (${totalChunks} chunks)`);
      
      // Download all chunks from Supabase Storage
      const chunks: Uint8Array[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = `temp-chunks/${user.id}/${fileName}/chunk_${i}`;
        const { data, error } = await supabase.storage
          .from('uploads')
          .download(chunkPath);
        
        if (error || !data) {
          console.error(`❌ Failed to download chunk ${i}:`, error);
          throw new Error(`Missing chunk ${i}`);
        }
        
        chunks[i] = new Uint8Array(await data.arrayBuffer());
      }
      
      // Combine chunks
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      console.log(`🧩 Combined ${chunks.length} chunks into ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      
      // Upload to R2
      const publicUrl = await uploadToR2(combined, fileName, fileType);
      
      // Save metadata
      const metadata = await saveFileMetadata(
        user.id,
        fileName,
        fileSize,
        fileType,
        'r2',
        publicUrl
      );
      
      // Clean up temp chunks
      console.log('🧹 Cleaning up temp chunks...');
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = `temp-chunks/${user.id}/${fileName}/chunk_${i}`;
        await supabase.storage.from('uploads').remove([chunkPath]);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          publicUrl,
          metadata,
          message: 'Fichier stocké avec succès dans R2 Cloudflare'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Error(`Unknown action: ${action}`);
    
  } catch (error) {
    console.error('❌ R2 error:', error);
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
