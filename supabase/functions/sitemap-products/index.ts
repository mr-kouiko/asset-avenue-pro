import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const SITE_URL = "https://visustock.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: products, error } = await supabase
      .from("content_submissions")
      .select("id, slug, updated_at, created_at, content_files(file_type, thumbnail_path)")
      .eq("status", "approved")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
`;

    if (products) {
      for (const product of products) {
        const lastmod = product.updated_at
          ? new Date(product.updated_at).toISOString().split("T")[0]
          : new Date(product.created_at).toISOString().split("T")[0];

        const thumbnail = product.content_files?.[0]?.thumbnail_path;
        const fileType = product.content_files?.[0]?.file_type || "";
        const isVideo = fileType.startsWith("video/");

        // Static page is the canonical URL for SEO
        xml += `  <url>
    <loc>${SITE_URL}/s/products/${product.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`;

        // Add image extension for thumbnails
        if (thumbnail) {
          const imgUrl = thumbnail.startsWith("http")
            ? thumbnail
            : `${supabaseUrl}/storage/v1/object/public/content-files/${thumbnail}`;
          xml += `
    <image:image>
      <image:loc>${imgUrl}</image:loc>
    </image:image>`;
        }

        xml += `
  </url>
`;
      }
    }

    xml += `</urlset>`;

    console.log(`[sitemap-products] Generated with ${products?.length || 0} products`);

    return new Response(xml, {
      headers: { ...corsHeaders, "Cache-Control": "public, max-age=1800" },
    });
  } catch (error) {
    console.error("[sitemap-products] Error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: corsHeaders }
    );
  }
});
