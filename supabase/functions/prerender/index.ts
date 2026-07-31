import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://visustock.com";

const CRAWLERS = [
  "googlebot", "google-extended", "storebot-google", "google-inspectiontool",
  "bingbot", "bingpreview", "yandexbot", "duckduckbot", "baiduspider",
  "facebookexternalhit", "facebot", "twitterbot", "linkedinbot", "discordbot",
  "slackbot", "telegrambot", "whatsapp", "pinterest", "redditbot", "applebot",
  "gptbot", "chatgpt-user", "oai-searchbot", "claudebot", "anthropic-ai",
  "claude-web", "perplexitybot", "ccbot", "amazonbot", "bytespider",
  "ia_archiver", "prerender",
];

function isCrawler(ua: string): boolean {
  return CRAWLERS.some((c) => ua.toLowerCase().includes(c));
}

/** Supported language prefixes — canonical/hreflang aware. */
const LANGS = ["en", "fr", "es", "de", "pt"] as const;
type Lang = typeof LANGS[number];

/** Split "/fr/s/products/x?y=1" → { lang: "fr", path: "/s/products/x?y=1" } */
function splitLang(raw: string): { lang: Lang; path: string } {
  const m = raw.match(/^\/([a-z]{2})(\/|$|\?)/i);
  const code = m?.[1]?.toLowerCase() as Lang | undefined;
  if (code && (LANGS as readonly string[]).includes(code)) {
    const rest = raw.slice(3);
    return { lang: code, path: rest.startsWith("/") || rest.startsWith("?") ? (rest.startsWith("?") ? "/" + rest : rest) : "/" };
  }
  return { lang: "en", path: raw };
}

/** Prefix a site-absolute path with the active language (en stays at root). */
function localized(path: string, lang: Lang): string {
  return lang === "en" ? path : `/${lang}${path === "/" ? "" : path}`;
}


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
  creator_id?: string;
}

interface SEOMetadata {
  seo_title?: string;
  seo_description?: string;
  seo_h1?: string;
  seo_content?: string;
  internal_links?: Array<{ anchor: string; url: string; context: string }>;
  faq_schema?: Array<{ question: string; answer: string }>;
}

function buildHtml(opts: {
  title: string;
  desc: string;
  h1: string;
  url: string;
  canonical: string;
  img: string;
  type: string;
  body: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
  schema?: object;
  seoMetadata?: SEOMetadata;
  /** Language-neutral path (starts with "/") used to emit hreflang alternates. */
  hreflangPath?: string;
  lang?: Lang;
}): string {

  // Apply SEO overrides if available
  const title = opts.seoMetadata?.seo_title || opts.title;
  const desc = opts.seoMetadata?.seo_description || opts.desc;
  const h1 = opts.seoMetadata?.seo_h1 || opts.h1;

  const breadcrumbHtml = opts.breadcrumbs?.map((b, i) => 
    `<span><a href="${b.url}">${esc(b.name)}</a>${i < opts.breadcrumbs!.length - 1 ? ' &gt; ' : ''}</span>`
  ).join('') || '';

  // Build enhanced body with SEO content
  let enhancedBody = opts.body;
  
  if (opts.seoMetadata?.seo_content) {
    enhancedBody = `<article class="seo-content">${markdownToHtml(opts.seoMetadata.seo_content)}</article>` + enhancedBody;
  }

  // Add internal links from SEO metadata
  if (opts.seoMetadata?.internal_links?.length) {
    const linksHtml = opts.seoMetadata.internal_links.map(link => 
      `<p>${esc(link.context).replace(esc(link.anchor), `<a href="${SITE_URL}${link.url}">${esc(link.anchor)}</a>`)}</p>`
    ).join('');
    enhancedBody += `<nav aria-label="Related content">${linksHtml}</nav>`;
  }

  // Add FAQ section from SEO metadata
  if (opts.seoMetadata?.faq_schema?.length) {
    const faqHtml = opts.seoMetadata.faq_schema.map(faq => 
      `<details><summary>${esc(faq.question)}</summary><p>${esc(faq.answer)}</p></details>`
    ).join('');
    enhancedBody += `<section aria-label="FAQ"><h2>Frequently Asked Questions</h2>${faqHtml}</section>`;
  }

  // Build schema with FAQ if present
  let schemaScript = opts.schema ? `<script type="application/ld+json">${JSON.stringify(opts.schema)}</script>` : '';
  
  if (opts.seoMetadata?.faq_schema?.length) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: opts.seoMetadata.faq_schema.map(faq => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer
        }
      }))
    };
    schemaScript += `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`;
  }

  const hreflangHtml = opts.hreflangPath
    ? LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE_URL}${localized(opts.hreflangPath!, l)}">`).join("\n  ") +
      `\n  <link rel="alternate" hreflang="x-default" href="${SITE_URL}${opts.hreflangPath}">`
    : "";

  return `<!DOCTYPE html>
<html lang="${opts.lang || "en"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="${opts.canonical}">
  ${hreflangHtml}

  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${opts.url}">
  <meta property="og:image" content="${opts.img}">
  <meta property="og:type" content="${opts.type}">
  <meta property="og:site_name" content="VisuStock">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${opts.img}">
  ${schemaScript}
</head>
<body>
  <nav aria-label="Breadcrumb">${breadcrumbHtml}</nav>
  <h1>${esc(h1)}</h1>
  ${enhancedBody}
  <footer>
    <nav>
      <a href="${SITE_URL}">Home</a> |
      <a href="${SITE_URL}/marketplace">Marketplace</a> |
      <a href="${SITE_URL}/about">About</a> |
      <a href="${SITE_URL}/contact">Contact</a>
    </nav>
    <p>&copy; ${new Date().getFullYear()} VisuStock</p>
  </footer>
</body>
</html>`;
}

