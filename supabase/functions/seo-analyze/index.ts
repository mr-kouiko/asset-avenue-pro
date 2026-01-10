import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisResult {
  pagePath: string;
  pageType: string;
  pageId?: string;
  score: number;
  issues: SEOIssue[];
  currentMeta: {
    title: string;
    description: string;
    h1: string;
    contentLength: number;
    hasSchema: boolean;
    internalLinks: number;
  };
}

interface SEOIssue {
  type: 'title' | 'description' | 'h1' | 'content' | 'schema' | 'internal_links' | 'alt_text' | 'duplicate';
  severity: 'high' | 'medium' | 'low';
  message: string;
  recommendation: string;
  impact: number; // 1-10 scale
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

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

    const { scope, scopeFilter, scanId } = await req.json();

    // Update scan status to running
    if (scanId) {
      await supabaseClient
        .from("seo_scans")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", scanId);
    }

    const results: AnalysisResult[] = [];
    let pagesToAnalyze: { path: string; type: string; id?: string; data?: any }[] = [];

    // Determine pages to analyze based on scope
    if (scope === "single" && scopeFilter) {
      pagesToAnalyze = [{ path: scopeFilter, type: determinePageType(scopeFilter) }];
    } else if (scope === "category" && scopeFilter) {
      // Get all products in a category
      const { data: products } = await supabaseClient
        .from("content_submissions")
        .select("id, title, description, slug, price, tags, category_id")
        .eq("status", "approved")
        .eq("category_id", scopeFilter)
        .not("slug", "is", null);

      pagesToAnalyze = (products || []).map(p => ({
        path: `/products/${p.slug}`,
        type: "product",
        id: p.id,
        data: p,
      }));

      // Add the category page itself
      pagesToAnalyze.push({
        path: `/marketplace?category=${scopeFilter}`,
        type: "category",
        id: scopeFilter,
      });
    } else if (scope === "marketplace") {
      // Analyze homepage, marketplace, categories, and products
      pagesToAnalyze = [
        { path: "/", type: "homepage" },
        { path: "/marketplace", type: "category" },
      ];

      // Get all categories
      const { data: categories } = await supabaseClient
        .from("categories")
        .select("id, name, slug");

      for (const cat of categories || []) {
        pagesToAnalyze.push({
          path: `/marketplace?category=${cat.id}`,
          type: "category",
          id: cat.id,
          data: cat,
        });
      }

      // Get all products (limit to 100 for now)
      const { data: products } = await supabaseClient
        .from("content_submissions")
        .select("id, title, description, slug, price, tags, category_id")
        .eq("status", "approved")
        .not("slug", "is", null)
        .limit(100);

      for (const p of products || []) {
        pagesToAnalyze.push({
          path: `/products/${p.slug}`,
          type: "product",
          id: p.id,
          data: p,
        });
      }

      // Add static pages
      const staticPages = ["/about", "/contact", "/licenses", "/packages-pricing", "/terms", "/privacy"];
      for (const page of staticPages) {
        pagesToAnalyze.push({ path: page, type: "static" });
      }
    }

    // Analyze each page
    for (const page of pagesToAnalyze) {
      const analysis = await analyzePage(page, supabaseClient, lovableApiKey);
      results.push(analysis);
    }

    // Calculate aggregate stats
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const avgScore = results.length > 0 
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length 
      : 0;

