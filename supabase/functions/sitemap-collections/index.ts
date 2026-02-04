const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://visustock.com";
const STATIC_PREFIX = "/s";

// Collection slugs (synced with static-collection)
const collectionSlugs = [
  'business',
  'technology',
  'nature',
  'travel',
  'food',
  'health-wellness',
  'education',
  'lifestyle',
  'music-audio',
  'abstract-backgrounds'
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = new Date().toISOString().split('T')[0];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}${STATIC_PREFIX}/collections</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;

    for (const slug of collectionSlugs) {
      xml += `  <url>
    <loc>${SITE_URL}${STATIC_PREFIX}/collections/${slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[sitemap-collections] Error:", error);
    return new Response(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>`, {
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  }
});
