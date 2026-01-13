import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MarketplaceContent {
  id: string;
  slug?: string; // SEO-friendly URL slug
  title: string;
  author: string;
  price: number;
  type: 'photo' | 'video' | 'audio' | 'illustration' | 'pdf' | 'ebook';
  thumbnail: string;
  videoUrl?: string;
  audioUrl?: string;
  coverUrl?: string; // Pour les ebooks/PDF
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
}

// Throttle duration for focus refetch (5 minutes in milliseconds)
const FOCUS_THROTTLE_MS = 5 * 60 * 1000;

export const useMarketplace = (initialLimit = 200) => {
  const [content, setContent] = useState<MarketplaceContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  
  // Track when the tab was last active for throttled focus refresh
  const lastActiveRef = useRef<number>(Date.now());
  const isInitialLoadRef = useRef<boolean>(true);

  // Silent background refresh - updates data without clearing content or showing loading
  const backgroundRefresh = async () => {
    try {
      console.log('🔄 [MARKETPLACE] Background refresh - preserving UI state');
      
      const { data: marketplaceData, error } = await supabase
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
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(0, initialLimit - 1);

      if (error) {
        console.error('Error in background refresh:', error);
        return;
      }

      // Fetch creator info
      const creatorIds = [...new Set((marketplaceData || []).map((item: any) => item.creator_id))];
      const { data: creators } = await supabase
        .from('profiles')
        .select('user_id, store_name')
        .in('user_id', creatorIds);
      
      const creatorMap = new Map(creators?.map(c => [c.user_id, c.store_name]) || []);

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

  // Helper function to process marketplace data (extracted for reuse)
  const processMarketplaceData = (
    marketplaceData: any[], 
    filesBySubmission: Map<string, any[]>,
    creatorMap: Map<string, string>
  ): MarketplaceContent[] => {
    const buildPublicUrl = (bucket: string, path: string) => 
      supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    const isImagePath = (p?: string) => !!p && /\.(jpg|jpeg|png|webp|gif)$/i.test(p);

    const contentWithFiles = marketplaceData.map((item: any) => {
      const files = filesBySubmission.get(item.id) || [];
      
      if (!files || files.length === 0) {
        return null;
      }

      const originalFile = files?.find(f => f.is_original);

      // Thumbnail logic
      let thumbnailUrl = '';
      const imageThumb = files?.find(f => isImagePath(f.thumbnail_path));
      if (imageThumb?.thumbnail_path) {
        thumbnailUrl = imageThumb.thumbnail_path.startsWith('http')
          ? imageThumb.thumbnail_path
          : buildPublicUrl('thumbnails', imageThumb.thumbnail_path);
      }
      if (!thumbnailUrl) {
        const imagePreview = files?.find(f => isImagePath(f.preview_path));
        if (imagePreview?.preview_path) {
          thumbnailUrl = imagePreview.preview_path.startsWith('http')
            ? imagePreview.preview_path
            : buildPublicUrl('previews', imagePreview.preview_path);
        }
      }
      if (!thumbnailUrl) {
        thumbnailUrl = '/placeholder.svg';
      }

      // Content type detection - prioritize category_id over file type
      let contentType: 'photo' | 'video' | 'audio' | 'illustration' | 'pdf' | 'ebook' = 'photo';
      
      // Category ID to type mapping (from database categories table)
      const categoryTypeMap: Record<string, 'photo' | 'video' | 'audio' | 'illustration' | 'pdf' | 'ebook'> = {
        'e6eb8946-abab-4a0b-9249-da012b7a87af': 'photo',      // Photo
        'b4fe5f6a-554b-4409-8eaa-71c87d225b33': 'video',      // Vidéo
        '0b9e322e-cecb-494f-ba8d-c5397e913b99': 'audio',      // Audio
        '653f8437-6317-4a81-8bbf-9b8c520c0dbe': 'illustration', // Illustration
        'ceca4e62-559c-4dc6-98fe-64017d537192': 'illustration', // Vectoriel (treated as illustration)
        '9ec96e29-199f-4ce2-b951-4ca18c62c87c': 'ebook',      // Ebooks
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
        } else if (fileType.includes('vector') || fileFormat === 'svg') {
          contentType = 'illustration';
        }
      }

      // Media URL
      let mediaUrl: string | undefined;
      if (contentType === 'video') {
        const fileWithPreview = files?.find(f => f.preview_path);
        if (fileWithPreview?.preview_path) {
          mediaUrl = fileWithPreview.preview_path.startsWith('http')
            ? fileWithPreview.preview_path
            : buildPublicUrl('previews', fileWithPreview.preview_path);
        }
        if (!mediaUrl && originalFile?.file_path) {
          mediaUrl = originalFile.file_path.startsWith('http')
            ? originalFile.file_path
            : buildPublicUrl('uploads', originalFile.file_path);
        }
      } else if (contentType === 'audio') {
        if (originalFile?.file_path) {
          mediaUrl = originalFile.file_path.startsWith('http')
            ? originalFile.file_path
            : buildPublicUrl('uploads', originalFile.file_path);
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
              : buildPublicUrl('uploads', coverFile.file_path);
          }
        }
      }

      const isAiGenerated = originalFile?.metadata && typeof originalFile.metadata === 'object' && 
        ('isAiGenerated' in originalFile.metadata ? originalFile.metadata.isAiGenerated === true : false);

      return {
        id: item.id,
        slug: item.slug,
        title: item.title || 'Untitled',
        author: creatorMap.get(item.creator_id) || 'Boutique anonyme',
        price: item.price || 0,
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
      } as MarketplaceContent;
    });

    return contentWithFiles.filter((item): item is MarketplaceContent => item !== null);
  };

  const fetchMarketplaceContent = async (reset = false) => {
    try {
      // Only show loading spinner on initial load, not on refreshes
      if (isInitialLoadRef.current) {
        setLoading(true);
      }
      
      const currentOffset = reset ? 0 : offset;
      
      const { data: marketplaceData, error } = await supabase
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
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + initialLimit - 1);

      if (error) {
        console.error('Error fetching marketplace content:', error);
        return;
      }

      setHasMore(marketplaceData && marketplaceData.length === initialLimit);
      
      console.log('🏪 [MARKETPLACE] Processing', marketplaceData?.length || 0, 'items');
      
      const creatorIds = [...new Set((marketplaceData || []).map((item: any) => item.creator_id))];
      const { data: creators } = await supabase
        .from('profiles')
        .select('user_id, store_name')
        .in('user_id', creatorIds);
      
      const creatorMap = new Map(creators?.map(c => [c.user_id, c.store_name]) || []);

      const submissionIds = (marketplaceData || []).map((item: any) => item.id);
      const filesStart = Date.now();
      const { data: allFiles, error: filesError } = await supabase
        .from('content_files')
        .select('*')
        .in('submission_id', submissionIds);
      
      const filesTime = Date.now() - filesStart;
      console.log(`⚡ [MARKETPLACE] Fetched ALL files in ONE query: ${filesTime}ms (${allFiles?.length || 0} files)`);
      
      if (filesError) {
        console.error('❌ [MARKETPLACE] Error loading files:', filesError);
      }

      const filesBySubmission = new Map<string, any[]>();
      (allFiles || []).forEach(file => {
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