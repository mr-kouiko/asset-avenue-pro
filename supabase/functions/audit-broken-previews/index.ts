import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Threshold: anything below this byte size is overwhelmingly likely a single-frame
// MP4 (typical broken previews observed: 60-100 KB; valid previews: 1.5+ MB).
const MIN_PREVIEW_BYTES = 200 * 1024;

interface BrokenPreview {
  fileId: string;
  submissionId: string;
  fileName: string;
  sizeBytes: number | null;
  reason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleData } = await adminClient
      .from('user_roles').select('role')
      .eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun === true;
    const maxScan = Math.min(Number(body.maxScan) || 500, 2000);
    const minBytes = Number(body.minBytes) || MIN_PREVIEW_BYTES;

    console.log(`[audit] start admin=${user.id} dryRun=${dryRun} maxScan=${maxScan} minBytes=${minBytes}`);

    // Fetch all video files with a preview_path set
    const { data: files, error: queryErr } = await adminClient
      .from('content_files')
      .select('id, submission_id, file_name, preview_path')
      .eq('is_original', true)
      .in('file_type', ['video', 'video/mp4', 'video/quicktime', 'video/webm', 'video/mov'])
      .not('preview_path', 'is', null)
      .limit(maxScan);

    if (queryErr) {
      console.error('[audit] query error', queryErr);
      return new Response(JSON.stringify({ error: 'Query failed', detail: queryErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const total = files?.length || 0;
    console.log(`[audit] scanning ${total} previews`);

    const broken: BrokenPreview[] = [];
    let scanned = 0;
    let unreachable = 0;

    // HEAD requests in batches of 10
    const BATCH = 10;
    for (let i = 0; i < (files || []).length; i += BATCH) {
      const slice = files!.slice(i, i + BATCH);
      await Promise.all(slice.map(async (f: any) => {
        scanned++;
        try {
          const r = await fetch(f.preview_path, { method: 'HEAD' });
          if (!r.ok) {
            unreachable++;
            broken.push({
              fileId: f.id, submissionId: f.submission_id, fileName: f.file_name,
              sizeBytes: null, reason: `HEAD ${r.status}`,
            });
            return;
          }
          const len = parseInt(r.headers.get('content-length') || '0', 10);
          if (len > 0 && len < minBytes) {
            broken.push({
              fileId: f.id, submissionId: f.submission_id, fileName: f.file_name,
              sizeBytes: len, reason: `size ${len}B < ${minBytes}B`,
            });
          }
        } catch (e: any) {
          unreachable++;
          broken.push({
            fileId: f.id, submissionId: f.submission_id, fileName: f.file_name,
            sizeBytes: null, reason: `fetch error: ${e?.message || 'unknown'}`,
          });
        }
      }));
    }

    console.log(`[audit] scanned=${scanned} broken=${broken.length} unreachable=${unreachable}`);

    if (dryRun || broken.length === 0) {
      return new Response(JSON.stringify({
        dryRun, scanned, broken: broken.length, unreachable, reset: 0, samples: broken.slice(0, 20),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Reset broken previews: clear preview_path so the backfill picks them up.
    // The sync_preview_status_on_preview_path trigger will set preview_quality='no_preview'.
    // We also force the parent submission back to 'processing_preview' so it disappears
    // from marketplace until the backfill regenerates a valid preview.
    const fileIds = broken.map(b => b.fileId);
    const submissionIds = [...new Set(broken.map(b => b.submissionId))];

    const { error: updFileErr } = await adminClient
      .from('content_files')
      .update({
        preview_path: null,
        preview_status: null,
        preview_failure_reason: null,
        preview_last_error: null,
      })
      .in('id', fileIds);

    if (updFileErr) {
      console.error('[audit] file update error', updFileErr);
      return new Response(JSON.stringify({ error: 'File reset failed', detail: updFileErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error: updSubErr } = await adminClient
      .from('content_submissions')
      .update({ status: 'processing_preview' })
      .in('id', submissionIds)
      .in('status', ['approved', 'approved_ai_assisted']);

    if (updSubErr) {
      console.warn('[audit] submission status update warning', updSubErr);
    }

    return new Response(JSON.stringify({
      dryRun: false,
      scanned,
      broken: broken.length,
      unreachable,
      reset: fileIds.length,
      submissionsHeld: submissionIds.length,
      samples: broken.slice(0, 20),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error('[audit] fatal', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
