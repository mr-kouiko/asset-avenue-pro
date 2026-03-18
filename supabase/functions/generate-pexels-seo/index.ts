import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pexelsId, type, alt, photographer, width, height, duration } = await req.json();

    if (!pexelsId || !type) {
      return new Response(JSON.stringify({ error: "pexelsId and type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const { data: cached } = await supabase
      .from("pexels_seo_content")
      .select("*")
      .eq("pexels_id", pexelsId)
      .eq("type", type)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate via AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mediaType = type === "video" ? "stock video" : "stock photo";
    const dimensionInfo = width && height ? `${width}×${height}px` : "";
    const durationInfo = duration ? `, ${duration}s duration` : "";
    const description = alt || "a professional scene";

    const systemPrompt = `You are a professional SEO content writer for a stock media marketplace called VisuStock. Generate UNIQUE, rich content for a free ${mediaType} detail page. Output valid JSON only.

STRICT RULES:
- 100% unique content — never reuse text across assets
- DO NOT mention "Pexels" anywhere in the main content body, intro, or about section
- Use natural, human-like language — no keyword stuffing
- Write as if describing an exclusive marketplace asset
- All content must be in English`;

    const userPrompt = `Generate SEO content for this free ${mediaType}:
- Description: "${description}"
- Photographer: ${photographer || "Unknown"}
- Dimensions: ${dimensionInfo}${durationInfo}

Return this exact JSON structure:
{
  "seo_title": "max 70 chars, format: Free {subject} Photo – {use case} (High Resolution)",
  "meta_description": "140-160 chars with primary keyword + benefit",
  "h1": "human-readable title, similar to seo_title",
  "intro": "2-3 sentences describing the scene, mood, and setting vividly",
  "main_content": "300-500 words: visual description (lighting, mood, composition), context (environment, setting), use cases (blog, website, social media, ads). Include keyword variations naturally. DO NOT mention Pexels.",
  "about_section": {
    "location": "best guess city/country or 'Studio' or 'Various'",
    "subject": "main subject in 2-5 words",
    "style": "photography/videography style in 2-4 words"
  },
  "use_cases": ["5-7 specific use case bullet points"],
  "visual_style": ["3-5 visual style descriptors like 'Warm natural lighting', 'Shallow depth of field'"],
  "keywords": ["10-15 long-tail keywords for this specific asset"]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_seo_content",
              description: "Generate structured SEO content for a stock media asset",
              parameters: {
                type: "object",
                properties: {
                  seo_title: { type: "string" },
                  meta_description: { type: "string" },
                  h1: { type: "string" },
                  intro: { type: "string" },
                  main_content: { type: "string" },
                  about_section: {
                    type: "object",
                    properties: {
                      location: { type: "string" },
                      subject: { type: "string" },
                      style: { type: "string" },
                    },
                    required: ["location", "subject", "style"],
                  },
                  use_cases: { type: "array", items: { type: "string" } },
                  visual_style: { type: "array", items: { type: "string" } },
                  keywords: { type: "array", items: { type: "string" } },
                },
                required: [
                  "seo_title", "meta_description", "h1", "intro", "main_content",
                  "about_section", "use_cases", "visual_style", "keywords",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_seo_content" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "AI returned unexpected format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seoContent = JSON.parse(toolCall.function.arguments);

    // Build internal links from keywords
    const internalLinks = {
      related_searches: (seoContent.keywords || []).slice(0, 8).map((kw: string) => ({
        label: kw,
        url: `/marketplace?search=${encodeURIComponent(kw)}`,
      })),
      category_links: [
        { label: "Browse Marketplace", url: "/marketplace" },
        { label: "Free Stock Library", url: "/free-stock-library" },
        { label: "Curated Collections", url: "/collections" },
      ],
    };

    // Store in cache
    const row = {
      pexels_id: pexelsId,
      type,
      seo_title: seoContent.seo_title,
      meta_description: seoContent.meta_description,
      h1: seoContent.h1,
      intro: seoContent.intro,
      main_content: seoContent.main_content,
      about_section: seoContent.about_section,
      use_cases: seoContent.use_cases,
      visual_style: seoContent.visual_style,
      keywords: seoContent.keywords,
      internal_links: internalLinks,
    };

    const { error: insertErr } = await supabase.from("pexels_seo_content").insert(row);
    if (insertErr) {
      console.error("Cache insert error:", insertErr);
      // Still return the content even if caching fails
    }

    return new Response(JSON.stringify(row), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-pexels-seo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
