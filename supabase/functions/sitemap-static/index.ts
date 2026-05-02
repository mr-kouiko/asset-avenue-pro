const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const SITE_URL = "https://visustock.com";
const STATIC_PREFIX = "/s";
const LANGS = ["en", "fr", "es", "de", "pt"] as const;

// Returns the path prefixed for a given language ("" for English/root)
const langPath = (lang: string, path: string) => (lang === "en" ? path : `/${lang}${path}`);

function buildLocalizedUrl(path: string, priority: string, changefreq: string, lastmod: string): string {
  let out = "";
  for (const lang of LANGS) {
    const loc = `${SITE_URL}${langPath(lang, path)}`;
    out += `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
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

  const now = new Date().toISOString().split("T")[0];

  // Localized pages (emitted once per language with hreflang alternates)
  const localizedPages = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/marketplace", priority: "0.9", changefreq: "hourly" },
    { path: `${STATIC_PREFIX}/categories`, priority: "0.9", changefreq: "daily" },
    { path: "/about", priority: "0.7", changefreq: "monthly" },
    { path: "/contact", priority: "0.6", changefreq: "monthly" },
    { path: "/packages-pricing", priority: "0.8", changefreq: "weekly" },
    { path: "/licenses", priority: "0.6", changefreq: "monthly" },
    { path: "/ai-image-generator", priority: "0.8", changefreq: "weekly" },
    { path: "/buy-credits", priority: "0.7", changefreq: "weekly" },
    { path: "/support", priority: "0.5", changefreq: "monthly" },
    { path: "/blog", priority: "0.7", changefreq: "weekly" },
    { path: "/free-stock-library", priority: "0.8", changefreq: "weekly" },
  ];

  // English-only legal pages (kept at root + /en)
  const legalPages = [
    { path: "/terms", priority: "0.3", changefreq: "yearly" },
    { path: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
    { path: "/cookie-policy", priority: "0.3", changefreq: "yearly" },
    { path: "/license-agreement", priority: "0.4", changefreq: "yearly" },
    { path: "/infinity", priority: "0.7", changefreq: "monthly" },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  for (const page of localizedPages) {
    xml += buildLocalizedUrl(page.path, page.priority, page.changefreq, now);
  }

  for (const page of legalPages) {
    xml += `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: { ...corsHeaders, "Cache-Control": "public, max-age=86400" },
  });
});
