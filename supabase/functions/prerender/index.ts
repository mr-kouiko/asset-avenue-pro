import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://visustock.com";

const CRAWLERS = ["googlebot", "bingbot", "yandexbot", "facebookexternalhit", "twitterbot", "linkedinbot", "discordbot"];

function isCrawler(ua: string): boolean {
  return CRAWLERS.some((c) => ua.toLowerCase().includes(c));
}

function esc(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function html(title: string, desc: string, h1: string, url: string, img: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${img}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"></head><body><h1>${esc(h1)}</h1>${body}<p><a href="${SITE_URL}">VisuStock</a></p></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/";
    const ua = req.headers.get("user-agent") || "";

    console.log(`[PRERENDER] Request for path: ${path}, UA: ${ua.substring(0, 50)}`);

    if (!isCrawler(ua)) {
      return new Response(JSON.stringify({ prerender: false, reason: "not-crawler" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const logo = `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`;

    // Homepage
    if (path === "/" || path === "/en") {
      const { data: products } = await supabase
        .from("content_submissions")
        .select("title, slug")
        .eq("status", "approved")
        .not("slug", "is", null)
        .limit(10);

      const list = products?.map((p: any) => `<li><a href="${SITE_URL}/products/${p.slug}">${esc(p.title)}</a></li>`).join("") || "";
      
      return new Response(
        html("VisuStock - Premium Stock Photos, Videos & Audio", "Discover high-quality stock content from talented creators.", "Premium Creative Content Marketplace", SITE_URL, logo, `<ul>${list}</ul>`),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" } }
      );
    }

    // Marketplace
    if (path === "/marketplace") {
      const { data: products } = await supabase
        .from("content_submissions")
        .select("title, slug, price")
        .eq("status", "approved")
        .not("slug", "is", null)
        .limit(30);

      const list = products?.map((p: any) => `<li><a href="${SITE_URL}/products/${p.slug}">${esc(p.title)}</a>${p.price ? ` - €${p.price}` : ""}</li>`).join("") || "";

      return new Response(
        html("Marketplace - VisuStock", "Browse professional stock photos, videos and audio.", "Creative Content Marketplace", `${SITE_URL}/marketplace`, logo, `<ul>${list}</ul>`),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=1800" } }
      );
    }

    // Product pages
    if (path.startsWith("/products/")) {
      const slug = path.replace("/products/", "");
      const uuid = slug.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];

      let product = null;
      const { data: bySlug } = await supabase
        .from("content_submissions")
        .select("id, title, description, slug, price, content_files(thumbnail_path)")
        .eq("slug", slug)
        .eq("status", "approved")
        .single();

      product = bySlug;
      if (!product && uuid) {
        const { data: byId } = await supabase
          .from("content_submissions")
          .select("id, title, description, slug, price, content_files(thumbnail_path)")
          .eq("id", uuid)
          .eq("status", "approved")
          .single();
        product = byId;
      }

      if (!product) {
        return new Response(html("Not Found - VisuStock", "Page not found", "Not Found", SITE_URL, logo, "<p>This page doesn't exist.</p>"), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        });
      }

      const thumb = product.content_files?.[0]?.thumbnail_path;
      const img = thumb?.startsWith("http") ? thumb : thumb ? `${supabaseUrl}/storage/v1/object/public/content-files/${thumb}` : logo;
      const pUrl = `${SITE_URL}/products/${product.slug || slug}`;

      return new Response(
        html(`${product.title} - VisuStock`, product.description?.substring(0, 155) || "Premium content", product.title, pUrl, img, `<p>${esc(product.description || "")}</p>${product.price ? `<p>Price: €${product.price}</p>` : ""}`),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=1800" } }
      );
    }

    // Static pages
    const pages: Record<string, [string, string, string]> = {
      "/about": ["About VisuStock", "Learn about VisuStock marketplace", "About Us"],
      "/en/about": ["About VisuStock", "Learn about VisuStock marketplace", "About Us"],
      "/contact": ["Contact VisuStock", "Get in touch with our team", "Contact Us"],
      "/en/contact": ["Contact VisuStock", "Get in touch with our team", "Contact Us"],
      "/licenses": ["Licensing - VisuStock", "Content licensing information", "Licensing"],
      "/terms": ["Terms of Service - VisuStock", "Terms and conditions", "Terms of Service"],
      "/en/terms": ["Terms of Service - VisuStock", "Terms and conditions", "Terms of Service"],
      "/privacy": ["Privacy Policy - VisuStock", "How we handle your data", "Privacy Policy"],
      "/en/privacy": ["Privacy Policy - VisuStock", "How we handle your data", "Privacy Policy"],
      "/packages-pricing": ["Pricing - VisuStock", "Subscription plans and pricing", "Pricing"],
    };

    const page = pages[path];
    if (page) {
      return new Response(
        html(page[0], page[1], page[2], `${SITE_URL}${path}`, logo, ""),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=86400" } }
      );
    }

    return new Response(JSON.stringify({ prerender: false, reason: "unknown-path" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[PRERENDER] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
