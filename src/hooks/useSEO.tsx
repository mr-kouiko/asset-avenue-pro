import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface SEOConfig {
  title: string;
  description: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  tags?: string[];
  price?: number;
  currency?: string;
  noindex?: boolean;
}

const DEFAULT_IMAGE = 'https://visustock.com/__l5e/assets-v1/3d772d83-288d-4e75-b369-f849731fa339/og-image.jpg';
const SITE_NAME = 'VisuStock';
const BASE_URL = 'https://visustock.com';

export const useSEO = (config: SEOConfig) => {
  const location = useLocation();
  const { language } = useLanguage();
  const lastConfigRef = useRef<string>('');

  useEffect(() => {
    const {
      title,
      description,
      image = DEFAULT_IMAGE,
      type = 'website',
      author,
      publishedTime,
      tags = [],
      price,
      currency = 'EUR',
      noindex = false
    } = config;

    // GUARD: Only proceed if essential fields are present and valid
    if (!title || !description || title.trim().length === 0 || description.trim().length === 0) {
      console.warn('⚠️ useSEO: Missing or empty title/description, skipping DOM update');
      return;
    }

    // GUARD: Prevent re-execution if config hasn't meaningfully changed
    const configHash = JSON.stringify({ title, description, image, type, price, location: location.pathname, language });
    if (configHash === lastConfigRef.current) {
      return;
    }
    lastConfigRef.current = configHash;

    // Update document title
    document.title = `${title} | ${SITE_NAME}`;

    // Helper function to update or create meta tags
    const updateMetaTag = (property: string, content: string, useProperty = true) => {
      const attribute = useProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${property}"]`) as HTMLMetaElement;
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, property);
        document.head.appendChild(element);
      }
      
      element.content = content;
    };

    // Helper function to update or create link tags
    const updateLinkTag = (rel: string, href: string, hreflang?: string) => {
      const selector = hreflang 
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]:not([hreflang])`;
      
      let element = document.querySelector(selector) as HTMLLinkElement;
      
      if (!element) {
        element = document.createElement('link');
        element.rel = rel;
        if (hreflang) element.hreflang = hreflang;
        document.head.appendChild(element);
      }
      
      element.href = href;
    };

    // Construct full URL - strip query params for canonical
    const pathWithoutParams = location.pathname;
    const fullUrl = `${BASE_URL}${pathWithoutParams}`;

    // Build canonical URL (always without query params for SEO)
    const canonicalUrl = fullUrl;

    // Basic meta tags
    updateMetaTag('description', description, false);
    updateMetaTag('robots', noindex ? 'noindex, follow' : 'index, follow', false);
    updateMetaTag('googlebot', noindex ? 'noindex, follow' : 'index, follow', false);
    
    if (author) {
      updateMetaTag('author', author, false);
    }
    
    if (tags.length > 0) {
      updateMetaTag('keywords', tags.join(', '), false);
    }

    // Canonical URL - self-referencing, always points to clean URL
    updateLinkTag('canonical', canonicalUrl);

    // Hreflang tags for internationalization
    updateLinkTag('alternate', canonicalUrl, 'en');
    updateLinkTag('alternate', canonicalUrl, 'x-default');

    // Open Graph meta tags
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:type', type);
    updateMetaTag('og:url', fullUrl);
    updateMetaTag('og:image', image);
    updateMetaTag('og:image:alt', title);
    updateMetaTag('og:image:width', '1200');
    updateMetaTag('og:image:height', '630');
    updateMetaTag('og:site_name', SITE_NAME);
    updateMetaTag('og:locale', 'en_US');

    // Twitter Card meta tags
    updateMetaTag('twitter:card', image ? 'summary_large_image' : 'summary', false);
    updateMetaTag('twitter:title', title, false);
    updateMetaTag('twitter:description', description, false);
    updateMetaTag('twitter:image', image, false);
    updateMetaTag('twitter:image:alt', title, false);

    // Article/Product specific meta tags
    if (type === 'article' || type === 'product') {
      if (author) {
        updateMetaTag('article:author', author);
      }
      if (publishedTime) {
        updateMetaTag('article:published_time', publishedTime);
      }
      
      // Remove existing article tags
      document.querySelectorAll('meta[property="article:tag"]').forEach(el => el.remove());
      
      // Add new article tags
      tags.forEach(tag => {
        const element = document.createElement('meta');
        element.setAttribute('property', 'article:tag');
        element.content = tag;
        document.head.appendChild(element);
      });
    }

    // Product specific - Schema.org structured data
    if (type === 'product' && price !== undefined) {
      const structuredData = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": title,
        "description": description,
        "image": image,
        "url": fullUrl,
        "brand": {
          "@type": "Brand",
          "name": SITE_NAME
        },
        "offers": {
          "@type": "Offer",
          "price": price,
          "priceCurrency": currency,
          "availability": "https://schema.org/InStock",
          "url": fullUrl,
        },
        ...(author && {
          "creator": {
            "@type": "Person",
            "name": author
          }
        }),
        ...(tags.length > 0 && {
          "keywords": tags.join(', ')
        })
      };

      // Remove only previously-injected dynamic structured data (preserve sitewide Organization schema from index.html)
      const existingScript = document.querySelector('script[type="application/ld+json"][data-seo-dynamic="true"]');
      if (existingScript) {
        existingScript.remove();
      }

      // Add new structured data
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-dynamic', 'true');
      script.text = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    // Article structured data
    if (type === 'article') {
      const articleData = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "image": image,
        "url": fullUrl,
        "mainEntityOfPage": { "@type": "WebPage", "@id": fullUrl },
        "publisher": {
          "@type": "Organization",
          "name": SITE_NAME,
          "logo": { "@type": "ImageObject", "url": `${BASE_URL}/favicon.ico` }
        },
        ...(author && { "author": { "@type": "Person", "name": author } }),
        ...(publishedTime && { "datePublished": publishedTime, "dateModified": publishedTime }),
        ...(tags.length > 0 && { "keywords": tags.join(', ') }),
      };

      const existingScript = document.querySelector('script[type="application/ld+json"][data-seo-dynamic="true"]');
      if (existingScript) existingScript.remove();

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-dynamic', 'true');
      script.text = JSON.stringify(articleData);
      document.head.appendChild(script);
    }

    // Website structured data for non-product pages
    if (type === 'website') {
      const websiteData = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": SITE_NAME,
        "url": BASE_URL,
        "description": description,
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${BASE_URL}/marketplace?search={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      };

      const existingScript = document.querySelector('script[type="application/ld+json"][data-seo-dynamic="true"]');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-dynamic', 'true');
      script.text = JSON.stringify(websiteData);
      document.head.appendChild(script);
    }

    // Cleanup function
    return () => {
      // Reset to default on unmount
      document.title = `${SITE_NAME} - Creative Content Marketplace`;
    };
  }, [config, location, language]);
};
