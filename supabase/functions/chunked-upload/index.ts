import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  try {
    const { fileName, fileSize, totalChunks, basePath } = await req.json()
    
    if (!fileName || !fileSize || !totalChunks) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: fileName, fileSize, totalChunks' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Generate unique upload ID with better entropy
    const uploadId = `${userId}-${Date.now()}-${Math.random().toString(36).substring(2)}-${Math.random().toString(36).substring(2)}`
    
    // Store upload metadata
    const uploadMetadata = {
      uploadId,
      fileName,
      fileSize,
      totalChunks,
      userId,
      basePath: basePath || `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}`,
      createdAt: new Date().toISOString(),
      chunks: new Array(totalChunks).fill(false),
      status: 'initialized'
    }
    
    console.log('Initialized upload:', {
      uploadId,
      fileName,
      fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
      totalChunks,
      userId
    })
    
    return new Response(
      JSON.stringify({ 
        uploadId, 
        message: 'Upload initialized successfully',
        metadata: uploadMetadata 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Initialize upload error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to initialize upload', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
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
  const { uploadId, fileName, totalChunks, bucket = 'original-files', basePath } = await req.json()

  if (!uploadId || !fileName || !totalChunks) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters: uploadId, fileName, totalChunks' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    console.log(`Starting merge for ${fileName} with ${totalChunks} chunks, uploadId: ${uploadId}`)
    
    // Verify all chunks exist before starting merge
    const chunkPaths = []
    for (let i = 0; i < totalChunks; i++) {
      chunkPaths.push(`chunks/${uploadId}/chunk-${i.toString().padStart(4, '0')}`)
    }

    // Check chunk existence in parallel
    const chunkChecks = await Promise.allSettled(
      chunkPaths.map(async (path, index) => {
        const { data, error } = await supabase.storage.from('temp-chunks').list(path.split('/').slice(0, -1).join('/'))
        if (error || !data.find(item => item.name === path.split('/').pop())) {
          throw new Error(`Chunk ${index} not found at ${path}`)
        }
        return path
      })
    )

    const failedChunks = chunkChecks.filter(result => result.status === 'rejected')
    if (failedChunks.length > 0) {
      console.error('Missing chunks:', failedChunks)
      return new Response(
        JSON.stringify({ 
          error: 'Some chunks are missing', 
          missingChunks: failedChunks.length,
          details: failedChunks.map((result, index) => ({ index, error: result.reason }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Download and merge chunks using streaming approach for memory efficiency
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
      
      console.log(`Downloaded chunk ${i + 1}/${totalChunks}, size: ${(chunkArray.length / 1024).toFixed(1)}KB`)
    }

    // Efficiently merge chunks using a single buffer allocation
    console.log(`Merging ${totalChunks} chunks into ${(totalSize / 1024 / 1024).toFixed(2)}MB file`)
    const mergedBuffer = new Uint8Array(totalSize)
    let offset = 0
    
    for (const chunk of chunks) {
      mergedBuffer.set(chunk, offset)
      offset += chunk.length
    }

    console.log(`Merged file size: ${(mergedBuffer.length / 1024 / 1024).toFixed(2)}MB`)

    // Use provided basePath or generate final file path
    const finalPath = basePath || (() => {
      const fileExt = fileName.split('.').pop()
      const finalFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      return `${userId}/${finalFileName}`
    })()

    // Upload merged file to final destination with retry logic
    let uploadAttempts = 0
    const maxUploadAttempts = 3
    let uploadData

    while (uploadAttempts < maxUploadAttempts) {
      try {
        const { data, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(finalPath, mergedBuffer, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          if (uploadError.message.includes('already exists') && uploadAttempts < maxUploadAttempts - 1) {
            // Try with modified path
            const timestamp = Date.now()
            const randomStr = Math.random().toString(36).substring(2)
            const pathParts = finalPath.split('.')
            pathParts[pathParts.length - 2] += `_${timestamp}_${randomStr}`
            const newFinalPath = pathParts.join('.')
            
            const { data: retryData, error: retryError } = await supabase.storage
              .from(bucket)
              .upload(newFinalPath, mergedBuffer, {
                cacheControl: '3600',
                upsert: false
              })

            if (retryError) throw retryError
            uploadData = retryData
            break
          } else {
            throw uploadError
          }
        } else {
          uploadData = data
          break
        }
      } catch (error) {
        uploadAttempts++
        console.error(`Upload attempt ${uploadAttempts} failed:`, error)
        
        if (uploadAttempts >= maxUploadAttempts) {
          throw error
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * uploadAttempts))
      }
    }

    if (!uploadData) {
      throw new Error('Failed to upload merged file after all attempts')
    }

    // Clean up temporary chunks in background (don't await)
    cleanupChunks(supabase, uploadId, totalChunks).catch(error => {
      console.error('Background cleanup failed:', error)
    })

    console.log(`Successfully merged and uploaded: ${uploadData.path}`)

    return new Response(
      JSON.stringify({ 
        message: 'File merged successfully',
        path: uploadData.path,
        size: mergedBuffer.length,
        uploadId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Chunk merge failed:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Chunk merge failed', 
        details: error.message,
        uploadId 
      }),
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