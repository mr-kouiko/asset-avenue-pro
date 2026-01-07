import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://visustock.com";

// Crawler user agents to serve static HTML
const CRAWLER_USER_AGENTS = [
  "googlebot",
  "bingbot",
  "yandexbot",
  "duckduckbot",
  "slurp",
  "baiduspider",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "pinterest",
  "whatsapp",
  "telegram",
  "discordbot",
  "applebot",
  "gptbot",
  "claudebot",
  "anthropic-ai",
  "perplexitybot",
  "ccbot",
];

function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some((crawler) => ua.includes(crawler));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface PageContent {
  title: string;
  description: string;
  h1: string;
  bodyContent: string;
  canonicalUrl: string;
  ogImage: string;
  ogType: string;
  schemaData?: object;
}

async function getHomepageContent(supabase: any): Promise<PageContent> {
  // Get featured products for homepage
  const { data: products } = await supabase
    .from("content_submissions")
    .select("id, title, description, slug, price, tags")
    .eq("status", "approved")
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(12);

  // Get content stats
  const { count: photoCount } = await supabase
    .from("content_files")
    .select("*", { count: "exact", head: true })
    .ilike("file_type", "image/%");

  const { count: videoCount } = await supabase
    .from("content_files")
    .select("*", { count: "exact", head: true })
    .ilike("file_type", "video/%");

  const { count: audioCount } = await supabase
    .from("content_files")
    .select("*", { count: "exact", head: true })
    .ilike("file_type", "audio/%");

  const productList = products
    ?.map(
      (p: any) =>
        `<article itemscope itemtype="https://schema.org/Product">
          <h3 itemprop="name"><a href="${SITE_URL}/products/${p.slug}">${escapeHtml(p.title)}</a></h3>
          <p itemprop="description">${escapeHtml(p.description?.substring(0, 150) || "")}</p>
          ${p.price ? `<span itemprop="price" content="${p.price}">€${p.price}</span>` : ""}
        </article>`
    )
    .join("\n") || "";

  return {
    title: "VisuStock - Premium Stock Photos, Videos, Audio & Illustrations",
    description:
      "Discover and download high-quality stock photos, videos, audio tracks, and illustrations. Professional creative content for your projects from talented creators worldwide.",
    h1: "Premium Creative Content Marketplace",
    canonicalUrl: SITE_URL,
    ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
    ogType: "website",
    bodyContent: `
      <section>
        <h2>Featured Content</h2>
        <p>Browse our collection of ${photoCount || 0} photos, ${videoCount || 0} videos, and ${audioCount || 0} audio tracks.</p>
        ${productList}
      </section>
      <section>
        <h2>Why VisuStock?</h2>
        <ul>
          <li>High-quality curated content from professional creators</li>
          <li>Flexible licensing options for every project</li>
          <li>Lightning-fast downloads with secure delivery</li>
          <li>Support independent creators worldwide</li>
        </ul>
      </section>
      <nav>
        <a href="${SITE_URL}/marketplace">Browse Marketplace</a>
        <a href="${SITE_URL}/about">About Us</a>
        <a href="${SITE_URL}/contact">Contact</a>
      </nav>
    `,
    schemaData: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "VisuStock",
      url: SITE_URL,
      description:
        "Premium stock photos, videos, audio and illustrations marketplace",
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/marketplace?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  };
}

async function getMarketplaceContent(supabase: any): Promise<PageContent> {
  const { data: products } = await supabase
    .from("content_submissions")
    .select("id, title, description, slug, price, tags, created_at")
    .eq("status", "approved")
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug");

  const productList = products
    ?.map(
      (p: any) =>
        `<article itemscope itemtype="https://schema.org/Product">
          <h3 itemprop="name"><a href="${SITE_URL}/products/${p.slug}">${escapeHtml(p.title)}</a></h3>
          <p itemprop="description">${escapeHtml(p.description?.substring(0, 150) || "")}</p>
          ${p.price ? `<span itemprop="offers" itemscope itemtype="https://schema.org/Offer"><span itemprop="price" content="${p.price}">€${p.price}</span><meta itemprop="priceCurrency" content="EUR"></span>` : ""}
        </article>`
    )
    .join("\n") || "";

  const categoryList = categories
    ?.map(
      (c: any) =>
        `<a href="${SITE_URL}/marketplace?category=${c.id}">${escapeHtml(c.name)}</a>`
    )
    .join(" | ") || "";

  return {
    title: "Marketplace - Browse Creative Content | VisuStock",
    description:
      "Browse thousands of professional photos, videos, audio tracks and illustrations. Find the perfect creative content for your projects at competitive prices.",
    h1: "Creative Content Marketplace",
    canonicalUrl: `${SITE_URL}/marketplace`,
    ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
    ogType: "website",
    bodyContent: `
      <section>
        <h2>Categories</h2>
        <nav>${categoryList}</nav>
      </section>
      <section>
        <h2>Available Content</h2>
        <p>Showing ${products?.length || 0} items</p>
        ${productList}
      </section>
    `,
    schemaData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "VisuStock Marketplace",
      url: `${SITE_URL}/marketplace`,
      description: "Browse creative content on VisuStock",
    },
  };
}

