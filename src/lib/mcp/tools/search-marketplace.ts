import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function db() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "search_marketplace",
  title: "Search VisuStock marketplace",
  description:
    "Search approved products (photos, videos, audio, VFX, ebooks) on the VisuStock marketplace by keyword and optional filters. Returns titles, slugs, prices (USD), and product URLs.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Keyword or phrase to search titles, descriptions, and tags."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
    max_price: z.number().min(0).optional().describe("Filter to products at or below this USD price."),
    only_free: z.boolean().optional().describe("If true, return only free items (price = 0)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit, max_price, only_free }) => {
    const supabase = db();
    let q = supabase
      .from("content_submissions")
      .select("id, title, description, slug, price, tags, width, height, created_at")
      .eq("status", "approved")
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (only_free) q = q.eq("price", 0);
    else if (typeof max_price === "number") q = q.lte("price", max_price);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };

    const results = (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      price_usd: r.price ?? 0,
      url: r.slug ? `https://visustock.com/products/${r.slug}` : `https://visustock.com/products/${r.id}`,
      tags: r.tags ?? [],
      dimensions: r.width && r.height ? `${r.width}x${r.height}` : null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { count: results.length, results },
    };
  },
});
