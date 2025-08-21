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
      
      // Use the secure marketplace_content view instead of direct table access
      const { data: submissions, error } = await supabase
        .from('marketplace_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching marketplace content:', error);
        return;
      }

      // Fetch content files separately for each submission
      const contentWithFiles = await Promise.all(
        (submissions || []).map(async (submission: any) => {
          const { data: files } = await supabase
            .from('content_files')
            .select('*')
            .eq('submission_id', submission.id);

          // Determine thumbnail URL and content type
          const thumbnailFile = files?.find(f => f.thumbnail_path);
          const originalFile = files?.find(f => f.is_original);
          
          let thumbnailUrl = '/placeholder.svg';
          let contentType: 'photo' | 'video' | 'audio' | 'illustration' = 'photo';
          let videoUrl: string | undefined;
          
          if (thumbnailFile?.thumbnail_path) {
            console.log('Processing thumbnail:', thumbnailFile.thumbnail_path);
            const { data } = supabase.storage
              .from('thumbnails')
              .getPublicUrl(thumbnailFile.thumbnail_path);
            thumbnailUrl = data.publicUrl;
            console.log('Generated thumbnail URL:', thumbnailUrl);
          }

          if (originalFile?.file_type) {
            if (originalFile.file_type.startsWith('video/')) {
              contentType = 'video';
              // Get video URL for video content from original-files with signed URL
              if (originalFile.file_path) {
                console.log('Processing video file:', originalFile.file_name, 'Path:', originalFile.file_path);
                const { data: signedData, error: signedError } = await supabase.storage
                  .from('original-files')
                  .createSignedUrl(originalFile.file_path, 3600); // 1 hour expiry
                
                if (signedError) {
                  console.error('Error creating signed URL for video:', signedError);
                } else if (signedData?.signedUrl) {
                  videoUrl = signedData.signedUrl;
                  console.log('Generated video URL:', videoUrl);
                } else {
                  console.warn('No signed URL generated for:', originalFile.file_path);
                }
              }
            } else if (originalFile.file_type.startsWith('audio/')) {
              contentType = 'audio';
            } else if (originalFile.file_type.includes('vector') || originalFile.file_type === 'application/pdf') {
              contentType = 'illustration';
            } else {
              contentType = 'photo';
            }
          }

          const contentItem = {
            id: submission.id,
            title: submission.title || 'Untitled',
            author: submission.creator_store_name || submission.creator_display_name || 'Boutique anonyme', // Use store name first, then display name as fallback
            price: submission.price || 0,
            type: contentType,
            thumbnail: thumbnailUrl,
            videoUrl: videoUrl,
            likes: Math.floor(Math.random() * 2000), // Would need to implement likes system
            downloads: Math.floor(Math.random() * 1000), // Would need to implement download tracking
            category_id: submission.category_id,
            tags: submission.tags || [],
          };

          console.log('Final content item:', contentItem.title, 'Type:', contentType, 'Video URL:', videoUrl, 'Thumbnail:', thumbnailUrl);
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
  }, []);

  return {
    content,
    loading,
    refreshContent: fetchMarketplaceContent
  };
};