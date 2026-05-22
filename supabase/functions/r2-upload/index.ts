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

// ✅ FIX: centralized public URL generator (NO CDN)
function getPublicR2Url(fileName: string) {
  const accountId = Deno.env.get('R2_ACCOUNT_ID');
  const bucketName = Deno.env.get('R2_BUCKET_NAME') || 'visustock';

  return `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${fileName}`;
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

  const response = await fetch(url, {
    method: 'PUT',
    body: fileData,
    headers: {
      'Content-Type': contentType
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ R2 upload failed: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`R2 upload failed`);
  }

  console.log(`✅ R2 upload successful: ${fileName}`);

  // ✅ FIXED
  return getPublicR2Url(fileName);
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const { action, fileName, fileType, fileSize, totalChunks } = body;

    console.log(`📤 [R2] Action: ${action}, File: ${fileName}`);

    if (action === 'finalize-upload') {
      console.log(`🔄 Finalizing upload: ${fileName} (${totalChunks} chunks)`);

      const config = await getR2Config();
      const encoder = new TextEncoder();

      const sha256Hex = async (data: Uint8Array | string): Promise<string> => {
        const bytes = typeof data === 'string' ? encoder.encode(data) : data;
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
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

      const sign = async (
        method: string,
        canonicalUri: string,
        queryParams: Record<string, string>,
        payloadHash: string,
        amzDate: string,
        dateStamp: string
      ) => {
        const region = 'auto';
        const service = 's3';
        const host = `${config.accountId}.r2.cloudflarestorage.com`;

        const entries = Object.entries(queryParams).sort(([a], [b]) => a.localeCompare(b));
        const canonicalQuery = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

        const canonicalHeaders = [
          `host:${host}`,
          `x-amz-content-sha256:${payloadHash}`,
          `x-amz-date:${amzDate}`,
        ].join('\n') + '\n';

        const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

        const canonicalRequest = [
          method,
          canonicalUri,
          canonicalQuery,
          canonicalHeaders,
          signedHeaders,
          payloadHash,
        ].join('\n');

        const canonicalRequestHash = await sha256Hex(encoder.encode(canonicalRequest));
        const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

        const stringToSign = [
          'AWS4-HMAC-SHA256',
          amzDate,
          credentialScope,
          canonicalRequestHash,
        ].join('\n');

        let signingKey = await hmac(`AWS4${config.secretAccessKey}`, dateStamp);
        signingKey = await hmac(signingKey, region);
        signingKey = await hmac(signingKey, service);
        signingKey = await hmac(signingKey, 'aws4_request');

        const signature = Array.from(new Uint8Array(await hmac(signingKey, stringToSign)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        return { authorization };
      };

      const fileUrl = getPublicR2Url(fileName);
      const baseUri = `/${config.bucketName}/${fileName}`;
      const baseUrl = `${config.endpoint}${baseUri}`;

      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = amzDate.slice(0, 8);

      const emptyHash = await sha256Hex('');
      const initSig = await sign('POST', baseUri, { uploads: '' }, emptyHash, amzDate, dateStamp);

      const initResp = await fetch(`${baseUrl}?uploads`, {
        method: 'POST',
        headers: {
          'Authorization': initSig.authorization,
          'x-amz-content-sha256': emptyHash,
          'x-amz-date': amzDate,
        },
      });

      if (!initResp.ok) throw new Error('Failed to init multipart upload');

      const initXml = await initResp.text();
      const uploadId = initXml.match(/<UploadId>(.+?)<\/UploadId>/)?.[1];
      if (!uploadId) throw new Error('No uploadId');

      const parts: { PartNumber: number; ETag: string }[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = `temp-chunks/${user.id}/${fileName}/chunk_${i}`;
        const { data, error } = await supabase.storage.from('uploads').download(chunkPath);
        if (error || !data) throw new Error(`Missing chunk ${i}`);

        const bytes = new Uint8Array(await data.arrayBuffer());
        const payloadHash = await sha256Hex(bytes);

        const partNumber = i + 1;

        const putResp = await fetch(
          `${baseUrl}?partNumber=${partNumber}&uploadId=${encodeURIComponent(uploadId)}`,
          {
            method: 'PUT',
            body: bytes,
            headers: {
              'x-amz-content-sha256': payloadHash,
            },
          }
        );

        if (!putResp.ok) throw new Error(`Part ${partNumber} failed`);

        const etag = putResp.headers.get('ETag') || '';
        parts.push({ PartNumber: partNumber, ETag: etag });
      }

      const completeXml =
        `<CompleteMultipartUpload>` +
        parts.map(p => `<Part><PartNumber>${p.PartNumber}</PartNumber><ETag>${p.ETag}</ETag></Part>`).join('') +
        `</CompleteMultipartUpload>`;

      const completeHash = await sha256Hex(completeXml);

      const completeResp = await fetch(`${baseUrl}?uploadId=${encodeURIComponent(uploadId)}`, {
        method: 'POST',
        body: completeXml,
        headers: {
          'x-amz-content-sha256': completeHash,
        },
      });

      if (!completeResp.ok) throw new Error('Complete failed');

      // ✅ FIXED FINAL URL
      const publicUrl = fileUrl;

      const metadata = await saveFileMetadata(
        user.id,
        fileName,
        fileSize,
        fileType,
        'r2',
        publicUrl
      );

      return new Response(JSON.stringify({
        success: true,
        publicUrl,
        metadata
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
