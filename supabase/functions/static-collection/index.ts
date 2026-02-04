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

interface Product {
  id: string;
  title: string;
  slug: string;
  price?: number;
  thumbnail?: string;
}

interface SEOCollection {
  id: string;
  slug: string;
  name: string;
  title: string;
  description: string;
  h1: string;
  seoContent: string;
  searchQueries: string[];
  relatedCollections: string[];
  relatedCategories: string[];
  faq: Array<{ question: string; answer: string }>;
}

// Embedded collection data (synced with frontend)
const collections: SEOCollection[] = [
  {
    id: 'business',
    slug: 'business',
    name: 'Business',
    title: 'Business Stock Photos, Videos & Audio | VisuStock',
    description: 'Professional business content for corporate presentations, marketing materials, and commercial projects.',
    h1: 'Business & Corporate Stock Media',
    seoContent: '<p><strong>Professional business content</strong> for every corporate need. Our curated collection features authentic workplace imagery, team collaboration scenes, and executive-level visuals.</p><p>Whether you\'re creating a <strong>corporate presentation</strong>, updating your website, or producing marketing materials, find the perfect business assets.</p>',
    searchQueries: ['business', 'corporate', 'office', 'meeting', 'professional', 'team', 'workplace', 'executive'],
    relatedCollections: ['technology', 'finance', 'marketing'],
    relatedCategories: ['photo', 'video'],
    faq: [
      { question: 'What types of business content are available?', answer: 'We offer photos, videos, and audio featuring office environments, team meetings, professional portraits, and workplace technology scenes.' },
      { question: 'Can I use these images for commercial purposes?', answer: 'Yes! All content comes with commercial licenses for business use.' }
    ]
  },
  {
    id: 'technology',
    slug: 'technology',
    name: 'Technology',
    title: 'Technology Stock Photos & Videos | Tech Media | VisuStock',
    description: 'Cutting-edge technology content featuring devices, software interfaces, AI concepts, and digital innovation.',
    h1: 'Technology & Digital Stock Media',
    seoContent: '<p><strong>Technology-focused stock content</strong> for the digital age. From smartphones and laptops to abstract data visualizations and AI concepts.</p><p>Explore content featuring <strong>coding</strong>, cybersecurity, cloud computing, and artificial intelligence.</p>',
    searchQueries: ['technology', 'tech', 'computer', 'laptop', 'smartphone', 'coding', 'digital', 'software', 'AI'],
    relatedCollections: ['business', 'education', 'abstract-backgrounds'],
    relatedCategories: ['photo', 'video', 'vector'],
    faq: [
      { question: 'Do you have AI and machine learning imagery?', answer: 'Yes, we have an extensive collection of AI concepts, neural networks, and data science visualizations.' }
    ]
  },
  {
    id: 'nature',
    slug: 'nature',
    name: 'Nature',
    title: 'Nature Stock Photos & Videos | Landscapes | VisuStock',
    description: 'Stunning nature photography and videos featuring landscapes, wildlife, forests, oceans, and natural phenomena.',
    h1: 'Nature & Landscape Stock Media',
    seoContent: '<p><strong>Breathtaking nature content</strong> that captures Earth\'s beauty. From majestic mountain ranges to serene forest scenes.</p><p>Explore <strong>wildlife photography</strong>, seasonal landscapes, underwater scenes, and aerial nature footage.</p>',
    searchQueries: ['nature', 'landscape', 'forest', 'mountain', 'ocean', 'wildlife', 'trees', 'flowers', 'sunset', 'water'],
    relatedCollections: ['travel', 'health-wellness'],
    relatedCategories: ['photo', 'video'],
    faq: [
      { question: 'Are drone nature videos available?', answer: 'Yes! We offer stunning aerial footage of landscapes, coastlines, and forests.' }
    ]
  },
  {
    id: 'travel',
    slug: 'travel',
    name: 'Travel',
    title: 'Travel Stock Photos & Videos | Destinations | VisuStock',
    description: 'Wanderlust-inspiring travel content featuring destinations worldwide, adventure activities, and cultural experiences.',
    h1: 'Travel & Adventure Stock Media',
    seoContent: '<p><strong>World-class travel content</strong> that transports viewers to destinations around the globe. Iconic landmarks, hidden gems, and authentic cultural experiences.</p>',
    searchQueries: ['travel', 'vacation', 'destination', 'tourism', 'adventure', 'landmark', 'hotel', 'beach', 'city'],
    relatedCollections: ['nature', 'food', 'lifestyle'],
    relatedCategories: ['photo', 'video'],
    faq: [
      { question: 'Which destinations are covered?', answer: 'Our travel collection spans all continents with content from popular and emerging destinations.' }
    ]
  },
  {
    id: 'food',
    slug: 'food',
    name: 'Food & Cuisine',
    title: 'Food Stock Photos & Videos | Restaurant Media | VisuStock',
    description: 'Mouth-watering food photography and videos featuring dishes, ingredients, cooking, and dining experiences.',
    h1: 'Food & Culinary Stock Media',
    seoContent: '<p><strong>Appetizing food content</strong> that makes viewers hungry. Gourmet dishes, fresh ingredients, cooking techniques, and dining experiences.</p>',
    searchQueries: ['food', 'cooking', 'restaurant', 'cuisine', 'recipe', 'ingredients', 'dining', 'chef', 'healthy'],
    relatedCollections: ['lifestyle', 'health-wellness', 'travel'],
    relatedCategories: ['photo', 'video'],
    faq: [
      { question: 'Are there healthy food options?', answer: 'Yes! Our collection includes extensive healthy eating content—salads, smoothies, and organic ingredients.' }
    ]
  },
  {
    id: 'health',
    slug: 'health-wellness',
    name: 'Health & Wellness',
    title: 'Health & Wellness Stock Photos | Medical Media | VisuStock',
    description: 'Health-focused content featuring fitness, medical, mental wellness, and healthy lifestyle imagery.',
    h1: 'Health & Wellness Stock Media',
    seoContent: '<p><strong>Health and wellness content</strong> for the modern wellness industry. Fitness, medical care, mental health, nutrition, and holistic wellness practices.</p>',
    searchQueries: ['health', 'wellness', 'fitness', 'medical', 'yoga', 'exercise', 'gym', 'meditation', 'doctor'],
    relatedCollections: ['food', 'lifestyle', 'nature'],
    relatedCategories: ['photo', 'video'],
    faq: [
      { question: 'Are there mental health images?', answer: 'Yes, we have content featuring therapy sessions, mindfulness practices, and emotional wellness.' }
    ]
  },
  {
    id: 'education',
    slug: 'education',
    name: 'Education',
    title: 'Education Stock Photos & Videos | Learning Media | VisuStock',
    description: 'Educational content featuring classrooms, students, e-learning, and academic settings.',
    h1: 'Education & Learning Stock Media',
    seoContent: '<p><strong>Education-focused stock content</strong> for academic and e-learning platforms. From elementary classrooms to university lectures and online courses.</p>',
    searchQueries: ['education', 'school', 'student', 'learning', 'teacher', 'classroom', 'university', 'study'],
    relatedCollections: ['technology', 'business'],
    relatedCategories: ['photo', 'video'],
    faq: [
      { question: 'Are there images of online learning?', answer: 'Yes! Our collection features extensive e-learning content including virtual classrooms.' }
    ]
  },
  {
    id: 'lifestyle',
    slug: 'lifestyle',
    name: 'Lifestyle',
    title: 'Lifestyle Stock Photos | People & Living | VisuStock',
    description: 'Authentic lifestyle content featuring real people, daily life, relationships, and modern living.',
    h1: 'Lifestyle & People Stock Media',
    seoContent: '<p><strong>Authentic lifestyle content</strong> that connects with real audiences. Genuine moments, diverse people, and relatable scenarios.</p>',
    searchQueries: ['lifestyle', 'people', 'family', 'friends', 'home', 'living', 'daily', 'modern'],
    relatedCollections: ['health-wellness', 'food', 'travel'],
    relatedCategories: ['photo', 'video'],
    faq: [
      { question: 'Are the people in images diverse?', answer: 'Yes! We prioritize diverse representation across age, ethnicity, body type, and lifestyle.' }
    ]
  },
  {
    id: 'music',
    slug: 'music-audio',
    name: 'Music & Audio',
    title: 'Royalty-Free Music & Audio | Sound Effects | VisuStock',
    description: 'Professional royalty-free music tracks, sound effects, and audio content.',
    h1: 'Royalty-Free Music & Audio',
    seoContent: '<p><strong>Professional audio content</strong> for multimedia projects. Original compositions, ambient tracks, and sound effects.</p>',
    searchQueries: ['music', 'audio', 'sound', 'soundtrack', 'ambient', 'beats', 'instrumental'],
    relatedCollections: ['technology', 'lifestyle'],
    relatedCategories: ['audio'],
    faq: [
      { question: 'Are music tracks royalty-free?', answer: 'Yes! All audio content includes royalty-free licensing for your projects.' }
    ]
  },
  {
    id: 'abstract',
    slug: 'abstract-backgrounds',
    name: 'Abstract & Backgrounds',
    title: 'Abstract Backgrounds & Textures | Design Assets | VisuStock',
    description: 'Creative abstract visuals, backgrounds, textures, and patterns.',
    h1: 'Abstract Backgrounds & Textures',
    seoContent: '<p><strong>Creative abstract content</strong> for designers. Stunning backgrounds, seamless patterns, textures, and abstract art.</p>',
    searchQueries: ['abstract', 'background', 'texture', 'pattern', 'gradient', 'geometric', 'design'],
    relatedCollections: ['technology'],
    relatedCategories: ['photo', 'vector', 'video'],
    faq: [
      { question: 'Are backgrounds available in multiple resolutions?', answer: 'Yes! Most backgrounds are available in 4K resolution.' }
    ]
  }
];

