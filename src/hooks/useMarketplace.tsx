import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useContentTranslation } from './useContentTranslation';

export interface MarketplaceContent {
  id: string;
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
}

export const useMarketplace = () => {
  const [content, setContent] = useState<MarketplaceContent[]>([]);
  const [loading, setLoading] = useState(true);
  const { translateBatch, currentLanguage } = useContentTranslation();

  const fetchMarketplaceContent = async () => {
    try {
      setLoading(true);
      
      // Use the new get_marketplace_content function for automatic content type detection and filtering
      const { data: marketplaceData, error } = await supabase
        .rpc('get_marketplace_content');

      if (error) {
        console.error('Error fetching marketplace content:', error);
        return;
      }

      // Fetch content files for each submission to get URLs
      const contentWithFiles = await Promise.all(
        (marketplaceData || []).map(async (item: any) => {
          const { data: files } = await supabase
            .from('content_files')
            .select('*')
            .eq('submission_id', item.id);

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

          // Determine media (video/audio) URL
          let mediaUrl: string | undefined;
          if (item.content_type === 'video') {
            // For video, use the PREVIEW (watermarked) version
            const previewFile = files?.find(f => f.is_preview === true);
            if (previewFile?.preview_path) {
              mediaUrl = previewFile.preview_path.startsWith('http')
                ? previewFile.preview_path
                : buildPublicUrl('previews', previewFile.preview_path);
            }
          } else if (item.content_type === 'audio') {
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
          if (item.content_type === 'document' || item.content_type === 'pdf') {
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

          // Map content types including PDFs
          let contentType: 'photo' | 'video' | 'audio' | 'illustration' | 'pdf' | 'ebook' = 'photo';
          if (item.content_type === 'video') contentType = 'video';
          else if (item.content_type === 'audio') contentType = 'audio';
          else if (item.content_type === 'illustration') contentType = 'illustration';
          else if (item.content_type === 'document') contentType = 'ebook';

          const contentItem: MarketplaceContent = {
            id: item.id,
            title: item.title || 'Untitled',
            author: item.creator_store_name || 'Boutique anonyme',
            price: item.price || 0,
            type: contentType,
            thumbnail: thumbnailUrl,
            videoUrl: item.content_type === 'video' ? mediaUrl : undefined,
            audioUrl: item.content_type === 'audio' ? mediaUrl : undefined,
            coverUrl: coverUrl || (contentType === 'ebook' ? thumbnailUrl : undefined),
            likes: Math.floor(Math.random() * 2000), // Would need to implement likes system
            downloads: Math.floor(Math.random() * 1000), // Would need to implement download tracking
            category_id: item.category_id,
            tags: item.tags || [],
            // Extract audio metadata if available
            duration: originalFile?.metadata && typeof originalFile.metadata === 'object' && 'duration' in originalFile.metadata 
              ? originalFile.metadata.duration as string 
              : undefined,
            bpm: originalFile?.metadata && typeof originalFile.metadata === 'object' && 'bpm' in originalFile.metadata 
              ? originalFile.metadata.bpm as number 
              : undefined,
          };

          console.log(`Content: ${item.title}, Type: ${item.content_type}, Thumbnail: ${thumbnailUrl}, Media: ${mediaUrl}`);
          return contentItem;
        })
      );

      // Translate content to visitor's language
      const itemsToTranslate = contentWithFiles.map(item => ({
        id: item.id,
        title: item.title,
        description: '', // No description in current interface
        tags: item.tags || []
      }));

      const translations = await translateBatch(itemsToTranslate);

      // Apply translations
      const translatedContent = contentWithFiles.map((item, index) => ({
        ...item,
        title: translations[index].title,
        tags: translations[index].tags
      }));

      setContent(translatedContent);
    } catch (error) {
      console.error('Error in fetchMarketplaceContent:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketplaceContent();
    
    // Listen for marketplace refresh events
    const handleRefresh = () => {
      console.log('Refreshing marketplace content after deletion');
      fetchMarketplaceContent();
    };
    
    window.addEventListener('refreshMarketplace', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshMarketplace', handleRefresh);
    };
  }, [currentLanguage]);

  return {
    content,
    loading,
    refreshContent: fetchMarketplaceContent
  };
};