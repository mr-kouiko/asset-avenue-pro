import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MarketplaceContent {
  id: string;
  title: string;
  author: string;
  price: number;
  type: 'photo' | 'video' | 'audio' | 'illustration';
  thumbnail: string;
  videoUrl?: string;
  likes: number;
  downloads: number;
  isLiked?: boolean;
  category_id?: string;
  tags?: string[];
}

export const useMarketplace = () => {
  const [content, setContent] = useState<MarketplaceContent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarketplaceContent = async () => {
    try {
      setLoading(true);
      
      // Use the new marketplace_content view for automatic content type detection and filtering
      const { data: marketplaceData, error } = await supabase
        .from('marketplace_content')
        .select('*')
        .order('created_at', { ascending: false });

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

          // Determine thumbnail URL and video/audio URL
          const thumbnailFile = files?.find(f => f.thumbnail_path);
          const originalFile = files?.find(f => f.is_original);
          
          let thumbnailUrl = '';
          let mediaUrl: string | undefined;
          
          // Handle thumbnail_path - construct full URL if relative path
          if (thumbnailFile?.thumbnail_path) {
            if (thumbnailFile.thumbnail_path.startsWith('http')) {
              thumbnailUrl = thumbnailFile.thumbnail_path;
            } else {
              // Use original-files bucket for consistency
              const { data } = supabase.storage
                .from('original-files')
                .getPublicUrl(thumbnailFile.thumbnail_path);
              thumbnailUrl = data.publicUrl;
            }
          }

          // Handle original file URL for videos and audio
          if (originalFile?.file_path && (item.content_type === 'video' || item.content_type === 'audio')) {
            if (originalFile.file_path.startsWith('http')) {
              mediaUrl = originalFile.file_path;
            } else {
              // Use original-files bucket for consistency
              const { data } = supabase.storage
                .from('original-files')
                .getPublicUrl(originalFile.file_path);
              mediaUrl = data.publicUrl;
            }
          }

          const contentItem: MarketplaceContent = {
            id: item.id,
            title: item.title || 'Untitled',
            author: item.creator_store_name || 'Boutique anonyme',
            price: item.price || 0,
            type: item.content_type as 'photo' | 'video' | 'audio' | 'illustration',
            thumbnail: thumbnailUrl,
            videoUrl: mediaUrl, // For both video and audio
            likes: Math.floor(Math.random() * 2000), // Would need to implement likes system
            downloads: Math.floor(Math.random() * 1000), // Would need to implement download tracking
            category_id: item.category_id,
            tags: item.tags || [],
          };

          console.log(`Content: ${item.title}, Type: ${item.content_type}, Thumbnail: ${thumbnailUrl}, Media: ${mediaUrl}`);
          return contentItem;
        })
      );

      setContent(contentWithFiles);
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
  }, []);

  return {
    content,
    loading,
    refreshContent: fetchMarketplaceContent
  };
};