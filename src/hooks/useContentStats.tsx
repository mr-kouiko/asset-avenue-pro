import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContentStats {
  photos: number;
  videos: number;
  audios: number;
  illustrations: number;
  ebooks: number;
  total: number;
}

export const useContentStats = () => {
  const [stats, setStats] = useState<ContentStats>({
    photos: 0,
    videos: 0,
    audios: 0,
    illustrations: 0,
    ebooks: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get ALL approved content with file types from all creators
      const { data: submissions, error } = await supabase
        .from('content_submissions')
        .select(`
          id,
          status,
          creator_id,
          content_files!inner (
            file_type,
            is_original
          )
        `)
        .eq('status', 'approved')
        .eq('content_files.is_original', true);

      if (error) {
        console.error('Error fetching content stats:', error);
        return;
      }

      // Count by type
      let photos = 0;
      let videos = 0; 
      let audios = 0;
      let illustrations = 0;
      let ebooks = 0;

      submissions?.forEach((submission: any) => {
        const fileType = submission.content_files[0]?.file_type;
        
        if (fileType?.startsWith('video/')) {
          videos++;
        } else if (fileType?.startsWith('audio/')) {
          audios++;
        } else if (fileType === 'application/pdf' || fileType === 'application/epub+zip' || fileType?.includes('ebook')) {
          ebooks++;
        } else if (fileType?.includes('vector')) {
          illustrations++;
        } else if (fileType?.startsWith('image/')) {
          photos++;
        }
      });

      const total = photos + videos + audios + illustrations + ebooks;

      setStats({
        photos,
        videos,
        audios,
        illustrations,
        ebooks,
        total
      });
    } catch (error) {
      console.error('Error in fetchStats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up real-time subscription for content changes
    const channel = supabase
      .channel('content-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_submissions'
        },
        () => {
          // Refetch stats when content changes
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_files'
        },
        () => {
          // Refetch stats when files change
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { stats, loading, refreshStats: fetchStats };
};