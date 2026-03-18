import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const SITE_URL = "https://visustock.com";

// Fetch popular/curated content from Pexels for sitemap inclusion
async function fetchPexelsItems(apiKey: string, type: "photos" | "videos", pages: number) {
  const items: { slug: string; type: string }[] = [];

  for (let page = 1; page <= pages; page++) {
    try {
      const endpoint = type === "videos"
        ? `https://api.pexels.com/videos/popular?per_page=80&page=${page}`
        : `https://api.pexels.com/v1/curated?per_page=80&page=${page}`;

      const res = await fetch(endpoint, {
        headers: { Authorization: apiKey },
      });

      if (!res.ok) break;
      const data = await res.json();

      const list = type === "videos" ? data.videos : data.photos;
      if (!list || list.length === 0) break;

      for (const item of list) {
        const id = item.id;
        const rawText = type === "videos"
          ? (item.user?.name ? `video-by-${item.user.name}` : "")
          : (item.alt || "");

        // Generate slug
        const words = rawText
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .split(/\s+/)
          .filter((w: string) => w.length > 2)
          .slice(0, 6);

        const t = type === "videos" ? "video" : "photo";
        const keywordPart = words.length > 0 ? `-${words.join("-")}` : "";
        const slug = `free-${t}${keywordPart}-pexels-${id}`;

        items.push({ slug, type: t });
      }
    } catch (e) {
      console.error(`[sitemap-pexels] Error fetching ${type} page ${page}:`, e);
      break;
    }
  }

  return items;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");
    if (!PEXELS_API_KEY) {
      throw new Error("PEXELS_API_KEY not configured");
    }

    // Fetch curated photos (3 pages × 80 = 240) and popular videos (2 pages × 80 = 160)
    const [photos, videos] = await Promise.all([
      fetchPexelsItems(PEXELS_API_KEY, "photos", 3),
      fetchPexelsItems(PEXELS_API_KEY, "videos", 2),
    ]);

    const allItems = [...photos, ...videos];
    const today = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    for (const item of allItems) {
      xml += `  <url>
    <loc>${SITE_URL}/pexels/${item.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;
    }

    xml += `</urlset>`;

    console.log(`[sitemap-pexels] Generated with ${allItems.length} URLs (${photos.length} photos, ${videos.length} videos)`);

    return new Response(xml, {
      headers: { ...corsHeaders, "Cache-Control": "public, max-age=86400" }, // 24h cache
    });
  } catch (error) {
    console.error("[sitemap-pexels] Error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: corsHeaders }
    );
  }
});