    // Update scan record
    if (scanId) {
      await supabaseClient
        .from("seo_scans")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          pages_scanned: results.length,
          issues_found: totalIssues,
          average_score: avgScore,
          results: results,
          credits_used: results.length, // 1 credit per page
        })
        .eq("id", scanId);
    }

    // Log the scan action
    await supabaseClient.from("seo_audit_log").insert({
      admin_id: user.id,
      action_type: "scan",
      changes_summary: `Scanned ${results.length} pages, found ${totalIssues} issues`,
      credits_used: results.length,
    });

    // Deduct credits
    await supabaseClient.rpc("deduct_user_credit", {
      user_id_param: user.id,
      cost_param: results.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        pagesScanned: results.length,
        totalIssues,
        averageScore: avgScore,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SEO Analysis error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function determinePageType(path: string): string {
  if (path === "/" || path === "/en") return "homepage";
  if (path.startsWith("/products/")) return "product";
  if (path.startsWith("/marketplace")) return "category";
  return "static";
}

async function analyzePage(
  page: { path: string; type: string; id?: string; data?: any },
  supabase: any,
  lovableApiKey?: string
): Promise<AnalysisResult> {
  const issues: SEOIssue[] = [];
  let currentMeta = {
    title: "",
    description: "",
    h1: "",
    contentLength: 0,
    hasSchema: false,
    internalLinks: 0,
  };

  // Get page data based on type
  if (page.type === "product" && page.data) {
    const product = page.data;
    currentMeta.title = `${product.title} | VisuStock`;
    currentMeta.description = product.description?.substring(0, 155) || "";
    currentMeta.h1 = product.title || "";
    currentMeta.contentLength = (product.description?.length || 0) + (product.title?.length || 0);
    currentMeta.hasSchema = true; // Product pages have Product schema
    currentMeta.internalLinks = product.tags?.length || 0; // Tags create internal links

    // Analyze title
    if (!product.title || product.title.length < 20) {
      issues.push({
        type: "title",
        severity: "high",
        message: "Title is too short (less than 20 characters)",
        recommendation: "Create a descriptive title between 30-60 characters",
        impact: 8,
      });
    } else if (product.title.length > 60) {
      issues.push({
        type: "title",
        severity: "medium",
        message: "Title exceeds 60 characters, may be truncated in search results",
        recommendation: "Shorten title to under 60 characters",
        impact: 5,
      });
    }

    // Analyze description
    if (!product.description || product.description.length < 50) {
      issues.push({
        type: "description",
        severity: "high",
        message: "Description is too short (less than 50 characters)",
        recommendation: "Write a compelling description of 100-155 characters",
        impact: 8,
      });
    } else if (product.description.length < 100) {
      issues.push({
        type: "description",
        severity: "medium",
        message: "Description could be more detailed",
        recommendation: "Expand description to 100-155 characters for better visibility",
        impact: 5,
      });
    }

    // Check content depth
    if (currentMeta.contentLength < 300) {
      issues.push({
        type: "content",
        severity: "high",
        message: "Thin content detected - page has less than 300 characters",
        recommendation: "Add more descriptive content, features, and use cases",
        impact: 9,
      });
    }

    // Check internal links (tags)
    if (!product.tags || product.tags.length === 0) {
      issues.push({
        type: "internal_links",
        severity: "medium",
        message: "No tags/keywords for internal linking",
        recommendation: "Add 3-5 relevant tags to improve discoverability",
        impact: 6,
      });
    }

    // Check for FAQ opportunity
    issues.push({
      type: "schema",
      severity: "low",
      message: "No FAQ schema detected",
      recommendation: "Add FAQ questions to improve rich snippet potential",
      impact: 4,
    });
  } else if (page.type === "category") {
    // Analyze category pages
    currentMeta.title = "Marketplace - Browse Creative Content | VisuStock";
    currentMeta.description = "Browse thousands of professional photos, videos, audio tracks and illustrations.";
    currentMeta.h1 = "Creative Content Marketplace";
    currentMeta.hasSchema = true;

    if (page.data) {
      currentMeta.title = `${page.data.name} - Stock Content | VisuStock`;
      currentMeta.h1 = `${page.data.name} Collection`;
    }

    // Category pages could use more unique content
    issues.push({
      type: "content",
      severity: "medium",
      message: "Category page could have more unique descriptive content",
      recommendation: "Add unique category description and featured content highlights",
      impact: 5,
    });
  } else if (page.type === "homepage") {
    currentMeta.title = "VisuStock - Premium Stock Photos, Videos, Audio & Illustrations";
    currentMeta.description = "Discover and download high-quality stock photos, videos, audio tracks, and illustrations.";
    currentMeta.h1 = "Premium Creative Content Marketplace";
    currentMeta.hasSchema = true;
    currentMeta.contentLength = 500;
    currentMeta.internalLinks = 10;
  } else {
    // Static pages
    currentMeta.contentLength = 200;
    currentMeta.internalLinks = 2;
  }

  // Calculate score (100 - penalty points)
  const totalPenalty = issues.reduce((sum, issue) => {
    const penalty = issue.severity === "high" ? issue.impact * 2 : 
                    issue.severity === "medium" ? issue.impact : 
                    issue.impact * 0.5;
    return sum + penalty;
  }, 0);

  const score = Math.max(0, Math.min(100, 100 - totalPenalty));

  return {
    pagePath: page.path,
    pageType: page.type,
    pageId: page.id,
    score,
    issues,
    currentMeta,
  };
}
