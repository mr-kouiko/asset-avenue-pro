import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const videoUrl = url.searchParams.get('url');

    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing url parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Validate URL - only allow Supabase storage and R2 URLs
    const allowedDomains = [
      'kdgfpophpoqugtuvfxqx.supabase.co',
      'supabase.co',
      'r2.cloudflarestorage.com',
      'pub-',
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

    // Determine if this is a private bucket URL that needs a signed URL
    let fetchTarget = videoUrl;
    const isContentUploads = videoUrl.includes('/content-uploads/') || videoUrl.includes('/object/public/content-uploads/');
    const isPrivateBucket = isContentUploads;

    if (isPrivateBucket && serviceRoleKey) {
      // Extract the relative path from the URL
      const pathMatch = parsedUrl.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/content-uploads\/(.+)/);
      if (pathMatch) {
        const relativePath = decodeURIComponent(pathMatch[1]);
        console.log('[proxy-video] Generating signed URL for private file:', relativePath);

        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: signedData, error: signedError } = await adminClient.storage
          .from('content-uploads')
          .createSignedUrl(relativePath, 300); // 5 min

        if (signedError || !signedData) {
          console.error('[proxy-video] Failed to generate signed URL:', signedError);
          return new Response(
            JSON.stringify({ error: 'Failed to access private file' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        fetchTarget = signedData.signedUrl;
        console.log('[proxy-video] Using signed URL for private bucket access');
      }
    }

    console.log('[proxy-video] Fetching video from:', fetchTarget.substring(0, 100) + '...');

    // Handle Range requests for video seeking
    const rangeHeader = req.headers.get('range');
    const fetchHeaders: HeadersInit = {};
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const response = await fetch(fetchTarget, { headers: fetchHeaders });

    if (!response.ok && response.status !== 206) {
      console.error('[proxy-video] Failed to fetch video:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch video', status: response.status }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = response.headers.get('Content-Type') || 'video/mp4';
    const contentLength = response.headers.get('Content-Length');
    const contentRange = response.headers.get('Content-Range');
    const acceptRanges = response.headers.get('Accept-Ranges');

    const responseHeaders: HeadersInit = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    };

    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    if (contentRange) responseHeaders['Content-Range'] = contentRange;
    responseHeaders['Accept-Ranges'] = acceptRanges || 'bytes';

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
