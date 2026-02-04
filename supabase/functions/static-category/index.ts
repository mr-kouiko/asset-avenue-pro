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
  description?: string;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  description?: string;
  price?: number;
  thumbnail?: string;
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

function buildStaticCategoryHtml(opts: {
  category: Category;
  products: Product[];
  allCategories: Category[];
  canonicalUrl: string;
  spaUrl: string;
  seoMetadata?: SEOMetadata;
  supabaseUrl: string;
}): string {
  const { category, products, allCategories, canonicalUrl, spaUrl, seoMetadata, supabaseUrl } = opts;
  
  // Apply SEO overrides if available
  const title = seoMetadata?.seo_title || `${category.name} - Stock Content | VisuStock`;
  const desc = seoMetadata?.seo_description || 
    `Browse professional ${category.name.toLowerCase()} content. Find the perfect creative assets for your projects.`;
  const h1 = seoMetadata?.seo_h1 || `${category.name} Collection`;

  // Build breadcrumbs
  const breadcrumbs = [
    { name: "Home", url: `${SITE_URL}${STATIC_PREFIX}` },
    { name: "Categories", url: `${SITE_URL}${STATIC_PREFIX}/categories` },
    { name: category.name, url: canonicalUrl },
  ];

  // Build JSON-LD schema
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${canonicalUrl}#collection`,
        name: h1,
        url: canonicalUrl,
        description: desc,
        numberOfItems: products.length,
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

  // Build products grid
  const productsHtml = products.map(p => {
    const imgUrl = p.thumbnail?.startsWith("http") 
      ? p.thumbnail 
      : p.thumbnail 
        ? `${supabaseUrl}/storage/v1/object/public/content-files/${p.thumbnail}`
        : `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`;
    
    return `
      <article class="product-card" itemscope itemtype="https://schema.org/Product">
        <a href="${SITE_URL}${STATIC_PREFIX}/products/${p.slug}">
          <img src="${imgUrl}" alt="${esc(p.title)}" loading="lazy" width="300" height="200">
          <div class="product-card-info">
            <h3 itemprop="name">${esc(p.title)}</h3>
            ${p.price ? `<span class="price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
              <span itemprop="price" content="${p.price}">€${p.price}</span>
              <meta itemprop="priceCurrency" content="EUR">
            </span>` : ''}
          </div>
        </a>
      </article>
    `;
  }).join('');

  // Build category sidebar
  const categorySidebar = allCategories.map(c => 
    `<a href="${SITE_URL}${STATIC_PREFIX}/categories/${c.slug}" class="${c.id === category.id ? 'active' : ''}">${esc(c.name)}</a>`
  ).join('\n');

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
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="VisuStock">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  
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
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 2rem;
    }
    @media (max-width: 900px) {
      .main { grid-template-columns: 1fr; }
      .sidebar { display: none; }
    }
    
    .sidebar {
      background: var(--card);
      border-radius: 1rem;
      padding: 1.5rem;
      border: 1px solid var(--border);
      height: fit-content;
      position: sticky;
      top: 2rem;
    }
    .sidebar h2 { font-size: 1rem; margin-bottom: 1rem; color: var(--muted); }
    .sidebar a {
      display: block;
      padding: 0.5rem 0.75rem;
      margin: 0.25rem 0;
      border-radius: 0.5rem;
      color: var(--muted);
    }
    .sidebar a:hover { background: var(--border); color: var(--text); text-decoration: none; }
    .sidebar a.active { background: var(--primary); color: white; }
    
    .content h1 { font-size: 2rem; margin-bottom: 1rem; }
    .content .meta { color: var(--muted); margin-bottom: 2rem; }
    
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.5rem;
    }
    
    .product-card {
      background: var(--card);
      border-radius: 1rem;
      overflow: hidden;
      border: 1px solid var(--border);
      transition: transform 0.2s, border-color 0.2s;
    }
    .product-card:hover { 
      transform: translateY(-4px); 
      border-color: var(--primary);
    }
    .product-card a { display: block; color: inherit; }
    .product-card a:hover { text-decoration: none; }
    .product-card img { 
      width: 100%; 
      aspect-ratio: 3/2; 
      object-fit: cover;
    }
    .product-card-info { padding: 1rem; }
    .product-card h3 { font-size: 1rem; margin-bottom: 0.5rem; }
    .product-card .price { color: var(--primary); font-weight: 600; }
    
    .seo-content, .faq, .internal-links { 
      margin-top: 3rem; 
      padding: 2rem;
      background: var(--card);
      border-radius: 1rem;
      border: 1px solid var(--border);
    }
    .seo-content p, .faq p, .internal-links p { margin-bottom: 1rem; color: var(--muted); }
    .faq h2 { margin-bottom: 1rem; }
    .faq details { margin-bottom: 1rem; }
    .faq summary { cursor: pointer; font-weight: 600; }
    
    .collections-nav {
      margin-top: 2rem;
      padding: 1.5rem;
      background: var(--card);
      border-radius: 0.5rem;
      border: 1px solid var(--border);
    }
    .collections-nav h3 { margin-bottom: 0.5rem; font-size: 1rem; color: var(--muted); }
    .collections-nav a { margin-right: 0.25rem; }
    
    .spa-link {
      display: inline-block;
      margin-top: 2rem;
      padding: 0.75rem 1.5rem;
      background: var(--primary);
      color: white;
      border-radius: 0.5rem;
      font-weight: 600;
    }
    .spa-link:hover { background: var(--primary-dark); text-decoration: none; }
    
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
    <aside class="sidebar">
      <h2>Categories</h2>
      ${categorySidebar}
    </aside>
    
    <section class="content">
      <h1>${esc(h1)}</h1>
      <p class="meta">${products.length} items available</p>
      
      ${seoContentHtml}
      
      <div class="products-grid">
        ${productsHtml}
      </div>
      
      <a href="${spaUrl}" class="spa-link">Open in App for Filters →</a>
      
      <nav class="collections-nav">
        <h3>Explore Collections</h3>
        <p>
          <a href="${SITE_URL}${STATIC_PREFIX}/collections/business">Business</a> · 
          <a href="${SITE_URL}${STATIC_PREFIX}/collections/technology">Technology</a> · 
          <a href="${SITE_URL}${STATIC_PREFIX}/collections/nature">Nature</a> · 
          <a href="${SITE_URL}${STATIC_PREFIX}/collections/travel">Travel</a> · 
          <a href="${SITE_URL}${STATIC_PREFIX}/collections/lifestyle">Lifestyle</a> · 
          <a href="${SITE_URL}${STATIC_PREFIX}/collections">All Collections →</a>
        </p>
      </nav>
      
      ${internalLinksHtml}
      ${faqHtml}
    </section>
  </main>
  
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

