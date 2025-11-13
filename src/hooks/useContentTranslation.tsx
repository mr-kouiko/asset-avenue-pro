import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface TranslationResult {
  title: string;
  description: string;
  tags: string[];
}

// In-memory cache for faster access
const translationCache = new Map<string, TranslationResult>();

// Free translation using LibreTranslate
async function translateWithLibreTranslate(text: string, targetLang: string): Promise<string> {
  if (!text || text.trim() === '') return text;
  
  try {
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'auto',
        target: targetLang,
        format: 'text'
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.translatedText || text;
  } catch (error) {
    console.warn('LibreTranslate error:', error);
    return text; // Return original on error
  }
}

export const useContentTranslation = () => {
  const { language } = useLanguage();
  const [isTranslating, setIsTranslating] = useState(false);

  const getCachedTranslation = useCallback(
    (id: string): TranslationResult | undefined => {
      const cacheKey = `${id}_${language}`;
      return translationCache.get(cacheKey);
    },
    [language]
  );

  const translateContent = useCallback(
    async (
      id: string,
      title: string,
      description: string,
      tags: string[]
    ): Promise<TranslationResult> => {
      const cacheKey = `${id}_${language}`;

      // Check in-memory cache first
      const cached = translationCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Check database
      try {
        const { data: existing } = await supabase
          .from('product_translations')
          .select('*')
          .eq('product_id', id)
          .eq('language', language)
          .maybeSingle();

        if (existing) {
          const result: TranslationResult = {
            title: existing.title || title,
            description: existing.description || description,
            tags: (existing.tags as string[]) || tags,
          };
          translationCache.set(cacheKey, result);
          return result;
        }
      } catch (error) {
        console.warn('Error fetching translation from DB:', error);
      }

      // If not in cache or DB, translate using LibreTranslate
      setIsTranslating(true);
      try {
        const translatedTitle = await translateWithLibreTranslate(title, language);
        const translatedDescription = description 
          ? await translateWithLibreTranslate(description, language)
          : '';

        const result: TranslationResult = {
          title: translatedTitle,
          description: translatedDescription,
          tags, // Tags remain as-is for now
        };

        // Store in cache
        translationCache.set(cacheKey, result);

        // Store in database (fire and forget)
        supabase
          .from('product_translations')
          .upsert({
            product_id: id,
            language,
            title: translatedTitle,
            description: translatedDescription,
            tags: tags || [],
          })
          .then(({ error }) => {
            if (error) console.warn('Error storing translation:', error);
          });

        return result;
      } catch (error) {
        console.warn('Translation failed:', error);
        // Return original on error
        return { title, description, tags };
      } finally {
        setIsTranslating(false);
      }
    },
    [language]
  );

  const translateBatch = useCallback(
    async (
      items: Array<{ id: string; title: string; description: string; tags: string[] }>
    ): Promise<Record<string, TranslationResult>> => {
      const results: Record<string, TranslationResult> = {};

      // Filter to only items not already cached
      const toTranslate = items.filter((item) => !getCachedTranslation(item.id));

      if (toTranslate.length === 0) return results;

      // Translate one by one to avoid rate limits
      for (const item of toTranslate) {
        try {
          const result = await translateContent(item.id, item.title, item.description, item.tags);
          results[item.id] = result;
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.warn(`Translation failed for ${item.id}:`, error);
          results[item.id] = { title: item.title, description: item.description, tags: item.tags };
        }
      }

      return results;
    },
    [translateContent, getCachedTranslation]
  );

  return {
    translateContent,
    translateBatch,
    getCachedTranslation,
    isTranslating,
    currentLanguage: language,
  };
};
