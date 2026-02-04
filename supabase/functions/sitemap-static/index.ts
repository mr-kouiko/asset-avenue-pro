const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const SITE_URL = "https://visustock.com";
const STATIC_PREFIX = "/s";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const now = new Date().toISOString().split("T")[0];

  // Only include indexable, content-rich pages
  // Exclude: auth pages, dashboards, filter variations, search pages
  const pages = [
    // Core pages (highest priority)
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/marketplace", priority: "0.9", changefreq: "hourly" },
    { url: `${STATIC_PREFIX}/categories`, priority: "0.9", changefreq: "daily" },
    
    // English homepage
    { url: "/en", priority: "1.0", changefreq: "daily" },
    
    // About & Info pages
    { url: "/about", priority: "0.7", changefreq: "monthly" },
    { url: "/en/about", priority: "0.7", changefreq: "monthly" },
    { url: "/contact", priority: "0.6", changefreq: "monthly" },
    { url: "/en/contact", priority: "0.6", changefreq: "monthly" },
    
    // Commercial pages
    { url: "/packages-pricing", priority: "0.8", changefreq: "weekly" },
    { url: "/licenses", priority: "0.6", changefreq: "monthly" },
    { url: "/ai-image-generator", priority: "0.8", changefreq: "weekly" },
    { url: "/buy-credits", priority: "0.7", changefreq: "weekly" },
    
    // Support
    { url: "/support", priority: "0.5", changefreq: "monthly" },
    
    // Blog (if exists)
    { url: "/blog", priority: "0.7", changefreq: "weekly" },
    
    // Legal pages (low priority but required)
    { url: "/terms", priority: "0.3", changefreq: "yearly" },
    { url: "/en/terms", priority: "0.3", changefreq: "yearly" },
    { url: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
    { url: "/en/privacy", priority: "0.3", changefreq: "yearly" },
    { url: "/cookie-policy", priority: "0.3", changefreq: "yearly" },
    { url: "/en/cookie-policy", priority: "0.3", changefreq: "yearly" },
    { url: "/license-agreement", priority: "0.4", changefreq: "yearly" },
    { url: "/en/license-agreement", priority: "0.4", changefreq: "yearly" },
    { url: "/en/infinity", priority: "0.7", changefreq: "monthly" },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const page of pages) {
    xml += `  <url>
    <loc>${SITE_URL}${page.url}</loc>
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
