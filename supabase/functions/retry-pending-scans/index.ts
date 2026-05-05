import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Find stuck submissions: pending_scan older than 5 minutes
    const { data: stuck, error } = await admin
      .from('content_submissions')
      .select('id, ai_declaration, updated_at')
      .eq('status', 'pending_scan')
      .lt('updated_at', cutoff)
      .limit(20);

    if (error) throw error;

    console.log(`[RETRY-SCAN] Found ${stuck?.length ?? 0} stuck submissions`);

    const results: Array<{ id: string; ok: boolean; status?: number; error?: string }> = [];

    for (const sub of stuck ?? []) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/scan-content`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE}`,
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE,
          },
          body: JSON.stringify({
            submissionId: sub.id,
            aiDeclaration: sub.ai_declaration,
          }),
        });
        results.push({ id: sub.id, ok: res.ok, status: res.status });
        console.log(`[RETRY-SCAN] ${sub.id} -> ${res.status}`);
      } catch (e) {
        results.push({ id: sub.id, ok: false, error: String(e) });
        console.error(`[RETRY-SCAN] ${sub.id} failed`, e);
      }
    }

    return new Response(JSON.stringify({ retried: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[RETRY-SCAN] fatal', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
