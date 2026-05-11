import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateSlug, ensureUniqueSlug, generateSlugifiedFileName } from '@/utils/slugGenerator';
import { getImageDimensions, getVideoDimensions } from '@/utils/mediaDimensions';

async function buildFileMetadata(file: { type: string; url: string; previewUrl?: string; name: string; isWatermarked?: boolean }): Promise<Record<string, any>> {
  const meta: Record<string, any> = {
    isWatermarked: file.isWatermarked || false,
    originalFileName: file.name,
  };
  try {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    let dims = null;
    if (isVideo && file.previewUrl) dims = await getVideoDimensions(file.previewUrl);
    else if (isImage) dims = await getImageDimensions(file.previewUrl || file.url);
    if (dims) { meta.width = dims.width; meta.height = dims.height; }
  } catch (e) {
    console.warn('[useContentManagement] dimension detection failed:', e);
  }
  return meta;
}

interface ContentData {
  title: string;
  description: string;
  category_id?: string;
  price?: number;
  tags: string[];
}

interface UploadedFile {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  isWatermarked?: boolean;
  thumbnailUrl?: string;
  previewUrl?: string;
}

export const useContentManagement = () => {
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleFilesUploaded = useCallback((files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const publishContent = useCallback(async (contentData: ContentData) => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one file');
      return false;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create content submissions for each uploaded file
      const contentPromises = uploadedFiles.map(async (file) => {
        // Generate SEO-friendly slug
        const baseSlug = generateSlug(contentData.title, contentData.tags || []);
        
        // Check for existing slugs to ensure uniqueness
        const { data: existingSlugs } = await supabase
          .from('content_submissions')
          .select('slug')
          .not('slug', 'is', null);
        
        const slugList = existingSlugs?.map(s => s.slug).filter(Boolean) as string[] || [];
        const uniqueSlug = ensureUniqueSlug(baseSlug, slugList);
        
        // First create the content submission with slug
        const { data: submissionData, error: submissionError } = await supabase
          .from('content_submissions')
          .insert({
            creator_id: user.id,
            title: contentData.title,
            description: contentData.description,
            category_id: contentData.category_id || null,
            price: contentData.price || 0,
            tags: contentData.tags,
            slug: uniqueSlug,
            status: 'approved' // Auto-approve for now
          })
          .select()
          .single();

        if (submissionError) throw submissionError;

        // Generate slugified file name from title
        const slugifiedFileName = generateSlugifiedFileName(contentData.title, file.name);

        // Then create the associated file entry
        const isVideo = file.type.startsWith('video/');
        const { data: fileData, error: fileError } = await supabase
          .from('content_files')
          .insert({
            submission_id: submissionData.id,
            file_name: slugifiedFileName, // Use slugified name
            file_path: file.url, // Keep original file_path unchanged
            file_type: file.type.split('/')[0], // 'image', 'video', etc.
            file_format: file.type,
            file_size: file.size,
            is_original: true,
            preview_path: file.previewUrl || null,
            thumbnail_path: isVideo ? file.thumbnailUrl || null : file.previewUrl || null,
            metadata: await buildFileMetadata(file),
          })
          .select()
          .single();

        if (fileError) throw fileError;
        
        return { submission: submissionData, file: fileData };
      });

      const results = await Promise.all(contentPromises);
      
      toast.success(`✅ Successfully published ${results.length} content item(s)!`);
      setUploadedFiles([]);
      return true;

    } catch (error) {
      console.error('Publish error:', error);
      toast.error(`Failed to publish content: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [uploadedFiles]);

  const saveDraft = useCallback(async (contentData: ContentData) => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one file');
      return false;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create content submissions as drafts
      const contentPromises = uploadedFiles.map(async (file) => {
        // Generate SEO-friendly slug
        const baseSlug = generateSlug(contentData.title, contentData.tags || []);
        
        // Check for existing slugs to ensure uniqueness
        const { data: existingSlugs } = await supabase
          .from('content_submissions')
          .select('slug')
          .not('slug', 'is', null);
        
        const slugList = existingSlugs?.map(s => s.slug).filter(Boolean) as string[] || [];
        const uniqueSlug = ensureUniqueSlug(baseSlug, slugList);

        // First create the content submission as draft with slug
        const { data: submissionData, error: submissionError } = await supabase
          .from('content_submissions')
          .insert({
            creator_id: user.id,
            title: contentData.title,
            description: contentData.description,
            category_id: contentData.category_id || null,
            price: contentData.price || 0,
            tags: contentData.tags,
            slug: uniqueSlug,
            status: 'draft'
          })
          .select()
          .single();

        if (submissionError) throw submissionError;

        // Generate slugified file name from title
        const slugifiedFileName = generateSlugifiedFileName(contentData.title, file.name);

        // Then create the associated file entry
        const isVideo = file.type.startsWith('video/');
        const { data: fileData, error: fileError } = await supabase
          .from('content_files')
          .insert({
            submission_id: submissionData.id,
            file_name: slugifiedFileName, // Use slugified name
            file_path: file.url, // Keep original file_path unchanged
            file_type: file.type.split('/')[0], // 'image', 'video', etc.
            file_format: file.type,
            file_size: file.size,
            is_original: true,
            preview_path: file.previewUrl || null,
            thumbnail_path: isVideo ? file.thumbnailUrl || null : file.previewUrl || null,
            metadata: await buildFileMetadata(file),
          })
          .select()
          .single();

        if (fileError) throw fileError;
        
        return { submission: submissionData, file: fileData };
      });

      const results = await Promise.all(contentPromises);
      
      toast.success(`✅ Successfully saved ${results.length} draft(s)!`);
      return true;

    } catch (error) {
      console.error('Save draft error:', error);
      toast.error(`Failed to save draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [uploadedFiles]);

  return {
    loading,
    uploadedFiles,
    handleFilesUploaded,
    removeFile,
    publishContent,
    saveDraft
  };
};