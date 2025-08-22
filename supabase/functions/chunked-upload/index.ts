import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Accept-Ranges': 'bytes'
};

interface ChunkUploadRequest {
  chunk?: number[];
  chunkIndex?: number;
  totalChunks?: number;
  fileName?: string;
  uploadId?: string;
  action?: string;
  mimeType?: string;
  enableStreaming?: boolean;
  acceptRanges?: boolean;
  fileSize?: number;
}

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

    const body: ChunkUploadRequest = await req.json();
    console.log(`🔄 Processing request:`, { 
      action: body.action || 'upload',
      uploadId: body.uploadId,
      fileName: body.fileName,
      chunkIndex: body.chunkIndex,
      totalChunks: body.totalChunks,
      mimeType: body.mimeType,
      enableStreaming: body.enableStreaming,
      acceptRanges: body.acceptRanges
    });

    if (body.action === 'finalize') {
      // Finalize upload by merging chunks with streaming support
      return await finalizeUpload(supabase, body);
    } else {
      // Upload chunk
      return await uploadChunk(supabase, body);
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

/**
 * Upload individual chunk with enhanced error handling
 */
async function uploadChunk(supabase: any, body: ChunkUploadRequest) {
  const { chunk, chunkIndex, totalChunks, fileName, uploadId, mimeType } = body;

  if (!chunk || chunkIndex === undefined || !totalChunks || !fileName || !uploadId) {
    throw new Error('Missing required chunk upload parameters');
  }

  console.log(`📦 Uploading chunk ${chunkIndex + 1}/${totalChunks} for ${fileName} (${mimeType})`);

  try {
    // Convert number array back to Uint8Array
    const chunkData = new Uint8Array(chunk);
    const chunkFileName = `${uploadId}_chunk_${chunkIndex.toString().padStart(6, '0')}`;

    // Upload chunk to storage with proper content type
    const { error: uploadError } = await supabase.storage
      .from('content')
      .upload(`chunks/${chunkFileName}`, chunkData, {
        contentType: 'application/octet-stream',
        duplex: 'half',
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

/**
 * Finalize upload by merging chunks with streaming support
 */
async function finalizeUpload(supabase: any, body: ChunkUploadRequest) {
  const { uploadId, fileName, totalChunks, mimeType, enableStreaming, acceptRanges, fileSize } = body;

  if (!uploadId || !fileName || !totalChunks) {
    throw new Error('Missing required finalization parameters');
  }

  console.log(`🔄 Finalizing streaming upload for ${fileName} (${totalChunks} chunks, ${fileSize} bytes)`);

  try {
    // List all chunks
    const { data: chunkFiles, error: listError } = await supabase.storage
      .from('content')
      .list('chunks', {
        search: `${uploadId}_chunk_`
      });

    if (listError) {
      throw new Error(`Failed to list chunks: ${listError.message}`);
    }

    if (!chunkFiles || chunkFiles.length !== totalChunks) {
      throw new Error(`Chunk count mismatch. Expected ${totalChunks}, found ${chunkFiles?.length || 0}`);
    }

    console.log(`📋 Found ${chunkFiles.length} chunks, starting streaming merge...`);

    // Sort chunks by name to ensure correct order
    const sortedChunks = chunkFiles.sort((a, b) => a.name.localeCompare(b.name));

    // Detect MIME type from file extension if not provided
    let finalMimeType = mimeType || 'application/octet-stream';
    if (!mimeType) {
      const extension = fileName.split('.').pop()?.toLowerCase();
      const mimeTypeMap: Record<string, string> = {
        // Video MIME types
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'video/ogg',
        'ogv': 'video/ogg',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'mkv': 'video/x-matroska',
        'm4v': 'video/mp4',
        // Audio MIME types
        'mp3': 'audio/mpeg',
        'aac': 'audio/aac',
        'm4a': 'audio/mp4',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'oga': 'audio/ogg',
        'webm': 'audio/webm',
        'flac': 'audio/flac'
      };
      finalMimeType = mimeTypeMap[extension || ''] || 'application/octet-stream';
    }

    console.log(`🎯 Using MIME type: ${finalMimeType} for streaming file: ${fileName}`);

    // Download and merge chunks using streaming approach
    const mergedChunks: Uint8Array[] = [];
    let totalSize = 0;

    for (let i = 0; i < sortedChunks.length; i++) {
      const chunkFile = sortedChunks[i];
      console.log(`📥 Downloading chunk ${i + 1}/${sortedChunks.length}: ${chunkFile.name}`);
      
      const { data: chunkData, error: downloadError } = await supabase.storage
        .from('content')
        .download(`chunks/${chunkFile.name}`);

      if (downloadError || !chunkData) {
        throw new Error(`Failed to download chunk ${chunkFile.name}: ${downloadError?.message}`);
      }

      const arrayBuffer = await chunkData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      mergedChunks.push(uint8Array);
      totalSize += uint8Array.length;
      
      console.log(`✅ Downloaded chunk ${i + 1}/${sortedChunks.length} (${uint8Array.length} bytes)`);
    }

    // Create merged file with proper streaming structure
    console.log(`🔧 Creating streamable merged file (${totalSize} bytes)`);
    const mergedData = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of mergedChunks) {
      mergedData.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(`📝 Final merged file size: ${mergedData.length} bytes`);

    // Prepare upload options with streaming metadata
    const uploadOptions: any = {
      contentType: finalMimeType,
      duplex: 'half',
      upsert: true
    };

    // Add streaming-specific headers if enabled
    if (enableStreaming) {
      uploadOptions.metadata = {
        'streaming-enabled': 'true',
        'accepts-ranges': acceptRanges ? 'bytes' : 'none',
        'original-size': totalSize.toString(),
        'mime-type': finalMimeType
      };
      console.log(`🌊 Streaming metadata added for ${fileName}`);
    }

    // Upload merged file with streaming support
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('content')
      .upload(`uploads/${fileName}`, mergedData, uploadOptions);

    if (uploadError) {
      throw new Error(`Failed to upload streaming file: ${uploadError.message}`);
    }

    console.log(`✅ Streaming file uploaded successfully: ${uploadData.path}`);

    // Clean up chunks
    console.log(`🧹 Cleaning up ${sortedChunks.length} temporary chunks...`);
    const cleanupPromises = sortedChunks.map(async (chunkFile) => {
      try {
        await supabase.storage
          .from('content')
          .remove([`chunks/${chunkFile.name}`]);
        console.log(`🗑️ Deleted chunk: ${chunkFile.name}`);
      } catch (error) {
        console.warn(`⚠️ Failed to delete chunk ${chunkFile.name}:`, error);
      }
    });

    // Execute cleanup in parallel
    await Promise.allSettled(cleanupPromises);

    // Get public URL with streaming headers
    const { data: { publicUrl } } = supabase.storage
      .from('content')
      .getPublicUrl(`uploads/${fileName}`);

    console.log(`🌐 Streaming-enabled public URL: ${publicUrl}`);

    // Generate signed URL for better streaming support (24 hour expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('content')
      .createSignedUrl(`uploads/${fileName}`, 24 * 60 * 60); // 24 hours

    let streamingUrl = publicUrl;
    if (!signedUrlError && signedUrlData?.signedUrl) {
      streamingUrl = signedUrlData.signedUrl;
      console.log(`🔒 Signed streaming URL generated with 24h expiry`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileUrl: streamingUrl,
        publicUrl: publicUrl, // Fallback URL
        fileName: fileName,
        fileSize: totalSize,
        mimeType: finalMimeType,
        streamingEnabled: enableStreaming || false,
        acceptsRanges: acceptRanges || false,
        message: 'Streaming upload completed successfully' 
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Accept-Ranges': acceptRanges ? 'bytes' : 'none'
        } 
      }
    );

  } catch (error) {
    console.error('💥 Streaming finalization error:', error);
    throw error;
  }
}