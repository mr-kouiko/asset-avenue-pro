import { useState, useEffect } from 'react';
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

export const useMarketplace = (initialLimit = 50) => {
  const [content, setContent] = useState<MarketplaceContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchMarketplaceContent = async (reset = false) => {
    try {
      setLoading(true);
      const currentOffset = reset ? 0 : offset;
      
      // Fetch marketplace content with slugs - LIMITED to 50 items
      // CRITICAL: Only select submissions that have at least one file (inner join)
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

      // Check if there are more items to load
      setHasMore(marketplaceData && marketplaceData.length === initialLimit);
      
      console.log('🏪 [MARKETPLACE] Processing', marketplaceData?.length || 0, 'items');
      
      // Fetch creator info for all items
      const creatorIds = [...new Set((marketplaceData || []).map((item: any) => item.creator_id))];
      const { data: creators } = await supabase
        .from('profiles')
        .select('user_id, store_name')
        .in('user_id', creatorIds);
      
      const creatorMap = new Map(creators?.map(c => [c.user_id, c.store_name]) || []);

      // PERFORMANCE: Fetch ALL files for ALL submissions in ONE query instead of N queries
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

      // Group files by submission_id for fast lookup
      const filesBySubmission = new Map<string, any[]>();
      (allFiles || []).forEach(file => {
        const existing = filesBySubmission.get(file.submission_id) || [];
        filesBySubmission.set(file.submission_id, [...existing, file]);
      });

      // Process all items synchronously (no more async map!)
      const contentWithFiles = (marketplaceData || []).map((item: any, index: number) => {
          console.log(`📦 [MARKETPLACE] Processing item ${index + 1}:`, item.title);
          
          const files = filesBySubmission.get(item.id) || [];
          console.log(`  📁 [MARKETPLACE] Found ${files.length} files for "${item.title}"`)

          // CRITICAL: Skip submissions with no files (deleted/orphaned submissions)
          if (!files || files.length === 0) {
            console.warn(`  ⚠️ [MARKETPLACE] Skipping "${item.title}" - no files found (orphaned submission)`);
            return null;
          }

          // Determine thumbnail URL and video/audio URL with robust fallbacks
          const originalFile = files?.find(f => f.is_original);

          const isImagePath = (p?: string) => !!p && /\.(jpg|jpeg|png|webp|gif)$/i.test(p);
          const buildPublicUrl = (bucket: string, path: string) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

          // Prefer an actual image thumbnail
          let thumbnailUrl = '';
          const imageThumb = files?.find(f => isImagePath(f.thumbnail_path));
          if (imageThumb?.thumbnail_path) {
            thumbnailUrl = imageThumb.thumbnail_path.startsWith('http')
              ? imageThumb.thumbnail_path
              : buildPublicUrl('thumbnails', imageThumb.thumbnail_path);
          }
          // Fallback to image preview
          if (!thumbnailUrl) {
            const imagePreview = files?.find(f => isImagePath(f.preview_path));
            if (imagePreview?.preview_path) {
              thumbnailUrl = imagePreview.preview_path.startsWith('http')
                ? imagePreview.preview_path
                : buildPublicUrl('previews', imagePreview.preview_path);
            }
          }
          // Last resort: use a default thumbnail asset
          if (!thumbnailUrl) {
            thumbnailUrl = '/placeholder.svg';
          }

          // Determine content type from files
          let contentType: 'photo' | 'video' | 'audio' | 'illustration' | 'pdf' | 'ebook' = 'photo';
          
          if (originalFile) {
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
          
          console.log(`📊 Content type: ${contentType} for "${item.title}"`);

          // Determine media (video/audio) URL
          let mediaUrl: string | undefined;
          if (contentType === 'video') {
            // For video, prefer the PREVIEW (watermarked) version
            const previewFile = files?.find(f => f.is_preview === true && f.preview_path);
            if (previewFile?.preview_path) {
              mediaUrl = previewFile.preview_path.startsWith('http')
                ? previewFile.preview_path
                : buildPublicUrl('previews', previewFile.preview_path);
              console.log(`  🎬 [MARKETPLACE] Video preview for "${item.title}":`, mediaUrl);
            }
            // Fallback: if no preview exists yet, use the original file
            if (!mediaUrl && originalFile?.file_path) {
              mediaUrl = originalFile.file_path.startsWith('http')
                ? originalFile.file_path
                : buildPublicUrl('uploads', originalFile.file_path);
              console.warn(`  ⚠️ [MARKETPLACE] No video preview found for "${item.title}", using original as fallback:`, mediaUrl);
            }
          } else if (contentType === 'audio') {
            // For audio: Use original file path directly
            // TODO: Implement audio watermarking system (periodic beep or voice overlay)
            if (originalFile?.file_path) {
              mediaUrl = originalFile.file_path.startsWith('http')
                ? originalFile.file_path
                : buildPublicUrl('uploads', originalFile.file_path);
              console.log('🎵 Audio URL:', mediaUrl);
            }
          }

          // For PDFs/ebooks, use thumbnail as cover if available
          let coverUrl: string | undefined;
          if (contentType === 'ebook') {
            console.log(`📚 Ebook detected: ${item.title}, thumbnailUrl: ${thumbnailUrl}`);
            // First priority: use the thumbnail_path (this is the uploaded cover)
            if (thumbnailUrl && thumbnailUrl !== '/placeholder.svg') {
              coverUrl = thumbnailUrl;
              console.log(`✅ Using thumbnail as cover: ${coverUrl}`);
            }
            // Fallback: look for a separate cover file
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
                console.log(`✅ Using separate cover file: ${coverUrl}`);
              } else {
                console.warn(`⚠️ No cover found for ebook: ${item.title}`);
              }
            }
          }


          // Check if content is AI-generated from metadata
          const isAiGenerated = originalFile?.metadata && typeof originalFile.metadata === 'object' && 
            ('isAiGenerated' in originalFile.metadata ? originalFile.metadata.isAiGenerated === true : false);

          const contentItem: MarketplaceContent = {
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
            likes: Math.floor(Math.random() * 2000), // Would need to implement likes system
            downloads: Math.floor(Math.random() * 1000), // Would need to implement download tracking
            category_id: item.category_id,
            tags: item.tags || [],
            created_at: item.created_at,
            // Extract audio metadata if available
            duration: originalFile?.metadata && typeof originalFile.metadata === 'object' && 'duration' in originalFile.metadata 
              ? originalFile.metadata.duration as string 
              : undefined,
            bpm: originalFile?.metadata && typeof originalFile.metadata === 'object' && 'bpm' in originalFile.metadata 
              ? originalFile.metadata.bpm as number 
              : undefined,
            isAiGenerated: isAiGenerated,
          };

          console.log(`Content: ${item.title}, Type: ${contentType}, Thumbnail: ${thumbnailUrl}, Media: ${mediaUrl}`);
          return contentItem;
        });

      // Filter out null entries (submissions with no files)
      const validContent = contentWithFiles.filter((item): item is MarketplaceContent => item !== null);
      console.log(`✅ [MARKETPLACE] Showing ${validContent.length} valid items (filtered out ${contentWithFiles.length - validContent.length} orphaned submissions)`);

      // If resetting, replace content; otherwise append
      if (reset) {
        setContent(validContent);
        setOffset(initialLimit);
      } else {
        setContent(prev => [...prev, ...validContent]);
        setOffset(prev => prev + initialLimit);
      }
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
    // Always fetch fresh data on mount
    fetchMarketplaceContent(true);
    
    // Poll for updates every 30 seconds to catch any missed events
    const pollInterval = setInterval(() => {
      console.log('🔄 [MARKETPLACE] Polling for updates');
      fetchMarketplaceContent(true);
    }, 30000);
    
    // Listen for marketplace refresh events
    const handleRefresh = () => {
      console.log('🔄 [MARKETPLACE] Received refresh event - reloading content');
      setContent([]); // Clear existing content immediately
      setOffset(0);
      setHasMore(true);
      fetchMarketplaceContent(true);
    };
    
    // Listen for window focus to refresh (user switching back to tab)
    const handleFocus = () => {
      console.log('🔄 [MARKETPLACE] Tab focused - refreshing content');
      fetchMarketplaceContent(true);
    };
    
    window.addEventListener('refreshMarketplace', handleRefresh);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('refreshMarketplace', handleRefresh);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return {
    content,
    loading,
    hasMore,
    loadMore,
    refreshContent: () => fetchMarketplaceContent(true)
  };
};