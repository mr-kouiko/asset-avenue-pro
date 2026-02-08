import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MarketplaceContent {
  id: string;
  slug?: string; // SEO-friendly URL slug
  title: string;
  author: string;
  price: number;
  /** True only when the creator explicitly set the product as free (price = 0 in DB). */
  isFree?: boolean;
  type: 'photo' | 'video' | 'audio' | 'pdf' | 'ebook' | 'vfx';
  thumbnail: string;
  videoUrl?: string;
  audioUrl?: string;
  coverUrl?: string; // For ebooks/PDF
  likes: number;
  downloads: number;
  isLiked?: boolean;
  category_id?: string;
  tags?: string[];
  duration?: string; // Audio duration (e.g., "3:45")
  bpm?: number; // Beats per minute for audio
  created_at?: string; // Upload date for sorting
  original_language?: string; // Original language of the content
  isAiGenerated?: boolean; // AI-generated content flag
  /** True only for real vector assets (SVG). */
  isVector?: boolean;
}


// Throttle duration for focus refetch (5 minutes in milliseconds)
const FOCUS_THROTTLE_MS = 5 * 60 * 1000;

// Category slug to UUID mapping for server-side filtering
const categorySlugToId: Record<string, string> = {
  'photo': 'e6eb8946-abab-4a0b-9249-da012b7a87af',
  'video': 'b4fe5f6a-554b-4409-8eaa-71c87d225b33',
  'audio': '0b9e322e-cecb-494f-ba8d-c5397e913b99',
  'vector': 'ceca4e62-559c-4dc6-98fe-64017d537192',
  'ebook': '9ec96e29-199f-4ce2-b951-4ca18c62c87c',
  'vfx': 'f8a21c7e-3d5b-4e9f-a1c2-8b6d9e4f7a3c',
};

// Cache for public URLs to avoid re-computation
const urlCache = new Map<string, string>();

const buildPublicUrlCached = (bucket: string, path: string): string => {
  const key = `${bucket}:${path}`;
  if (urlCache.has(key)) return urlCache.get(key)!;
  const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  urlCache.set(key, url);
  return url;
};

