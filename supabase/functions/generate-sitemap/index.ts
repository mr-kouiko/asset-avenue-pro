import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
}

const SITE_URL = 'https://visustock.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch all approved products with slugs
    const { data: products, error } = await supabase
      .from('content_submissions')
      .select('id, slug, updated_at, created_at')
      .eq('status', 'approved')
      .not('slug', 'is', null)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
      throw error
    }

    console.log(`Generating sitemap with ${products?.length || 0} products`)

    // Static pages with priorities
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/marketplace', priority: '0.9', changefreq: 'daily' },
      { url: '/about', priority: '0.7', changefreq: 'monthly' },
      { url: '/contact', priority: '0.6', changefreq: 'monthly' },
      { url: '/packages-pricing', priority: '0.8', changefreq: 'weekly' },
      { url: '/ai-image-generator', priority: '0.8', changefreq: 'weekly' },
      { url: '/buy-credits', priority: '0.7', changefreq: 'weekly' },
      { url: '/support', priority: '0.5', changefreq: 'monthly' },
      { url: '/licenses', priority: '0.6', changefreq: 'monthly' },
      { url: '/terms', priority: '0.3', changefreq: 'yearly' },
      { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
      { url: '/cookie-policy', priority: '0.3', changefreq: 'yearly' },
      { url: '/license-agreement', priority: '0.4', changefreq: 'yearly' },
    ]

    // English versions
    const englishPages = [
      { url: '/en', priority: '1.0', changefreq: 'daily' },
      { url: '/en/about', priority: '0.7', changefreq: 'monthly' },
      { url: '/en/contact', priority: '0.6', changefreq: 'monthly' },
      { url: '/en/terms', priority: '0.3', changefreq: 'yearly' },
      { url: '/en/privacy', priority: '0.3', changefreq: 'yearly' },
      { url: '/en/cookie-policy', priority: '0.3', changefreq: 'yearly' },
      { url: '/en/license-agreement', priority: '0.4', changefreq: 'yearly' },
      { url: '/en/infinity', priority: '0.7', changefreq: 'monthly' },
    ]

    const now = new Date().toISOString().split('T')[0]

    // Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`

    // Add static pages
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`
    }

    // Add English pages
    for (const page of englishPages) {
      xml += `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`
    }

    // Add product pages
    if (products && products.length > 0) {
      for (const product of products) {
        const lastmod = product.updated_at 
          ? new Date(product.updated_at).toISOString().split('T')[0]
          : new Date(product.created_at).toISOString().split('T')[0]
        
        xml += `  <url>
    <loc>${SITE_URL}/products/${product.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`
      }
    }

    xml += `</urlset>`

    console.log('Sitemap generated successfully')

    return new Response(xml, {
      headers: corsHeaders,
      status: 200,
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <priority>1.0</priority>
  </url>
</urlset>`,
      { headers: corsHeaders, status: 200 }
    )
  }
})
