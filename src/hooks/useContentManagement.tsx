import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
        // First create the content submission
        const { data: submissionData, error: submissionError } = await supabase
          .from('content_submissions')
          .insert({
            creator_id: user.id,
            title: contentData.title,
            description: contentData.description,
            category_id: contentData.category_id || null,
            price: contentData.price || 0,
            tags: contentData.tags,
            status: 'approved' // Auto-approve for now
          })
          .select()
          .single();

        if (submissionError) throw submissionError;

        // Then create the associated file entry
        const { data: fileData, error: fileError } = await supabase
          .from('content_files')
          .insert({
            submission_id: submissionData.id,
            file_name: file.name,
            file_path: file.url,
            file_type: file.type.split('/')[0], // 'image', 'video', etc.
            file_format: file.type,
            file_size: file.size,
            is_original: true,
            preview_path: file.url,
            thumbnail_path: file.url,
            metadata: {
              isWatermarked: file.isWatermarked || false
            }
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
        // First create the content submission as draft
        const { data: submissionData, error: submissionError } = await supabase
          .from('content_submissions')
          .insert({
            creator_id: user.id,
            title: contentData.title,
            description: contentData.description,
            category_id: contentData.category_id || null,
            price: contentData.price || 0,
            tags: contentData.tags,
            status: 'draft'
          })
          .select()
          .single();

        if (submissionError) throw submissionError;

        // Then create the associated file entry
        const { data: fileData, error: fileError } = await supabase
          .from('content_files')
          .insert({
            submission_id: submissionData.id,
            file_name: file.name,
            file_path: file.url,
            file_type: file.type.split('/')[0], // 'image', 'video', etc.
            file_format: file.type,
            file_size: file.size,
            is_original: true,
            preview_path: file.url,
            thumbnail_path: file.url,
            metadata: {
              isWatermarked: file.isWatermarked || false
            }
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