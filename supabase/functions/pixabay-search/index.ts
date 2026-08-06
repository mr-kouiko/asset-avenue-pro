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
    const PIXABAY_API_KEY = Deno.env.get('PIXABAY_API_KEY');
    if (!PIXABAY_API_KEY) {
      return new Response(JSON.stringify({ error: 'PIXABAY_API_KEY is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    let body: Record<string, string> = {};
    if (req.method === 'POST') {
      try { body = await req.json(); } catch { /* ignore */ }
    }
    const getParam = (k: string) => (url.searchParams.get(k) ?? body[k] ?? '') as string;

    const query = getParam('query');
    const type = getParam('type') === 'videos' ? 'videos' : 'photos';
    const page = getParam('page') || '1';
    const per_page = getParam('per_page') || '30';
    const orientation = getParam('orientation'); // horizontal | vertical
    const id = getParam('id');
    const category = getParam('category');
    const safesearch = getParam('safesearch') || 'true';

    const base = type === 'videos'
      ? 'https://pixabay.com/api/videos/'
      : 'https://pixabay.com/api/';

    const params = new URLSearchParams({ key: PIXABAY_API_KEY, safesearch });

    if (id) {
      params.set('id', id);
    } else {
      params.set('page', page);
      params.set('per_page', String(Math.min(Math.max(parseInt(per_page, 10) || 30, 3), 200)));
      if (query) params.set('q', query);
      else params.set('order', 'popular');
      if (category) params.set('category', category);
      if (orientation && type === 'photos') {
        params.set('orientation', orientation === 'portrait' ? 'vertical' : orientation === 'landscape' ? 'horizontal' : orientation);
      }
    }

    const endpoint = `${base}?${params}`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      const details = await response.text();
      console.error(`Pixabay API error [${response.status}]: ${details}`);
      return new Response(JSON.stringify({ error: 'Pixabay request failed', status: response.status, details }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
    });
  } catch (error) {
    console.error('Pixabay search error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
