import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const SITE_URL = "https://visustock.com";
const FUNCTIONS_URL = "https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${FUNCTIONS_URL}/sitemap-static</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${FUNCTIONS_URL}/sitemap-categories</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${FUNCTIONS_URL}/sitemap-products</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;

  return new Response(xml, {
    headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600" },
  });
});