export const useMarketplace = (initialLimit = 200, categoryFilter?: string) => {
  const [content, setContent] = useState<MarketplaceContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  
  // Track when the tab was last active for throttled focus refresh
  const lastActiveRef = useRef<number>(Date.now());
  const isInitialLoadRef = useRef<boolean>(true);
  
  // Track previous category to detect changes
  const prevCategoryRef = useRef<string | undefined>(categoryFilter);

  // Silent background refresh - updates data without clearing content or showing loading
  const backgroundRefresh = async () => {
    try {
      console.log('🔄 [MARKETPLACE] Background refresh - preserving UI state', { categoryFilter });
      
      // Build query with optional category filter
      let query = supabase
        .from('content_submissions')
        .select(`
          id,
          title,
          description,
          price,
          tags,
          created_at,
          category_id,
          slug,
          creator_id,
          content_files!inner(id)
        `)
        .eq('status', 'approved');
      
      // Apply server-side category filter
      if (categoryFilter && categoryFilter !== 'all') {
        const categoryUUID = categorySlugToId[categoryFilter];
        if (categoryUUID) {
          query = query.eq('category_id', categoryUUID);
        }
      }
      
      const { data: marketplaceData, error } = await query
        .order('created_at', { ascending: false })
        .range(0, initialLimit - 1);

      if (error) {
        console.error('Error in background refresh:', error);
        return;
      }

      // Fetch creator info using secure public RPC (works for anonymous users)
      const creatorIds = [...new Set((marketplaceData || []).map((item: any) => item.creator_id))];
      const { data: creators } = await supabase
        .rpc('get_creator_public_info', { creator_ids: creatorIds });
      
      const creatorMap = new Map((creators as any[])?.map(c => [c.user_id, c.store_name || c.display_name]) || []);

      // Fetch all files in one query
      const submissionIds = (marketplaceData || []).map((item: any) => item.id);
      const { data: allFiles } = await supabase
        .from('content_files')
        .select('*')
        .in('submission_id', submissionIds);

      // Group files by submission_id
      const filesBySubmission = new Map<string, any[]>();
      (allFiles || []).forEach(file => {
        const existing = filesBySubmission.get(file.submission_id) || [];
        filesBySubmission.set(file.submission_id, [...existing, file]);
      });

      // Process items (same logic as fetchMarketplaceContent)
      const newContent = processMarketplaceData(marketplaceData || [], filesBySubmission, creatorMap);
      
      // Only update if there are actual changes to avoid unnecessary re-renders
      setContent(prev => {
        const prevIds = new Set(prev.map(p => p.id));
        const newIds = new Set(newContent.map(n => n.id));
        const hasChanges = prev.length !== newContent.length || 
          [...newIds].some(id => !prevIds.has(id)) ||
          [...prevIds].some(id => !newIds.has(id));
        
        if (hasChanges) {
          console.log('📊 [MARKETPLACE] Content updated in background');
          return newContent;
        }
        return prev;
      });
      
      setHasMore(marketplaceData && marketplaceData.length === initialLimit);
      setOffset(initialLimit);
    } catch (error) {
      console.error('Background refresh error:', error);
    }
  };

  // Helper function to process marketplace data (extracted for reuse) - memoized
  const processMarketplaceData = useCallback((
    marketplaceData: any[], 
    filesBySubmission: Map<string, any[]>,
    creatorMap: Map<string, string>
  ): MarketplaceContent[] => {
    const isImagePath = (p?: string) => !!p && /\.(jpg|jpeg|png|webp|gif)$/i.test(p);

    const contentWithFiles = marketplaceData.map((item: any) => {
      const files = filesBySubmission.get(item.id) || [];
      
      if (!files || files.length === 0) {
        return null;
      }

      const originalFile = files?.find(f => f.is_original);

      // Thumbnail logic - optimized with cached URL builder
      let thumbnailUrl = '';
      const imageThumb = files?.find(f => isImagePath(f.thumbnail_path));
      if (imageThumb?.thumbnail_path) {
        thumbnailUrl = imageThumb.thumbnail_path.startsWith('http')
          ? imageThumb.thumbnail_path
          : buildPublicUrlCached('thumbnails', imageThumb.thumbnail_path);
      }
      if (!thumbnailUrl) {
        const imagePreview = files?.find(f => isImagePath(f.preview_path));
        if (imagePreview?.preview_path) {
          thumbnailUrl = imagePreview.preview_path.startsWith('http')
            ? imagePreview.preview_path
            : buildPublicUrlCached('previews', imagePreview.preview_path);
        }
      }
      if (!thumbnailUrl) {
        thumbnailUrl = '/placeholder.svg';
      }

      // Content type detection - prioritize category_id over file type
      let contentType: 'photo' | 'video' | 'audio' | 'pdf' | 'ebook' | 'vfx' = 'photo';
      
      // Category ID to type mapping (from database categories table)
      const categoryTypeMap: Record<string, 'photo' | 'video' | 'audio' | 'pdf' | 'ebook' | 'vfx'> = {
        'e6eb8946-abab-4a0b-9249-da012b7a87af': 'photo',      // Photo
        'b4fe5f6a-554b-4409-8eaa-71c87d225b33': 'video',      // Vidéo
        '0b9e322e-cecb-494f-ba8d-c5397e913b99': 'audio',      // Audio
        'ceca4e62-559c-4dc6-98fe-64017d537192': 'photo',      // Vector (now treated as photo)
        '9ec96e29-199f-4ce2-b951-4ca18c62c87c': 'ebook',      // Ebooks
        'f8a21c7e-3d5b-4e9f-a1c2-8b6d9e4f7a3c': 'vfx',        // Visual Effects
      };
      
      // Use category_id first if available
      if (item.category_id && categoryTypeMap[item.category_id]) {
        contentType = categoryTypeMap[item.category_id];
      } else if (originalFile) {
        // Fallback to file type detection
        const fileType = originalFile.file_type?.toLowerCase() || '';
        const fileFormat = originalFile.file_format?.toLowerCase() || '';
        
        if (fileType.includes('video')) {
          contentType = 'video';
        } else if (fileType.includes('audio')) {
          contentType = 'audio';
        } else if (fileType === 'document' || fileFormat === 'application/pdf') {
          contentType = 'ebook';
        }
      }

      // Media URL - optimized with cached URL builder
      // CRITICAL: For videos, we MUST have a valid URL for hover autoplay
      let mediaUrl: string | undefined;
      if (contentType === 'video') {
        // Priority 1: Watermarked preview (preferred for marketplace)
        const fileWithPreview = files?.find(f => f.preview_path);
        if (fileWithPreview?.preview_path) {
          mediaUrl = fileWithPreview.preview_path.startsWith('http')
            ? fileWithPreview.preview_path
            : buildPublicUrlCached('previews', fileWithPreview.preview_path);
        }
        
        // Priority 2: Original file path (fallback)
        if (!mediaUrl && originalFile?.file_path) {
          mediaUrl = originalFile.file_path.startsWith('http')
            ? originalFile.file_path
            : buildPublicUrlCached('uploads', originalFile.file_path);
        }
        
        // Priority 3: Any video file in the submission
        if (!mediaUrl) {
          const anyVideoFile = files?.find(f => 
            f.file_type?.toLowerCase().includes('video') && f.file_path
          );
          if (anyVideoFile?.file_path) {
            mediaUrl = anyVideoFile.file_path.startsWith('http')
              ? anyVideoFile.file_path
              : buildPublicUrlCached('uploads', anyVideoFile.file_path);
          }
        }
        
        // Debug: Log when video has no URL (should not happen)
        if (!mediaUrl && process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ [MARKETPLACE] Video "${item.title}" (${item.id}) has no playable URL`, { files });
        }
      } else if (contentType === 'audio') {
        if (originalFile?.file_path) {
          mediaUrl = originalFile.file_path.startsWith('http')
            ? originalFile.file_path
            : buildPublicUrlCached('uploads', originalFile.file_path);
        }
      }

      // Cover URL for ebooks
      let coverUrl: string | undefined;
      if (contentType === 'ebook') {
        if (thumbnailUrl && thumbnailUrl !== '/placeholder.svg') {
          coverUrl = thumbnailUrl;
        }
        if (!coverUrl) {
          const coverFile = files?.find(f => 
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
        return (
          fileName.endsWith('.svg') ||
          fileType.includes('svg') ||
          fileFormat.includes('svg') ||
          fileType.includes('vector') ||
          fileFormat.includes('vector')
        );
      })();

      return {
        id: item.id,
        slug: item.slug,
        title: item.title || 'Untitled',
        author: creatorMap.get(item.creator_id) || 'Anonymous Store',
        price: item.price ?? 0,
        isFree: item.price === 0,
        type: contentType,
        thumbnail: thumbnailUrl,
        videoUrl: contentType === 'video' ? mediaUrl : undefined,
        audioUrl: contentType === 'audio' ? mediaUrl : undefined,
        coverUrl: coverUrl || (contentType === 'ebook' ? thumbnailUrl : undefined),
        likes: Math.floor(Math.random() * 2000),
        downloads: Math.floor(Math.random() * 1000),
        category_id: item.category_id,
        tags: item.tags || [],
        created_at: item.created_at,
        duration: originalFile?.metadata && typeof originalFile.metadata === 'object' && 'duration' in originalFile.metadata 
          ? originalFile.metadata.duration as string 
          : undefined,
        bpm: originalFile?.metadata && typeof originalFile.metadata === 'object' && 'bpm' in originalFile.metadata 
          ? originalFile.metadata.bpm as number 
          : undefined,
        isAiGenerated: isAiGenerated,
        isVector,
      } as MarketplaceContent;
    });

    return contentWithFiles.filter((item): item is MarketplaceContent => item !== null);
  }, []);

  const fetchMarketplaceContent = async (reset = false) => {
    try {
      // Only show loading spinner on initial load, not on refreshes
      if (isInitialLoadRef.current) {
        setLoading(true);
      }
      
      const currentOffset = reset ? 0 : offset;
      
      console.log('🏪 [MARKETPLACE] Fetching content', { categoryFilter, currentOffset, initialLimit });
      
      // Build query with optional category filter
      let query = supabase
        .from('content_submissions')
        .select(`
          id,
          title,
          description,
          price,
          tags,
          created_at,
          category_id,
          slug,
          creator_id,
          content_files!inner(id)
        `)
        .eq('status', 'approved');
      
      // Apply server-side category filter
      if (categoryFilter && categoryFilter !== 'all') {
        const categoryUUID = categorySlugToId[categoryFilter];
        if (categoryUUID) {
          query = query.eq('category_id', categoryUUID);
          console.log(`📁 [MARKETPLACE] Server-side filter: ${categoryFilter} -> ${categoryUUID}`);
        }
      }
      
      const { data: marketplaceData, error } = await query
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + initialLimit - 1);

      if (error) {
        console.error('Error fetching marketplace content:', error);
        return;
      }

      setHasMore(marketplaceData && marketplaceData.length === initialLimit);
      
      console.log('🏪 [MARKETPLACE] Processing', marketplaceData?.length || 0, 'items');
      
      const creatorIds = [...new Set((marketplaceData || []).map((item: any) => item.creator_id))];
      const submissionIds = (marketplaceData || []).map((item: any) => item.id);
      
      // PARALLEL FETCH: Creators and Files at the same time
      // Using secure public RPC for creators (works for anonymous users)
      const parallelStart = Date.now();
      const [creatorsResult, filesResult] = await Promise.all([
        supabase.rpc('get_creator_public_info', { creator_ids: creatorIds }),
        supabase
          .from('content_files')
          .select('id, submission_id, file_name, file_path, file_type, file_format, is_original, is_preview, preview_path, thumbnail_path, metadata')
          .in('submission_id', submissionIds)
      ]);
      
      const parallelTime = Date.now() - parallelStart;
      console.log(`⚡ [MARKETPLACE] PARALLEL fetch (creators + files): ${parallelTime}ms`);
      
      const creatorMap = new Map((creatorsResult.data as any[])?.map(c => [c.user_id, c.store_name || c.display_name]) || []);
      
      if (filesResult.error) {
        console.error('❌ [MARKETPLACE] Error loading files:', filesResult.error);
      }

      const filesBySubmission = new Map<string, any[]>();
      (filesResult.data || []).forEach(file => {
        const existing = filesBySubmission.get(file.submission_id) || [];
        filesBySubmission.set(file.submission_id, [...existing, file]);
      });

      const validContent = processMarketplaceData(marketplaceData || [], filesBySubmission, creatorMap);
      console.log(`✅ [MARKETPLACE] Showing ${validContent.length} valid items`);

      if (reset) {
        setContent(validContent);
        setOffset(initialLimit);
      } else {
        setContent(prev => [...prev, ...validContent]);
        setOffset(prev => prev + initialLimit);
      }
      
      isInitialLoadRef.current = false;
    } catch (error) {
      console.error('Error in fetchMarketplaceContent:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchMarketplaceContent(false);
    }
  };

  // Refetch when category filter changes
  useEffect(() => {
    if (prevCategoryRef.current !== categoryFilter) {
      console.log(`🔀 [MARKETPLACE] Category changed: ${prevCategoryRef.current} -> ${categoryFilter}`);
      prevCategoryRef.current = categoryFilter;
      isInitialLoadRef.current = true;
      setOffset(0);
      fetchMarketplaceContent(true);
    }
  }, [categoryFilter]);

  useEffect(() => {
    // Initial fetch on mount
    fetchMarketplaceContent(true);
    
    // Listen for explicit refresh events (triggered by user actions like search, filter, sort)
    const handleRefresh = () => {
      console.log('🔄 [MARKETPLACE] Explicit refresh event - updating content');
      // Use background refresh to avoid clearing content/scroll position
      backgroundRefresh();
    };
    
    // Throttled focus handler - only refresh if tab was inactive for 5+ minutes
    const handleFocus = () => {
      const now = Date.now();
      const timeSinceLastActive = now - lastActiveRef.current;
      
      if (timeSinceLastActive >= FOCUS_THROTTLE_MS) {
        console.log(`🔄 [MARKETPLACE] Tab refocused after ${Math.round(timeSinceLastActive / 60000)}min - background refresh`);
        backgroundRefresh();
      } else {
        console.log(`⏭️ [MARKETPLACE] Tab refocused but only ${Math.round(timeSinceLastActive / 1000)}s inactive - skipping refresh`);
      }
      
      lastActiveRef.current = now;
    };
    
    // Track when tab becomes hidden to measure inactivity
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };
    
    window.addEventListener('refreshMarketplace', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('refreshMarketplace', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    content,
    loading,
    hasMore,
    loadMore,
    refreshContent: backgroundRefresh // Use background refresh for manual calls too
  };
};