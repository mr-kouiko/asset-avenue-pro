import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';


export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: {
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
  video_pictures: {
    id: number;
    picture: string;
    nr: number;
  }[];
}

export interface PexelsItem {
  id: string;
  numericId: number;
  title: string;
  photographer: string;
  photographerUrl: string;
  thumbnail: string;
  largeThumbnail: string;
  originalUrl: string;
  pexelsUrl: string;
  type: 'photo' | 'video';
  width: number;
  height: number;
  duration?: number;
  videoUrl?: string;
  alt?: string;
}

interface PexelsSearchParams {
  query: string;
  type: 'photos' | 'videos';
  orientation?: string;
  perPage?: number;
  page?: number;
}

interface CacheEntry {
  data: { items: PexelsItem[]; totalResults: number };
  expiresAt: number;
}

const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
const CACHE_PREFIX = 'pexels_cache_';

function getCacheKey(params: PexelsSearchParams): string {
  return `${CACHE_PREFIX}${params.query || '_curated'}_${params.orientation || 'any'}_${params.type}_p${params.page || 1}`;
}

function getFromCache(key: string): CacheEntry['data'] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setCache(key: string, data: CacheEntry['data']) {
  try {
    const entry: CacheEntry = { data, expiresAt: Date.now() + CACHE_DURATION_MS };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage full — silently ignore
  }
}

function normalizePhoto(photo: PexelsPhoto): PexelsItem {
  return {
    id: `pexels-photo-${photo.id}`,
    numericId: photo.id,
    title: photo.alt || 'Pexels Photo',
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    thumbnail: photo.src.medium,
    largeThumbnail: photo.src.large2x,
    originalUrl: photo.src.original,
    pexelsUrl: photo.url,
    type: 'photo',
    width: photo.width,
    height: photo.height,
    alt: photo.alt,
  };
}

function normalizeVideo(video: PexelsVideo): PexelsItem {
  const hdFile = video.video_files.find(f => f.quality === 'hd') || video.video_files[0];
  return {
    id: `pexels-video-${video.id}`,
    numericId: video.id,
    title: `Video by ${video.user.name}`,
    photographer: video.user.name,
    photographerUrl: video.user.url,
    thumbnail: video.image,
    largeThumbnail: video.image,
    originalUrl: hdFile?.link || '',
    pexelsUrl: video.url,
    type: 'video',
    width: video.width,
    height: video.height,
    duration: video.duration,
    videoUrl: hdFile?.link,
  };
}

// ── Single item fetch (for detail pages) ──────────────────────
export async function fetchPexelsPhotoById(id: number): Promise<PexelsItem | null> {
  const cacheKey = `${CACHE_PREFIX}photo_detail_${id}`;
  const cached = getFromCache(cacheKey);
  if (cached && cached.items.length > 0) return cached.items[0];

  try {
    const { data, error } = await supabase.functions.invoke('pexels-search', {
      body: { type: 'photos', id: String(id) },
    });
    if (error || !data?.id) return null;
    const item = normalizePhoto(data as PexelsPhoto);
    setCache(cacheKey, { items: [item], totalResults: 1 });
    return item;
  } catch {
    return null;
  }
}

export async function fetchPexelsVideoById(id: number): Promise<PexelsItem | null> {
  const cacheKey = `${CACHE_PREFIX}video_detail_${id}`;
  const cached = getFromCache(cacheKey);
  if (cached && cached.items.length > 0) return cached.items[0];

  try {
    const { data, error } = await supabase.functions.invoke('pexels-search', {
      body: { type: 'videos', id: String(id) },
    });
    if (error || !data?.id) return null;
    const item = normalizeVideo(data as PexelsVideo);
    setCache(cacheKey, { items: [item], totalResults: 1 });
    return item;
  } catch {
    return null;
  }
}

// ── Search hook ───────────────────────────────────────────────
export const usePexelsSearch = (params: {
  query: string;
  category: string;
  orientation?: string;
  enabled?: boolean;
}) => {
  const [items, setItems] = useState<PexelsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(0);

  const { query, category, orientation, enabled = true } = params;

  // Determine content type from category
  const pexelsType: 'photos' | 'videos' = category === 'video' ? 'videos' : 'photos';
  const shouldFetch = enabled && (category === 'photo' || category === 'video' || category === 'all');

  const fetchPexels = useCallback(async () => {
    if (!shouldFetch) {
      setItems([]);
      return;
    }

    const fetchId = ++abortRef.current;
    const searchParams: PexelsSearchParams = {
      query: query.trim(),
      type: pexelsType,
      orientation: orientation || undefined,
      perPage: 20,
      page: 1,
    };

    // Check cache first
    const cacheKey = getCacheKey(searchParams);
    const cached = getFromCache(cacheKey);
    if (cached) {
      setItems(cached.items);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const invokeBody: Record<string, string> = {
        type: searchParams.type,
        per_page: String(searchParams.perPage),
        page: String(searchParams.page),
      };
      if (searchParams.query) invokeBody.query = searchParams.query;
      if (searchParams.orientation) invokeBody.orientation = searchParams.orientation;

      const { data, error: invokeError } = await supabase.functions.invoke('pexels-search', {
        body: invokeBody,
      });

      if (fetchId !== abortRef.current) return;
      if (invokeError) throw new Error(invokeError.message || 'Pexels API error');

      let normalized: PexelsItem[] = [];
      if (searchParams.type === 'videos' && data.videos) {
        normalized = data.videos.map(normalizeVideo);
      } else if (data.photos) {
        normalized = data.photos.map(normalizePhoto);
      }

      const result = { items: normalized, totalResults: data.total_results || normalized.length };
      setCache(cacheKey, result);
      setItems(normalized);
    } catch (err: any) {
      if (fetchId === abortRef.current) {
        setError(err.message);
        setItems([]);
      }
    } finally {
      if (fetchId === abortRef.current) setLoading(false);
    }
  }, [shouldFetch, query, pexelsType, orientation]);

  useEffect(() => {
    const timer = setTimeout(fetchPexels, 400);
    return () => clearTimeout(timer);
  }, [fetchPexels]);

  return { items, loading, error };
};
