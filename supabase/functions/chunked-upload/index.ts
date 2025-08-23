import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log(`📤 Chunked upload request: ${req.method}`);

  if (req.method === 'OPTIONS') {
    console.log('📋 Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log(`🔄 Processing action: ${action}`);

    if (action === 'init-upload') {
      return await initUpload(req, supabase);
    } else if (action === 'upload-chunk') {
      return await uploadChunk(req, supabase);
    } else if (action === 'merge-chunks') {
      return await mergeChunks(req, supabase);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('💥 Chunked upload error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function initUpload(req: Request, supabase: any) {
  const { fileName, fileSize, totalChunks, basePath } = await req.json();
  
  if (!fileName || !fileSize || !totalChunks || !basePath) {
    throw new Error('Missing required parameters for upload initialization');
  }

  const uploadId = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  console.log(`🆔 Initialized upload: ${uploadId} for ${fileName} (${totalChunks} chunks)`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      uploadId,
      message: 'Upload initialized successfully' 
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function uploadChunk(req: Request, supabase: any) {
  const formData = await req.formData();
  const chunk = formData.get('chunk') as File;
  const chunkIndex = parseInt(formData.get('chunkIndex') as string);
  const totalChunks = parseInt(formData.get('totalChunks') as string);
  const fileName = formData.get('fileName') as string;
  const uploadId = formData.get('uploadId') as string;

  if (!chunk || isNaN(chunkIndex) || !totalChunks || !fileName || !uploadId) {
    throw new Error('Missing required chunk upload parameters');
  }

  console.log(`📦 Uploading chunk ${chunkIndex + 1}/${totalChunks} for ${fileName}`);

  try {
    const chunkFileName = `${uploadId}_chunk_${chunkIndex.toString().padStart(6, '0')}`;
    const chunkArrayBuffer = await chunk.arrayBuffer();
    const chunkData = new Uint8Array(chunkArrayBuffer);

    // Upload chunk to temp-chunks bucket
    const { error: uploadError } = await supabase.storage
      .from('temp-chunks')
      .upload(`${uploadId}/${chunkFileName}`, chunkData, {
        contentType: 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error(`❌ Chunk upload failed for ${chunkFileName}:`, uploadError);
      throw new Error(`Chunk upload failed: ${uploadError.message}`);
    }

    console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully (${chunkData.length} bytes)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunkIndex,
        chunkSize: chunkData.length,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error(`💥 Exception during chunk upload:`, error);
    throw error;
  }
}

async function mergeChunks(req: Request, supabase: any) {
  const { uploadId, fileName, totalChunks, bucket, basePath } = await req.json();

  if (!uploadId || !fileName || !totalChunks || !basePath) {
    throw new Error('Missing required merge parameters');
  }

  console.log(`🔄 Merging ${totalChunks} chunks for ${fileName}`);

  try {
    // List all chunks for this upload
    const { data: chunkFiles, error: listError } = await supabase.storage
      .from('temp-chunks')
      .list(uploadId);

    if (listError) {
      throw new Error(`Failed to list chunks: ${listError.message}`);
    }

    if (!chunkFiles || chunkFiles.length !== totalChunks) {
      throw new Error(`Chunk count mismatch. Expected ${totalChunks}, found ${chunkFiles?.length || 0}`);
    }

    console.log(`📋 Found ${chunkFiles.length} chunks, starting merge...`);

    // Sort chunks by name to ensure correct order
    const sortedChunks = chunkFiles
      .filter(file => file.name.includes('chunk_'))
      .sort((a, b) => {
        const aIndex = parseInt(a.name.split('chunk_')[1]);
        const bIndex = parseInt(b.name.split('chunk_')[1]);
        return aIndex - bIndex;
      });

    // Download and merge chunks
    const mergedChunks: Uint8Array[] = [];
    let totalSize = 0;

    for (let i = 0; i < sortedChunks.length; i++) {
      const chunkFile = sortedChunks[i];
      console.log(`📥 Downloading chunk ${i + 1}/${sortedChunks.length}: ${chunkFile.name}`);
      
      const { data: chunkData, error: downloadError } = await supabase.storage
        .from('temp-chunks')
        .download(`${uploadId}/${chunkFile.name}`);

      if (downloadError || !chunkData) {
        throw new Error(`Failed to download chunk ${chunkFile.name}: ${downloadError?.message}`);
      }

      const arrayBuffer = await chunkData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      mergedChunks.push(uint8Array);
      totalSize += uint8Array.length;
      
      console.log(`✅ Downloaded chunk ${i + 1}/${sortedChunks.length} (${uint8Array.length} bytes)`);
    }

    // Create merged file
    console.log(`🔧 Creating merged file (${totalSize} bytes)`);
    const mergedData = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of mergedChunks) {
      mergedData.set(chunk, offset);
      offset += chunk.length;
    }

    // Detect MIME type from file extension
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeTypeMap: Record<string, string> = {
      // Image types
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
      // Video types
      'mp4': 'video/mp4', 'webm': 'video/webm', 'ogg': 'video/ogg', 'mov': 'video/quicktime', 'avi': 'video/x-msvideo',
      // Audio types  
      'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'm4a': 'audio/mp4', 'aac': 'audio/aac', 'flac': 'audio/flac'
    };
    const contentType = mimeTypeMap[extension || ''] || 'application/octet-stream';

    // Upload merged file to the target bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket || 'original-files')
      .upload(basePath, mergedData, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload merged file: ${uploadError.message}`);
    }

    console.log(`✅ Merged file uploaded successfully: ${uploadData.path}`);

    // Clean up chunks
    console.log(`🧹 Cleaning up ${sortedChunks.length} temporary chunks...`);
    const cleanupPromises = sortedChunks.map(async (chunkFile) => {
      try {
        await supabase.storage
          .from('temp-chunks')
          .remove([`${uploadId}/${chunkFile.name}`]);
        console.log(`🗑️ Deleted chunk: ${chunkFile.name}`);
      } catch (error) {
        console.warn(`⚠️ Failed to delete chunk ${chunkFile.name}:`, error);
      }
    });

    // Execute cleanup in parallel
    await Promise.allSettled(cleanupPromises);

    // Also clean up the upload folder
    try {
      const { error: folderDeleteError } = await supabase.storage
        .from('temp-chunks')
        .remove([uploadId]);
      if (folderDeleteError) {
        console.warn('⚠️ Failed to delete upload folder:', folderDeleteError);
      }
    } catch (error) {
      console.warn('⚠️ Exception deleting upload folder:', error);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        path: uploadData.path,
        fileName: fileName,
        fileSize: totalSize,
        contentType: contentType,
        message: 'File upload completed successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Merge error:', error);
    throw error;
  }
}