function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(.+)$/gm, "<p>$1</p>");
}

function buildCategoryLinks(categories: Category[]): string {
  return categories.map(c => 
    `<li><a href="${SITE_URL}/marketplace?category=${c.id}">${esc(c.name)}</a></li>`
  ).join('\n');
}

function buildProductLinks(products: Product[]): string {
  return products.map(p => 
    `<article itemscope itemtype="https://schema.org/Product">
      <h3 itemprop="name"><a href="${SITE_URL}/s/products/${p.slug}">${esc(p.title)}</a></h3>
      ${p.price ? `<span itemprop="offers" itemscope itemtype="https://schema.org/Offer"><span itemprop="price" content="${p.price}">$${p.price}</span><meta itemprop="priceCurrency" content="USD"></span>` : ''}
    </article>`
  ).join('\n');
}

function buildRelatedLinks(products: Product[]): string {
  if (!products.length) return '';
  return `<section><h2>Related Products</h2><ul>${products.map(p => 
    `<li><a href="${SITE_URL}/s/products/${p.slug}">${esc(p.title)}</a></li>`
  ).join('')}</ul></section>`;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rawPath = url.searchParams.get("path") || "/";
    const { lang, path: langlessPath } = splitLang(rawPath);
    // Normalize: drop trailing slash (except root) so route matching is stable.
    const path = langlessPath.length > 1 && langlessPath.endsWith("/")
      ? langlessPath.slice(0, -1)
      : langlessPath;
    const ua = req.headers.get("user-agent") || "";

    console.log(`[PRERENDER] Path: ${path} (lang=${lang}), UA: ${ua.substring(0, 50)}`);


    if (!isCrawler(ua)) {
      return new Response(JSON.stringify({ prerender: false, reason: "not-crawler" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const logo = `${SITE_URL}/lovable-uploads/visustock-logo-no-bg.png`;

    // Fetch SEO metadata for this path
    const { data: seoData } = await supabase
      .rpc("get_seo_metadata", { path_param: path });
    
    const seoMetadata: SEOMetadata | undefined = seoData?.[0] || undefined;

    // Fetch categories for internal linking
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name");

    const cats: Category[] = categories || [];

    // ===== HOMEPAGE =====
    if (path === "/" || path === "/en") {
      const { data: featuredProducts } = await supabase
        .from("content_submissions")
        .select("id, title, slug, price, category_id")
        .eq("status", "approved")
        .not("slug", "is", null)
        .order("created_at", { ascending: false })
        .limit(12);

      const schema = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: SITE_URL,
            name: "VisuStock",
            description: "Premium stock photos, videos, audio and illustrations marketplace",
            potentialAction: {
              "@type": "SearchAction",
              target: `${SITE_URL}/marketplace?search={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: "VisuStock",
            url: SITE_URL,
            logo: logo,
            sameAs: [],
          },
        ],
      };

      const body = `
        <section>
          <h2>Browse by Category</h2>
          <ul>${buildCategoryLinks(cats)}</ul>
        </section>
        <section>
          <h2>Featured Content</h2>
          ${buildProductLinks(featuredProducts || [])}
        </section>
        <section>
          <h2>Why VisuStock?</h2>
          <ul>
            <li>High-quality curated content from professional creators</li>
            <li>Flexible licensing options for every project</li>
            <li>Lightning-fast downloads with secure delivery</li>
          </ul>
        </section>`;

      return new Response(
        buildHtml({
          title: "VisuStock - Premium Stock Photos, Videos, Audio & Illustrations",
          desc: "Discover and download high-quality stock photos, videos, audio tracks, and illustrations from talented creators worldwide.",
          h1: "Premium Creative Content Marketplace",
          url: SITE_URL,
          canonical: SITE_URL,
          img: logo,
          type: "website",
          body,
          breadcrumbs: [{ name: "Home", url: SITE_URL }],
          schema,
          hreflangPath: "/",
          lang,
        }),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" } }
      );
    }

    // ===== MARKETPLACE / CATEGORY =====
    if (path === "/marketplace" || path.startsWith("/marketplace?")) {
      const urlObj = new URL(`${SITE_URL}${path}`);
      const categoryId = urlObj.searchParams.get("category");
      const search = urlObj.searchParams.get("search");

      // Canonical URL: base marketplace without filters (except category)
      let canonicalUrl = `${SITE_URL}/marketplace`;
      if (categoryId) {
        canonicalUrl = `${SITE_URL}/marketplace?category=${categoryId}`;
      }

      let query = supabase
        .from("content_submissions")
        .select("id, title, slug, price, description, category_id")
        .eq("status", "approved")
        .not("slug", "is", null);

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data: products } = await query.order("created_at", { ascending: false }).limit(50);

      const currentCat = cats.find(c => c.id === categoryId);
      const pageTitle = currentCat 
        ? `${currentCat.name} - Stock Content | VisuStock`
        : "Marketplace - Browse Creative Content | VisuStock";
      const pageDesc = currentCat
        ? `Browse professional ${currentCat.name.toLowerCase()} content. Find the perfect creative assets for your projects.`
        : "Browse thousands of professional photos, videos, audio tracks and illustrations.";
      const pageH1 = currentCat ? `${currentCat.name} Collection` : "Creative Content Marketplace";

      const breadcrumbs = [
        { name: "Home", url: SITE_URL },
        { name: "Marketplace", url: `${SITE_URL}/marketplace` },
      ];
      if (currentCat) {
        breadcrumbs.push({ name: currentCat.name, url: canonicalUrl });
      }

      const schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${canonicalUrl}#collection`,
        name: pageH1,
        url: canonicalUrl,
        description: pageDesc,
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbs.map((b, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: b.name,
            item: b.url,
          })),
        },
      };

      const body = `
        <section>
          <h2>Categories</h2>
          <ul>${buildCategoryLinks(cats)}</ul>
        </section>
        <section>
          <h2>Available Content (${products?.length || 0} items)</h2>
          ${buildProductLinks(products || [])}
        </section>`;

      return new Response(
        buildHtml({
          title: pageTitle,
          desc: pageDesc,
          h1: pageH1,
          url: `${SITE_URL}${path}`,
          canonical: canonicalUrl,
          img: logo,
          type: "website",
          body,
          breadcrumbs,
          schema,
        }),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=1800" } }
      );
    }

    // ===== PRODUCT PAGES (canonical /s/products/:slug, legacy /products/:slug) =====
    if (path.startsWith("/products/") || path.startsWith("/s/products/")) {
      const slug = path.replace(/^\/(s\/)?products\//, "").split("?")[0].split("/")[0];
      const uuid = slug.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];


      let product = null;
      const { data: bySlug } = await supabase
        .from("content_submissions")
        .select("id, title, description, slug, price, tags, category_id, creator_id, content_files(thumbnail_path, file_type)")
        .eq("slug", slug)
        .eq("status", "approved")
        .single();

      product = bySlug;
      if (!product && uuid) {
        const { data: byId } = await supabase
          .from("content_submissions")
          .select("id, title, description, slug, price, tags, category_id, creator_id, content_files(thumbnail_path, file_type)")
          .eq("id", uuid)
          .eq("status", "approved")
          .single();
        product = byId;
      }

      if (!product) {
        return new Response(
          buildHtml({
            title: "Not Found - VisuStock",
            desc: "Page not found",
            h1: "Not Found",
            url: `${SITE_URL}${path}`,
            canonical: SITE_URL,
            img: logo,
            type: "website",
            body: "<p>This page doesn't exist.</p>",
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
        );
      }

      const thumb = product.content_files?.[0]?.thumbnail_path;
      const img = thumb?.startsWith("http") ? thumb : thumb ? `${supabaseUrl}/storage/v1/object/public/content-files/${thumb}` : logo;
      const productPath = `/s/products/${product.slug || slug}`;
      const pUrl = `${SITE_URL}${productPath}`;
      const currentCat = cats.find(c => c.id === product.category_id);

      // Fetch related products (same category, exclude current)
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

      const breadcrumbs = [
        { name: "Home", url: SITE_URL },
        { name: "Marketplace", url: `${SITE_URL}/marketplace` },
      ];
      if (currentCat) {
        breadcrumbs.push({ name: currentCat.name, url: `${SITE_URL}/marketplace?category=${currentCat.id}` });
      }
      breadcrumbs.push({ name: product.title, url: pUrl });

      const schema = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Product",
            "@id": `${pUrl}#product`,
            name: product.title,
            description: product.description,
            image: img,
            url: pUrl,
            brand: { "@type": "Brand", name: "VisuStock" },
            ...(product.price && {
              offers: {
                "@type": "Offer",
                price: product.price,
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                url: pUrl,
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

      const tagsHtml = product.tags?.length 
        ? `<p>Tags: ${product.tags.map((t: string) => `<a href="${SITE_URL}/marketplace?search=${encodeURIComponent(t)}">${esc(t)}</a>`).join(", ")}</p>` 
        : '';

      const body = `
        <article itemscope itemtype="https://schema.org/Product">
          <img src="${img}" alt="${esc(product.title)}" itemprop="image" width="800" height="600">
          <p itemprop="description">${esc(product.description || '')}</p>
          ${product.price ? `<div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
            <span>Price: </span><span itemprop="price" content="${product.price}">$${product.price}</span>
            <meta itemprop="priceCurrency" content="USD">
            <link itemprop="availability" href="https://schema.org/InStock">
          </div>` : ''}
          ${tagsHtml}
          ${currentCat ? `<p>Category: <a href="${SITE_URL}/marketplace?category=${currentCat.id}">${esc(currentCat.name)}</a></p>` : ''}
        </article>
        ${buildRelatedLinks(relatedProducts)}
        <nav><a href="${SITE_URL}/marketplace">← Back to Marketplace</a></nav>`;

      return new Response(
        buildHtml({
          title: `${product.title} | VisuStock`,
          desc: product.description?.substring(0, 155) || "Premium digital content on VisuStock",
          h1: product.title,
          url: pUrl,
          canonical: pUrl,
          img,
          type: "product",
          body,
          breadcrumbs,
          schema,
          hreflangPath: productPath,
          lang,
        }),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=1800" } }
      );
    }

    // ===== /s/categories/:slug =====
    if (path.startsWith("/s/categories/")) {
      const slug = path.replace("/s/categories/", "").split("?")[0].split("/")[0];
      const canonical = `${SITE_URL}/s/categories/${slug}`;

      const { data: cat } = await supabase
        .from("categories")
        .select("id, name, slug, description")
        .eq("slug", slug)
        .maybeSingle();

      const displayName = cat?.name || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const desc = cat?.description
        || `Browse professional ${displayName.toLowerCase()} stock content on VisuStock. High-quality assets for your creative projects.`;

      let products: Product[] = [];
      if (cat?.id) {
        const { data } = await supabase
          .from("content_submissions")
          .select("id, title, slug, price, description")
          .eq("status", "approved")
          .eq("category_id", cat.id)
          .not("slug", "is", null)
          .order("created_at", { ascending: false })
          .limit(30);
        products = data || [];
      }

      const breadcrumbs = [
        { name: "Home", url: SITE_URL },
        { name: "Categories", url: `${SITE_URL}/marketplace` },
        { name: displayName, url: canonical },
      ];

      const itemListElement = products.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/products/${p.slug}`,
        name: p.title,
      }));

      const schema = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            "@id": `${canonical}#collection`,
            url: canonical,
            name: `${displayName} Stock Content`,
            description: desc,
            mainEntity: { "@type": "ItemList", itemListElement },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbs.map((b, i) => ({
              "@type": "ListItem", position: i + 1, name: b.name, item: b.url,
            })),
          },
        ],
      };

      const itemsHtml = products.length
        ? products.map((p) => `<article><h3><a href="${SITE_URL}/products/${p.slug}">${esc(p.title)}</a></h3>${p.description ? `<p>${esc(p.description.substring(0, 200))}</p>` : ""}${p.price ? `<p>Price: €${p.price}</p>` : ""}</article>`).join("\n")
        : `<p>New ${esc(displayName.toLowerCase())} content is being curated. <a href="${SITE_URL}/marketplace">Browse the full marketplace</a>.</p>`;

      const body = `
        <section>
          <p>${esc(desc)}</p>
        </section>
        <section>
          <h2>${esc(displayName)} Content (${products.length} items)</h2>
          ${itemsHtml}
        </section>`;

      return new Response(
        buildHtml({
          title: `${displayName} Stock Photos, Videos & Audio | VisuStock`,
          desc,
          h1: `${displayName} Stock Media`,
          url: canonical,
          canonical,
          img: logo,
          type: "website",
          body,
          breadcrumbs,
          schema,
        }),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=1800" } }
      );
    }

    // ===== /s/collections/:slug =====
    if (path.startsWith("/s/collections/") || path.startsWith("/collections/")) {
      const slug = path.replace(/^\/(s\/)?collections\//, "").split("?")[0].split("/")[0];
      const canonical = `${SITE_URL}/s/collections/${slug}`;
      const displayName = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const desc = `Curated ${displayName.toLowerCase()} stock collection on VisuStock — premium photos, videos and audio for your creative projects.`;

      // Fetch products matching the collection slug via tags or title
      const keyword = slug.replace(/-/g, " ");
      const { data: prodData } = await supabase
        .from("content_submissions")
        .select("id, title, slug, price, description, tags")
        .eq("status", "approved")
        .not("slug", "is", null)
        .or(`title.ilike.%${keyword}%,tags.cs.{${keyword}}`)
        .order("created_at", { ascending: false })
        .limit(30);
      const products: Product[] = prodData || [];

      const breadcrumbs = [
        { name: "Home", url: SITE_URL },
        { name: "Collections", url: `${SITE_URL}/collections` },
        { name: displayName, url: canonical },
      ];

      const schema = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            "@id": `${canonical}#collection`,
            url: canonical,
            name: `${displayName} Collection`,
            description: desc,
            mainEntity: {
              "@type": "ItemList",
              itemListElement: products.map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `${SITE_URL}/products/${p.slug}`,
                name: p.title,
              })),
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbs.map((b, i) => ({
              "@type": "ListItem", position: i + 1, name: b.name, item: b.url,
            })),
          },
        ],
      };

      const itemsHtml = products.length
        ? products.map((p) => `<article><h3><a href="${SITE_URL}/products/${p.slug}">${esc(p.title)}</a></h3>${p.description ? `<p>${esc(p.description.substring(0, 200))}</p>` : ""}</article>`).join("\n")
        : `<p>This ${esc(displayName.toLowerCase())} collection is being curated. <a href="${SITE_URL}/marketplace">Explore the marketplace</a>.</p>`;

      const body = `
        <section><p>${esc(desc)}</p></section>
        <section>
          <h2>${esc(displayName)} Items (${products.length})</h2>
          ${itemsHtml}
        </section>`;

      return new Response(
        buildHtml({
          title: `${displayName} Collection | VisuStock`,
          desc,
          h1: `${displayName} Collection`,
          url: canonical,
          canonical,
          img: logo,
          type: "website",
          body,
          breadcrumbs,
          schema,
        }),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=1800" } }
      );
    }

    // ===== /blog (index) =====
    if (path === "/blog" || path === "/blog/") {
      const { data: posts } = await supabase
        .from("blog_posts")
        .select("slug, title, excerpt, published_at, hero_image, author")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50);

      const canonical = `${SITE_URL}/blog`;
      const breadcrumbs = [
        { name: "Home", url: SITE_URL },
        { name: "Blog", url: canonical },
      ];
      const list = posts || [];

      const schema = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Blog",
            "@id": `${canonical}#blog`,
            url: canonical,
            name: "VisuStock Blog",
            description: "Insights, tutorials and news for creators and content buyers.",
            blogPost: list.map((p: any) => ({
              "@type": "BlogPosting",
              headline: p.title,
              url: `${SITE_URL}/blog/${p.slug}`,
              datePublished: p.published_at,
            })),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbs.map((b, i) => ({
              "@type": "ListItem", position: i + 1, name: b.name, item: b.url,
            })),
          },
        ],
      };

      const itemsHtml = list.length
        ? list.map((p: any) => `<article><h3><a href="${SITE_URL}/blog/${p.slug}">${esc(p.title)}</a></h3>${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ""}${p.published_at ? `<time datetime="${p.published_at}">${p.published_at.split("T")[0]}</time>` : ""}</article>`).join("\n")
        : `<p>New posts coming soon.</p>`;

      return new Response(
        buildHtml({
          title: "Blog - Stock Media Insights & Tutorials | VisuStock",
          desc: "Read the VisuStock blog for creator tutorials, licensing tips and industry insights.",
          h1: "VisuStock Blog",
          url: canonical,
          canonical,
          img: logo,
          type: "website",
          body: `<section>${itemsHtml}</section>`,
          breadcrumbs,
          schema,
        }),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=1800" } }
      );
    }

    // ===== /blog/:slug =====
    if (path.startsWith("/blog/")) {
      const slug = path.replace("/blog/", "").split("?")[0].split("/")[0];
      const canonical = `${SITE_URL}/blog/${slug}`;

      const { data: post } = await supabase
        .from("blog_posts")
        .select("slug, title, excerpt, content, hero_image, author, author_role, published_at, updated_at, category, tags, seo_title, meta_description")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (!post) {
        return new Response(
          buildHtml({
            title: "Post Not Found | VisuStock Blog",
            desc: "This blog post is unavailable.",
            h1: "Post Not Found",
            url: canonical,
            canonical,
            img: logo,
            type: "website",
            body: `<p>This post doesn't exist. <a href="${SITE_URL}/blog">Back to blog</a>.</p>`,
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
        );
      }

      const img = post.hero_image || logo;
      const title = post.seo_title || post.title;
      const desc = post.meta_description || post.excerpt || `${post.title} — VisuStock Blog`;

      const breadcrumbs = [
        { name: "Home", url: SITE_URL },
        { name: "Blog", url: `${SITE_URL}/blog` },
        { name: post.title, url: canonical },
      ];

      const schema = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BlogPosting",
            "@id": `${canonical}#post`,
            headline: post.title,
            description: desc,
            image: img,
            url: canonical,
            datePublished: post.published_at,
            dateModified: post.updated_at || post.published_at,
            author: { "@type": "Person", name: post.author || "VisuStock Team" },
            publisher: {
              "@type": "Organization",
              name: "VisuStock",
              logo: { "@type": "ImageObject", url: logo },
            },
            mainEntityOfPage: canonical,
            ...(post.tags?.length && { keywords: post.tags.join(", ") }),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbs.map((b, i) => ({
              "@type": "ListItem", position: i + 1, name: b.name, item: b.url,
            })),
          },
        ],
      };

      const body = `
        <article>
          ${post.hero_image ? `<img src="${esc(post.hero_image)}" alt="${esc(post.title)}" width="1200" height="630">` : ""}
          <p><em>By ${esc(post.author || "VisuStock Team")}${post.author_role ? `, ${esc(post.author_role)}` : ""}${post.published_at ? ` — <time datetime="${post.published_at}">${post.published_at.split("T")[0]}</time>` : ""}</em></p>
          ${post.excerpt ? `<p><strong>${esc(post.excerpt)}</strong></p>` : ""}
          <div>${markdownToHtml(post.content || "")}</div>
          ${post.tags?.length ? `<p>Tags: ${post.tags.map((t: string) => esc(t)).join(", ")}</p>` : ""}
        </article>
        <nav><a href="${SITE_URL}/blog">← Back to blog</a></nav>`;

      return new Response(
        buildHtml({
          title: `${title} | VisuStock Blog`,
          desc: desc.substring(0, 160),
          h1: post.title,
          url: canonical,
          canonical,
          img,
          type: "article",
          body,
          breadcrumbs,
          schema,
        }),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=1800" } }
      );
    }

    // ===== COLLECTIONS INDEX =====
    if (path === "/collections" || path === "/s/collections") {
      const canonical = `${SITE_URL}/s/collections`;
      const desc = "Browse curated VisuStock collections — business, technology, nature, travel, food, wellness, education, lifestyle, music and abstract backgrounds.";
      const slugs = [
        "business", "technology", "nature", "travel", "food",
        "health-wellness", "education", "lifestyle", "music-audio", "abstract-backgrounds",
      ];
      const pretty = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const breadcrumbs = [
        { name: "Home", url: SITE_URL },
        { name: "Collections", url: canonical },
      ];
      const schema = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            "@id": `${canonical}#collections`,
            url: canonical,
            name: "VisuStock Collections",
            description: desc,
            mainEntity: {
              "@type": "ItemList",
              itemListElement: slugs.map((s, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: pretty(s),
                url: `${SITE_URL}/s/collections/${s}`,
              })),
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbs.map((b, i) => ({
              "@type": "ListItem", position: i + 1, name: b.name, item: b.url,
            })),
          },
        ],
      };
      const body = `
        <section><p>${esc(desc)}</p></section>
        <section><h2>All Collections</h2><ul>
          ${slugs.map((s) => `<li><a href="${SITE_URL}/s/collections/${s}">${esc(pretty(s))} Collection</a></li>`).join("\n")}
        </ul></section>
        <nav><a href="${SITE_URL}/marketplace">Browse the full marketplace</a></nav>`;

      return new Response(
        buildHtml({
          title: "Curated Stock Collections | VisuStock",
          desc, h1: "Curated Collections",
          url: canonical, canonical, img: logo, type: "website",
          body, breadcrumbs, schema, hreflangPath: "/s/collections", lang,
        }),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" } }
      );
    }

    // ===== FREE STOCK LIBRARY =====
    if (path === "/free-stock-library") {
      const canonical = `${SITE_URL}/free-stock-library`;
      const desc = "Download free stock photos and videos from the VisuStock free library — no subscription required, ready for personal and commercial projects.";
      const { data: freeProducts } = await supabase
        .from("content_submissions")
        .select("id, title, slug, price")
        .eq("status", "approved")
        .not("slug", "is", null)
        .order("created_at", { ascending: false })
        .limit(24);
      const breadcrumbs = [
        { name: "Home", url: SITE_URL },
        { name: "Free Stock Library", url: canonical },
      ];
      const body = `
        <section><p>${esc(desc)}</p></section>
        <section><h2>Popular Free Downloads</h2>${buildProductLinks(freeProducts || [])}</section>
        <nav><a href="${SITE_URL}/marketplace">Explore premium assets</a></nav>`;

      return new Response(
        buildHtml({
          title: "Free Stock Photos & Videos | VisuStock",
          desc, h1: "Free Stock Library",
          url: canonical, canonical, img: logo, type: "website",
          body, breadcrumbs, hreflangPath: "/free-stock-library", lang,
        }),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" } }
      );
    }

    // ===== STUDIO AI TOOL PAGES =====
    const toolPages: Record<string, { title: string; desc: string; h1: string; intro: string }> = {
      "/ai-upscaler": { title: "AI Image Upscaler — Enlarge Photos Without Losing Quality | VisuStock", desc: "Upscale images up to 4x in your browser with AI. Sharper details, no quality loss, free and private.", h1: "AI Image Upscaler", intro: "Enlarge photos up to 4x with Real-ESRGAN AI directly in your browser. Nothing is uploaded to a server." },
      "/image-upscale": { title: "Image Upscale — AI Photo Enlarger | VisuStock", desc: "Enlarge and sharpen any photo with AI upscaling directly in your browser.", h1: "Image Upscale", intro: "Increase resolution while preserving fine detail using AI upscaling." },
      "/face-enhancer": { title: "AI Face Enhancer — Restore & Sharpen Portraits | VisuStock", desc: "Restore blurry or low-resolution faces with GFPGAN AI face enhancement in your browser.", h1: "AI Face Enhancer", intro: "Restore facial detail in portraits and old photos with AI, right in your browser." },
      "/remove-background": { title: "Remove Image Background Free | VisuStock", desc: "Remove backgrounds from photos automatically with AI and download a transparent PNG.", h1: "Remove Background", intro: "Cut out subjects automatically and export a transparent PNG in seconds." },
      "/image-converter": { title: "Free Image Converter — JPG, PNG, WebP, AVIF | VisuStock", desc: "Convert images between JPG, PNG, WebP and AVIF instantly in your browser. Free, no upload.", h1: "Image Converter", intro: "Convert between JPG, PNG, WebP and AVIF locally — files never leave your device." },
      "/image-resizer": { title: "Free Image Resizer — Resize Photos Online | VisuStock", desc: "Resize images to any dimension or social media preset instantly in your browser.", h1: "Image Resizer", intro: "Resize to exact pixel dimensions or ready-made social presets." },
      "/reframe-video": { title: "AI Video Reframe — Auto Crop to Vertical & Square | VisuStock", desc: "Automatically reframe landscape videos to vertical or square with AI subject tracking.", h1: "AI Reframe Video", intro: "Reframe 16:9 footage to 9:16 or 1:1 with AI subject tracking." },
      "/video-upscale": { title: "AI Video Upscaler — Improve Video Resolution | VisuStock", desc: "Upscale and sharpen video footage with AI for crisper, higher-resolution results.", h1: "AI Video Upscaler", intro: "Increase video resolution and clarity with AI enhancement." },
      "/text-to-speech": { title: "Free Text to Speech — Natural AI Voices | VisuStock", desc: "Turn text into natural-sounding speech with neural AI voices and download the audio.", h1: "Text to Speech", intro: "Generate natural voiceovers from text with neural AI voices." },
      "/text-to-video": { title: "AI Text to Video Generator | VisuStock", desc: "Generate short videos from a text prompt with AI video generation.", h1: "Text to Video AI", intro: "Describe a scene and generate a short AI video clip." },
      "/image-to-video": { title: "AI Image to Video Generator | VisuStock", desc: "Animate any still image into a short AI-generated video clip.", h1: "Image to Video", intro: "Turn a still photo into a short animated video with AI." },
      "/adjust-music-duration": { title: "Adjust Music Duration — Seamless Audio Trimming | VisuStock", desc: "Shorten or extend music tracks to an exact duration with seamless, loop-aware editing.", h1: "Adjust Music Duration", intro: "Fit any track to an exact runtime with seamless loop-aware editing." },
      "/studio-ai": { title: "Studio AI — Free Creative AI Tools | VisuStock", desc: "A free suite of browser-based AI tools: upscaling, face enhancement, background removal, reframing, text to speech and more.", h1: "Studio AI", intro: "A complete suite of browser-based AI creative tools, free to use." },
      "/ai-image-generator": { title: "AI Image Generator — Create Images From Text | VisuStock", desc: "Generate unique, royalty-free images from a text prompt with AI.", h1: "AI Image Generator", intro: "Create original royalty-free visuals from a text description." },
    };

    const tool = toolPages[path];
    if (tool) {
      const canonical = `${SITE_URL}${path}`;
      const breadcrumbs = [
        { name: "Home", url: SITE_URL },
        { name: "Studio AI", url: `${SITE_URL}/studio-ai` },
        { name: tool.h1, url: canonical },
      ];
      const schema = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "SoftwareApplication",
            "@id": `${canonical}#app`,
            name: tool.h1,
            description: tool.desc,
            url: canonical,
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Any (web browser)",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            publisher: { "@type": "Organization", name: "VisuStock", url: SITE_URL },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbs.map((b, i) => ({
              "@type": "ListItem", position: i + 1, name: b.name, item: b.url,
            })),
          },
        ],
      };
      const otherTools = Object.entries(toolPages).filter(([p]) => p !== path).slice(0, 8);
      const body = `
        <section><p>${esc(tool.intro)}</p></section>
        <section><h2>How it works</h2><ol>
          <li>Open ${esc(tool.h1)} on VisuStock.</li>
          <li>Upload or select your file.</li>
          <li>Process it and download the result.</li>
        </ol></section>
        <section><h2>More Studio AI tools</h2><ul>
          ${otherTools.map(([p, t]) => `<li><a href="${SITE_URL}${p}">${esc(t.h1)}</a></li>`).join("\n")}
        </ul></section>
        <nav><a href="${SITE_URL}/marketplace">Browse stock assets</a> · <a href="${SITE_URL}/free-stock-library">Free stock library</a></nav>`;

      return new Response(
        buildHtml({
          title: tool.title, desc: tool.desc, h1: tool.h1,
          url: canonical, canonical, img: logo, type: "website",
          body, breadcrumbs, schema, hreflangPath: path, lang,
        }),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=86400" } }
      );
    }

    // ===== STATIC PAGES =====
    const staticPages: Record<string, { title: string; desc: string; h1: string }> = {
      "/about": { title: "About VisuStock — Our Story & Mission", desc: "Learn how VisuStock helps creators sell and buyers find premium stock photos, videos, audio and vectors.", h1: "About VisuStock" },
      "/contact": { title: "Contact VisuStock — Support & Enquiries", desc: "Get in touch with the VisuStock team for support, partnerships or licensing questions.", h1: "Contact Us" },
      "/licenses": { title: "Licensing — How VisuStock Licences Work", desc: "Understand VisuStock content licensing for personal, commercial and extended use.", h1: "Licensing" },
      "/packages-pricing": { title: "Pricing & Packages — Credits and Subscriptions", desc: "Compare VisuStock credit packs and Infinity subscription plans in USD.", h1: "Pricing & Packages" },
      "/terms": { title: "Terms of Service — VisuStock", desc: "The terms and conditions that govern use of the VisuStock marketplace.", h1: "Terms of Service" },
      "/privacy": { title: "Privacy Policy — VisuStock", desc: "How VisuStock collects, uses and protects your personal data.", h1: "Privacy Policy" },
      "/privacy-policy": { title: "Privacy Policy — VisuStock", desc: "How VisuStock collects, uses and protects your personal data.", h1: "Privacy Policy" },
      "/cookie-policy": { title: "Cookie Policy — VisuStock", desc: "How VisuStock uses cookies and similar technologies.", h1: "Cookie Policy" },
      "/license-agreement": { title: "License Agreement — VisuStock", desc: "The full VisuStock content license agreement for buyers and sellers.", h1: "License Agreement" },
      "/buy-credits": { title: "Buy Credits — VisuStock", desc: "Purchase VisuStock credits in USD to download premium assets instantly.", h1: "Buy Credits" },
      "/support": { title: "Support & Help Centre — VisuStock", desc: "Find answers, guides and direct support for your VisuStock account.", h1: "Support" },
      "/infinity": { title: "VisuStock Infinity — Unlimited Downloads Subscription", desc: "Unlimited access to premium stock photos, videos, audio and vectors with VisuStock Infinity.", h1: "VisuStock Infinity" },
      "/become-seller": { title: "Sell Your Content — Become a VisuStock Seller", desc: "Earn 60% on every sale. Upload photos, videos, audio and vectors to the VisuStock marketplace.", h1: "Become a Seller" },
      "/business": {
        title: "Business Plans — Enterprise Solutions for Companies | VisuStock",
        desc: "Custom business packages for companies and organizations. Premium photos, videos, vectors, and audio for professional and commercial use.",
        h1: "Power Your Business With Premium Creative Content",
      },
    };

    const page = staticPages[path];
    if (page) {
      const canonical = `${SITE_URL}${path}`;
      const breadcrumbs = [
        { name: "Home", url: SITE_URL },
        { name: page.h1, url: canonical },
      ];

      return new Response(
        buildHtml({
          title: page.title,
          desc: page.desc,
          h1: page.h1,
          url: canonical,
          canonical,
          img: logo,
          type: "website",
          body: `<section><p>${esc(page.desc)}</p></section>
            <nav><a href="${SITE_URL}/marketplace">Marketplace</a> · <a href="${SITE_URL}/s/collections">Collections</a> · <a href="${SITE_URL}/free-stock-library">Free stock</a> · <a href="${SITE_URL}/studio-ai">Studio AI</a> · <a href="${SITE_URL}/support">Support</a></nav>`,
          breadcrumbs,
          hreflangPath: path,
          lang,
        }),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=86400" } }
      );
    }


    return new Response(JSON.stringify({ prerender: false, reason: "unknown-path" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[PRERENDER] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
