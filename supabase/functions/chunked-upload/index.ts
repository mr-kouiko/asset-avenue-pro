import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChunkUploadRequest {
  chunkIndex: number
  totalChunks: number
  fileName: string
  uploadId: string
  chunk: Blob
}

interface ChunkMergeRequest {
  uploadId: string
  fileName: string
  totalChunks: number
  bucket: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    )

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (action === 'upload-chunk') {
      return await handleChunkUpload(req, user.id)
    } else if (action === 'merge-chunks') {
      return await handleChunkMerge(req, user.id)
    } else if (action === 'init-upload') {
      return await initializeUpload(req, user.id)
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Chunked upload error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function initializeUpload(req: Request, userId: string) {
  const { fileName, fileSize, totalChunks } = await req.json()
  
  // Generate unique upload ID
  const uploadId = `${userId}-${Date.now()}-${Math.random().toString(36).substring(2)}`
  
  // Store upload metadata in a temporary table or storage
  // For now, we'll use a simple in-memory approach with a KV store pattern
  const uploadMetadata = {
    uploadId,
    fileName,
    fileSize,
    totalChunks,
    userId,
    createdAt: new Date().toISOString(),
    chunks: new Array(totalChunks).fill(false)
  }
  
  console.log('Initialized upload:', uploadMetadata)
  
  return new Response(
    JSON.stringify({ uploadId, message: 'Upload initialized' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleChunkUpload(req: Request, userId: string) {
  const formData = await req.formData()
  const chunkIndex = parseInt(formData.get('chunkIndex') as string)
  const totalChunks = parseInt(formData.get('totalChunks') as string)
  const fileName = formData.get('fileName') as string
  const uploadId = formData.get('uploadId') as string
  const chunk = formData.get('chunk') as Blob

  if (!chunk) {
    return new Response(
      JSON.stringify({ error: 'No chunk provided' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    // Convert Blob to ArrayBuffer for storage
    const chunkBuffer = await chunk.arrayBuffer()
    const chunkPath = `chunks/${uploadId}/chunk-${chunkIndex.toString().padStart(4, '0')}`
    
    // Store chunk in a temporary bucket
    const { error: uploadError } = await supabase.storage
      .from('temp-chunks')
      .upload(chunkPath, chunkBuffer, {
        contentType: 'application/octet-stream',
        cacheControl: '3600'
      })

    if (uploadError) {
      console.error('Chunk upload error:', uploadError)
      throw uploadError
    }

    console.log(`Uploaded chunk ${chunkIndex + 1}/${totalChunks} for ${fileName}`)

    return new Response(
      JSON.stringify({ 
        message: 'Chunk uploaded successfully',
        chunkIndex,
        progress: ((chunkIndex + 1) / totalChunks) * 100
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Chunk upload failed:', error)
    return new Response(
      JSON.stringify({ error: 'Chunk upload failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleChunkMerge(req: Request, userId: string) {
  const { uploadId, fileName, totalChunks, bucket = 'original-files' } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    console.log(`Starting merge for ${fileName} with ${totalChunks} chunks`)
    
    // Collect all chunks using streaming approach
    const chunks: Uint8Array[] = []
    let totalSize = 0

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = `chunks/${uploadId}/chunk-${i.toString().padStart(4, '0')}`
      
      const { data: chunkData, error: downloadError } = await supabase.storage
        .from('temp-chunks')
        .download(chunkPath)

      if (downloadError) {
        console.error(`Error downloading chunk ${i}:`, downloadError)
        throw new Error(`Failed to download chunk ${i}: ${downloadError.message}`)
      }

      const chunkBuffer = await chunkData.arrayBuffer()
      const chunkArray = new Uint8Array(chunkBuffer)
      chunks.push(chunkArray)
      totalSize += chunkArray.length
      
      console.log(`Downloaded chunk ${i + 1}/${totalChunks}, size: ${chunkArray.length}`)
    }

    // Efficiently merge chunks using a single buffer allocation
    const mergedBuffer = new Uint8Array(totalSize)
    let offset = 0
    
    for (const chunk of chunks) {
      mergedBuffer.set(chunk, offset)
      offset += chunk.length
    }

    console.log(`Merged file size: ${mergedBuffer.length} bytes`)

    // Generate final file path
    const fileExt = fileName.split('.').pop()
    const finalFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const finalPath = `${userId}/${finalFileName}`

    // Upload merged file to final destination
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(finalPath, mergedBuffer, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Final upload error:', uploadError)
      throw uploadError
    }

    // Clean up temporary chunks in background
    EdgeRuntime.waitUntil(cleanupChunks(supabase, uploadId, totalChunks))

    console.log(`Successfully merged and uploaded: ${finalPath}`)

    return new Response(
      JSON.stringify({ 
        message: 'File merged successfully',
        path: uploadData.path,
        size: mergedBuffer.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Chunk merge failed:', error)
    return new Response(
      JSON.stringify({ error: 'Chunk merge failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function cleanupChunks(supabase: any, uploadId: string, totalChunks: number) {
  try {
    console.log(`Cleaning up ${totalChunks} chunks for upload ${uploadId}`)
    
    const chunksToDelete = []
    for (let i = 0; i < totalChunks; i++) {
      chunksToDelete.push(`chunks/${uploadId}/chunk-${i.toString().padStart(4, '0')}`)
    }

    const { error } = await supabase.storage
      .from('temp-chunks')
      .remove(chunksToDelete)

    if (error) {
      console.error('Cleanup error:', error)
    } else {
      console.log(`Successfully cleaned up ${totalChunks} chunks`)
    }
  } catch (error) {
    console.error('Cleanup failed:', error)
  }
}