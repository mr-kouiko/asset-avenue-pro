import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Enhanced MIME type detection with mobile browser compatibility
function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  
  const mimeTypes: { [key: string]: string } = {
    // Video formats - optimized for mobile playback
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'flv': 'video/x-flv', 
    'wmv': 'video/x-ms-wmv',
    'm4v': 'video/x-m4v',
    '3gp': 'video/3gpp',
    '3g2': 'video/3gpp2',
    'ogv': 'video/ogg',
    'ts': 'video/mp2t',
    'mts': 'video/mp2t',
    'vob': 'video/dvd',
    
    // Audio formats - mobile compatible
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'ogg': 'audio/ogg',
    'oga': 'audio/ogg',
    'wma': 'audio/x-ms-wma',
    'm4a': 'audio/mp4',
    'opus': 'audio/opus',
    'webm': 'audio/webm',
    'amr': 'audio/amr',
    'au': 'audio/basic',
    'mid': 'audio/midi',
    'midi': 'audio/midi',
    'ra': 'audio/x-realaudio',
    'aiff': 'audio/x-aiff',
    
    // Image formats
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg', 
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
    'ico': 'image/x-icon',
    'heic': 'image/heic',
    'heif': 'image/heif',
    'avif': 'image/avif',
    
    // Document formats
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'rtf': 'application/rtf',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip'
  }
  
  const mimeType = mimeTypes[ext || ''] || 'application/octet-stream'
  console.log(`MIME type detection: ${fileName} -> ${ext} -> ${mimeType}`)
  return mimeType
}

// Enhanced CORS headers for mobile compatibility and streaming
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, range, cache-control',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type, Cache-Control',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Type': 'application/octet-stream'
  }
}

const corsHeaders = getCorsHeaders()

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

    // Check chunk existence with better error handling
    const chunkChecks = await Promise.allSettled(
      chunkPaths.map(async (path, index) => {
        try {
          const chunkDir = path.split('/').slice(0, -1).join('/')
          const chunkFile = path.split('/').pop()
          
          const { data, error } = await supabase.storage.from('temp-chunks').list(chunkDir)
          
          if (error) {
            console.error(`Error listing chunks in ${chunkDir}:`, error)
            throw new Error(`Failed to list chunks in directory: ${error.message}`)
          }
          
          if (!data) {
            throw new Error(`No data returned when listing chunks in ${chunkDir}`)
          }
          
          const foundChunk = data.find(item => item.name === chunkFile)
          if (!foundChunk) {
            console.error(`Chunk ${index} not found. Available files:`, data.map(f => f.name))
            throw new Error(`Chunk ${index} (${chunkFile}) not found at ${path}`)
          }
          
          console.log(`Verified chunk ${index}: ${foundChunk.name} (${foundChunk.metadata?.size || 'unknown size'})`)
          return path
        } catch (error) {
          console.error(`Chunk verification failed for ${path}:`, error)
          throw error
        }
      })
    )

    const failedChunks = chunkChecks.filter(result => result.status === 'rejected')
    if (failedChunks.length > 0) {
      console.error('Missing chunks detected:', failedChunks.map((result, index) => ({
        index,
        error: result.status === 'rejected' ? result.reason?.message || result.reason : 'Unknown error'
      })))
      
      return new Response(
        JSON.stringify({ 
          error: 'Some chunks are missing', 
          missingChunks: failedChunks.length,
          totalChunks: totalChunks,
          details: failedChunks.map((result, index) => ({
            chunkIndex: index,
            error: result.status === 'rejected' ? result.reason?.message || result.reason : 'Unknown error'
          })),
          suggestion: 'Try re-uploading the missing chunks'
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

    // Upload merged file to final destination with retry logic and mobile optimization
    let uploadAttempts = 0
    const maxUploadAttempts = 3
    let uploadData
    let finalPathUsed = finalPath
    
    // Determine correct MIME type for the merged file
    const contentType = getMimeType(fileName)
    console.log(`Using MIME type: ${contentType} for file: ${fileName}`)
    
    // Enhanced upload options for mobile compatibility and streaming
    const uploadOptions = {
      contentType: contentType,
      cacheControl: 'public, max-age=31536000, immutable',
      upsert: false,
      metadata: {
        originalFileName: fileName,
        uploadedAt: new Date().toISOString(),
        fileSize: mergedBuffer.length.toString(),
        mimeType: contentType,
        acceptRanges: 'bytes',
        streamable: 'true'
      }
    }

    while (uploadAttempts < maxUploadAttempts) {
      try {
        uploadAttempts++
        console.log(`Upload attempt ${uploadAttempts}/${maxUploadAttempts} for ${fileName}`)
        
        const { data, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(finalPathUsed, mergedBuffer, uploadOptions)

        if (uploadError) {
          console.error(`Upload error on attempt ${uploadAttempts}:`, uploadError)
          
          if (uploadError.message.includes('already exists')) {
            // Generate unique path and retry
            const timestamp = Date.now()
            const randomStr = Math.random().toString(36).substring(2, 8)
            const pathParts = finalPath.split('.')
            const extension = pathParts.pop()
            const baseName = pathParts.join('.')
            finalPathUsed = `${baseName}_${timestamp}_${randomStr}.${extension}`
            console.log(`File exists, trying new path: ${finalPathUsed}`)
            continue
          } else if (uploadError.message.includes('mime type') && uploadAttempts <= 2) {
            // Try with application/octet-stream as fallback
            console.log('MIME type rejected, trying with application/octet-stream')
            uploadOptions.contentType = 'application/octet-stream'
            continue
          } else {
            throw uploadError
          }
        } else {
          uploadData = data
          console.log(`Successfully uploaded ${fileName} to ${finalPathUsed}`)
          break
        }
      } catch (error) {
        console.error(`Upload attempt ${uploadAttempts} failed:`, error)
        
        if (uploadAttempts >= maxUploadAttempts) {
          console.error(`All upload attempts failed for ${fileName}:`, error)
          throw new Error(`Failed to upload merged file after ${maxUploadAttempts} attempts: ${error.message}`)
        }
        
        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, uploadAttempts - 1), 5000)
        console.log(`Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
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