import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const { 
      pagePath, 
      pageType, 
      pageId, 
      optimizations, 
      action, // 'preview' | 'apply' | 'revert'
      mode // 'suggestion' | 'auto'
    } = await req.json();

    // Handle preview - just return what would be applied
    if (action === "preview") {
      const previewHtml = generatePreviewHtml(optimizations);
      
      await supabaseClient.from("seo_audit_log").insert({
        admin_id: user.id,
        action_type: "preview",
        page_path: pagePath,
        page_id: pageId,
        after_state: optimizations,
        changes_summary: `Previewed optimizations for ${pagePath}`,
        credits_used: 0,
      });

      return new Response(
        JSON.stringify({
          success: true,
          action: "preview",
          html: previewHtml,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle revert
    if (action === "revert") {
      // Get current record
      const { data: existing } = await supabaseClient
        .from("seo_metadata")
        .select("*")
        .eq("page_path", pagePath)
        .single();

      if (!existing || !existing.previous_version) {
        return new Response(
          JSON.stringify({ error: "No previous version to revert to" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const previousVersion = existing.previous_version as any;

      // Restore previous version
      const { error: updateError } = await supabaseClient
        .from("seo_metadata")
        .update({
          seo_title: previousVersion.seo_title,
          seo_description: previousVersion.seo_description,
          seo_h1: previousVersion.seo_h1,
          seo_content: previousVersion.seo_content,
          internal_links: previousVersion.internal_links,
          faq_schema: previousVersion.faq_schema,
          version: existing.version + 1,
          previous_version: {
            seo_title: existing.seo_title,
            seo_description: existing.seo_description,
            seo_h1: existing.seo_h1,
            seo_content: existing.seo_content,
            internal_links: existing.internal_links,
            faq_schema: existing.faq_schema,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("page_path", pagePath);

      if (updateError) {
        throw updateError;
      }

      await supabaseClient.from("seo_audit_log").insert({
        admin_id: user.id,
        action_type: "revert",
        page_path: pagePath,
        page_id: pageId,
        before_state: existing,
        after_state: previousVersion,
        changes_summary: `Reverted ${pagePath} to previous version`,
        credits_used: 0,
      });

      return new Response(
        JSON.stringify({
          success: true,
          action: "revert",
          message: "Successfully reverted to previous version",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle apply
    if (action === "apply") {
      // Check for existing record
      const { data: existing } = await supabaseClient
        .from("seo_metadata")
        .select("*")
        .eq("page_path", pagePath)
        .single();

      const seoData = {
        page_type: pageType,
        page_id: pageId,
        page_path: pagePath,
        seo_title: optimizations.optimizedTitle,
        seo_description: optimizations.optimizedDescription,
        seo_h1: optimizations.optimizedH1,
        seo_content: optimizations.enhancedContent,
        internal_links: optimizations.internalLinks || [],
        faq_schema: optimizations.faq || [],
        optimized_by: user.id,
        optimization_mode: mode || "suggestion",
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabaseClient
          .from("seo_metadata")
          .update({
            ...seoData,
            version: existing.version + 1,
            previous_version: {
              seo_title: existing.seo_title,
              seo_description: existing.seo_description,
              seo_h1: existing.seo_h1,
              seo_content: existing.seo_content,
              internal_links: existing.internal_links,
              faq_schema: existing.faq_schema,
            },
          })
          .eq("page_path", pagePath);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabaseClient
          .from("seo_metadata")
          .insert({
            ...seoData,
            version: 1,
          });

        if (insertError) {
          throw insertError;
        }
      }

      // Log the action
      await supabaseClient.from("seo_audit_log").insert({
        admin_id: user.id,
        action_type: "apply",
        page_path: pagePath,
        page_id: pageId,
        before_state: existing || null,
        after_state: seoData,
        changes_summary: `Applied SEO optimizations to ${pagePath}`,
        credits_used: 0,
      });

      return new Response(
        JSON.stringify({
          success: true,
          action: "apply",
          message: "SEO optimizations applied successfully",
          version: existing ? existing.version + 1 : 1,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SEO Apply error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Operation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generatePreviewHtml(optimizations: any): string {
  const faqHtml = optimizations.faq?.map((item: any) => 
    `<details>
      <summary>${escapeHtml(item.question)}</summary>
      <p>${escapeHtml(item.answer)}</p>
    </details>`
  ).join("\n") || "";

  const linksHtml = optimizations.internalLinks?.map((link: any) =>
    `<p>${escapeHtml(link.context.replace(link.anchor, `<a href="${link.url}">${link.anchor}</a>`))}</p>`
  ).join("\n") || "";

  const faqSchema = optimizations.faq?.length > 0 ? `
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: optimizations.faq.map((item: any) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer
    }
  }))
}, null, 2)}
</script>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(optimizations.optimizedTitle || "")}</title>
  <meta name="description" content="${escapeHtml(optimizations.optimizedDescription || "")}">
  ${faqSchema}
</head>
<body>
  <h1>${escapeHtml(optimizations.optimizedH1 || "")}</h1>
  
  <article>
    ${markdownToHtml(optimizations.enhancedContent || "")}
  </article>
  
  ${linksHtml ? `<nav><h2>Related Content</h2>${linksHtml}</nav>` : ""}
  
  ${faqHtml ? `<section><h2>Frequently Asked Questions</h2>${faqHtml}</section>` : ""}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(.+)$/gm, "<p>$1</p>");
}