function buildCategoriesIndexHtml(categories: Category[], seoMetadata?: SEOMetadata): string {
  const title = seoMetadata?.seo_title || "Browse Categories | VisuStock";
  const desc = seoMetadata?.seo_description || "Explore our collection of professional stock photos, videos, audio, and illustrations.";
  const h1 = seoMetadata?.seo_h1 || "Browse All Categories";
  const canonicalUrl = `${SITE_URL}${STATIC_PREFIX}/categories`;

  const breadcrumbs = [
    { name: "Home", url: `${SITE_URL}${STATIC_PREFIX}` },
    { name: "Categories", url: canonicalUrl },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: h1,
    url: canonicalUrl,
    description: desc,
  };

  const categoriesHtml = categories.map(c => `
    <a href="${SITE_URL}${STATIC_PREFIX}/categories/${c.slug}" class="category-card">
      <h2>${esc(c.name)}</h2>
      ${c.description ? `<p>${esc(c.description)}</p>` : ''}
    </a>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="robots" content="index, follow">
  
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="VisuStock">
  
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  
  <style>
    :root {
      --primary: #6366f1;
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
    }
    a { color: var(--primary); text-decoration: none; }
    
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
    
    .breadcrumb { padding: 1rem 2rem; color: var(--muted); font-size: 0.875rem; }
    .breadcrumb a { color: var(--muted); }
    
    .main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    .main h1 { font-size: 2.5rem; margin-bottom: 2rem; }
    
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    
    .category-card {
      display: block;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 2rem;
      color: var(--text);
      transition: transform 0.2s, border-color 0.2s;
    }
    .category-card:hover { 
      transform: translateY(-4px); 
      border-color: var(--primary);
      text-decoration: none;
    }
    .category-card h2 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    .category-card p { color: var(--muted); font-size: 0.875rem; }
    
    .footer {
      margin-top: 4rem;
      padding: 2rem;
      background: var(--card);
      text-align: center;
    }
    .footer-nav a { margin: 0 1rem; color: var(--muted); }
    .footer-copy { color: var(--muted); font-size: 0.875rem; margin-top: 1rem; }
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
  
  <nav class="breadcrumb">${breadcrumbs.map((b, i) => 
    `<a href="${b.url}">${esc(b.name)}</a>${i < breadcrumbs.length - 1 ? ' › ' : ''}`
  ).join('')}</nav>
  
  <main class="main">
    <h1>${esc(h1)}</h1>
    <div class="categories-grid">
      ${categoriesHtml}
    </div>
  </main>
  
  <footer class="footer">
    <nav class="footer-nav">
      <a href="${SITE_URL}${STATIC_PREFIX}">Home</a>
      <a href="${SITE_URL}${STATIC_PREFIX}/categories">Marketplace</a>
      <a href="${SITE_URL}/about">About</a>
      <a href="${SITE_URL}/contact">Contact</a>
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
    
    console.log(`[static-category] Serving slug: ${slug || 'index'}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all categories
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, slug, description")
      .order("name");

    const allCategories: Category[] = categories || [];

    // If no slug, show categories index
    if (!slug) {
      const { data: seoData } = await supabase
        .rpc("get_seo_metadata", { path_param: "/categories" });
      
      const html = buildCategoriesIndexHtml(allCategories, seoData?.[0]);
      
      return new Response(html, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }

    // Find category by slug
    const category = allCategories.find(c => c.slug === slug);
    
    if (!category) {
      console.log(`[static-category] Category not found: ${slug}`);
      return new Response("Category not found", { status: 404, headers: corsHeaders });
    }

    // Fetch products in this category
    const { data: products } = await supabase
      .from("content_submissions")
      .select("id, title, slug, description, price, content_files(thumbnail_path)")
      .eq("status", "approved")
      .eq("category_id", category.id)
      .not("slug", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);

    const productsList: Product[] = (products || []).map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug!,
      description: p.description,
      price: p.price || undefined,
      thumbnail: p.content_files?.[0]?.thumbnail_path || undefined,
    }));

    // Fetch SEO metadata
    const { data: seoData } = await supabase
      .rpc("get_seo_metadata", { path_param: `/categories/${slug}` });

    const canonicalUrl = `${SITE_URL}${STATIC_PREFIX}/categories/${category.slug}`;
    const spaUrl = `${SITE_URL}/marketplace?category=${category.id}`;

    const html = buildStaticCategoryHtml({
      category,
      products: productsList,
      allCategories,
      canonicalUrl,
      spaUrl,
      seoMetadata: seoData?.[0],
      supabaseUrl,
    });

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[static-category] Error:", error);
    return new Response("Internal server error", { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
