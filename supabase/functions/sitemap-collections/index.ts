const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://visustock.com";
const STATIC_PREFIX = "/s";
const LANGS = ["en", "fr", "es", "de", "pt"] as const;
const langPath = (lang: string, path: string) => (lang === "en" ? path : `/${lang}${path}`);

const collectionSlugs = [
  "business",
  "technology",
  "nature",
  "travel",
  "food",
  "health-wellness",
  "education",
  "lifestyle",
  "music-audio",
  "abstract-backgrounds",
];

function emitLocalized(path: string, priority: string, lastmod: string): string {
  let out = "";
  for (const lang of LANGS) {
    out += `  <url>
    <loc>${SITE_URL}${langPath(lang, path)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
`;
    for (const alt of LANGS) {
      out += `    <xhtml:link rel="alternate" hreflang="${alt}" href="${SITE_URL}${langPath(alt, path)}" />\n`;
    }
    out += `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${path}" />\n  </url>\n`;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

    xml += emitLocalized(`${STATIC_PREFIX}/collections`, "0.9", now);

    for (const slug of collectionSlugs) {
      xml += emitLocalized(`${STATIC_PREFIX}/collections/${slug}`, "0.8", now);
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
