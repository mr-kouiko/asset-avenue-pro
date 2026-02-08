import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TrendingItem {
  id: string;
  title: string;
  author: string;
  price: number;
  type: 'photo' | 'video' | 'audio' | 'pdf' | 'ebook' | 'vfx';
  thumbnail: string;
  videoUrl?: string;
  likes: number;
  downloads: number;
  isLiked: boolean;
}

const urlCache = new Map<string, string>();

function buildPublicUrl(bucket: string, path: string): string {
  const key = `${bucket}:${path}`;
  if (urlCache.has(key)) return urlCache.get(key)!;
  
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  urlCache.set(key, data.publicUrl);
  return data.publicUrl;
}

function getFileType(format: string): TrendingItem['type'] {
  const fmt = format.toLowerCase();
  // Handle both MIME types (video/mp4) and extensions (mp4)
  if (fmt.includes('video') || ['mp4', 'mov', 'webm', 'avi'].includes(fmt)) return 'video';
  if (fmt.includes('audio') || ['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(fmt)) return 'audio';
  if (fmt.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fmt)) return 'photo';
  if (fmt.includes('pdf') || fmt === 'pdf') return 'pdf';
  return 'ebook';
}

export function useTrendingContent(limit: number = 6) {
  const [content, setContent] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrendingContent = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get downloads from the last 30 days, grouped by submission
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: downloadStats, error: downloadError } = await supabase
        .from('downloads')
        .select('submission_id')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('submission_id', 'is', null);

      // Count downloads per submission
      const downloadCounts = new Map<string, number>();
      if (downloadStats) {
        downloadStats.forEach(d => {
          if (d.submission_id) {
            downloadCounts.set(d.submission_id, (downloadCounts.get(d.submission_id) || 0) + 1);
          }
        });
      }

      // Get top submission IDs by download count
      const topSubmissionIds = Array.from(downloadCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id);

      let submissionIds = topSubmissionIds;
      
      // If not enough trending data, fall back to most recent
      if (submissionIds.length < limit) {
        const { data: recentSubmissions } = await supabase
          .from('content_submissions')
          .select('id')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (recentSubmissions) {
          const existingIds = new Set(submissionIds);
          for (const sub of recentSubmissions) {
            if (!existingIds.has(sub.id) && submissionIds.length < limit) {
              submissionIds.push(sub.id);
            }
          }
        }
      }

      if (submissionIds.length === 0) {
        setContent([]);
        return;
      }

      // Fetch full submission data
      const { data: submissions, error: subError } = await supabase
        .from('content_submissions')
        .select('id, title, description, price, creator_id, created_at')
        .in('id', submissionIds)
        .eq('status', 'approved');

      if (subError || !submissions) {
        console.error('Error fetching trending submissions:', subError);
        setContent([]);
        return;
      }

      // Fetch files for these submissions
      const { data: files } = await supabase
        .from('content_files')
        .select('submission_id, file_path, file_format, thumbnail_path, preview_path, is_preview')
        .in('submission_id', submissionIds);

      // Fetch creator info
      const creatorIds = [...new Set(submissions.map(s => s.creator_id))];
      const { data: creators } = await supabase
        .rpc('get_creator_profiles_public', { creator_ids: creatorIds });

      const creatorMap = new Map(creators?.map(c => [c.user_id, c]) || []);
      const fileMap = new Map<string, typeof files>();
      files?.forEach(f => {
        if (!fileMap.has(f.submission_id!)) fileMap.set(f.submission_id!, []);
        fileMap.get(f.submission_id!)!.push(f);
      });

      // Process content
      const processedContent: TrendingItem[] = submissions.map(sub => {
        const subFiles = fileMap.get(sub.id) || [];
        const creator = creatorMap.get(sub.creator_id);
        
        // Find thumbnail and main file
        const previewFile = subFiles.find(f => f.is_preview) || subFiles[0];
        const mainFile = subFiles.find(f => !f.is_preview) || previewFile;
        
        let thumbnail = '/placeholder.svg';
        let videoUrl: string | undefined;
        let type: TrendingItem['type'] = 'photo';
        
        if (previewFile) {
          type = getFileType(previewFile.file_format);
          
          // Check if paths are already full URLs or relative paths
          const isFullUrl = (path: string) => path.startsWith('http://') || path.startsWith('https://');
          
          if (previewFile.thumbnail_path) {
            thumbnail = isFullUrl(previewFile.thumbnail_path) 
              ? previewFile.thumbnail_path 
              : buildPublicUrl('content-files', previewFile.thumbnail_path);
          } else if (previewFile.preview_path) {
            thumbnail = isFullUrl(previewFile.preview_path)
              ? previewFile.preview_path
              : buildPublicUrl('content-files', previewFile.preview_path);
          } else if (type === 'photo' && previewFile.file_path) {
            thumbnail = isFullUrl(previewFile.file_path)
              ? previewFile.file_path
              : buildPublicUrl('content-files', previewFile.file_path);
          }
          
          if (type === 'video' && previewFile.preview_path) {
            videoUrl = isFullUrl(previewFile.preview_path)
              ? previewFile.preview_path
              : buildPublicUrl('content-files', previewFile.preview_path);
          }
        }

        return {
          id: sub.id,
          title: sub.title,
          author: creator?.display_name || creator?.store_name || 'Unknown Creator',
          price: sub.price || 0,
          type,
          thumbnail,
          videoUrl,
          likes: Math.floor(Math.random() * 100), // Placeholder until we have a likes system
          downloads: downloadCounts.get(sub.id) || 0,
          isLiked: false
        };
      });

      // Sort by download count to maintain trending order
      processedContent.sort((a, b) => b.downloads - a.downloads);
      
      setContent(processedContent);
    } catch (error) {
      console.error('Error fetching trending content:', error);
      setContent([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTrendingContent();
  }, [fetchTrendingContent]);

  return { content, loading, refresh: fetchTrendingContent };
}
