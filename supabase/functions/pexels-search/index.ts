import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
    if (!PEXELS_API_KEY) {
      throw new Error('PEXELS_API_KEY is not configured');
    }

    const url = new URL(req.url);
    let body: Record<string, string> = {};
    if (req.method === 'POST') {
      try { body = await req.json(); } catch { /* ignore */ }
    }
    const getParam = (k: string) => (url.searchParams.get(k) ?? body[k] ?? '') as string;
    const query = getParam('query');
    const type = getParam('type') || 'photos';
    const page = getParam('page') || '1';
    const per_page = getParam('per_page') || '30';
    const orientation = getParam('orientation');
    const id = getParam('id');

    // ── Single item fetch by ID ───────────────────────────────
    if (id) {
      const endpoint = type === 'videos'
        ? `https://api.pexels.com/videos/videos/${id}`
        : `https://api.pexels.com/v1/photos/${id}`;

      const response = await fetch(endpoint, {
        headers: { Authorization: PEXELS_API_KEY },
      });

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Build search/curated URL ──────────────────────────────
    let endpoint: string;

    if (!query) {
      // Curated/popular content when no query
      endpoint = type === 'videos'
        ? `https://api.pexels.com/videos/popular?per_page=${per_page}&page=${page}`
        : `https://api.pexels.com/v1/curated?per_page=${per_page}&page=${page}`;
    } else {
      // Search with query
      const params = new URLSearchParams({
        query,
        per_page,
        page,
      });
      if (orientation) params.set('orientation', orientation);

      endpoint = type === 'videos'
        ? `https://api.pexels.com/videos/search?${params}`
        : `https://api.pexels.com/v1/search?${params}`;
    }

    const response = await fetch(endpoint, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Pexels search error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