async function getProductContent(
  supabase: any,
  slug: string
): Promise<PageContent | null> {
  const uuidMatch = slug.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );

  let product = null;

  // Try exact slug first
  const { data: bySlug } = await supabase
    .from("content_submissions")
    .select(
      `id, title, description, slug, tags, price, created_at,
      content_files (file_path, thumbnail_path, is_preview, is_original, file_type)`
    )
    .eq("slug", slug)
    .eq("status", "approved")
    .single();

  if (bySlug) {
    product = bySlug;
  } else if (uuidMatch) {
    const { data: byId } = await supabase
      .from("content_submissions")
      .select(
        `id, title, description, slug, tags, price, created_at,
        content_files (file_path, thumbnail_path, is_preview, is_original, file_type)`
      )
      .eq("id", uuidMatch[0])
      .eq("status", "approved")
      .single();
    product = byId;
  }

  if (!product) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const thumbnailFile = product.content_files?.find(
    (f: any) => f.thumbnail_path
  );
  const previewFile = product.content_files?.find((f: any) => f.is_preview);
  const originalFile = product.content_files?.find((f: any) => f.is_original);

  let ogImage = `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`;
  if (thumbnailFile?.thumbnail_path) {
    ogImage = thumbnailFile.thumbnail_path.startsWith("http")
      ? thumbnailFile.thumbnail_path
      : `${supabaseUrl}/storage/v1/object/public/content-files/${thumbnailFile.thumbnail_path}`;
  }

  const fileType = originalFile?.file_type || previewFile?.file_type || "";
  let ogType = "product";
  if (fileType.startsWith("video/")) ogType = "video.other";
  else if (fileType.startsWith("audio/")) ogType = "music.song";

  const productSlug = product.slug || slug;
  const canonicalUrl = `${SITE_URL}/products/${productSlug}`;

  return {
    title: `${product.title} | VisuStock`,
    description:
      product.description?.substring(0, 160) ||
      "Premium digital content on VisuStock",
    h1: product.title,
    canonicalUrl,
    ogImage,
    ogType,
    bodyContent: `
      <article itemscope itemtype="https://schema.org/Product">
        <h2 itemprop="name">${escapeHtml(product.title)}</h2>
        <p itemprop="description">${escapeHtml(product.description || "")}</p>
        ${
          product.tags?.length
            ? `<p>Tags: ${product.tags.map((t: string) => escapeHtml(t)).join(", ")}</p>`
            : ""
        }
        ${
          product.price
            ? `<div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
              <span itemprop="price" content="${product.price}">€${product.price}</span>
              <meta itemprop="priceCurrency" content="EUR">
              <link itemprop="availability" href="https://schema.org/InStock">
            </div>`
            : ""
        }
        <p><a href="${SITE_URL}/marketplace">← Back to Marketplace</a></p>
      </article>
    `,
    schemaData: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description: product.description,
      image: ogImage,
      url: canonicalUrl,
      brand: { "@type": "Brand", name: "VisuStock" },
      ...(product.price && {
        offers: {
          "@type": "Offer",
          price: product.price,
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url: canonicalUrl,
        },
      }),
    },
  };
}

