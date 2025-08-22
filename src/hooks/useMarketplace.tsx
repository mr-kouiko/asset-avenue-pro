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
      
      // Get approved submissions
      const { data: submissions, error } = await supabase
        .from('content_submissions')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching marketplace content:', error);
        return;
      }

      // Get unique creator IDs
      const creatorIds = [...new Set(submissions?.map(s => s.creator_id) || [])];
      
      // Fetch public creator profiles (no RLS restrictions)
      const { data: creatorProfiles } = await supabase
        .from('public_creator_profiles')
        .select('user_id, display_name, store_name')
        .in('user_id', creatorIds);

      // Create a map of creator profiles for quick lookup
      const profileMap = new Map(creatorProfiles?.map(p => [p.user_id, p]) || []);

      console.log('Creator profiles fetched:', creatorProfiles);
      console.log('Profile map created:', profileMap);

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
                try {
                  // First try signed URL with extended expiry for mobile
                  const { data: signedData, error: signedError } = await supabase.storage
                    .from('original-files')
                    .createSignedUrl(originalFile.file_path, 24 * 60 * 60); // 24 hours expiry for mobile reliability
                  
                  if (signedData?.signedUrl && !signedError) {
                    videoUrl = signedData.signedUrl;
                    console.log('✅ Generated signed video URL:', videoUrl);
                  } else {
                    console.warn('⚠️ Signed URL failed, trying public URL fallback:', signedError);
                    // Fallback to public URL
                    const { data: publicData } = supabase.storage
                      .from('original-files')
                      .getPublicUrl(originalFile.file_path);
                    videoUrl = publicData.publicUrl;
                    console.log('📺 Using public video URL:', videoUrl);
                  }
                } catch (error) {
                  console.error('❌ Exception creating video URL, using public fallback:', error);
                  // Emergency fallback to public URL
                  const { data: publicData } = supabase.storage
                    .from('original-files')
                    .getPublicUrl(originalFile.file_path);
                  videoUrl = publicData.publicUrl;
                  console.log('🚨 Emergency public video URL:', videoUrl);
                }
              }
            } else if (originalFile.file_type.startsWith('audio/')) {
              contentType = 'audio';
              // Get audio URL for audio content from original-files with signed URL
              if (originalFile.file_path) {
                console.log('Processing audio file:', originalFile.file_name, 'Path:', originalFile.file_path);
                try {
                  // First try signed URL with extended expiry for mobile
                  const { data: signedData, error: signedError } = await supabase.storage
                    .from('original-files')
                    .createSignedUrl(originalFile.file_path, 24 * 60 * 60); // 24 hours expiry for mobile reliability
                  
                  if (signedData?.signedUrl && !signedError) {
                    videoUrl = signedData.signedUrl; // Using videoUrl field for audio too
                    console.log('🎵 Generated signed audio URL:', videoUrl);
                  } else {
                    console.warn('⚠️ Audio signed URL failed, trying public URL fallback:', signedError);
                    // Fallback to public URL
                    const { data: publicData } = supabase.storage
                      .from('original-files')
                      .getPublicUrl(originalFile.file_path);
                    videoUrl = publicData.publicUrl;
                    console.log('🔊 Using public audio URL:', videoUrl);
                  }
                } catch (error) {
                  console.error('❌ Exception creating audio URL, using public fallback:', error);
                  // Emergency fallback to public URL
                  const { data: publicData } = supabase.storage
                    .from('original-files')
                    .getPublicUrl(originalFile.file_path);
                  videoUrl = publicData.publicUrl;
                  console.log('🚨 Emergency public audio URL:', videoUrl);
                }
              }
            } else if (originalFile.file_type.includes('vector') || originalFile.file_type === 'application/pdf') {
              contentType = 'illustration';
            } else {
              contentType = 'photo';
            }
          }

          // Get creator profile from the map
          const creatorProfile = profileMap.get(submission.creator_id);
          
          // STRICT: Only use store_name, no fallback to display_name
          let authorName = 'Boutique anonyme';
          
          if (!creatorProfile) {
            console.error(`ERROR: No creator profile found for submission "${submission.title}" (creator_id: ${submission.creator_id})`);
          } else if (!creatorProfile.store_name) {
            console.error(`ERROR: Missing store_name for submission "${submission.title}" (creator_id: ${submission.creator_id}). Profile:`, creatorProfile);
          } else {
            authorName = creatorProfile.store_name;
            console.log(`SUCCESS: Using store_name "${creatorProfile.store_name}" for submission "${submission.title}"`);
          }

          const contentItem = {
            id: submission.id,
            title: submission.title || 'Untitled',
            author: authorName, // ONLY store_name, no fallbacks
            price: submission.price || 0,
            type: contentType,
            thumbnail: thumbnailUrl,
            videoUrl: videoUrl, // This will contain audio URL for audio files
            audioUrl: contentType === 'audio' ? videoUrl : undefined,
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