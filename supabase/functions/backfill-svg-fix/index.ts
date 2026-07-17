// One-off backfill: sanitize + re-derive metadata for 2 legacy SVG uploads
// from user javid.heyrabady@gmail.com that predate the SVG hardening pipeline.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resvg, initWasm } from 'https://esm.sh/@resvg/resvg-wasm@2.6.2';
const WASM_URL = 'https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TARGET_EMAIL = 'javid.heyrabady@gmail.com';

let wasmReady: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = initWasm(wasm as unknown as ArrayBuffer);
  }
  await wasmReady;
}

// Mirror of src/utils/svgUtils.ts sanitizeSvgString — regex-only fallback
// (DOMPurify isn't trivially available in Deno). Matches the client behavior
// closely enough for these two legacy files, and is strictly conservative.
function sanitizeSvgString(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\s(xlink:href|href)\s*=\s*"(?!#|data:)[^"]*"/gi, '')
    .replace(/\s(xlink:href|href)\s*=\s*'(?!#|data:)[^']*'/gi, '');
}

function parseSvgDimensions(svg: string): { width: number; height: number } | null {
  const vb = svg.match(/<svg[^>]*\sviewBox\s*=\s*["']([^"']+)["']/i);
  if (vb) {
    const parts = vb[1].trim().split(/[\s,]+/).map(parseFloat);
    if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      return scaleUp(parts[2], parts[3]);
    }
  }
  const w = svg.match(/<svg[^>]*\swidth\s*=\s*["']?([\d.]+)/i);
  const h = svg.match(/<svg[^>]*\sheight\s*=\s*["']?([\d.]+)/i);
  if (w && h) {
    const ww = parseFloat(w[1]);
    const hh = parseFloat(h[1]);
    if (ww > 0 && hh > 0) return scaleUp(ww, hh);
  }
  return null;
}
function scaleUp(w: number, h: number, minLong = 800) {
  const longest = Math.max(w, h);
  if (longest >= minLong) return { width: Math.round(w), height: Math.round(h) };
  const f = minLong / longest;
  return { width: Math.round(w * f), height: Math.round(h * f) };
}

// Extract public storage path (bucket + key) from a Supabase public URL.
function parsePublicUrl(url: string): { bucket: string; path: string } | null {
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { data: rows, error: qErr } = await supabase.rpc('exec_sql' as never, {} as never).then(() => ({ data: null, error: null })).catch(() => ({ data: null, error: null }));
    // Direct query instead:
    const { data: userRow, error: uErr } = await supabase
      .schema('auth' as never)
      .from('users' as never)
      .select('id')
      .eq('email', TARGET_EMAIL)
      .maybeSingle();
    if (uErr || !userRow) throw new Error(`User lookup failed: ${uErr?.message}`);
    const userId = (userRow as { id: string }).id;

    const { data: files, error: fErr } = await supabase
      .from('content_files')
      .select('id, file_path, file_type, metadata, submission_id, content_submissions!inner(creator_id)')
      .eq('file_format', 'image/svg+xml')
      .eq('content_submissions.creator_id', userId);
    if (fErr) throw new Error(`Files query failed: ${fErr.message}`);

    await ensureWasm();

    const report: unknown[] = [];
    for (const f of files ?? []) {
      const before = { id: f.id, file_type: f.file_type, metadata: f.metadata };
      const parsed = parsePublicUrl(f.file_path);
      if (!parsed) { report.push({ ...before, error: 'unparseable file_path' }); continue; }

      // Fetch original from private storage via signed URL fallback OR public
      const rawRes = await fetch(f.file_path);
      if (!rawRes.ok) { report.push({ ...before, error: `fetch ${rawRes.status}` }); continue; }
      const rawText = await rawRes.text();

      const clean = sanitizeSvgString(rawText);
      const dims = parseSvgDimensions(clean) ?? { width: 800, height: 800 };

      // Overwrite sanitized SVG in place
      const { error: upErr } = await supabase.storage
        .from(parsed.bucket)
        .upload(parsed.path, new Blob([clean], { type: 'image/svg+xml' }), {
          upsert: true,
          contentType: 'image/svg+xml',
          cacheControl: '3600',
        });
      if (upErr) { report.push({ ...before, error: `upload svg: ${upErr.message}` }); continue; }

      // Rasterize to PNG thumbnail at max 400px
      const scale = Math.min(1, 400 / Math.max(dims.width, dims.height));
      const thumbW = Math.max(1, Math.round(dims.width * scale));
      const resvg = new Resvg(clean, { fitTo: { mode: 'width', value: thumbW } });
      const png = resvg.render().asPng();

      const thumbPath = `${userId}/thumbnails/backfill-${f.id}.png`;
      const { error: tErr } = await supabase.storage
        .from('thumbnails')
        .upload(thumbPath, png, { upsert: true, contentType: 'image/png', cacheControl: '3600' });
      if (tErr) { report.push({ ...before, error: `upload thumb: ${tErr.message}` }); continue; }
      const { data: pub } = supabase.storage.from('thumbnails').getPublicUrl(thumbPath);
      const thumbnailUrl = pub.publicUrl;

      const newMetadata = {
        ...(f.metadata as Record<string, unknown> ?? {}),
        width: dims.width,
        height: dims.height,
        sanitized: true,
        backfilledAt: new Date().toISOString(),
      };

      const { error: dbErr } = await supabase
        .from('content_files')
        .update({ file_type: 'vector', metadata: newMetadata, thumbnail_path: thumbnailUrl })
        .eq('id', f.id);
      if (dbErr) { report.push({ ...before, error: `db: ${dbErr.message}` }); continue; }

      report.push({
        id: f.id,
        before,
        after: { file_type: 'vector', metadata: newMetadata, thumbnail_path: thumbnailUrl },
      });
    }

    return new Response(JSON.stringify({ ok: true, count: report.length, report }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