function getCollection(slug: string): SEOCollection | undefined {
  return collections.find(c => c.slug === slug);
}

function buildCollectionHtml(opts: {
  collection: SEOCollection;
  products: Product[];
  allCollections: SEOCollection[];
  canonicalUrl: string;
  supabaseUrl: string;
}): string {
  const { collection, products, allCollections, canonicalUrl, supabaseUrl } = opts;
  
  const breadcrumbs = [
    { name: "Home", url: `${SITE_URL}${STATIC_PREFIX}` },
    { name: "Collections", url: `${SITE_URL}${STATIC_PREFIX}/collections` },
    { name: collection.name, url: canonicalUrl },
  ];

  // Build JSON-LD schema
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${canonicalUrl}#collection`,
        name: collection.h1,
        url: canonicalUrl,
        description: collection.description,
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

  // FAQ Schema
  const faqSchema = collection.faq.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: collection.faq.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer }
    }))
  } : null;

  const breadcrumbHtml = breadcrumbs.map((b, i) => 
    `<a href="${b.url}">${esc(b.name)}</a>${i < breadcrumbs.length - 1 ? ' › ' : ''}`
  ).join('');

  // Products grid
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
            ${p.price ? `<span class="price">€${p.price}</span>` : '<span class="price">Free</span>'}
          </div>
        </a>
      </article>
    `;
  }).join('');

  // Related collections
  const relatedHtml = collection.relatedCollections
    .map(slug => allCollections.find(c => c.slug === slug))
    .filter(Boolean)
    .map(c => `<a href="${SITE_URL}${STATIC_PREFIX}/collections/${c!.slug}" class="related-link">${esc(c!.name)}</a>`)
    .join(' · ');

  // All collections sidebar
  const sidebarHtml = allCollections.map(c => 
    `<a href="${SITE_URL}${STATIC_PREFIX}/collections/${c.slug}" class="${c.slug === collection.slug ? 'active' : ''}">${esc(c.name)}</a>`
  ).join('\n');

  // FAQ section
  const faqHtml = collection.faq.length
    ? `<section class="faq"><h2>Frequently Asked Questions</h2>${collection.faq.map(faq => 
        `<details><summary>${esc(faq.question)}</summary><p>${esc(faq.answer)}</p></details>`
      ).join('')}</section>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(collection.title)}</title>
  <meta name="description" content="${esc(collection.description)}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="robots" content="index, follow">
  
  <meta property="og:title" content="${esc(collection.title)}">
  <meta property="og:description" content="${esc(collection.description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="VisuStock">
  
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(collection.title)}">
  <meta name="twitter:description" content="${esc(collection.description)}">
  
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  ${faqSchema ? `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>` : ''}
  
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
    
    .breadcrumb { padding: 1rem 2rem; color: var(--muted); font-size: 0.875rem; }
    .breadcrumb a { color: var(--muted); }
    
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
    
    .content h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .content .meta { color: var(--muted); margin-bottom: 1rem; }
    .content .related { color: var(--muted); margin-bottom: 2rem; font-size: 0.875rem; }
    .related-link { color: var(--primary); }
    
    .seo-content {
      background: var(--card);
      padding: 1.5rem;
      border-radius: 0.5rem;
      margin-bottom: 2rem;
      border: 1px solid var(--border);
    }
    .seo-content p { margin-bottom: 1rem; color: var(--muted); }
    .seo-content strong { color: var(--text); }
    
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
    .product-card:hover { transform: translateY(-4px); border-color: var(--primary); }
    .product-card a { display: block; color: inherit; }
    .product-card a:hover { text-decoration: none; }
    .product-card img { width: 100%; aspect-ratio: 3/2; object-fit: cover; }
    .product-card-info { padding: 1rem; }
    .product-card h3 { font-size: 1rem; margin-bottom: 0.5rem; }
    .product-card .price { color: var(--primary); font-weight: 600; }
    
    .faq { margin-top: 3rem; background: var(--card); padding: 2rem; border-radius: 1rem; border: 1px solid var(--border); }
    .faq h2 { margin-bottom: 1rem; }
    .faq details { margin-bottom: 1rem; }
    .faq summary { cursor: pointer; font-weight: 600; padding: 0.5rem 0; }
    .faq p { color: var(--muted); padding: 0.5rem 0; }
    
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
    
    .empty { text-align: center; padding: 4rem; color: var(--muted); }
    
    .footer {
      margin-top: 4rem;
      padding: 2rem;
      background: var(--card);
      border-top: 1px solid var(--border);
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
      <a href="${SITE_URL}${STATIC_PREFIX}/collections">Collections</a>
      <a href="${SITE_URL}${STATIC_PREFIX}/categories">Categories</a>
      <a href="${SITE_URL}/cart">Cart</a>
    </nav>
  </header>
  
  <nav class="breadcrumb" aria-label="Breadcrumb">${breadcrumbHtml}</nav>
  
  <main class="main">
    <aside class="sidebar">
      <h2>All Collections</h2>
      ${sidebarHtml}
    </aside>
    
    <section class="content">
      <h1>${esc(collection.h1)}</h1>
      <p class="meta">${products.length} items in this collection</p>
      ${relatedHtml ? `<p class="related">Related: ${relatedHtml}</p>` : ''}
      
      <div class="seo-content">${collection.seoContent}</div>
      
      ${products.length > 0 ? `
        <div class="products-grid">${productsHtml}</div>
      ` : `
        <div class="empty">
          <p>No items found in this collection yet.</p>
          <a href="${SITE_URL}/marketplace" class="spa-link">Browse All Content</a>
        </div>
      `}
      
      <a href="${SITE_URL}/marketplace?theme=${collection.slug}" class="spa-link">Explore in App →</a>
      
      ${faqHtml}
    </section>
  </main>
  
  <footer class="footer">
    <nav class="footer-nav">
      <a href="${SITE_URL}${STATIC_PREFIX}">Home</a>
      <a href="${SITE_URL}${STATIC_PREFIX}/collections">Collections</a>
      <a href="${SITE_URL}${STATIC_PREFIX}/categories">Categories</a>
      <a href="${SITE_URL}/about">About</a>
      <a href="${SITE_URL}/contact">Contact</a>
    </nav>
    <p class="footer-copy">&copy; ${new Date().getFullYear()} VisuStock. All rights reserved.</p>
  </footer>
</body>
</html>`;
}

function buildCollectionsIndexHtml(allCollections: SEOCollection[]): string {
  const canonicalUrl = `${SITE_URL}${STATIC_PREFIX}/collections`;
  
  const collectionsHtml = allCollections.map(c => `
    <a href="${SITE_URL}${STATIC_PREFIX}/collections/${c.slug}" class="collection-card">
      <h2>${esc(c.name)}</h2>
      <p>${esc(c.description.substring(0, 120))}...</p>
    </a>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Stock Media Collections | VisuStock</title>
  <meta name="description" content="Explore curated collections of stock photos, videos, and audio. Business, technology, nature, travel, and more thematic content for your projects.">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="robots" content="index, follow">
  
  <meta property="og:title" content="Stock Media Collections | VisuStock">
  <meta property="og:description" content="Explore curated collections of stock photos, videos, and audio.">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  
  <style>
    :root { --primary: #6366f1; --bg: #0f0f23; --card: #1a1a2e; --text: #e2e8f0; --muted: #94a3b8; --border: #2d2d44; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
    a { color: var(--primary); text-decoration: none; }
    
    .header { background: var(--card); border-bottom: 1px solid var(--border); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 1.5rem; font-weight: bold; color: var(--text); }
    .nav-links { display: flex; gap: 1.5rem; }
    .nav-links a { color: var(--muted); }
    
    .main { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .main h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    .main .intro { color: var(--muted); margin-bottom: 2rem; max-width: 700px; }
    
    .collections-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
    
    .collection-card {
      display: block;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 2rem;
      color: var(--text);
      transition: transform 0.2s, border-color 0.2s;
    }
    .collection-card:hover { transform: translateY(-4px); border-color: var(--primary); text-decoration: none; }
    .collection-card h2 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    .collection-card p { color: var(--muted); font-size: 0.875rem; }
    
    .footer { margin-top: 4rem; padding: 2rem; background: var(--card); text-align: center; }
    .footer-nav a { margin: 0 1rem; color: var(--muted); }
    .footer-copy { color: var(--muted); font-size: 0.875rem; margin-top: 1rem; }
  </style>
</head>
<body>
  <header class="header">
    <a href="${SITE_URL}" class="logo">VisuStock</a>
    <nav class="nav-links">
      <a href="${SITE_URL}${STATIC_PREFIX}/categories">Categories</a>
      <a href="${SITE_URL}/cart">Cart</a>
    </nav>
  </header>
  
  <main class="main">
    <h1>Curated Collections</h1>
    <p class="intro">Discover hand-picked thematic collections of stock photos, videos, and audio. Each collection is curated to help you find the perfect content for your specific project needs.</p>
    
    <div class="collections-grid">
      ${collectionsHtml}
    </div>
  </main>
  
  <footer class="footer">
    <nav class="footer-nav">
      <a href="${SITE_URL}${STATIC_PREFIX}">Home</a>
      <a href="${SITE_URL}${STATIC_PREFIX}/categories">Categories</a>
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
    
    console.log(`[static-collection] Serving slug: ${slug || 'index'}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If no slug, return collections index
    if (!slug) {
      return new Response(buildCollectionsIndexHtml(collections), {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
      });
    }

    const collection = getCollection(slug);
    if (!collection) {
      return new Response("Collection not found", { status: 404, headers: corsHeaders });
    }

    // Build search query from collection's search terms
    const searchTerms = collection.searchQueries.join(' | ');
    
    // Fetch products matching search queries
    const { data: products } = await supabase
      .from("content_submissions")
      .select("id, title, slug, price, content_files(thumbnail_path)")
      .eq("status", "approved")
      .not("slug", "is", null)
      .or(`title.ilike.%${collection.searchQueries[0]}%,description.ilike.%${collection.searchQueries[0]}%,tags.cs.{${collection.searchQueries[0]}}`)
      .order("created_at", { ascending: false })
      .limit(48);

    const mappedProducts: Product[] = (products || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: p.price,
      thumbnail: p.content_files?.[0]?.thumbnail_path,
    }));

    const canonicalUrl = `${SITE_URL}${STATIC_PREFIX}/collections/${slug}`;
    
    return new Response(
      buildCollectionHtml({
        collection,
        products: mappedProducts,
        allCollections: collections,
        canonicalUrl,
        supabaseUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=1800" } }
    );

  } catch (error) {
    console.error("[static-collection] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
