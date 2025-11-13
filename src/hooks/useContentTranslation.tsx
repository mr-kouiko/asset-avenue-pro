import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface TranslationResult {
  title: string;
  description: string;
  tags: string[];
  timestamp: number;
}

interface TranslationCache {
  [key: string]: TranslationResult;
}

// Cache translations for 1 hour
const CACHE_DURATION = 60 * 60 * 1000;
const RATE_LIMIT_MS = 500; // throttle: one call every 500ms

// In-memory cache and control flags
const translationCache: TranslationCache = {};
let translationsDisabled = false; // Global circuit breaker
let failureCount = 0;
const MAX_FAILURES = 3; // Disable after 3 consecutive failures

// Global throttling and de-duplication
const inFlight = new Map<string, Promise<TranslationResult>>();
let globalQueue: Promise<void> = Promise.resolve();
let lastStartTime = 0;

const storageKeyFor = (cacheKey: string) => `t_cache_${cacheKey}`;

function getCacheKey(id: string, language: string) {
  return `${id}-${language}`;
}

function getFromStorage(cacheKey: string): TranslationResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKeyFor(cacheKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TranslationResult;
    if (!parsed?.timestamp) return null;
    if (Date.now() - parsed.timestamp > CACHE_DURATION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setToStorage(cacheKey: string, value: TranslationResult) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKeyFor(cacheKey), JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

async function enqueueRateLimited<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    globalQueue = globalQueue.then(async () => {
      const now = Date.now();
      const wait = Math.max(0, RATE_LIMIT_MS - (now - lastStartTime));
      if (wait > 0) {
        await new Promise((r) => setTimeout(r, wait));
      }
      lastStartTime = Date.now();
      try {
        const res = await fn();
        resolve(res);
      } catch (e) {
        reject(e);
      }
    });
  });
}

export const useContentTranslation = () => {
  const { language } = useLanguage();
  const [isTranslating, setIsTranslating] = useState(false);

  const getCachedTranslation = useCallback(
    (id: string, title: string, description: string, tags: string[]): TranslationResult | undefined => {
      const cacheKey = getCacheKey(id, language);
      // in-memory first
      const mem = translationCache[cacheKey];
      if (mem && Date.now() - mem.timestamp < CACHE_DURATION) return mem;
      // storage fallback
      const stored = getFromStorage(cacheKey);
      if (stored) {
        translationCache[cacheKey] = stored;
        return stored;
      }
      return undefined;
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
      const cacheKey = getCacheKey(id, language);

      // Cache: memory or storage
      const cached = getCachedTranslation(id, title, description, tags);
      if (cached) return cached;

      // Circuit breaker
      if (translationsDisabled) {
        return { title, description, tags, timestamp: Date.now() };
      }

      // De-duplicate same request
      const existing = inFlight.get(cacheKey);
      if (existing) {
        try {
          const res = await existing;
          return res;
        } catch {
          return { title, description, tags, timestamp: Date.now() };
        }
      }

      // Wrap the network call in the rate-limited queue
      const promise = enqueueRateLimited(async () => {
        setIsTranslating(true);
        const { data, error } = await supabase.functions.invoke('translate-content', {
          body: {
            title,
            description,
            tags,
            targetLanguage: language,
          },
        });

        if (error) throw error;

        if (data?.success && data?.translation) {
          // Reset failure count on success
          failureCount = 0;

          const result: TranslationResult = {
            title: data.translation.translated_title,
            description: data.translation.translated_description,
            tags: data.translation.translated_tags,
            timestamp: Date.now(),
          };
          translationCache[cacheKey] = result;
          setToStorage(cacheKey, result);
          return result;
        }

        // Fallback if unexpected response
        return { title, description, tags, timestamp: Date.now() };
      })
        .catch((error: any) => {
          failureCount++;
          // Only log first few errors to avoid console spam
          if (!translationsDisabled && failureCount <= MAX_FAILURES) {
            console.error('Translation error:', error);
          }

          // Disable on quota/credits errors or too many failures
          const msg = typeof error === 'string' ? error : error?.message || '';
          const serialized = JSON.stringify(error || {});
          if (
            failureCount >= MAX_FAILURES ||
            (error && (error as any).status === 402) ||
            msg.toLowerCase().includes('not enough credits') ||
            serialized.includes('payment_required') ||
            serialized.includes('402')
          ) {
            if (!translationsDisabled) {
              console.warn('🚫 Translations disabled due to errors');
              translationsDisabled = true;
            }
          }
          return { title, description, tags, timestamp: Date.now() };
        })
        .finally(() => {
          inFlight.delete(cacheKey);
          setIsTranslating(false);
        });

      inFlight.set(cacheKey, promise);
      return promise;
    },
    [language, getCachedTranslation]
  );

  const translateBatch = useCallback(
    async (
      items: Array<{ id: string; title: string; description: string; tags: string[] }>
    ): Promise<Record<string, TranslationResult>> => {
      const results: Record<string, TranslationResult> = {};

      // Filter to only items not already cached
      const toProcess = items.filter(
        (it) => !getCachedTranslation(it.id, it.title, it.description, it.tags)
      );

      // Nothing to translate
      if (toProcess.length === 0) return results;

      for (const it of toProcess) {
        const res = await translateContent(it.id, it.title, it.description, it.tags);
        results[it.id] = res;
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
