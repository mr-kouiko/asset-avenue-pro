import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IntegrityIssue {
  issue_type: 'orphaned_file' | 'broken_record' | 'stuck_upload';
  severity: 'info' | 'warning' | 'critical';
  file_path?: string;
  file_name?: string;
  file_size?: number;
  bucket_name?: string;
  table_name?: string;
  record_id?: string;
  user_id?: string;
  description: string;
  age_hours?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request to determine if manual trigger
    let triggeredBy = 'cron';
    let adminId: string | null = null;
    
    try {
      const body = await req.json();
      triggeredBy = body.manual ? 'manual' : 'cron';
      adminId = body.admin_id || null;
    } catch {
      // Default to cron if no body
    }

    // Check if scanner is enabled
    const { data: config } = await supabase
      .from('integrity_scanner_config')
      .select('*')
      .limit(1)
      .single();

    if (!config?.enabled && triggeredBy === 'cron') {
      console.log('Integrity scanner is disabled, skipping...');
      return new Response(
        JSON.stringify({ message: 'Scanner disabled' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create scan record
    const { data: scanRecord, error: scanError } = await supabase
      .from('integrity_scans')
      .insert({
        status: 'running',
        triggered_by: triggeredBy,
        admin_id: adminId,
        buckets_scanned: ['seller-content', 'uploads', 'original-files']
      })
      .select()
      .single();

    if (scanError) {
      throw new Error(`Failed to create scan record: ${scanError.message}`);
    }

    const scanId = scanRecord.id;
    const issues: IntegrityIssue[] = [];
    const stuckTimeoutHours = config?.stuck_upload_timeout_hours || 24;

    console.log(`🔍 Starting integrity scan ${scanId}...`);

    // ============================================
    // 1. DETECT STUCK UPLOADS
    // ============================================
    console.log('📦 Checking for stuck uploads...');
    
    const stuckThreshold = new Date();
    stuckThreshold.setHours(stuckThreshold.getHours() - stuckTimeoutHours);

    // Check uploaded_files with non-completed status
    const { data: stuckUploads, error: stuckError } = await supabase
      .from('uploaded_files')
      .select('id, file_name, file_url, file_size, user_id, status, created_at')
      .in('status', ['pending', 'uploading', 'processing'])
      .lt('created_at', stuckThreshold.toISOString());

    if (stuckError) {
      console.error('Error checking stuck uploads:', stuckError);
    } else if (stuckUploads) {
      for (const file of stuckUploads) {
        const ageHours = Math.floor((Date.now() - new Date(file.created_at).getTime()) / (1000 * 60 * 60));
        issues.push({
          issue_type: 'stuck_upload',
          severity: ageHours > 72 ? 'critical' : 'warning',
          file_path: file.file_url,
          file_name: file.file_name,
          file_size: file.file_size,
          table_name: 'uploaded_files',
          record_id: file.id,
          user_id: file.user_id,
          description: `Upload stuck in '${file.status}' status for ${ageHours} hours`,
          age_hours: ageHours
        });
      }
    }

    // ============================================
    // 2. DETECT BROKEN DATABASE RECORDS
    // ============================================
    console.log('🔗 Checking for broken database records...');

    // Get all content_files records
    const { data: contentFiles, error: cfError } = await supabase
      .from('content_files')
      .select('id, file_path, file_name, file_size, submission_id, thumbnail_path, preview_path, created_at');

    if (cfError) {
      console.error('Error fetching content_files:', cfError);
    } else if (contentFiles) {
      // Check each file exists in storage
      for (const record of contentFiles) {
        const paths = [
          record.file_path,
          record.thumbnail_path,
          record.preview_path
        ].filter(Boolean);

        for (const path of paths) {
          if (!path) continue;
          
          // Extract bucket and path from URL
          const bucketMatch = path.match(/\/storage\/v1\/object\/public\/([^\/]+)\//);
          if (bucketMatch) {
            const bucket = bucketMatch[1];
            const filePath = path.split(`/storage/v1/object/public/${bucket}/`)[1];
            
            if (filePath) {
              const { data: fileExists } = await supabase.storage
                .from(bucket)
                .list(filePath.split('/').slice(0, -1).join('/') || '', {
                  search: filePath.split('/').pop()
                });

              const found = fileExists?.some(f => f.name === filePath.split('/').pop());
              
              if (!found) {
                const ageHours = Math.floor((Date.now() - new Date(record.created_at).getTime()) / (1000 * 60 * 60));
                issues.push({
                  issue_type: 'broken_record',
                  severity: 'critical',
                  file_path: path,
                  file_name: record.file_name,
                  file_size: record.file_size,
                  bucket_name: bucket,
                  table_name: 'content_files',
                  record_id: record.id,
                  description: `Database record references non-existent file in storage`,
                  age_hours: ageHours
                });
              }
            }
          }
        }
      }
    }

    // ============================================
    // 3. DETECT ORPHANED FILES IN STORAGE
    // ============================================
    console.log('🗑️ Checking for orphaned files in storage...');

    const bucketsToScan = ['seller-content', 'uploads'];
    
    for (const bucketName of bucketsToScan) {
      try {
        // List all files in bucket (recursively via root listing)
        const { data: bucketFiles, error: listError } = await supabase.storage
          .from(bucketName)
          .list('', { limit: 1000 });

        if (listError) {
          console.error(`Error listing bucket ${bucketName}:`, listError);
          continue;
        }

        // For each top-level folder (usually user IDs), check files
        for (const folder of bucketFiles || []) {
          if (folder.id) continue; // Skip files at root

          const { data: userFiles } = await supabase.storage
            .from(bucketName)
            .list(folder.name, { limit: 500 });

          for (const file of userFiles || []) {
            if (!file.id) continue; // Skip folders

            const fullPath = `${folder.name}/${file.name}`;
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fullPath}`;

            // Check if this file is referenced in content_files
            const { data: inContentFiles } = await supabase
              .from('content_files')
              .select('id')
              .or(`file_path.eq.${publicUrl},thumbnail_path.eq.${publicUrl},preview_path.eq.${publicUrl}`)
              .limit(1);

            // Check if referenced in uploaded_files
            const { data: inUploadedFiles } = await supabase
              .from('uploaded_files')
              .select('id')
              .or(`file_url.eq.${publicUrl},thumbnail_url.eq.${publicUrl},preview_url.eq.${publicUrl}`)
              .limit(1);

            // If not found in either table, it's orphaned
            if ((!inContentFiles || inContentFiles.length === 0) && 
                (!inUploadedFiles || inUploadedFiles.length === 0)) {
              
              const createdAt = file.created_at ? new Date(file.created_at) : new Date();
              const ageHours = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
              
              // Only flag files older than 1 hour (to avoid false positives during active uploads)
              if (ageHours > 1) {
                issues.push({
                  issue_type: 'orphaned_file',
                  severity: ageHours > 168 ? 'warning' : 'info', // > 1 week = warning
                  file_path: publicUrl,
                  file_name: file.name,
                  file_size: file.metadata?.size,
                  bucket_name: bucketName,
                  user_id: folder.name, // User ID is the folder name
                  description: `File exists in storage but has no database reference`,
                  age_hours: ageHours
                });
              }
            }
          }
        }
      } catch (bucketError) {
        console.error(`Error scanning bucket ${bucketName}:`, bucketError);
      }
    }

    // ============================================
    // 4. SAVE ISSUES TO DATABASE
    // ============================================
    console.log(`📝 Saving ${issues.length} issues to database...`);

    if (issues.length > 0) {
      const issueRecords = issues.map(issue => ({
        scan_id: scanId,
        issue_type: issue.issue_type,
        severity: issue.severity,
        file_path: issue.file_path,
        file_name: issue.file_name,
        file_size: issue.file_size,
        bucket_name: issue.bucket_name,
        table_name: issue.table_name,
        record_id: issue.record_id,
        user_id: issue.user_id,
        description: issue.description,
        age_hours: issue.age_hours,
        status: 'open'
      }));

      const { error: insertError } = await supabase
        .from('integrity_issues')
        .insert(issueRecords);

      if (insertError) {
        console.error('Error inserting issues:', insertError);
      }
    }

    // ============================================
    // 5. UPDATE SCAN RECORD
    // ============================================
    const endTime = Date.now();
    const orphanedCount = issues.filter(i => i.issue_type === 'orphaned_file').length;
    const brokenCount = issues.filter(i => i.issue_type === 'broken_record').length;
    const stuckCount = issues.filter(i => i.issue_type === 'stuck_upload').length;

    await supabase
      .from('integrity_scans')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        scan_duration_ms: endTime - startTime,
        orphaned_files_count: orphanedCount,
        broken_records_count: brokenCount,
        stuck_uploads_count: stuckCount,
        total_storage_files: issues.length, // Approximate
        total_db_records: contentFiles?.length || 0
      })
      .eq('id', scanId);

    console.log(`✅ Integrity scan completed in ${endTime - startTime}ms`);
    console.log(`   - Orphaned files: ${orphanedCount}`);
    console.log(`   - Broken records: ${brokenCount}`);
    console.log(`   - Stuck uploads: ${stuckCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        scan_id: scanId,
        duration_ms: endTime - startTime,
        issues_found: issues.length,
        summary: {
          orphaned_files: orphanedCount,
          broken_records: brokenCount,
          stuck_uploads: stuckCount
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ Integrity scan failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
