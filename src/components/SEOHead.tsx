import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES, parseLangFromPath, localizePath, type Language } from '@/i18n';
import { publicUrl } from '@/utils/publicUrl';

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

const SITE_URL = 'https://visustock.com';

const OG_LOCALES: Record<Language, string> = {
  en: 'en_US',
  fr: 'fr_FR',
  es: 'es_ES',
  de: 'de_DE',
  pt: 'pt_PT',
};

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
  currency = 'USD',
}: SEOHeadProps) => {
  const { language } = useLanguage();

  useEffect(() => {
    document.title = `${title} | VisuStock`;

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

    updateMetaTag('description', description, false);
    if (author) updateMetaTag('author', author, false);
    if (tags.length > 0) updateMetaTag('keywords', tags.join(', '), false);

    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:type', type);

    if (url) updateMetaTag('og:url', url);

    if (image) {
      updateMetaTag('og:image', image);
      updateMetaTag('og:image:alt', title);
      updateMetaTag('og:image:width', '1200');
      updateMetaTag('og:image:height', '630');
    }

    updateMetaTag('og:site_name', 'VisuStock');
    updateMetaTag('og:locale', OG_LOCALES[language] || 'en_US');

    // og:locale:alternate for other languages
    document.querySelectorAll('meta[property="og:locale:alternate"]').forEach((n) => n.remove());
    SUPPORTED_LANGUAGES.filter((l) => l !== language).forEach((l) => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:locale:alternate');
      m.content = OG_LOCALES[l];
      document.head.appendChild(m);
    });

    // hreflang alternates + canonical
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const { rest } = parseLangFromPath(currentPath);

    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove());
    SUPPORTED_LANGUAGES.forEach((l) => {
      const link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', l);
      link.setAttribute('href', `${SITE_URL}${localizePath(rest, l)}`);
      document.head.appendChild(link);
    });
    const xDefault = document.createElement('link');
    xDefault.setAttribute('rel', 'alternate');
    xDefault.setAttribute('hreflang', 'x-default');
    xDefault.setAttribute('href', `${SITE_URL}${rest}`);
    document.head.appendChild(xDefault);

    // canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.href = url || `${SITE_URL}${localizePath(rest, language)}`;

    // Twitter
    updateMetaTag('twitter:card', image ? 'summary_large_image' : 'summary', false);
    updateMetaTag('twitter:title', title, false);
    updateMetaTag('twitter:description', description, false);
    if (image) {
      updateMetaTag('twitter:image', image, false);
      updateMetaTag('twitter:image:alt', title, false);
    }

    if (type === 'article' || type === 'product') {
      if (author) updateMetaTag('article:author', author);
      if (publishedTime) updateMetaTag('article:published_time', publishedTime);
    }

    if (type === 'product' && price !== undefined) {
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: title,
        description,
        image,
        url,
        brand: { '@type': 'Brand', name: 'VisuStock' },
        offers: {
          '@type': 'Offer',
          price,
          priceCurrency: currency,
          availability: 'https://schema.org/InStock',
          url,
        },
        ...(author && { creator: { '@type': 'Person', name: author } }),
        ...(tags.length > 0 && { keywords: tags.join(', ') }),
      };
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) existingScript.remove();
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    return () => {
      document.title = 'VisuStock - Creative Content Marketplace';
    };
  }, [title, description, image, url, type, author, publishedTime, tags, price, currency, language]);

  return null;
};
