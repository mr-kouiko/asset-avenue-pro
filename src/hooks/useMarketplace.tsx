import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

export interface MarketplaceContent {
  id: string;
  slug?: string;
  title: string;
  author: string;
  price: number;
  isFree?: boolean;
  type: 'photo' | 'video' | 'audio' | 'pdf' | 'ebook' | 'vfx';
  thumbnail: string;
  videoUrl?: string;
  audioUrl?: string;
  coverUrl?: string;
  likes: number;
  downloads: number;
  isLiked?: boolean;
  category_id?: string;
  tags?: string[];
  duration?: string;
  bpm?: number;
  created_at?: string;
  original_language?: string;
  isAiGenerated?: boolean;
  isVector?: boolean;
}

export interface MarketplaceFilters {
  category?: string;
  searchQuery?: string;
  subjectTags?: string[];
  styleTags?: string[];
  useCaseTags?: string[];
  orientationTags?: string[];
  colorTags?: string[];
  effectTags?: string[];
  platformTags?: string[];
  aiGenerated?: boolean | null;
  freeOnly?: boolean;
  priceMin?: number | null;
  priceMax?: number | null;
  withPeople?: boolean | null;
  sortBy?: string;
  page?: number;
}

export const PAGE_SIZE = 40;

// Category slug to UUID mapping
const categorySlugToId: Record<string, string> = {
  'photo': 'e6eb8946-abab-4a0b-9249-da012b7a87af',
  'video': 'b4fe5f6a-554b-4409-8eaa-71c87d225b33',
  'audio': '0b9e322e-cecb-494f-ba8d-c5397e913b99',
  'vector': 'ceca4e62-559c-4dc6-98fe-64017d537192',
  'ebook': '9ec96e29-199f-4ce2-b951-4ca18c62c87c',
  'vfx': 'f8a21c7e-3d5b-4e9f-a1c2-8b6d9e4f7a3c',
};

// Cache for public URLs
const urlCache = new Map<string, string>();

const buildPublicUrlCached = (bucket: string, path: string): string => {
  const key = `${bucket}:${path}`;
  if (urlCache.has(key)) return urlCache.get(key)!;
  const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  urlCache.set(key, url);
  return url;
};

// ============================================================================
// CONTENT PROCESSING (shared between all fetch paths)
// ============================================================================

const isImagePath = (p?: string) => !!p && /\.(jpg|jpeg|png|webp|gif)$/i.test(p);

const categoryTypeMap: Record<string, 'photo' | 'video' | 'audio' | 'pdf' | 'ebook' | 'vfx'> = {
  'e6eb8946-abab-4a0b-9249-da012b7a87af': 'photo',
  'b4fe5f6a-554b-4409-8eaa-71c87d225b33': 'video',
  '0b9e322e-cecb-494f-ba8d-c5397e913b99': 'audio',
  'ceca4e62-559c-4dc6-98fe-64017d537192': 'photo',
  '9ec96e29-199f-4ce2-b951-4ca18c62c87c': 'ebook',
  'f8a21c7e-3d5b-4e9f-a1c2-8b6d9e4f7a3c': 'vfx',
};

