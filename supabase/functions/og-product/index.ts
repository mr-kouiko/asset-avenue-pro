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
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response("Missing slug parameter", { status: 400 });
    }

    // Detect social crawlers vs human browsers.
    // Humans get an immediate 302 redirect to the real product page (never see raw HTML).
    // Crawlers (Facebook, Twitter, LinkedIn, WhatsApp, Slack, Discord, Telegram, Pinterest, Google bot, etc.)
    // get the full HTML with OG/Twitter meta tags.
    const ua = (req.headers.get("user-agent") || "").toLowerCase();
    const isCrawler = /facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|pinterest|googlebot|bingbot|applebot|redditbot|embedly|quora link preview|outbrain|vkshare|w3c_validator|yandex|baiduspider|skypeuripreview|nuzzel|bitlybot|tumblr|flipboard|chatgpt|gptbot|perplexity|claudebot|metainspector|iframely/.test(ua);

    // For humans we don't even need to hit the DB — redirect straight to the canonical page.
    if (!isCrawler) {
      const redirectUrl = `https://visustock.com/products/${encodeURIComponent(slug)}`;
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: redirectUrl,
          "Cache-Control": "no-store",
        },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract UUID from slug if present (slug might be "title-keywords-uuid")
    const uuidMatch = slug.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    
    let product = null;

    // Try to find by exact slug first
    const { data: bySlug } = await supabase
      .from("content_submissions")
      .select(`
        id,
        title,
        description,
        slug,
        tags,
        price,
        created_at,
        content_files (
          file_path,
          thumbnail_path,
          is_preview,
          is_original,
          file_type
        )
      `)
      .eq("slug", slug)
      .eq("status", "approved")
      .single();

    if (bySlug) {
      product = bySlug;
    } else if (uuidMatch) {
      // Try by UUID extracted from slug
      const { data: byId } = await supabase
        .from("content_submissions")
        .select(`
          id,
          title,
          description,
          slug,
          tags,
          price,
          created_at,
          content_files (
            file_path,
            thumbnail_path,
            is_preview,
            is_original,
            file_type
          )
        `)
        .eq("id", uuidMatch[0])
        .eq("status", "approved")
        .single();
      
      product = byId;
    }

    if (!product) {
      return new Response("Product not found", { status: 404 });
    }

    // Get the best image for OG
    const previewFile = product.content_files?.find((f: any) => f.is_preview);
    const thumbnailFile = product.content_files?.find((f: any) => f.thumbnail_path);
    const originalFile = product.content_files?.find((f: any) => f.is_original);

    // Build the OG image URL
    let ogImage = "https://visustock.com/lovable-uploads/visustock-logo-no-bg.png";
    
    if (thumbnailFile?.thumbnail_path) {
      ogImage = thumbnailFile.thumbnail_path.startsWith("http") 
        ? thumbnailFile.thumbnail_path 
        : `${supabaseUrl}/storage/v1/object/public/content-files/${thumbnailFile.thumbnail_path}`;
    } else if (previewFile?.file_path) {
      ogImage = previewFile.file_path.startsWith("http")
        ? previewFile.file_path
        : `${supabaseUrl}/storage/v1/object/public/content-files/${previewFile.file_path}`;
    }

    const productSlug = product.slug || slug;
    const canonicalUrl = `https://visustock.com/products/${productSlug}`;
    const title = product.title || "VisuStock Product";
    const description = product.description || "Discover premium digital content on VisuStock marketplace.";
    const truncatedDescription = description.length > 160 
      ? description.substring(0, 157) + "..." 
      : description;

    // Determine content type for og:type
    const fileType = originalFile?.file_type || previewFile?.file_type || "";
    let ogType = "product";
    if (fileType.startsWith("video/")) ogType = "video.other";
    else if (fileType.startsWith("audio/")) ogType = "music.song";

    // Build hashtags from tags
    const hashtags = (product.tags || [])
      .slice(0, 5)
      .map((tag: string) => `#${tag.replace(/\s+/g, "")}`)
      .join(" ");

    // Generate HTML with proper meta tags
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${escapeHtml(title)} | VisuStock</title>
  <meta name="title" content="${escapeHtml(title)} | VisuStock">
  <meta name="description" content="${escapeHtml(truncatedDescription)}">
  <meta name="author" content="VisuStock">
  <meta name="keywords" content="${escapeHtml((product.tags || []).join(", "))}">
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="${ogType}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(truncatedDescription)}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(title)}">
  <meta property="og:site_name" content="VisuStock">
  <meta property="og:locale" content="en_US">
  <meta property="og:locale:alternate" content="fr_FR">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${canonicalUrl}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(truncatedDescription)}">
  <meta name="twitter:image" content="${ogImage}">
  <meta name="twitter:image:alt" content="${escapeHtml(title)}">

  <!-- LinkedIn specific -->
  <meta property="og:image:secure_url" content="${ogImage}">
  
  ${product.price ? `
  <!-- Product specific -->
  <meta property="product:price:amount" content="${product.price}">
  <meta property="product:price:currency" content="EUR">
  ` : ""}

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    "name": title,
    "description": description,
    "image": ogImage,
    "url": canonicalUrl,
    "brand": {
      "@type": "Brand",
      "name": "VisuStock"
    },
    ...(product.price && {
      "offers": {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock",
        "url": canonicalUrl
      }
    }),
    ...(product.tags?.length && {
      "keywords": product.tags.join(", ")
    })
  })}
  </script>

  <!-- Redirect to actual page after crawlers have read meta tags -->
  <meta http-equiv="refresh" content="0;url=${canonicalUrl}">
  <script>window.location.replace("${canonicalUrl}");</script>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <p>${hashtags}</p>
  <p>Redirecting to <a href="${canonicalUrl}">${canonicalUrl}</a>...</p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error generating OG page:", error);
    return new Response("Internal server error", { status: 500 });
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
