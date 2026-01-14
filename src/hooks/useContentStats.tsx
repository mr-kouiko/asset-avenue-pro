import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContentStats {
  photos: number;
  videos: number;
  audios: number;
  ebooks: number;
  total: number;
}

export const useContentStats = () => {
  const [stats, setStats] = useState<ContentStats>({
    photos: 0,
    videos: 0,
    audios: 0,
    ebooks: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get ALL approved content with file types + category_id
      const { data: submissions, error } = await supabase
        .from('content_submissions')
        .select(`
          id,
          status,
          category_id,
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

      // Count by type - prefer category_id (seller edits), fallback to file_type
      let photos = 0;
      let videos = 0;
      let audios = 0;
      let ebooks = 0;

      // Category ID to type mapping (from database categories table)
      const categoryTypeMap: Record<string, 'photo' | 'video' | 'audio' | 'ebook'> = {
        'e6eb8946-abab-4a0b-9249-da012b7a87af': 'photo',
        'b4fe5f6a-554b-4409-8eaa-71c87d225b33': 'video',
        '0b9e322e-cecb-494f-ba8d-c5397e913b99': 'audio',
        '9ec96e29-199f-4ce2-b951-4ca18c62c87c': 'ebook',
      };

      // Use a Map to track unique submissions by ID
      const processedSubmissions = new Map<string, true>();

      submissions?.forEach((submission: any) => {
        const submissionId = submission.id;

        // Skip if we've already processed this submission
        if (processedSubmissions.has(submissionId)) return;
        processedSubmissions.set(submissionId, true);

        const mappedType = submission.category_id ? categoryTypeMap[submission.category_id] : undefined;
        if (mappedType) {
          if (mappedType === 'photo') photos++;
          else if (mappedType === 'video') videos++;
          else if (mappedType === 'audio') audios++;
          else if (mappedType === 'ebook') ebooks++;
          return;
        }

        // Fallback: classify from file_type
        const fileType = submission.content_files[0]?.file_type?.toLowerCase() || '';

        if (fileType === 'video' || fileType.startsWith('video/')) {
          videos++;
        } else if (fileType === 'audio' || fileType.startsWith('audio/')) {
          audios++;
        } else if (
          fileType === 'document' ||
          fileType === 'ebook' ||
          fileType === 'application/pdf' ||
          fileType === 'application/epub+zip' ||
          fileType.includes('ebook')
        ) {
          ebooks++;
        } else if (fileType === 'image' || fileType.startsWith('image/')) {
          photos++;
        }
      });

      const total = photos + videos + audios + ebooks;

      setStats({
        photos,
        videos,
        audios,
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

    // Listen for global refresh events
    const handleGlobalRefresh = () => {
      fetchStats();
    };

    const handleContentStatsRefresh = () => {
      fetchStats();
    };

    window.addEventListener('globalContentRefresh', handleGlobalRefresh);
    window.addEventListener('refreshContentStats', handleContentStatsRefresh);

    // Force immediate refresh after component mount
    setTimeout(() => {
      fetchStats();
    }, 100);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('globalContentRefresh', handleGlobalRefresh);
      window.removeEventListener('refreshContentStats', handleContentStatsRefresh);
    };
  }, []);

  return { stats, loading, refreshStats: fetchStats };
};