function processMarketplaceData(
  marketplaceData: any[],
  filesBySubmission: Map<string, any[]>,
  creatorMap: Map<string, string>,
  likesMap: Map<string, number>,
  downloadsMap: Map<string, number>,
  translationsMap: Map<string, { title?: string | null; tags?: string[] | null }>
): MarketplaceContent[] {
  return marketplaceData
    .map((item: any) => {
      const files = filesBySubmission.get(item.id) || [];
      const localized = translationsMap.get(item.id);
      if (!files.length) return null;

      const originalFile = files.find((f: any) => f.is_original);

      // Thumbnail
      let thumbnailUrl = '';
      const imageThumb = files.find((f: any) => isImagePath(f.thumbnail_path));
      if (imageThumb?.thumbnail_path) {
        thumbnailUrl = imageThumb.thumbnail_path.startsWith('http')
          ? imageThumb.thumbnail_path
          : buildPublicUrlCached('thumbnails', imageThumb.thumbnail_path);
      }
      if (!thumbnailUrl) {
        const imagePreview = files.find((f: any) => isImagePath(f.preview_path));
        if (imagePreview?.preview_path) {
          thumbnailUrl = imagePreview.preview_path.startsWith('http')
            ? imagePreview.preview_path
            : buildPublicUrlCached('previews', imagePreview.preview_path);
        }
      }
      if (!thumbnailUrl) thumbnailUrl = '/placeholder.svg';

      // Content type
      let contentType: 'photo' | 'video' | 'audio' | 'pdf' | 'ebook' | 'vfx' = 'photo';
      if (item.category_id && categoryTypeMap[item.category_id]) {
        contentType = categoryTypeMap[item.category_id];
      } else if (originalFile) {
        const fileType = originalFile.file_type?.toLowerCase() || '';
        const fileFormat = originalFile.file_format?.toLowerCase() || '';
        if (fileType.includes('video')) contentType = 'video';
        else if (fileType.includes('audio')) contentType = 'audio';
        else if (fileType === 'document' || fileFormat === 'application/pdf') contentType = 'ebook';
      }

      // Media URL — STRICT: video playback requires a watermarked preview_path. No fallback to original.
      let mediaUrl: string | undefined;
      if (contentType === 'video') {
        const fileWithPreview = files.find((f: any) => f.preview_path);
        if (fileWithPreview?.preview_path) {
          mediaUrl = fileWithPreview.preview_path.startsWith('http')
            ? fileWithPreview.preview_path
            : buildPublicUrlCached('previews', fileWithPreview.preview_path);
        }
        // No fallback: original videos must never be served publicly.
      } else if (contentType === 'audio') {
        // Prefer watermarked preview_path; fall back to original file_path for legacy items.
        const audioPreview = files.find((f: any) => f.preview_path);
        if (audioPreview?.preview_path) {
          mediaUrl = audioPreview.preview_path.startsWith('http')
            ? audioPreview.preview_path
            : buildPublicUrlCached('previews', audioPreview.preview_path);
        } else {
          const originalAudio = files.find((f: any) => f.is_original && f.file_path) || files.find((f: any) => f.file_path);
          if (originalAudio?.file_path) {
            mediaUrl = originalAudio.file_path.startsWith('http')
              ? originalAudio.file_path
              : buildPublicUrlCached('uploads', originalAudio.file_path);
          }
        }
      }

      // VFX video preview
      if (contentType === 'vfx') {
        const videoPreviewFile = files.find((f: any) => f.preview_path?.toLowerCase().endsWith('.mp4'));
        const hasVideoPreviewMetadata = files.find((f: any) =>
          f.metadata && typeof f.metadata === 'object' && 'previewMediaType' in f.metadata && f.metadata.previewMediaType === 'video'
        );
        const vfxVideoFile = videoPreviewFile || hasVideoPreviewMetadata;
        if (vfxVideoFile?.preview_path) {
          mediaUrl = vfxVideoFile.preview_path.startsWith('http')
            ? vfxVideoFile.preview_path
            : buildPublicUrlCached('previews', vfxVideoFile.preview_path);
        }
      }

      // Cover URL for ebooks
      let coverUrl: string | undefined;
      if (contentType === 'ebook') {
        if (thumbnailUrl && thumbnailUrl !== '/placeholder.svg') coverUrl = thumbnailUrl;
        if (!coverUrl) {
          const coverFile = files.find((f: any) =>
            f.file_name?.toLowerCase().includes('cover') ||
            (f.metadata && typeof f.metadata === 'object' && 'isCover' in f.metadata) ||
            (f.file_type?.startsWith('image/') && f.id !== originalFile?.id)
          );
          if (coverFile?.file_path) {
            coverUrl = coverFile.file_path.startsWith('http')
              ? coverFile.file_path
              : buildPublicUrlCached('uploads', coverFile.file_path);
          }
        }
      }

      const isAiGenerated = originalFile?.metadata && typeof originalFile.metadata === 'object' &&
        ('isAiGenerated' in originalFile.metadata ? originalFile.metadata.isAiGenerated === true : false);

      const isVector = (() => {
        const fileName = (originalFile?.file_name || originalFile?.file_path || '').toLowerCase();
        const fileType = (originalFile?.file_type || '').toLowerCase();
        const fileFormat = (originalFile?.file_format || '').toLowerCase();
        return fileName.endsWith('.svg') || fileType.includes('svg') || fileFormat.includes('svg') ||
          fileType.includes('vector') || fileFormat.includes('vector');
      })();

      return {
        id: item.id,
        slug: item.slug,
        title: localized?.title || item.title || 'Untitled',
        author: creatorMap.get(item.creator_id) || 'Anonymous Store',
        price: item.price ?? 0,
        isFree: item.price === 0,
        type: contentType,
        thumbnail: thumbnailUrl,
        videoUrl: (contentType === 'video' || contentType === 'vfx') ? mediaUrl : undefined,
        audioUrl: contentType === 'audio' ? mediaUrl : undefined,
        coverUrl: coverUrl || (contentType === 'ebook' ? thumbnailUrl : undefined),
        likes: likesMap.get(item.id) || 0,
        downloads: downloadsMap.get(item.id) || 0,
        category_id: item.category_id,
        tags: localized?.tags || item.tags || [],
        created_at: item.created_at,
        duration: originalFile?.metadata && typeof originalFile.metadata === 'object' && 'duration' in originalFile.metadata
          ? originalFile.metadata.duration as string : undefined,
        bpm: originalFile?.metadata && typeof originalFile.metadata === 'object' && 'bpm' in originalFile.metadata
          ? originalFile.metadata.bpm as number : undefined,
        isAiGenerated,
        isVector,
      } as MarketplaceContent;
    })
    .filter((item): item is MarketplaceContent => item !== null);
}

// ============================================================================
// HOOK
// ============================================================================

