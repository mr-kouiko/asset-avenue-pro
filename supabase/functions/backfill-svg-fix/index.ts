// One-off: upload a provided PNG as thumbnail for a content_file row and
// update thumbnail_path. Body: { id, pngBase64 }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { id, pngBase64 } = await req.json();
    if (!id || !pngBase64) return new Response(JSON.stringify({ error: 'missing' }), { status: 400, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: row, error: rowErr } = await supabase
      .from('content_files')
      .select('id, submission_id, content_submissions!inner(creator_id)')
      .eq('id', id)
      .single();
    if (rowErr || !row) return new Response(JSON.stringify({ error: rowErr?.message || 'not found' }), { status: 404, headers: corsHeaders });

    const userId = (row as any).content_submissions.creator_id as string;
    const bin = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));
    const thumbPath = `${userId}/thumbnails/backfill-${id}.png`;
    const { error: upErr } = await supabase.storage.from('thumbnails').upload(
      thumbPath,
      new Blob([bin], { type: 'image/png' }),
      { upsert: true, contentType: 'image/png', cacheControl: '3600' },
    );
    if (upErr) return new Response(JSON.stringify({ error: `upload: ${upErr.message}` }), { status: 500, headers: corsHeaders });

    const { data: pub } = supabase.storage.from('thumbnails').getPublicUrl(thumbPath);
    const thumbnailUrl = pub.publicUrl;

    const { error: updErr } = await supabase
      .from('content_files')
      .update({ thumbnail_path: thumbnailUrl })
      .eq('id', id);
    if (updErr) return new Response(JSON.stringify({ error: `update: ${updErr.message}` }), { status: 500, headers: corsHeaders });

    return new Response(JSON.stringify({ ok: true, thumbnail: thumbnailUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
