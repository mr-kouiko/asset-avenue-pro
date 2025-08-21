import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContentStats {
  photos: number;
  videos: number;
  audios: number;
  illustrations: number;
  total: number;
}

export const useContentStats = () => {
  const [stats, setStats] = useState<ContentStats>({
    photos: 0,
    videos: 0,
    audios: 0,
    illustrations: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get Karim Lechheb's user ID first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('display_name', 'karim lechheb')
        .single();

      if (profileError || !profile) {
        console.error('Error fetching Karim profile:', profileError);
        setStats({ photos: 0, videos: 0, audios: 0, illustrations: 0, total: 0 });
        return;
      }

      // Get approved content with file types for Karim Lechheb only
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
        .eq('creator_id', profile.user_id)
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

      submissions?.forEach((submission: any) => {
        const fileType = submission.content_files[0]?.file_type;
        
        if (fileType?.startsWith('video/')) {
          videos++;
        } else if (fileType?.startsWith('audio/')) {
          audios++;
        } else if (fileType?.includes('vector') || fileType === 'application/pdf') {
          illustrations++;
        } else if (fileType?.startsWith('image/')) {
          photos++;
        }
      });

      const total = photos + videos + audios + illustrations;

      setStats({
        photos,
        videos,
        audios,
        illustrations,
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