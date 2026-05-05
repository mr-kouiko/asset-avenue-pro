import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface BackfillResult {
  fileId: string;
  fileName: string;
  status: 'success' | 'error';
  error?: string;
  failureReason?: 'timeout' | 'file_too_large' | 'ffmpeg_error' | 'network_error' | 'signed_url_error' | 'upload_error' | 'db_update_error' | 'invalid_output' | 'unknown';
  processingTimeMs?: number;
  ffmpegTimeMs?: number;
  outputSizeBytes?: number;
}

function classifyError(msg: string): BackfillResult['failureReason'] {
  const m = msg.toLowerCase();
  if (m.includes('timeout') || m.includes('timed out') || m.includes('aborted')) return 'timeout';
  if (m.includes('too large') || m.includes('413')) return 'file_too_large';
  if (m.includes('signed url') || m.includes('cannot create signed')) return 'signed_url_error';
  if (m.includes('upload failed')) return 'upload_error';
  if (m.includes('db update')) return 'db_update_error';
  if (m.includes('output too small') || m.includes('invalid output')) return 'invalid_output';
  if (m.includes('ffmpeg api')) return 'ffmpeg_error';
  if (m.includes('fetch') || m.includes('network')) return 'network_error';
  return 'unknown';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const ffmpegApiUrl = Deno.env.get('FFMPEG_API_URL');
    const ffmpegApiKey = Deno.env.get('FFMPEG_API_KEY');

    if (!ffmpegApiUrl) {
      return new Response(
        JSON.stringify({ error: 'FFMPEG_API_URL secret is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse params
    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(body.batchSize || 5, 20);
    const maxVideos = Math.min(body.maxVideos || 50, 100);
    const dryRun = body.dryRun === true;

    console.log(`[backfill] Admin ${user.id} started. batchSize=${batchSize}, maxVideos=${maxVideos}, dryRun=${dryRun}`);

    // Query videos missing previews
    const { data: videosByType, error: queryError1 } = await adminClient
      .from('content_files')
      .select('id, submission_id, file_name, file_path, file_type')
      .is('preview_path', null)
      .eq('is_original', true)
      .in('file_type', ['video', 'video/mp4', 'video/quicktime', 'video/webm', 'video/mov'])
      .limit(maxVideos);

    if (queryError1) {
      console.error('[backfill] Query error:', queryError1);
      return new Response(
        JSON.stringify({ error: 'Failed to query videos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also check by extension
    const { data: videosByExt } = await adminClient
      .from('content_files')
      .select('id, submission_id, file_name, file_path, file_type')
      .is('preview_path', null)
      .eq('is_original', true)
      .or('file_name.ilike.%.mp4,file_name.ilike.%.mov,file_name.ilike.%.webm')
      .limit(maxVideos);

    // Merge and deduplicate
    const allFiles = [...(videosByType || []), ...(videosByExt || [])];
    const uniqueMap = new Map();
    allFiles.forEach(f => uniqueMap.set(f.id, f));

    // Filter to approved submissions only
    const unique = Array.from(uniqueMap.values());
    const submissionIds = [...new Set(unique.map((f: any) => f.submission_id))];

    let approvedIds = new Set<string>();
    if (submissionIds.length > 0) {
      const { data: approvedSubs } = await adminClient
        .from('content_submissions')
        .select('id')
        .in('id', submissionIds)
        .eq('status', 'approved');
      approvedIds = new Set((approvedSubs || []).map((s: any) => s.id));
    }

    const videosToProcess = unique.filter((f: any) => approvedIds.has(f.submission_id)).slice(0, maxVideos);

    console.log(`[backfill] Found ${videosToProcess.length} videos to process`);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dryRun: true,
          totalFound: videosToProcess.length,
          videos: videosToProcess.map((v: any) => ({ id: v.id, fileName: v.file_name, submissionId: v.submission_id })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (videosToProcess.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, succeeded: 0, failed: 0, errors: [], message: 'No videos need processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Watermark URL (public asset)
    const watermarkUrl = `${supabaseUrl}/storage/v1/object/public/previews/visustock-watermark-logo.png`;

    // Process in parallel batches
    const results: BackfillResult[] = [];

    for (let i = 0; i < videosToProcess.length; i += batchSize) {
      const batch = videosToProcess.slice(i, i + batchSize);
      console.log(`[backfill] Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} videos)`);

      const batchResults = await Promise.allSettled(
        batch.map(async (file: any) => {
          try {
            console.log(`[backfill] Processing: ${file.file_name} (${file.id})`);

            // Generate signed URL for source video
            const storagePath = file.file_path.includes('/object/')
              ? file.file_path.split('/object/public/').pop() || file.file_path.split('/object/sign/').pop() || file.file_path
              : file.file_path;

            // Determine bucket — try content-uploads first
            const bucket = 'content-uploads';
            const { data: signedData, error: signError } = await adminClient.storage
              .from(bucket)
              .createSignedUrl(storagePath, 900); // 15 min

            let videoUrl: string;
            if (signError || !signedData) {
              // Fallback: try the file_path as-is (might be a full public URL)
              if (file.file_path.startsWith('http')) {
                videoUrl = file.file_path;
              } else {
                throw new Error(`Cannot create signed URL: ${signError?.message || 'unknown'}`);
              }
            } else {
              videoUrl = signedData.signedUrl;
            }

            // Call FFmpeg API
            const ffmpegHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            if (ffmpegApiKey) {
              ffmpegHeaders['Authorization'] = `Bearer ${ffmpegApiKey}`;
            }

            const ffmpegResponse = await fetch(ffmpegApiUrl, {
              method: 'POST',
              headers: ffmpegHeaders,
              body: JSON.stringify({
                videoUrl,
                watermarkUrl,
                resolution: 720,
              }),
            });

            if (!ffmpegResponse.ok) {
              const errText = await ffmpegResponse.text();
              throw new Error(`FFmpeg API returned ${ffmpegResponse.status}: ${errText.substring(0, 200)}`);
            }

            // Get the processed video as blob
            const videoBlob = await ffmpegResponse.arrayBuffer();
            const videoBytes = new Uint8Array(videoBlob);

            if (videoBytes.length < 1000) {
              throw new Error(`Output too small (${videoBytes.length} bytes), likely failed`);
            }

            console.log(`[backfill] FFmpeg output for ${file.file_name}: ${(videoBytes.length / 1024 / 1024).toFixed(1)}MB`);

            // Upload to previews bucket
            const previewPath = `${file.submission_id}/${file.id}_preview.mp4`;
            const { error: uploadError } = await adminClient.storage
              .from('previews')
              .upload(previewPath, videoBytes, {
                contentType: 'video/mp4',
                upsert: true,
              });

            if (uploadError) {
              throw new Error(`Upload failed: ${uploadError.message}`);
            }

            // Get public URL
            const { data: urlData } = adminClient.storage
              .from('previews')
              .getPublicUrl(previewPath);

            // Update content_files record
            const { error: updateError } = await adminClient
              .from('content_files')
              .update({ preview_path: urlData.publicUrl })
              .eq('id', file.id);

            if (updateError) {
              throw new Error(`DB update failed: ${updateError.message}`);
            }

            console.log(`[backfill] ✅ Done: ${file.file_name}`);
            return { fileId: file.id, fileName: file.file_name, status: 'success' as const };
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error(`[backfill] ❌ Failed: ${file.file_name} — ${msg}`);
            return { fileId: file.id, fileName: file.file_name, status: 'error' as const, error: msg };
          }
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({ fileId: 'unknown', fileName: 'unknown', status: 'error', error: result.reason?.message || 'Promise rejected' });
        }
      }
    }

    const succeeded = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    console.log(`[backfill] Complete. Processed: ${results.length}, Succeeded: ${succeeded}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({
        processed: results.length,
        succeeded,
        failed,
        errors: results.filter(r => r.status === 'error'),
        successes: results.filter(r => r.status === 'success').map(r => r.fileName),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[backfill] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
