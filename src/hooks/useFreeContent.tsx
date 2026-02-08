import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FreeItem {
  id: string;
  title: string;
  author: string;
  price: number;
  type: 'photo' | 'video' | 'audio' | 'pdf' | 'ebook';
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

function getFileType(format: string): FreeItem['type'] {
  const fmt = format.toLowerCase();
  // Handle both MIME types (video/mp4) and extensions (mp4)
  if (fmt.includes('video') || ['mp4', 'mov', 'webm', 'avi'].includes(fmt)) return 'video';
  if (fmt.includes('audio') || ['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(fmt)) return 'audio';
  if (fmt.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fmt)) return 'photo';
  if (fmt.includes('pdf') || fmt === 'pdf') return 'pdf';
  return 'ebook';
}

export function useFreeContent(limit: number = 6) {
  const [content, setContent] = useState<FreeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFreeContent = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch approved content with price = 0 (explicitly marked as free by seller)
      const { data: submissions, error } = await supabase
        .from('content_submissions')
        .select('id, title, description, price, creator_id, created_at')
        .eq('status', 'approved')
        .eq('price', 0)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !submissions || submissions.length === 0) {
        console.log('No free content found or error:', error);
        setContent([]);
        return;
      }

      const submissionIds = submissions.map(s => s.id);
      
      // Fetch files for these submissions
      const { data: files } = await supabase
        .from('content_files')
        .select('submission_id, file_path, file_format, thumbnail_path, preview_path, is_preview')
        .in('submission_id', submissionIds);

      // Fetch creator info using secure public RPC (works for anonymous users)
      const creatorIds = [...new Set(submissions.map(s => s.creator_id))];
      const { data: creators } = await supabase
        .rpc('get_creator_public_info', { creator_ids: creatorIds });

      const creatorMap = new Map((creators as any[])?.map(c => [c.user_id, c]) || []);
      const fileMap = new Map<string, typeof files>();
      files?.forEach(f => {
        if (!fileMap.has(f.submission_id!)) fileMap.set(f.submission_id!, []);
        fileMap.get(f.submission_id!)!.push(f);
      });

      // Process content
      const processedContent: FreeItem[] = submissions.map(sub => {
        const subFiles = fileMap.get(sub.id) || [];
        const creator = creatorMap.get(sub.creator_id);
        
        // Find thumbnail and main file
        const previewFile = subFiles.find(f => f.is_preview) || subFiles[0];
        
        let thumbnail = '/placeholder.svg';
        let videoUrl: string | undefined;
        let type: FreeItem['type'] = 'photo';
        
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
          author: creator?.store_name || creator?.display_name || 'Unknown Creator',
          price: 0,
          type,
          thumbnail,
          videoUrl,
          likes: Math.floor(Math.random() * 50),
          downloads: Math.floor(Math.random() * 200),
          isLiked: false
        };
      });
      
      setContent(processedContent);
    } catch (error) {
      console.error('Error fetching free content:', error);
      setContent([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchFreeContent();
  }, [fetchFreeContent]);

  return { content, loading, refresh: fetchFreeContent };
}