function getStaticPageContent(path: string): PageContent | null {
  const staticPages: Record<string, PageContent> = {
    "/about": {
      title: "About VisuStock - Premium Creative Marketplace",
      description:
        "Learn about VisuStock, the premium marketplace for stock photos, videos, audio and illustrations. Connecting creators with buyers worldwide.",
      h1: "About VisuStock",
      canonicalUrl: `${SITE_URL}/about`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `
        <section>
          <h2>Our Mission</h2>
          <p>VisuStock connects talented creators with businesses and individuals seeking premium creative content. We provide a curated marketplace for high-quality photos, videos, audio tracks, and illustrations.</p>
        </section>
        <section>
          <h2>Why Choose VisuStock?</h2>
          <ul>
            <li>Curated content from professional creators</li>
            <li>Flexible licensing for all project types</li>
            <li>Fast and secure downloads</li>
            <li>Fair compensation for creators</li>
          </ul>
        </section>
      `,
    },
    "/en/about": {
      title: "About VisuStock - Premium Creative Marketplace",
      description:
        "Learn about VisuStock, the premium marketplace for stock photos, videos, audio and illustrations. Connecting creators with buyers worldwide.",
      h1: "About VisuStock",
      canonicalUrl: `${SITE_URL}/en/about`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `
        <section>
          <h2>Our Mission</h2>
          <p>VisuStock connects talented creators with businesses and individuals seeking premium creative content.</p>
        </section>
      `,
    },
    "/contact": {
      title: "Contact VisuStock - Get in Touch",
      description:
        "Contact the VisuStock team for support, partnerships, or general inquiries. We're here to help with your creative content needs.",
      h1: "Contact Us",
      canonicalUrl: `${SITE_URL}/contact`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `
        <section>
          <h2>Get in Touch</h2>
          <p>Have questions? Need support? We're here to help.</p>
          <p>Email: support@visustock.com</p>
        </section>
      `,
    },
    "/en/contact": {
      title: "Contact VisuStock - Get in Touch",
      description:
        "Contact the VisuStock team for support, partnerships, or general inquiries.",
      h1: "Contact Us",
      canonicalUrl: `${SITE_URL}/en/contact`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `
        <section>
          <h2>Get in Touch</h2>
          <p>Have questions? We're here to help.</p>
        </section>
      `,
    },
    "/packages-pricing": {
      title: "Pricing & Packages - VisuStock",
      description:
        "Explore VisuStock pricing plans and subscription packages. Get the best value for premium stock photos, videos, audio and illustrations.",
      h1: "Pricing & Packages",
      canonicalUrl: `${SITE_URL}/packages-pricing`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `
        <section>
          <h2>Choose Your Plan</h2>
          <p>Flexible pricing options for individuals and teams. Download premium content with our subscription plans.</p>
        </section>
      `,
    },
    "/licenses": {
      title: "Licensing Information - VisuStock",
      description:
        "Understand VisuStock licensing options. Standard and extended licenses for commercial and personal use of creative content.",
      h1: "Licensing Information",
      canonicalUrl: `${SITE_URL}/licenses`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `
        <section>
          <h2>License Types</h2>
          <ul>
            <li><strong>Standard License:</strong> For personal and small commercial projects</li>
            <li><strong>Extended License:</strong> For large-scale commercial use, resale products</li>
          </ul>
        </section>
      `,
    },
    "/terms": {
      title: "Terms of Service - VisuStock",
      description:
        "Read VisuStock terms of service. Understand your rights and responsibilities when using our creative content marketplace.",
      h1: "Terms of Service",
      canonicalUrl: `${SITE_URL}/terms`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `
        <section>
          <p>These terms govern your use of the VisuStock platform and services.</p>
        </section>
      `,
    },
    "/en/terms": {
      title: "Terms of Service - VisuStock",
      description: "Read VisuStock terms of service.",
      h1: "Terms of Service",
      canonicalUrl: `${SITE_URL}/en/terms`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `<section><p>Terms of service for VisuStock platform.</p></section>`,
    },
    "/privacy": {
      title: "Privacy Policy - VisuStock",
      description:
        "VisuStock privacy policy. Learn how we collect, use, and protect your personal information.",
      h1: "Privacy Policy",
      canonicalUrl: `${SITE_URL}/privacy`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `
        <section>
          <p>Your privacy is important to us. This policy explains how we handle your data.</p>
        </section>
      `,
    },
    "/en/privacy": {
      title: "Privacy Policy - VisuStock",
      description: "VisuStock privacy policy.",
      h1: "Privacy Policy",
      canonicalUrl: `${SITE_URL}/en/privacy`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `<section><p>Your privacy matters.</p></section>`,
    },
    "/cookie-policy": {
      title: "Cookie Policy - VisuStock",
      description:
        "VisuStock cookie policy. Understand how we use cookies to improve your browsing experience.",
      h1: "Cookie Policy",
      canonicalUrl: `${SITE_URL}/cookie-policy`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `
        <section>
          <p>This policy explains our use of cookies and similar technologies.</p>
        </section>
      `,
    },
    "/en/cookie-policy": {
      title: "Cookie Policy - VisuStock",
      description: "VisuStock cookie policy.",
      h1: "Cookie Policy",
      canonicalUrl: `${SITE_URL}/en/cookie-policy`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `<section><p>Cookie usage information.</p></section>`,
    },
    "/license-agreement": {
      title: "License Agreement - VisuStock",
      description:
        "VisuStock content license agreement. Legal terms for using purchased creative content.",
      h1: "License Agreement",
      canonicalUrl: `${SITE_URL}/license-agreement`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `
        <section>
          <p>This agreement governs the licensing of content purchased on VisuStock.</p>
        </section>
      `,
    },
    "/en/license-agreement": {
      title: "License Agreement - VisuStock",
      description: "VisuStock content license agreement.",
      h1: "License Agreement",
      canonicalUrl: `${SITE_URL}/en/license-agreement`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `<section><p>Content licensing terms.</p></section>`,
    },
    "/support": {
      title: "Support - VisuStock Help Center",
      description:
        "Get help with VisuStock. FAQs, tutorials, and customer support for all your creative content needs.",
      h1: "Support Center",
      canonicalUrl: `${SITE_URL}/support`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `
        <section>
          <h2>How Can We Help?</h2>
          <p>Find answers to common questions or contact our support team.</p>
        </section>
      `,
    },
    "/ai-image-generator": {
      title: "AI Image Generator - VisuStock",
      description:
        "Generate unique images with AI. Create custom visuals for your projects using our advanced AI image generation tool.",
      h1: "AI Image Generator",
      canonicalUrl: `${SITE_URL}/ai-image-generator`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `
        <section>
          <p>Create stunning AI-generated images for your creative projects.</p>
        </section>
      `,
    },
    "/buy-credits": {
      title: "Buy Credits - VisuStock",
      description:
        "Purchase credits for VisuStock. Use credits to download premium content and generate AI images.",
      h1: "Buy Credits",
      canonicalUrl: `${SITE_URL}/buy-credits`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `
        <section>
          <p>Purchase credits to access premium content and AI features.</p>
        </section>
      `,
    },
    "/en/infinity": {
      title: "VisuStock Infinity - Unlimited Downloads",
      description:
        "VisuStock Infinity subscription. Get unlimited downloads of premium creative content with our all-access plan.",
      h1: "VisuStock Infinity",
      canonicalUrl: `${SITE_URL}/en/infinity`,
      ogImage: `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`,
      ogType: "website",
      bodyContent: `
        <section>
          <p>Unlimited access to our entire library of premium content.</p>
        </section>
      `,
    },
  };

  return staticPages[path] || null;
}

