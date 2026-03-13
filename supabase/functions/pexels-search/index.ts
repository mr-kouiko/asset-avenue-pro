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
    const query = url.searchParams.get('query') || '';
    const type = url.searchParams.get('type') || 'photos'; // photos or videos
    const page = url.searchParams.get('page') || '1';
    const per_page = url.searchParams.get('per_page') || '30';

    if (!query) {
      // Return curated/popular content when no query
      const endpoint = type === 'videos'
        ? `https://api.pexels.com/videos/popular?per_page=${per_page}&page=${page}`
        : `https://api.pexels.com/v1/curated?per_page=${per_page}&page=${page}`;

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

    const endpoint = type === 'videos'
      ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${per_page}&page=${page}`
      : `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${per_page}&page=${page}`;

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
