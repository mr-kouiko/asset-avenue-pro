import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OptimizationResult {
  pagePath: string;
  optimizedTitle: string;
  optimizedDescription: string;
  optimizedH1: string;
  enhancedContent: string;
  internalLinks: Array<{ anchor: string; url: string; context: string }>;
  faq: Array<{ question: string; answer: string }>;
  faqSchema: object;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const useAI = !!openaiApiKey;

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pagePath, pageType, pageId, currentMeta, issues } = await req.json();

    // Fetch additional context based on page type
    let pageData: any = null;
    let relatedProducts: any[] = [];
    let categories: any[] = [];

    // Get categories for internal linking
    const { data: cats } = await supabaseClient
      .from("categories")
      .select("id, name, slug");
    categories = cats || [];

    if (pageType === "product" && pageId) {
      const { data: product } = await supabaseClient
        .from("content_submissions")
        .select("id, title, description, price, tags, category_id")
        .eq("id", pageId)
        .single();
      pageData = product;

      // Get related products for internal linking suggestions
      if (product?.category_id) {
        const { data: related } = await supabaseClient
          .from("content_submissions")
          .select("id, title, slug")
          .eq("status", "approved")
          .eq("category_id", product.category_id)
          .neq("id", pageId)
          .not("slug", "is", null)
          .limit(5);
        relatedProducts = related || [];
      }
    }

    let optimizations: OptimizationResult;

    if (useAI) {
      // Build the AI prompt
      const prompt = buildOptimizationPrompt(
        pagePath,
        pageType,
        currentMeta,
        issues,
        pageData,
        categories,
        relatedProducts
      );

      // Call OpenAI API
      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an SEO expert for VisuStock, a premium stock content marketplace. 
Generate optimized SEO content that is natural, compelling, and follows best practices.
Always respond in valid JSON format.`,
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI API error:", errorText);
        // Fall back to rule-based optimization
        optimizations = generateFallbackOptimization(pagePath, pageType, currentMeta, pageData, categories);
      } else {
        const aiData = await aiResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content;

        // Parse AI response
        try {
          // Extract JSON from potential markdown code blocks
          let jsonContent = aiContent;
          const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            jsonContent = jsonMatch[1].trim();
          }
          optimizations = JSON.parse(jsonContent);
          optimizations.pagePath = pagePath;
        } catch (parseError) {
          console.error("Failed to parse AI response:", aiContent);
          // Fallback to basic optimization
          optimizations = generateFallbackOptimization(pagePath, pageType, currentMeta, pageData, categories);
        }
      }
    } else {
      // No AI key configured, use rule-based optimization
      console.log("No OPENAI_API_KEY configured, using rule-based optimization");
      optimizations = generateFallbackOptimization(pagePath, pageType, currentMeta, pageData, categories);
    }

    // Build FAQ Schema
    if (optimizations.faq && optimizations.faq.length > 0) {
      optimizations.faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: optimizations.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      };
    }

    // Log the optimization action
    await supabaseClient.from("seo_audit_log").insert({
      admin_id: user.id,
      action_type: "optimize",
      page_path: pagePath,
      page_id: pageId,
      before_state: currentMeta,
      after_state: optimizations,
      changes_summary: `Generated optimized content for ${pagePath}`,
      credits_used: 2,
    });

    // Deduct credits (2 per optimization)
    await supabaseClient.rpc("deduct_user_credit", {
      user_id_param: user.id,
      cost_param: 2,
    });

    return new Response(
      JSON.stringify({
        success: true,
        optimizations,
        creditsUsed: 2,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SEO Optimization error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Optimization failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildOptimizationPrompt(
  pagePath: string,
  pageType: string,
  currentMeta: any,
  issues: any[],
  pageData: any,
  categories: any[],
  relatedProducts: any[]
): string {
  const categoryNames = categories.map((c) => c.name).join(", ");
  const relatedLinks = relatedProducts.map((p) => `- ${p.title}: /products/${p.slug}`).join("\n");

  let context = `
Page: ${pagePath}
Type: ${pageType}
Current Title: ${currentMeta.title || "None"}
Current Description: ${currentMeta.description || "None"}
Current H1: ${currentMeta.h1 || "None"}
Content Length: ${currentMeta.contentLength || 0} characters

Issues to fix:
${issues.map((i) => `- [${i.severity.toUpperCase()}] ${i.type}: ${i.message}`).join("\n")}

Available categories for internal linking: ${categoryNames}
`;

  if (pageData) {
    context += `
Product Data:
- Title: ${pageData.title}
- Description: ${pageData.description || "None"}
- Price: €${pageData.price || 0}
- Tags: ${pageData.tags?.join(", ") || "None"}
`;
  }

  if (relatedProducts.length > 0) {
    context += `
Related products for internal linking:
${relatedLinks}
`;
  }

  return `${context}

Generate optimized SEO content for this page. Return a JSON object with:
{
  "optimizedTitle": "SEO-optimized title (30-60 chars, include main keyword)",
  "optimizedDescription": "Compelling meta description (100-155 chars, include call-to-action)",
  "optimizedH1": "Clear, keyword-rich H1 heading",
  "enhancedContent": "2-3 paragraphs of rich, SEO-friendly content (markdown format) describing the value and use cases",
  "internalLinks": [
    {"anchor": "link text", "url": "/target-page", "context": "sentence with the link"}
  ],
  "faq": [
    {"question": "Common question about this content?", "answer": "Helpful answer..."}
  ]
}

Guidelines:
- Focus on VisuStock marketplace and creative content
- Use natural language, avoid keyword stuffing
- Include 2-3 internal links to categories or related products
- Generate 2-3 relevant FAQ questions
- Make content engaging and informative for buyers`;
}

function generateFallbackOptimization(
  pagePath: string,
  pageType: string,
  currentMeta: any,
  pageData: any,
  categories: any[]
): OptimizationResult {
  const title = pageData?.title || currentMeta.title || "VisuStock Content";
  const desc = pageData?.description || currentMeta.description || "";

  return {
    pagePath,
    optimizedTitle: `${title.substring(0, 50)} | Premium Stock Content`,
    optimizedDescription: desc.length > 155 
      ? `${desc.substring(0, 150)}...` 
      : `${desc} Download high-quality content on VisuStock.`,
    optimizedH1: title,
    enhancedContent: `Discover this premium ${pageType === "product" ? "creative asset" : "content"} on VisuStock. 
      
Perfect for professional projects, this ${pageType === "product" ? "digital content" : "collection"} offers exceptional quality 
and versatility for designers, marketers, and content creators.

**Why choose VisuStock?**
- High-quality curated content
- Flexible licensing options  
- Instant download delivery`,
    internalLinks: categories.slice(0, 2).map((c) => ({
      anchor: c.name,
      url: `/marketplace?category=${c.id}`,
      context: `Browse more ${c.name} content in our marketplace.`,
    })),
    faq: [
      {
        question: "What license is included with this content?",
        answer: "All VisuStock content comes with a standard commercial license that allows use in personal and commercial projects.",
      },
      {
        question: "How do I download after purchase?",
        answer: "After completing your purchase, you'll receive instant access to download the original high-resolution file.",
      },
    ],
    faqSchema: {},
  };
}
