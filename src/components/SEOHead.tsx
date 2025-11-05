import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  tags?: string[];
  price?: number;
  currency?: string;
}

export const SEOHead = ({
  title,
  description,
  image,
  url,
  type = 'product',
  author,
  publishedTime,
  tags = [],
  price,
  currency = 'EUR',
}: SEOHeadProps) => {
  useEffect(() => {
    // Update document title
    document.title = `${title} | VisuStock`;

    // Update or create meta tags
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

    // Basic meta tags
    updateMetaTag('description', description, false);
    if (author) {
      updateMetaTag('author', author, false);
    }
    if (tags.length > 0) {
      updateMetaTag('keywords', tags.join(', '), false);
    }

    // Open Graph meta tags
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:type', type);
    
    if (url) {
      updateMetaTag('og:url', url);
    }
    
    if (image) {
      updateMetaTag('og:image', image);
      updateMetaTag('og:image:alt', title);
      updateMetaTag('og:image:width', '1200');
      updateMetaTag('og:image:height', '630');
    }

    updateMetaTag('og:site_name', 'VisuStock');
    updateMetaTag('og:locale', 'fr_FR');

    // Twitter Card meta tags
    updateMetaTag('twitter:card', image ? 'summary_large_image' : 'summary', false);
    updateMetaTag('twitter:title', title, false);
    updateMetaTag('twitter:description', description, false);
    
    if (image) {
      updateMetaTag('twitter:image', image, false);
      updateMetaTag('twitter:image:alt', title, false);
    }

    // Article/Product specific meta tags
    if (type === 'article' || type === 'product') {
      if (author) {
        updateMetaTag('article:author', author);
      }
      if (publishedTime) {
        updateMetaTag('article:published_time', publishedTime);
      }
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
        "url": url,
        "brand": {
          "@type": "Brand",
          "name": "VisuStock"
        },
        "offers": {
          "@type": "Offer",
          "price": price,
          "priceCurrency": currency,
          "availability": "https://schema.org/InStock",
          "url": url,
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

      // Remove existing structured data
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        existingScript.remove();
      }

      // Add new structured data
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    // Cleanup function to reset to default values when component unmounts
    return () => {
      document.title = 'VisuStock - Creative Content Marketplace';
    };
  }, [title, description, image, url, type, author, publishedTime, tags, price, currency]);

  return null; // This component doesn't render anything
};
