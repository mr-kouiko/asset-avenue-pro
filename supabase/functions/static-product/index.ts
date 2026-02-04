import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://visustock.com";
const STATIC_PREFIX = "/s";

function esc(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  description?: string;
  price?: number;
  tags?: string[];
  category_id?: string;
}

interface SEOMetadata {
  seo_title?: string;
  seo_description?: string;
  seo_h1?: string;
  seo_content?: string;
  internal_links?: Array<{ anchor: string; url: string; context: string }>;
  faq_schema?: Array<{ question: string; answer: string }>;
}

function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(.+)$/gm, "<p>$1</p>");
}

function buildStaticProductHtml(opts: {
  product: {
    id: string;
    title: string;
    description?: string;
    slug: string;
    price?: number;
    tags?: string[];
  };
  category?: Category;
  relatedProducts: Product[];
  imageUrl: string;
  canonicalUrl: string;
  spaUrl: string;
  categories: Category[];
  seoMetadata?: SEOMetadata;
}): string {
  const { product, category, relatedProducts, imageUrl, canonicalUrl, spaUrl, categories, seoMetadata } = opts;
  
  // Apply SEO overrides if available
  const title = seoMetadata?.seo_title || `${product.title} | VisuStock`;
  const desc = seoMetadata?.seo_description || product.description?.substring(0, 155) || "Premium digital content on VisuStock";
  const h1 = seoMetadata?.seo_h1 || product.title;

  // Build breadcrumbs
  const breadcrumbs = [
    { name: "Home", url: `${SITE_URL}${STATIC_PREFIX}` },
    { name: "Marketplace", url: `${SITE_URL}${STATIC_PREFIX}/categories` },
  ];
  if (category) {
    breadcrumbs.push({ name: category.name, url: `${SITE_URL}${STATIC_PREFIX}/categories/${category.slug}` });
  }
  breadcrumbs.push({ name: product.title, url: canonicalUrl });

  // Build JSON-LD schema
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${canonicalUrl}#product`,
        name: product.title,
        description: product.description,
        image: imageUrl,
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
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: b.name,
          item: b.url,
        })),
      },
    ],
  };

  // Add FAQ schema if present
  let faqSchemaScript = "";
  if (seoMetadata?.faq_schema?.length) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: seoMetadata.faq_schema.map(faq => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer
        }
      }))
    };
    faqSchemaScript = `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`;
  }

  // Build breadcrumb HTML
  const breadcrumbHtml = breadcrumbs.map((b, i) => 
    `<a href="${b.url}">${esc(b.name)}</a>${i < breadcrumbs.length - 1 ? ' › ' : ''}`
  ).join('');

  // Build tags HTML
  const tagsHtml = product.tags?.length 
    ? `<div class="tags">${product.tags.map(t => 
        `<a href="${SITE_URL}${STATIC_PREFIX}/categories?search=${encodeURIComponent(t)}" class="tag">${esc(t)}</a>`
      ).join(' ')}</div>` 
    : '';

  // Build related products
  const relatedHtml = relatedProducts.length 
    ? `<section class="related">
        <h2>Related Products</h2>
        <div class="related-grid">
          ${relatedProducts.map(p => `
            <article class="related-item">
              <a href="${SITE_URL}${STATIC_PREFIX}/products/${p.slug}">
                <h3>${esc(p.title)}</h3>
                ${p.price ? `<span class="price">€${p.price}</span>` : ''}
              </a>
            </article>
          `).join('')}
        </div>
      </section>` 
    : '';

  // Build SEO content if present
  const seoContentHtml = seoMetadata?.seo_content 
    ? `<article class="seo-content">${markdownToHtml(seoMetadata.seo_content)}</article>` 
    : '';

  // Build internal links if present
  const internalLinksHtml = seoMetadata?.internal_links?.length
    ? `<nav class="internal-links" aria-label="Related content">
        ${seoMetadata.internal_links.map(link => 
          `<p>${esc(link.context).replace(esc(link.anchor), `<a href="${SITE_URL}${link.url}">${esc(link.anchor)}</a>`)}</p>`
        ).join('')}
      </nav>`
    : '';

  // Build FAQ section if present
  const faqHtml = seoMetadata?.faq_schema?.length
    ? `<section class="faq" aria-label="FAQ">
        <h2>Frequently Asked Questions</h2>
        ${seoMetadata.faq_schema.map(faq => 
          `<details><summary>${esc(faq.question)}</summary><p>${esc(faq.answer)}</p></details>`
        ).join('')}
      </section>`
    : '';

  // Build category navigation
  const categoryNav = categories.slice(0, 8).map(c => 
    `<a href="${SITE_URL}${STATIC_PREFIX}/categories/${c.slug}">${esc(c.name)}</a>`
  ).join(' · ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="robots" content="index, follow">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="VisuStock">
  <meta property="product:price:amount" content="${product.price || 0}">
  <meta property="product:price:currency" content="EUR">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  ${faqSchemaScript}
  
  <style>
    :root {
      --primary: #6366f1;
      --primary-dark: #4f46e5;
      --bg: #0f0f23;
      --card: #1a1a2e;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --border: #2d2d44;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }
    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }
    
    .header {
      background: var(--card);
      border-bottom: 1px solid var(--border);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo { font-size: 1.5rem; font-weight: bold; color: var(--text); }
    .nav-links { display: flex; gap: 1.5rem; }
    .nav-links a { color: var(--muted); }
    .nav-links a:hover { color: var(--text); }
    
    .breadcrumb {
      padding: 1rem 2rem;
      color: var(--muted);
      font-size: 0.875rem;
    }
    .breadcrumb a { color: var(--muted); }
    .breadcrumb a:hover { color: var(--text); }
    
    .main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 2rem;
    }
    @media (max-width: 900px) {
      .main { grid-template-columns: 1fr; }
    }
    
    .product-image {
      width: 100%;
      border-radius: 1rem;
      background: var(--card);
      aspect-ratio: 16/10;
      object-fit: cover;
    }
    
    .product-info {
      background: var(--card);
      border-radius: 1rem;
      padding: 2rem;
      border: 1px solid var(--border);
      height: fit-content;
      position: sticky;
      top: 2rem;
    }
    .product-info h1 { font-size: 1.75rem; margin-bottom: 1rem; }
    .product-info .price { 
      font-size: 2rem; 
      font-weight: bold; 
      color: var(--primary);
      margin-bottom: 1.5rem;
      display: block;
    }
    .product-info .description { 
      color: var(--muted); 
      margin-bottom: 1.5rem;
      line-height: 1.8;
    }
    
    .cta-button {
      display: block;
      width: 100%;
      padding: 1rem 2rem;
      background: var(--primary);
      color: white;
      text-align: center;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 1.125rem;
      margin-bottom: 1rem;
      transition: background 0.2s;
    }
    .cta-button:hover { 
      background: var(--primary-dark); 
      text-decoration: none;
    }
    .cta-secondary {
      background: transparent;
      border: 2px solid var(--border);
      color: var(--text);
    }
    .cta-secondary:hover {
      background: var(--border);
    }
    
    .tags { margin-top: 1.5rem; }
    .tag {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: var(--border);
      border-radius: 1rem;
      font-size: 0.875rem;
      margin: 0.25rem;
      color: var(--muted);
    }
    .tag:hover { color: var(--text); text-decoration: none; }
    
    .category-link { color: var(--muted); font-size: 0.875rem; margin-bottom: 0.5rem; display: block; }
    
    .seo-content, .faq, .internal-links { 
      margin-top: 2rem; 
      grid-column: 1 / -1;
      padding: 2rem;
      background: var(--card);
      border-radius: 1rem;
      border: 1px solid var(--border);
    }
    .seo-content p, .faq p, .internal-links p { margin-bottom: 1rem; color: var(--muted); }
    .faq h2 { margin-bottom: 1rem; }
    .faq details { margin-bottom: 1rem; }
    .faq summary { cursor: pointer; font-weight: 600; }
    
    .related {
      grid-column: 1 / -1;
      margin-top: 2rem;
    }
    .related h2 { margin-bottom: 1rem; }
    .related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    .related-item {
      background: var(--card);
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid var(--border);
    }
    .related-item h3 { font-size: 1rem; margin-bottom: 0.5rem; }
    .related-item .price { color: var(--primary); }
    
    .footer {
      margin-top: 4rem;
      padding: 2rem;
      background: var(--card);
      border-top: 1px solid var(--border);
      text-align: center;
    }
    .footer-nav { margin-bottom: 1rem; }
    .footer-nav a { margin: 0 1rem; color: var(--muted); }
    .footer-copy { color: var(--muted); font-size: 0.875rem; }
    .category-nav { padding: 1rem 2rem; color: var(--muted); font-size: 0.875rem; }
  </style>
</head>
<body>
  <header class="header">
    <a href="${SITE_URL}" class="logo">VisuStock</a>
    <nav class="nav-links">
      <a href="${SITE_URL}${STATIC_PREFIX}/categories">Browse</a>
      <a href="${SITE_URL}/cart">Cart</a>
      <a href="${SITE_URL}/auth">Sign In</a>
    </nav>
  </header>
  
  <nav class="breadcrumb" aria-label="Breadcrumb">${breadcrumbHtml}</nav>
  
  <main class="main">
    <div class="product-media">
      <img src="${imageUrl}" alt="${esc(product.title)}" class="product-image" loading="lazy" width="800" height="500">
      ${seoContentHtml}
    </div>
    
    <aside class="product-info">
      ${category ? `<a href="${SITE_URL}${STATIC_PREFIX}/categories/${category.slug}" class="category-link">${esc(category.name)}</a>` : ''}
      <h1>${esc(h1)}</h1>
      ${product.price ? `<span class="price">€${product.price}</span>` : ''}
      <p class="description">${esc(product.description || '')}</p>
      
      <a href="${spaUrl}?action=purchase" class="cta-button">Buy Now</a>
      <a href="${spaUrl}?action=cart" class="cta-button cta-secondary">Add to Cart</a>
      <a href="${spaUrl}" class="cta-button cta-secondary">View in App →</a>
      
      ${tagsHtml}
    </aside>
    
    ${relatedHtml}
    ${internalLinksHtml}
    ${faqHtml}
  </main>
  
  <nav class="category-nav">Categories: ${categoryNav}</nav>
  
  <footer class="footer">
    <nav class="footer-nav">
      <a href="${SITE_URL}${STATIC_PREFIX}">Home</a>
      <a href="${SITE_URL}${STATIC_PREFIX}/categories">Marketplace</a>
      <a href="${SITE_URL}/about">About</a>
      <a href="${SITE_URL}/contact">Contact</a>
      <a href="${SITE_URL}/licenses">Licenses</a>
    </nav>
    <p class="footer-copy">&copy; ${new Date().getFullYear()} VisuStock. All rights reserved.</p>
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
    const slug = url.searchParams.get("slug") || "";
    
    console.log(`[static-product] Serving slug: ${slug}`);

    if (!slug) {
      return new Response("Missing slug parameter", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch product by slug
    const { data: product, error } = await supabase
      .from("content_submissions")
      .select("id, title, description, slug, price, tags, category_id, creator_id, content_files(thumbnail_path, file_type)")
      .eq("slug", slug)
      .eq("status", "approved")
      .single();

    if (error || !product) {
      // Try by UUID if slug not found
      const uuid = slug.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
      if (uuid) {
        const { data: byId } = await supabase
          .from("content_submissions")
          .select("id, title, description, slug, price, tags, category_id, creator_id, content_files(thumbnail_path, file_type)")
          .eq("id", uuid)
          .eq("status", "approved")
          .single();
        
        if (byId) {
          // Redirect to canonical slug URL
          return new Response(null, {
            status: 301,
            headers: { 
              ...corsHeaders, 
              "Location": `${SITE_URL}${STATIC_PREFIX}/products/${byId.slug}` 
            },
          });
        }
      }

      console.log(`[static-product] Product not found: ${slug}`);
      // Return proper 404 HTML page (not just text)
      const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Product Not Found | VisuStock</title>
  <meta name="robots" content="noindex, follow">
  <meta name="description" content="The product you're looking for doesn't exist or has been removed.">
  <style>
    body { font-family: system-ui, sans-serif; background: #0f0f23; color: #e2e8f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
    .container { text-align: center; max-width: 400px; padding: 2rem; }
    h1 { font-size: 4rem; color: #6366f1; margin-bottom: 1rem; }
    p { color: #94a3b8; margin-bottom: 1.5rem; }
    a { color: #6366f1; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .btn { display: inline-block; padding: 0.75rem 1.5rem; background: #6366f1; color: white; border-radius: 0.5rem; margin: 0.5rem; }
    .btn:hover { background: #4f46e5; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <h2>Product Not Found</h2>
    <p>This product doesn't exist or has been removed from our marketplace.</p>
    <a href="${SITE_URL}/marketplace" class="btn">Browse Marketplace</a>
    <a href="${SITE_URL}" class="btn">Go Home</a>
  </div>
</body>
</html>`;
      return new Response(notFoundHtml, { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
      });
    }

    // Fetch all categories
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name");

    // Find current category
    const currentCategory = (categories || []).find(c => c.id === product.category_id);

    // Fetch related products
    let relatedProducts: Product[] = [];
    if (product.category_id) {
      const { data: related } = await supabase
        .from("content_submissions")
        .select("id, title, slug, price")
        .eq("status", "approved")
        .eq("category_id", product.category_id)
        .neq("id", product.id)
        .not("slug", "is", null)
        .limit(6);
      relatedProducts = related || [];
    }

    // Fetch SEO metadata
    const { data: seoData } = await supabase
      .rpc("get_seo_metadata", { path_param: `/products/${slug}` });
    const seoMetadata: SEOMetadata | undefined = seoData?.[0] || undefined;

    // Build image URL
    const thumb = product.content_files?.[0]?.thumbnail_path;
    const imageUrl = thumb?.startsWith("http") 
      ? thumb 
      : thumb 
        ? `${supabaseUrl}/storage/v1/object/public/content-files/${thumb}` 
        : `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`;

    // Canonical URL is the static page
    const canonicalUrl = `${SITE_URL}${STATIC_PREFIX}/products/${product.slug}`;
    // SPA URL for interactive actions
    const spaUrl = `${SITE_URL}/products/${product.slug}`;

    const html = buildStaticProductHtml({
      product,
      category: currentCategory,
      relatedProducts,
      imageUrl,
      canonicalUrl,
      spaUrl,
      categories: categories || [],
      seoMetadata,
    });

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[static-product] Error:", error);
    return new Response("Internal server error", { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
