import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const SITE_URL = "https://visustock.com";
const STATIC_PREFIX = "/s"; // SEO canonical URLs use /s/ prefix

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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add categories index page
    xml += `  <url>
    <loc>${SITE_URL}${STATIC_PREFIX}/categories</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;

    // Add category pages (only categories with approved products)
    if (categories) {
      for (const cat of categories) {
        // Check if category has approved products
        const { count } = await supabase
          .from("content_submissions")
          .select("*", { count: "exact", head: true })
          .eq("category_id", cat.id)
          .eq("status", "approved")
          .not("slug", "is", null);

        // Only include categories with at least 1 product (avoid soft 404s)
        if (count && count > 0) {
          // Use static page URL as canonical
          xml += `  <url>
    <loc>${SITE_URL}${STATIC_PREFIX}/categories/${cat.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
        } else {
          console.log(`[sitemap-categories] Skipping empty category: ${cat.name} (0 products)`);
        }
      }
    }

    xml += `</urlset>`;

    const includedCount = (xml.match(/<url>/g) || []).length;
    console.log(`[sitemap-categories] Generated with ${includedCount} URLs (${categories?.length || 0} total categories)`);

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
