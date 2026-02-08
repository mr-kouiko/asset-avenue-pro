import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const videoUrl = url.searchParams.get('url');

    if (!videoUrl) {
      console.error('[proxy-video] Missing url parameter');
      return new Response(
        JSON.stringify({ error: 'Missing url parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL - only allow Supabase storage and R2 URLs
    const allowedDomains = [
      'kdgfpophpoqugtuvfxqx.supabase.co',
      'supabase.co',
      'r2.cloudflarestorage.com',
      'pub-', // R2 public buckets
    ];

    const parsedUrl = new URL(videoUrl);
    const isAllowed = allowedDomains.some(domain => 
      parsedUrl.hostname.includes(domain) || parsedUrl.hostname.startsWith(domain)
    );

    if (!isAllowed) {
      console.error('[proxy-video] URL not allowed:', parsedUrl.hostname);
      return new Response(
        JSON.stringify({ error: 'URL not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[proxy-video] Fetching video from:', videoUrl);

    // Handle Range requests for video seeking
    const rangeHeader = req.headers.get('range');
    const fetchHeaders: HeadersInit = {};
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
      console.log('[proxy-video] Range request:', rangeHeader);
    }

    // Fetch the video from the source
    const response = await fetch(videoUrl, {
      headers: fetchHeaders,
    });

    if (!response.ok && response.status !== 206) {
      console.error('[proxy-video] Failed to fetch video:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch video', status: response.status }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get content type and length from response
    const contentType = response.headers.get('Content-Type') || 'video/mp4';
    const contentLength = response.headers.get('Content-Length');
    const contentRange = response.headers.get('Content-Range');
    const acceptRanges = response.headers.get('Accept-Ranges');

    console.log('[proxy-video] Response:', {
      status: response.status,
      contentType,
      contentLength,
      contentRange,
    });

    // Build response headers
    const responseHeaders: HeadersInit = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    };

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }
    if (acceptRanges) {
      responseHeaders['Accept-Ranges'] = acceptRanges;
    } else {
      responseHeaders['Accept-Ranges'] = 'bytes';
    }

    // Return the video blob with proper headers
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('[proxy-video] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