export const useMarketplace = (filters: MarketplaceFilters = {}) => {
  const { language } = useLanguage();
  const [content, setContent] = useState<MarketplaceContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const abortRef = useRef(0);

  const fetchContent = useCallback(async (currentFilters: MarketplaceFilters) => {
    const fetchId = ++abortRef.current;
    setLoading(true);

    try {
      const page = currentFilters.page || 1;
      const offset = (page - 1) * PAGE_SIZE;

      const categoryId = currentFilters.category && currentFilters.category !== 'all'
        ? categorySlugToId[currentFilters.category] || null
        : null;

      const { data: rpcData, error } = await (supabase.rpc as any)('search_marketplace', {
        p_category_id: categoryId,
        p_search: currentFilters.searchQuery?.trim() || null,
        p_subject_tags: currentFilters.subjectTags?.length ? currentFilters.subjectTags : null,
        p_style_tags: currentFilters.styleTags?.length ? currentFilters.styleTags : null,
        p_use_case_tags: currentFilters.useCaseTags?.length ? currentFilters.useCaseTags : null,
        p_orientation_tags: currentFilters.orientationTags?.length ? currentFilters.orientationTags : null,
        p_color_tags: currentFilters.colorTags?.length ? currentFilters.colorTags : null,
        p_effect_tags: currentFilters.effectTags?.length ? currentFilters.effectTags : null,
        p_platform_tags: currentFilters.platformTags?.length ? currentFilters.platformTags : null,
        p_ai_generated: currentFilters.aiGenerated ?? null,
        p_free_only: currentFilters.freeOnly || false,
        p_price_min: currentFilters.priceMin ?? null,
        p_price_max: currentFilters.priceMax ?? null,
        p_with_people: currentFilters.withPeople ?? null,
        p_sort: currentFilters.sortBy || 'recent',
        p_offset: offset,
        p_limit: PAGE_SIZE,
      });

      // Abort if a newer fetch started
      if (fetchId !== abortRef.current) return;

      if (error) {
        console.error('❌ [MARKETPLACE] RPC error:', error);
        setContent([]);
        setTotalCount(0);
        return;
      }

      if (!rpcData || rpcData.length === 0) {
        setContent([]);
        setTotalCount(0);
        return;
      }

      const total = Number(rpcData[0]?.total_count || 0);
      setTotalCount(total);

      // Parallel fetch: creators, files, likes, downloads
      const submissionIds = rpcData.map((item: any) => item.id);
      const creatorIds = [...new Set(rpcData.map((item: any) => item.creator_id))];

      const [creatorsResult, filesResult, likesResult, downloadsResult, translationsResult] = await Promise.all([
        supabase.rpc('get_creator_public_info', { creator_ids: creatorIds as string[] }),
        supabase
          .from('content_files')
          .select('id, submission_id, file_name, file_path, file_type, file_format, is_original, is_preview, preview_path, thumbnail_path, metadata')
          .in('submission_id', submissionIds),
        (supabase as any).from('content_like_counts').select('submission_id, like_count').in('submission_id', submissionIds),
        supabase.from('downloads').select('submission_id').in('submission_id', submissionIds),
        language === 'en'
          ? Promise.resolve({ data: [] })
          : supabase
              .from('product_translations')
              .select('product_id, title, tags')
              .eq('language', language)
              .in('product_id', submissionIds),
      ]);

      if (fetchId !== abortRef.current) return;

      const creatorMap = new Map((creatorsResult.data as any[])?.map(c => [c.user_id, c.store_name || c.display_name]) || []);

      const filesBySubmission = new Map<string, any[]>();
      (filesResult.data || []).forEach((file: any) => {
        const existing = filesBySubmission.get(file.submission_id) || [];
        filesBySubmission.set(file.submission_id, [...existing, file]);
      });

      const likesMap = new Map<string, number>();
      (likesResult.data || []).forEach((row: any) => {
        likesMap.set(row.submission_id, Number(row.like_count) || 0);
      });

      const downloadsMap = new Map<string, number>();
      (downloadsResult.data || []).forEach((row: any) => {
        downloadsMap.set(row.submission_id, (downloadsMap.get(row.submission_id) || 0) + 1);
      });

      const translationsMap = new Map<string, { title?: string | null; tags?: string[] | null }>();
      (translationsResult.data || []).forEach((row: any) => {
        translationsMap.set(row.product_id, {
          title: row.title,
          tags: Array.isArray(row.tags) ? row.tags : [],
        });
      });

      const processed = processMarketplaceData(rpcData, filesBySubmission, creatorMap, likesMap, downloadsMap, translationsMap);
      setContent(processed);
    } catch (err) {
      console.error('Error fetching marketplace:', err);
      if (fetchId === abortRef.current) {
        setContent([]);
        setTotalCount(0);
      }
    } finally {
      if (fetchId === abortRef.current) {
        setLoading(false);
      }
    }
  }, [language]);

  // Refetch when filters change
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    fetchContent(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  return {
    content,
    loading,
    totalCount,
    totalPages: Math.ceil(totalCount / PAGE_SIZE),
    refreshContent: () => fetchContent(filters),
  };
};
