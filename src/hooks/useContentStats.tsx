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

      // Count by type - using exact file_type values from database
      let photos = 0;
      let videos = 0; 
      let audios = 0;
      let illustrations = 0;
      let ebooks = 0;

      // Use a Map to track unique submissions by ID
      const processedSubmissions = new Map<string, string>();

      submissions?.forEach((submission: any) => {
        const fileType = submission.content_files[0]?.file_type?.toLowerCase() || '';
        const submissionId = submission.id;
        
        // Skip if we've already processed this submission
        if (processedSubmissions.has(submissionId)) {
          return;
        }
        
        // Mark this submission as processed
        processedSubmissions.set(submissionId, fileType);
        
        // Match file types - handle both MIME types and simple types
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
        } else if (fileType === 'illustration' || fileType.includes('vector') || fileType.includes('svg')) {
          illustrations++;
        } else if (fileType === 'image' || fileType.startsWith('image/')) {
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