import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MarketplaceContent {
  id: string;
  title: string;
  author: string;
  price: number;
  type: 'photo' | 'video' | 'audio' | 'illustration';
  thumbnail: string;
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
      
      // Récupérer les submissions approuvées avec leurs fichiers et profils
      const { data: submissions, error } = await supabase
        .from('content_submissions')
        .select(`
          id,
          title,
          price,
          tags,
          category_id,
          creator_id,
          content_files (
            file_path,
            thumbnail_path,
            preview_path,
            file_type,
            is_preview
          )
        `)
        .eq('status', 'approved');

      if (error) {
        console.error('Error fetching marketplace content:', error);
        return;
      }

      // Utiliser la fonction sécurisée pour récupérer les profils publics des créateurs
      const creatorIds = submissions?.map(s => s.creator_id).filter(Boolean) || [];
      let profilesMap: Record<string, any> = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .rpc('get_creator_public_info', { creator_ids: creatorIds });
          
        if (profilesError) {
          console.error('Error fetching creator profiles:', profilesError);
        } else {
          profilesMap = profiles?.reduce((acc, profile) => {
            acc[profile.user_id] = profile;
            return acc;
          }, {} as Record<string, any>) || {};
        }
      }

      // Transformer les données pour l'interface
      const transformedContent: MarketplaceContent[] = submissions?.map((submission) => {
        // Trouver la première image de preview ou thumbnail
        const previewFile = submission.content_files?.find(file => 
          file.is_preview && file.file_type.startsWith('image/')
        );
        const thumbnailFile = submission.content_files?.find(file => 
          file.thumbnail_path && file.file_type.startsWith('image/')
        );
        
        const thumbnail = previewFile?.file_path || 
                         thumbnailFile?.thumbnail_path || 
                         thumbnailFile?.file_path ||
                         '/placeholder.svg';

        // Déterminer le type basé sur les fichiers
        let type: 'photo' | 'video' | 'audio' | 'illustration' = 'photo';
        if (submission.content_files?.some(file => file.file_type.startsWith('video/'))) {
          type = 'video';
        } else if (submission.content_files?.some(file => file.file_type.startsWith('audio/'))) {
          type = 'audio';
        } else if (submission.content_files?.some(file => file.file_type.includes('illustration'))) {
          type = 'illustration';
        }

        const profile = profilesMap[submission.creator_id];

        return {
          id: submission.id,
          title: submission.title,
          author: profile?.store_name || profile?.display_name || 'Créateur',
          price: submission.price || 0,
          type,
          thumbnail,
          likes: Math.floor(Math.random() * 2000), // Sera remplacé par de vraies données plus tard
          downloads: Math.floor(Math.random() * 1000), // Sera remplacé par de vraies données plus tard
          category_id: submission.category_id,
          tags: submission.tags
        };
      }) || [];

      setContent(transformedContent);
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