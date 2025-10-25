import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface TranslationCache {
  [key: string]: {
    title: string;
    description: string;
    tags: string[];
    timestamp: number;
  };
}

// Cache translations for 1 hour
const CACHE_DURATION = 60 * 60 * 1000;
const translationCache: TranslationCache = {};

// If translation fails (e.g., credits required), disable further attempts to avoid blocking UX
let translationsDisabled = false;
export const useContentTranslation = () => {
  const { language } = useLanguage();
  const [isTranslating, setIsTranslating] = useState(false);

  const translateContent = useCallback(async (
    id: string,
    title: string,
    description: string,
    tags: string[]
  ) => {
    // Check cache first
    const cacheKey = `${id}-${language}`;
    const cached = translationCache[cacheKey];
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached;
    }

    try {
      setIsTranslating(true);

      // If translations are disabled (e.g., due to previous 402), short-circuit
      if (translationsDisabled) {
        return { title, description, tags, timestamp: Date.now() };
      }

      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: {
          title,
          description,
          tags,
          targetLanguage: language
        }
      });

      if (error) throw error;

      if (data?.success && data?.translation) {
        const result = {
          title: data.translation.translated_title,
          description: data.translation.translated_description,
          tags: data.translation.translated_tags,
          timestamp: Date.now()
        };

        // Cache the result
        translationCache[cacheKey] = result;
        
        return result;
      }

      // Return original if translation failed
      return { title, description, tags, timestamp: Date.now() };
    } catch (error) {
      console.error('Translation error:', error);
      // Disable further translation attempts to avoid repeated failures (e.g., 402 Payment Required)
      translationsDisabled = true;
      // Return original content on error
      return { title, description, tags, timestamp: Date.now() };
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  const translateBatch = useCallback(async (
    items: Array<{ id: string; title: string; description: string; tags: string[] }>
  ) => {
    const results = await Promise.all(
      items.map(item => translateContent(item.id, item.title, item.description, item.tags))
    );
    return results;
  }, [translateContent]);

  return {
    translateContent,
    translateBatch,
    isTranslating,
    currentLanguage: language
  };
};
