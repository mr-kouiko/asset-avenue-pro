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
  name: "get_product",
  title: "Get VisuStock product details",
  description:
    "Fetch full details for a single approved VisuStock product by its slug or UUID: title, description, price (USD), tags, dimensions, and canonical URL.",
  inputSchema: {
    slug_or_id: z.string().trim().min(1).describe("Product slug (preferred) or UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug_or_id }) => {
    const supabase = db();
    const isUuid = /^[0-9a-f-]{36}$/i.test(slug_or_id);
    const { data, error } = await supabase
      .from("content_submissions")
      .select("id, title, description, slug, price, tags, width, height, created_at, status")
      .eq("status", "approved")
      .eq(isUuid ? "id" : "slug", slug_or_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Product not found." }], isError: true };

    const product = {
      id: data.id,
      title: data.title,
      description: data.description,
      slug: data.slug,
      price_usd: data.price ?? 0,
      tags: data.tags ?? [],
      dimensions: data.width && data.height ? `${data.width}x${data.height}` : null,
      url: data.slug ? `https://visustock.com/products/${data.slug}` : `https://visustock.com/products/${data.id}`,
      created_at: data.created_at,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(product, null, 2) }],
      structuredContent: { product },
    };
  },
});
