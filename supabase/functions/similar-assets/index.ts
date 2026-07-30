import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY = 'https://ai.gateway.lovable.dev/v1/embeddings';
const MODEL = 'google/gemini-embedding-2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

type Row = {
  id: string;
  title: string | null;
  description: string | null;
  tags: string[] | null;
  content_files: Array<{ thumbnail_path: string | null; file_type: string | null }> | null;
};

async function embed(apiKey: string, input: unknown): Promise<number[] | null> {
  const res = await fetch(GATEWAY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': apiKey },
    body: JSON.stringify({ model: MODEL, input, encoding_format: 'float' }),
  });
  if (!res.ok) {
    console.error('embeddings error', res.status, (await res.text()).slice(0, 400));
    return null;
  }
  const data = await res.json();
  return data?.data?.[0]?.embedding ?? null;
}

function textOf(row: Row) {
  return [row.title, row.description, (row.tags || []).join(', ')]
    .filter(Boolean)
    .join('. ')
    .slice(0, 4000);
}

// Visual-first embedding: the image carries composition, lighting, colour palette,
// subject and photographic style. Text is only a short hint so it can never dominate.
async function embedRow(apiKey: string, row: Row): Promise<{ vec: number[]; source: string } | null> {
  const thumb = row.content_files?.[0]?.thumbnail_path;
  if (thumb && /^https?:\/\//i.test(thumb)) {
    const hint = (row.title || '').slice(0, 80);
    const vec = await embed(apiKey, [
      {
        content: [
          { type: 'image_url', image_url: { url: thumb } },
          ...(hint ? [{ type: 'text', text: hint }] : []),
        ],
      },
    ]);
    if (vec) return { vec, source: 'image' };
  }
  const vec = await embed(apiKey, textOf(row));
  return vec ? { vec, source: 'text' } : null;
}

const mediaFamily = (t?: string | null) => (t || '').toLowerCase().split('/')[0] || null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return json({ error: 'Missing LOVABLE_API_KEY' }, 500);

    const { submissionId, limit } = await req.json().catch(() => ({}));
    if (!submissionId || typeof submissionId !== 'string') {
      return json({ error: 'submissionId is required' }, 400);
    }
    const matchCount = Math.min(Math.max(Number(limit) || 12, 8), 12);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const select = 'id, title, description, tags, content_files(thumbnail_path, file_type)';

    const { data: current, error: curErr } = await supabase
      .from('content_submissions')
      .select(select)
      .eq('id', submissionId)
      .maybeSingle();

    if (curErr || !current) return json({ items: [], reason: 'not_found' });

    // 1. Ensure the current asset has an embedding.
    const { data: existing } = await supabase
      .from('asset_embeddings')
      .select('submission_id, source')
      .eq('submission_id', submissionId)
      .maybeSingle();

    const currentThumb = (current as any)?.content_files?.[0]?.thumbnail_path as string | undefined;
    // Upgrade text-only embeddings to visual ones as soon as a thumbnail exists.
    const needsVisualUpgrade =
      !!existing && (existing as any).source !== 'image' && !!currentThumb && /^https?:\/\//i.test(currentThumb);

    let queryVec: number[] | null = null;
    if (!existing || needsVisualUpgrade) {
      const result = await embedRow(apiKey, current as Row);
      if (result) {
        queryVec = result.vec;
        await supabase.from('asset_embeddings').upsert({
          submission_id: submissionId,
          embedding: JSON.stringify(result.vec),
          model: MODEL,
          source: result.source,
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      const { data: row } = await supabase
        .from('asset_embeddings')
        .select('embedding')
        .eq('submission_id', submissionId)
        .maybeSingle();
      const raw = (row as any)?.embedding;
      queryVec = typeof raw === 'string' ? JSON.parse(raw) : raw;
    }

    // 2. Opportunistically index a small batch of not-yet-embedded approved assets.
    const { data: indexed } = await supabase.from('asset_embeddings').select('submission_id').limit(5000);
    const indexedIds = new Set((indexed || []).map((r: any) => r.submission_id));

    const { data: candidates } = await supabase
      .from('content_submissions')
      .select(select)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(200);

    const pending = (candidates || []).filter((c: any) => !indexedIds.has(c.id)).slice(0, 12);
    for (const row of pending) {
      const result = await embedRow(apiKey, row as Row);
      if (!result) continue;
      await supabase.from('asset_embeddings').upsert({
        submission_id: row.id,
        embedding: JSON.stringify(result.vec),
        model: MODEL,
        source: result.source,
        updated_at: new Date().toISOString(),
      });
    }

    // 3. Similarity search.
    let items: any[] = [];
    if (queryVec) {
      const { data: matches, error: matchErr } = await supabase.rpc('match_similar_assets', {
        query_embedding: JSON.stringify(queryVec),
        exclude_id: submissionId,
        match_count: matchCount,
        // Metadata only refines the visual ranking (see match_similar_assets).
        query_tags: ((current as any).tags || []).slice(0, 12),
        prefer_type: mediaFamily((current as any)?.content_files?.[0]?.file_type),
        min_similarity: 0.5,
        max_per_creator: 3,
      });

      // Relax the relevance floor only if we came back nearly empty.
      if (!matchErr && (matches || []).length < 4) {
        const { data: relaxed } = await supabase.rpc('match_similar_assets', {
          query_embedding: JSON.stringify(queryVec),
          exclude_id: submissionId,
          match_count: matchCount,
          query_tags: ((current as any).tags || []).slice(0, 12),
          prefer_type: mediaFamily((current as any)?.content_files?.[0]?.file_type),
          min_similarity: 0.3,
          max_per_creator: 4,
        });
        if ((relaxed || []).length > (matches || []).length) {
          items = relaxed || [];
          return json({ items: items.slice(0, matchCount) });
        }
      }
      if (matchErr) console.error('match error', matchErr);
      items = matches || [];
    }

    // 4. Fallback: tag / category overlap when the index is still warming up.
    if (items.length < 8) {
      const tags = ((current as any).tags || []).slice(0, 5);
      if (!tags.length && items.length > 0) return json({ items: items.slice(0, matchCount) });
      const or = tags.length
        ? tags.map((t: string) => `tags.cs.{${t}}`).join(',')
        : `title.ilike.%${(current as any).title?.split(' ')?.[0] || ''}%`;
      const { data: fallback } = await supabase
        .from('content_submissions')
        .select('id, title, slug, price, content_files(thumbnail_path, file_type)')
        .eq('status', 'approved')
        .neq('id', submissionId)
        .or(or)
        .limit(matchCount * 2);

      const seen = new Set(items.map((i) => i.id));
      const family = mediaFamily((current as any)?.content_files?.[0]?.file_type);
      for (const f of fallback || []) {
        if (items.length >= matchCount) break;
        if (seen.has(f.id)) continue;
        const fFamily = mediaFamily((f as any).content_files?.[0]?.file_type);
        // Avoid irrelevant matches: keep the same media family when we know it.
        if (family && fFamily && fFamily !== family) continue;
        if (!(f as any).content_files?.[0]?.thumbnail_path) continue;
        seen.add(f.id);
        items.push({
          id: f.id,
          title: f.title,
          slug: (f as any).slug,
          price: f.price,
          thumbnail_path: (f as any).content_files?.[0]?.thumbnail_path ?? null,
          file_type: (f as any).content_files?.[0]?.file_type ?? null,
          similarity: null,
        });
      }
    }

    return json({ items: items.slice(0, matchCount) });
  } catch (e) {
    console.error('similar-assets failed', e);
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
