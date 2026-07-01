import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = [
  { name: "AI Visuals", tag: "ai-visuals", topics: [
    "How AI image generators change stock photography workflows",
    "Best prompt techniques for generating photoreal AI backgrounds",
    "Blending AI-generated and real photography in campaigns",
    "AI upscaling: turning small assets into hero visuals",
    "Ethics and licensing of AI-generated stock imagery",
  ]},
  { name: "Stock Footage", tag: "stock-footage", topics: [
    "Vertical video trends dominating stock footage sales",
    "How to shoot 4K B-roll that actually sells",
    "Drone footage checklist for stock marketplaces",
    "Editing loopable background videos for websites",
    "Color grading stock footage for consistency",
  ]},
  { name: "Creative Trends", tag: "creative-trends", topics: [
    "Design trends creators should watch this quarter",
    "The rise of authentic imagery in brand marketing",
    "Motion design trends shaping social content",
    "Color palettes trending in stock imagery right now",
    "How Gen Z buyers pick stock visuals differently",
  ]},
  { name: "Prompts", tag: "prompts", topics: [
    "10 high-converting prompts for cinematic AI video",
    "Prompt library: portraits that feel human",
    "Prompt engineering for isometric product illustrations",
    "How to iterate on prompts to nail brand style",
    "Negative prompts every creator should master",
  ]},
  { name: "Digital Assets", tag: "digital-assets", topics: [
    "Building a passive income portfolio with digital assets",
    "Pricing digital assets: what buyers actually pay",
    "Keywording strategy that ranks stock content",
    "From asset to package: bundling for higher AOV",
    "Licensing digital assets without getting burned",
  ]},
];

// A stable pool of themed hero images (Unsplash — free, hotlinkable).
const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1500673922987-e212871fec22?w=1200&h=630&fit=crop",
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function generateArticle(topic: string, categoryName: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const systemPrompt = `You are a senior SEO editor for VisuStock, an AI + stock marketplace for photos, videos, audio, vectors and VFX. Write engaging, keyword-rich but human editorial content. Always include 3-6 contextual internal links back to VisuStock:
- /marketplace  (all premium assets)
- /marketplace?category=photo  /marketplace?category=video  /marketplace?category=audio  /marketplace?category=vector  /marketplace?category=vfx
- /free-stock-library  (free Pexels-powered library)
- /studio-ai  (AI creator tools hub)
- /infinity  (subscription for unlimited photos/audio/vectors)
- /collections  (curated collections)
Use plain markdown links in the body like [browse the marketplace](/marketplace). Do NOT link to external websites. Never include images, HTML, or code fences. Output valid JSON only.`;

  const userPrompt = `Write a fresh, unique 900-1200 word article for the "${categoryName}" section of the VisuStock blog.

Working topic (feel free to sharpen it into a strong SEO headline):
"${topic}"

Return this exact JSON shape:
{
  "title": "SEO headline, 55-70 chars, includes primary keyword",
  "excerpt": "1-2 sentence teaser, 140-160 chars, ends with a hook",
  "seo_title": "same as title or slightly optimised, max 65 chars",
  "meta_description": "155-160 chars, includes primary keyword and a benefit",
  "slug": "kebab-case-url-slug, 4-8 words, no year",
  "category": "${categoryName}",
  "tags": ["5-8 lowercase tags"],
  "keywords": ["8-14 long-tail SEO keywords"],
  "read_time": 6,
  "content": "Full article in Markdown. Use ## H2 and ### H3 sections. Include 3-6 markdown internal links to VisuStock routes listed in the system prompt. No images."
}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "publish_article",
          description: "Return a complete blog article",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              excerpt: { type: "string" },
              seo_title: { type: "string" },
              meta_description: { type: "string" },
              slug: { type: "string" },
              category: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              keywords: { type: "array", items: { type: "string" } },
              read_time: { type: "number" },
              content: { type: "string" },
            },
            required: ["title","excerpt","seo_title","meta_description","slug","category","tags","keywords","read_time","content"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "publish_article" } },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t}`);
  }
  const data = await res.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No tool call in AI response");
  return JSON.parse(args);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Allow manual override: { category, topic }
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body ok for cron */ }

    // Pick category (rotate deterministically by week+day so Tue/Fri differ)
    const now = new Date();
    const dayIndex = now.getUTCFullYear() * 400 + now.getUTCMonth() * 32 + now.getUTCDate();
    const cat = body.category
      ? CATEGORIES.find(c => c.name.toLowerCase() === String(body.category).toLowerCase()) ?? CATEGORIES[dayIndex % CATEGORIES.length]
      : CATEGORIES[dayIndex % CATEGORIES.length];
    const topic = body.topic ?? cat.topics[dayIndex % cat.topics.length];

    const article = await generateArticle(topic, cat.name);

    // Ensure unique slug
    let slug = slugify(article.slug || article.title);
    const { data: existing } = await supabase.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const hero = HERO_IMAGES[dayIndex % HERO_IMAGES.length];

    // Featured: at most one featured per week — mark true on Tuesday only.
    const featured = now.getUTCDay() === 2;

    const row = {
      slug,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      category: cat.name,
      tags: article.tags ?? [],
      keywords: article.keywords ?? [],
      seo_title: article.seo_title ?? article.title,
      meta_description: article.meta_description ?? article.excerpt,
      hero_image: hero,
      read_time: article.read_time ?? 6,
      featured,
      status: "published",
      published_at: now.toISOString(),
    };

    const { data, error } = await supabase.from("blog_posts").insert(row).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, post: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-blog-post]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
