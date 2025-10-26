import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FileRecord {
  id: string;
  file_url: string;
  file_name: string;
  table_name: 'uploaded_files' | 'content_files';
}

async function computeFileHash(fileBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function downloadFileFromStorage(supabase: any, fileUrl: string): Promise<ArrayBuffer | null> {
  try {
    // Extract bucket and path from URL
    const urlParts = fileUrl.split('/storage/v1/object/public/');
    if (urlParts.length < 2) {
      console.error('Invalid storage URL format:', fileUrl);
      return null;
    }
    
    const [bucketAndPath] = urlParts[1].split('?');
    const pathParts = bucketAndPath.split('/');
    const bucket = pathParts[0];
    const filePath = pathParts.slice(1).join('/');
    
    console.log(`Downloading from bucket: ${bucket}, path: ${filePath}`);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);
    
    if (error) {
      console.error('Error downloading file:', error);
      return null;
    }
    
    return await data.arrayBuffer();
  } catch (error) {
    console.error('Error in downloadFileFromStorage:', error);
    return null;
  }
}

async function processFileBatch(
  supabase: any,
  files: FileRecord[]
): Promise<{ processed: number; errors: number; skipped: number }> {
  let processed = 0;
  let errors = 0;
  let skipped = 0;
  
  for (const file of files) {
    try {
      console.log(`Processing ${file.table_name}: ${file.file_name}`);
      
      // Download file from storage
      const fileBuffer = await downloadFileFromStorage(supabase, file.file_url);
      
      if (!fileBuffer) {
        console.error(`Skipping ${file.file_name}: Could not download`);
        skipped++;
        continue;
      }
      
      // Compute hash
      const fileHash = await computeFileHash(fileBuffer);
      console.log(`Computed hash for ${file.file_name}: ${fileHash}`);
      
      // Update database
      const { error: updateError } = await supabase
        .from(file.table_name)
        .update({ file_hash: fileHash })
        .eq('id', file.id);
      
      if (updateError) {
        console.error(`Error updating ${file.file_name}:`, updateError);
        errors++;
      } else {
        console.log(`✅ Updated ${file.file_name} with hash`);
        processed++;
      }
    } catch (error) {
      console.error(`Error processing ${file.file_name}:`, error);
      errors++;
    }
  }
  
  return { processed, errors, skipped };
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log('🚀 Starting file hash backfill process...');

    // Get all files without hash from uploaded_files
    const { data: uploadedFiles, error: uploadedError } = await supabaseClient
      .from('uploaded_files')
      .select('id, file_url, file_name')
      .is('file_hash', null)
      .limit(100); // Process in batches of 100

    if (uploadedError) {
      throw uploadedError;
    }

    // Get all files without hash from content_files
    const { data: contentFiles, error: contentError } = await supabaseClient
      .from('content_files')
      .select('id, file_path, file_name')
      .is('file_hash', null)
      .limit(100); // Process in batches of 100

    if (contentError) {
      throw contentError;
    }

    const uploadedFileRecords: FileRecord[] = (uploadedFiles || []).map(f => ({
      id: f.id,
      file_url: f.file_url,
      file_name: f.file_name,
      table_name: 'uploaded_files' as const,
    }));

    const contentFileRecords: FileRecord[] = (contentFiles || []).map(f => ({
      id: f.id,
      file_url: f.file_path, // Use file_path for content_files
      file_name: f.file_name,
      table_name: 'content_files' as const,
    }));

    const allFiles = [...uploadedFileRecords, ...contentFileRecords];
    
    console.log(`📊 Found ${allFiles.length} files to process (${uploadedFileRecords.length} uploaded, ${contentFileRecords.length} content)`);

    if (allFiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No files to process - all files already have hashes',
          stats: { processed: 0, errors: 0, skipped: 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process all files
    const stats = await processFileBatch(supabaseClient, allFiles);

    console.log('✅ Backfill complete:', stats);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${stats.processed} files, ${stats.errors} errors, ${stats.skipped} skipped`,
        stats,
        hasMore: allFiles.length === 200, // If we hit the limit, there might be more
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in backfill-file-hashes:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
