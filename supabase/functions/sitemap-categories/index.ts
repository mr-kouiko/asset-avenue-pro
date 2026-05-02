import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const SITE_URL = "https://visustock.com";
const STATIC_PREFIX = "/s";
const LANGS = ["en", "fr", "es", "de", "pt"] as const;
const langPath = (lang: string, path: string) => (lang === "en" ? path : `/${lang}${path}`);

function emitLocalized(path: string, priority: string, changefreq: string, lastmod: string): string {
  let out = "";
  for (const lang of LANGS) {
    out += `  <url>
    <loc>${SITE_URL}${langPath(lang, path)}</loc>
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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name");

    const now = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

    xml += emitLocalized(`${STATIC_PREFIX}/categories`, "0.9", "daily", now);

    if (categories) {
      for (const cat of categories) {
        const { count } = await supabase
          .from("content_submissions")
          .select("*", { count: "exact", head: true })
          .eq("category_id", cat.id)
          .eq("status", "approved")
          .not("slug", "is", null);

        if (count && count > 0) {
          xml += emitLocalized(`${STATIC_PREFIX}/categories/${cat.slug}`, "0.8", "daily", now);
        }
      }
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600" },
    });
  } catch (error) {
    console.error("[sitemap-categories] Error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: corsHeaders }
    );
  }
});
