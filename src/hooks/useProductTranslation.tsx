import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ProductTranslation {
  title?: string;
  description?: string;
  tags?: string[];
}

/**
 * Returns localized title/description/tags for a product, falling back to
 * the original (English) values when no translation exists for the current language.
 */
export const useProductTranslation = (
  productId: string | undefined,
  fallback: { title?: string; description?: string; tags?: string[] }
) => {
  const { language } = useLanguage();
  const [translation, setTranslation] = useState<ProductTranslation | null>(null);

  useEffect(() => {
    if (!productId || language === 'en') {
      setTranslation(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('product_translations')
      .select('title, description, tags')
      .eq('product_id', productId)
      .eq('language', language)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setTranslation(data as ProductTranslation | null);
      });
    return () => { cancelled = true; };
  }, [productId, language]);

  return {
    title: translation?.title || fallback.title || '',
    description: translation?.description || fallback.description || '',
    tags: (translation?.tags as string[] | undefined) || fallback.tags || [],
    isTranslated: !!translation,
  };
};