function generateHtml(content: PageContent): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${escapeHtml(content.title)}</title>
  <meta name="title" content="${escapeHtml(content.title)}">
  <meta name="description" content="${escapeHtml(content.description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${content.canonicalUrl}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="${content.ogType}">
  <meta property="og:url" content="${content.canonicalUrl}">
  <meta property="og:title" content="${escapeHtml(content.title)}">
  <meta property="og:description" content="${escapeHtml(content.description)}">
  <meta property="og:image" content="${content.ogImage}">
  <meta property="og:site_name" content="VisuStock">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${content.canonicalUrl}">
  <meta name="twitter:title" content="${escapeHtml(content.title)}">
  <meta name="twitter:description" content="${escapeHtml(content.description)}">
  <meta name="twitter:image" content="${content.ogImage}">

  ${content.schemaData ? `<script type="application/ld+json">${JSON.stringify(content.schemaData)}</script>` : ""}
</head>
<body>
  <header>
    <nav>
      <a href="${SITE_URL}">VisuStock</a> |
      <a href="${SITE_URL}/marketplace">Marketplace</a> |
      <a href="${SITE_URL}/about">About</a> |
      <a href="${SITE_URL}/contact">Contact</a>
    </nav>
  </header>
  <main>
    <h1>${escapeHtml(content.h1)}</h1>
    ${content.bodyContent}
  </main>
  <footer>
    <p>&copy; ${new Date().getFullYear()} VisuStock. All rights reserved.</p>
    <nav>
      <a href="${SITE_URL}/terms">Terms</a> |
      <a href="${SITE_URL}/privacy">Privacy</a> |
      <a href="${SITE_URL}/licenses">Licenses</a>
    </nav>
  </footer>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/";
    const userAgent = req.headers.get("user-agent") || "";

    console.log(`[PRERENDER] Request for path: ${path}, UA: ${userAgent.substring(0, 50)}`);

    // Check if this is a crawler
    const crawler = isCrawler(userAgent);
    const forcePrerender = url.searchParams.get("force") === "true";

    if (!crawler && !forcePrerender) {
      // Not a crawler - redirect to main site
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: `${SITE_URL}${path}`,
        },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let pageContent: PageContent | null = null;

    // Route matching
    if (path === "/" || path === "") {
      pageContent = await getHomepageContent(supabase);
    } else if (path === "/marketplace") {
      pageContent = await getMarketplaceContent(supabase);
    } else if (path.startsWith("/products/")) {
      const slug = path.replace("/products/", "");
      pageContent = await getProductContent(supabase, slug);
    } else {
      // Check static pages
      pageContent = getStaticPageContent(path);
    }

    if (!pageContent) {
      return new Response("Page not found", { status: 404 });
    }

    const html = generateHtml(pageContent);

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "X-Prerendered": "true",
      },
    });
  } catch (error) {
    console.error("[PRERENDER] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
});
