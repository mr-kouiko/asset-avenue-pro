import { useState, useEffect, useRef } from "react";
import type { PexelsItem } from "@/hooks/usePexelsSearch";

export interface PexelsSEOContent {
  seo_title: string;
  meta_description: string;
  h1: string;
  intro: string;
  main_content: string;
  about_section: { location: string; subject: string; style: string };
  use_cases: string[];
  visual_style: string[];
  keywords: string[];
  internal_links?: {
    related_searches: { label: string; url: string }[];
    category_links: { label: string; url: string }[];
  };
}

const memoryCache = new Map<string, PexelsSEOContent>();

export const usePexelsSEOContent = (item: PexelsItem | null) => {
  const [content, setContent] = useState<PexelsSEOContent | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!item) return;

    const cacheKey = `${item.type}-${item.numericId}`;
    if (fetchedRef.current === cacheKey) return;

    // Check memory cache
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      setContent(cached);
      fetchedRef.current = cacheKey;
      return;
    }

    const fetchSEO = async () => {
      setLoading(true);
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/generate-pexels-seo`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: apiKey,
            },
            body: JSON.stringify({
              pexelsId: item.numericId,
              type: item.type,
              alt: item.alt || item.title,
              photographer: item.photographer,
              width: item.width,
              height: item.height,
              duration: item.duration,
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          if (data.h1) {
            memoryCache.set(cacheKey, data);
            setContent(data);
            fetchedRef.current = cacheKey;
          }
        }
      } catch (err) {
        console.error("Failed to fetch Pexels SEO content:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSEO();
  }, [item]);

  return { content, loading };
};
