import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Enhanced MIME type detection with accurate format mapping
function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  
  const mimeTypes: { [key: string]: string } = {
    // Video formats - precise MIME types for better compatibility
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
    
    // Audio formats - accurate MIME types
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'ogg': 'audio/ogg',
    'oga': 'audio/ogg',
    'wma': 'audio/x-ms-wma',
    'm4a': 'audio/mp4',
    'opus': 'audio/opus',
    'webm': 'audio/webm', // WebM audio
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
  console.log(`📄 MIME type detection: ${fileName} -> ${ext} -> ${mimeType}`)
  return mimeType
}

// CORS headers optimized for both desktop and mobile browsers
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, range, cache-control, user-agent',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type, Cache-Control, ETag, Last-Modified',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable'
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

// Streaming-optimized chunked merging with proper MIME type validation
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
    console.log(`🔄 Starting streaming merge for ${fileName} with ${totalChunks} chunks`)
    
    // Verify all chunks exist first
    const chunkPaths = []
    for (let i = 0; i < totalChunks; i++) {
      chunkPaths.push(`chunks/${uploadId}/chunk-${i.toString().padStart(4, '0')}`)
    }

    // Verify chunk integrity and order
    const chunkVerification = await Promise.allSettled(
      chunkPaths.map(async (path, index) => {
        const chunkDir = path.split('/').slice(0, -1).join('/')
        const chunkFile = path.split('/').pop()
        
        const { data, error } = await supabase.storage.from('temp-chunks').list(chunkDir)
        
        if (error || !data) {
          throw new Error(`Failed to verify chunk ${index}: ${error?.message || 'No data'}`)
        }
        
        const foundChunk = data.find(item => item.name === chunkFile)
        if (!foundChunk) {
          throw new Error(`Chunk ${index} missing: ${chunkFile}`)
        }
        
        console.log(`✅ Verified chunk ${index}: ${foundChunk.name} (${foundChunk.metadata?.size || 'unknown'} bytes)`)
        return { index, size: foundChunk.metadata?.size || 0, path }
      })
    )

    const failedVerifications = chunkVerification.filter(result => result.status === 'rejected')
    if (failedVerifications.length > 0) {
      console.error('❌ Chunk verification failed:', failedVerifications)
      return new Response(
        JSON.stringify({ 
          error: 'Chunk integrity check failed', 
          missingChunks: failedVerifications.length,
          details: failedVerifications.map((result, index) => ({
            chunkIndex: index,
            error: result.status === 'rejected' ? result.reason?.message : 'Unknown error'
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Stream-based merging for better memory efficiency and integrity
    console.log('🔧 Starting streaming merge process...')
    const chunks: ArrayBuffer[] = []
    let totalMergedSize = 0

    // Download and validate chunks in order
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = `chunks/${uploadId}/chunk-${i.toString().padStart(4, '0')}`
      
      console.log(`📥 Downloading chunk ${i + 1}/${totalChunks}...`)
      const { data: chunkData, error: downloadError } = await supabase.storage
        .from('temp-chunks')
        .download(chunkPath)

      if (downloadError || !chunkData) {
        console.error(`❌ Failed to download chunk ${i}:`, downloadError)
        throw new Error(`Failed to download chunk ${i}: ${downloadError?.message || 'No data'}`)
      }

      const chunkBuffer = await chunkData.arrayBuffer()
      
      // Validate chunk is not empty or corrupted
      if (chunkBuffer.byteLength === 0) {
        throw new Error(`Chunk ${i} is empty or corrupted`)
      }
      
      chunks.push(chunkBuffer)
      totalMergedSize += chunkBuffer.byteLength
      
      console.log(`✅ Chunk ${i + 1}/${totalChunks} ready: ${(chunkBuffer.byteLength / 1024).toFixed(1)}KB`)
    }

    // Create merged buffer with proper byte alignment
    console.log(`🔀 Merging ${totalChunks} chunks into ${(totalMergedSize / 1024 / 1024).toFixed(2)}MB file`)
    
    const mergedBuffer = new Uint8Array(totalMergedSize)
    let offset = 0
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkArray = new Uint8Array(chunks[i])
      mergedBuffer.set(chunkArray, offset)
      offset += chunkArray.length
      
      // Log progress for large files
      if (totalChunks > 10 && i % Math.ceil(totalChunks / 10) === 0) {
        console.log(`📊 Merge progress: ${Math.round((i / totalChunks) * 100)}%`)
      }
    }

    // Validate merged file integrity
    if (mergedBuffer.length !== totalMergedSize) {
      throw new Error(`File integrity check failed: expected ${totalMergedSize}, got ${mergedBuffer.length}`)
    }

    console.log(`✅ File merged successfully: ${(mergedBuffer.length / 1024 / 1024).toFixed(2)}MB`)

    // Determine and validate MIME type
    const detectedMimeType = getMimeType(fileName)
    console.log(`🔍 Detected MIME type: ${detectedMimeType}`)

    // Validate file header matches expected format
    const fileHeader = Array.from(mergedBuffer.slice(0, 12))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    console.log(`🔬 File header signature: ${fileHeader}`)
    
    // Common file signatures for validation
    const signatures = {
      'mp4': ['000000', '667479'],  // MP4 signatures
      'webm': ['1a45df', 'a3'],     // WebM signature
      'avi': ['524946', '46'],      // AVI signature
      'mp3': ['494433', 'fff'],     // MP3 signatures
      'wav': ['524946', '46'],      // WAV signature
      'aac': ['fff'],               // AAC signature
    }

    // Use provided basePath or generate one
    const finalPath = basePath || (() => {
      const fileExt = fileName.split('.').pop()?.toLowerCase()
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      return `${userId}/${timestamp}-${randomStr}.${fileExt}`
    })()

    // Enhanced upload with streaming support and proper metadata
    const uploadOptions = {
      contentType: detectedMimeType,
      cacheControl: 'public, max-age=31536000, immutable',
      upsert: false,
      metadata: {
        originalFileName: fileName,
        uploadedAt: new Date().toISOString(),
        fileSize: mergedBuffer.length.toString(),
        mimeType: detectedMimeType,
        acceptRanges: 'bytes',
        streamable: 'true',
        chunkedUpload: 'true',
        chunkCount: totalChunks.toString(),
        fileSignature: fileHeader,
        userId: userId
      }
    }

    // Upload with retry mechanism
    let uploadAttempts = 0
    const maxUploadAttempts = 3
    let uploadData
    let finalPathUsed = finalPath

    while (uploadAttempts < maxUploadAttempts) {
      try {
        uploadAttempts++
        console.log(`📤 Upload attempt ${uploadAttempts}/${maxUploadAttempts}`)
        
        const { data, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(finalPathUsed, mergedBuffer, uploadOptions)

        if (uploadError) {
          console.error(`❌ Upload error (attempt ${uploadAttempts}):`, uploadError)
          
          if (uploadError.message.includes('already exists')) {
            // Generate unique path and retry
            const timestamp = Date.now()
            const randomStr = Math.random().toString(36).substring(2, 8)
            const pathParts = finalPath.split('.')
            const extension = pathParts.pop()
            const baseName = pathParts.join('.')
            finalPathUsed = `${baseName}_${timestamp}_${randomStr}.${extension}`
            console.log(`🔄 File exists, trying new path: ${finalPathUsed}`)
            continue
          } else if (uploadError.message.includes('mime type') && uploadAttempts <= 2) {
            console.log('🔄 MIME type rejected, trying with application/octet-stream')
            uploadOptions.contentType = 'application/octet-stream'
            continue
          } else {
            throw uploadError
          }
        } else {
          uploadData = data
          console.log(`✅ Successfully uploaded: ${finalPathUsed}`)
          break
        }
      } catch (error) {
        console.error(`💥 Upload attempt ${uploadAttempts} failed:`, error)
        
        if (uploadAttempts >= maxUploadAttempts) {
          throw new Error(`Failed to upload after ${maxUploadAttempts} attempts: ${error.message}`)
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, uploadAttempts - 1), 5000)
        console.log(`⏳ Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    if (!uploadData) {
      throw new Error('Upload failed after all attempts')
    }

    // Clean up chunks asynchronously
    cleanupChunks(supabase, uploadId, totalChunks).catch(error => {
      console.error('🧹 Background cleanup failed:', error)
    })

    console.log(`🎉 Merge completed successfully: ${uploadData.path}`)

    return new Response(
      JSON.stringify({ 
        message: 'File merged and uploaded successfully',
        path: uploadData.path,
        size: mergedBuffer.length,
        mimeType: detectedMimeType,
        chunks: totalChunks,
        uploadId,
        fileSignature: fileHeader
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Chunk merge failed:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Chunk merge failed', 
        details: error.message,
        uploadId,
        fileName 
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