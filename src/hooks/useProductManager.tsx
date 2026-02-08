import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateSlug, ensureUniqueSlug, generateSlugifiedFileName } from '@/utils/slugGenerator';

interface ProductFile {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  thumbnailUrl?: string;
  isWatermarked?: boolean;
  isAiGenerated?: boolean;
  fileHash?: string;
  previewMediaType?: 'image' | 'video'; // For VFX: indicates if preview is an image or video
}

interface ProductMetadata {
  title: string;
  description: string;
  category_id?: string;
  tags: string[];
  isFreeContent?: boolean;
}

interface ProductSubmission {
  file: ProductFile;
  productData: ProductMetadata;
  draftId?: string; // Optional: if provided, update existing draft instead of creating new
}

export const useProductManager = () => {
  const [loading, setLoading] = useState(false);

  const ensureCreatorRole = async (userId: string): Promise<boolean> => {
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingRole || (existingRole.role !== 'creator' && existingRole.role !== 'admin')) {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch('https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/ensure-creator-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({})
      });
      if (!resp.ok) {
        console.error('Role upgrade function error');
        return false;
      }
    }
    return true;
  };

  const saveProductDraft = async (submission: ProductSubmission): Promise<boolean> => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (!(await ensureCreatorRole(user.id))) {
        throw new Error('Unable to upgrade user role');
      }

      // If draftId is provided, update existing draft
      if (submission.draftId) {
        const { error } = await supabase
          .from('content_submissions')
          .update({
            title: submission.productData.title,
            description: submission.productData.description,
            category_id: submission.productData.category_id || null,
            tags: submission.productData.tags,
            updated_at: new Date().toISOString()
          })
          .eq('id', submission.draftId)
          .eq('creator_id', user.id);

        if (error) throw error;
        toast.success(`Draft updated: ${submission.productData.title}`);
      } else {
        // Create new draft
        const { error } = await supabase
          .from('content_submissions')
          .insert({
            creator_id: user.id,
            title: submission.productData.title,
            description: submission.productData.description,
            category_id: submission.productData.category_id || null,
            tags: submission.productData.tags,
            status: 'draft'
          });

        if (error) throw error;
        toast.success(`Draft saved: ${submission.productData.title}`);
      }
      
      return true;

    } catch (error) {
      console.error('Save draft error:', error);
      toast.error(`Error saving draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const publishProduct = async (submission: ProductSubmission): Promise<boolean> => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (!(await ensureCreatorRole(user.id))) {
        throw new Error('Unable to upgrade user role');
      }

      // Determine product price
      let productPrice: number | null = null;
      if (submission.productData.isFreeContent) {
        productPrice = 0;
      } else if (submission.file.type === 'application/pdf') {
        productPrice = 3.99;
      }

      // Generate SEO-friendly slug
      const baseSlug = generateSlug(
        submission.productData.title, 
        submission.productData.tags || []
      );
      
      // Check for existing slugs to ensure uniqueness
      const { data: existingSlugs } = await supabase
        .from('content_submissions')
        .select('slug')
        .not('slug', 'is', null);
      
      const slugList = existingSlugs?.map(s => s.slug).filter(Boolean) as string[] || [];
      const uniqueSlug = ensureUniqueSlug(baseSlug, slugList);
      
      console.log('🔗 Generated SEO slug:', uniqueSlug);

      let submissionId: string;

      // If draftId is provided, update existing draft to published
      if (submission.draftId) {
        const { data: updatedSubmission, error: updateError } = await supabase
          .from('content_submissions')
          .update({
            title: submission.productData.title,
            description: submission.productData.description,
            category_id: submission.productData.category_id || null,
            tags: submission.productData.tags,
            price: productPrice,
            slug: uniqueSlug,
            status: 'approved',
            updated_at: new Date().toISOString()
          })
          .eq('id', submission.draftId)
          .eq('creator_id', user.id)
          .select()
          .single();

        if (updateError) throw updateError;
        submissionId = updatedSubmission.id;
        console.log('📝 Updated draft to published:', submissionId);
      } else {
        // Create new content submission
        const { data: submissionData, error: submissionError } = await supabase
          .from('content_submissions')
          .insert({
            creator_id: user.id,
            title: submission.productData.title,
            description: submission.productData.description,
            category_id: submission.productData.category_id || null,
            tags: submission.productData.tags,
            price: productPrice,
            slug: uniqueSlug,
            status: 'approved'
          })
          .select()
          .single();

        if (submissionError) throw submissionError;
        submissionId = submissionData.id;
      }

      // Determine file type for database
      let fileType = submission.file.type.split('/')[0];
      if (submission.file.type === 'application/pdf') {
        fileType = 'document';
      }
      // For VFX archives, set type as 'document' (archive)
      const isArchive = submission.file.type.includes('rar') || 
                        submission.file.type.includes('zip') ||
                        submission.file.name?.toLowerCase().endsWith('.rar') ||
                        submission.file.name?.toLowerCase().endsWith('.zip');
      if (isArchive) {
        fileType = 'document';
      }

      const isVideo = fileType === 'video';
      const isPDF = submission.file.type === 'application/pdf';
      
      // Determine if VFX preview is a video (MP4)
      const isVfxVideoPreview = isArchive && submission.file.previewMediaType === 'video';
      
      const slugifiedFileName = generateSlugifiedFileName(
        submission.productData.title,
        submission.file.name
      );
      
      console.log('📁 Slugified file name:', slugifiedFileName);
      if (isVfxVideoPreview) {
        console.log('🎬 VFX product with video preview detected');
      }

      // Check if content_file already exists for this submission
      const { data: existingFile } = await supabase
        .from('content_files')
        .select('id')
        .eq('submission_id', submissionId)
        .maybeSingle();

      if (existingFile) {
        // Update existing file entry
        const { error: fileError } = await supabase
          .from('content_files')
          .update({
            file_name: slugifiedFileName,
            file_path: submission.file.url,
            file_type: fileType,
            file_format: submission.file.type,
            file_size: submission.file.size,
            file_hash: submission.file.fileHash || null,
            preview_path: submission.file.previewUrl,
            thumbnail_path: (isVideo || isPDF) ? submission.file.thumbnailUrl : submission.file.previewUrl,
            metadata: {
              isWatermarked: submission.file.isWatermarked || false,
              isAiGenerated: submission.file.isAiGenerated || false,
              originalFileName: submission.file.name,
              // Store preview media type for VFX products with video previews
              previewMediaType: isVfxVideoPreview ? 'video' : undefined
            }
          })
          .eq('id', existingFile.id);

        if (fileError) throw fileError;
      } else {
        // Create new content file entry
        const { error: fileError } = await supabase
          .from('content_files')
          .insert({
            submission_id: submissionId,
            file_name: slugifiedFileName,
            file_path: submission.file.url,
            file_type: fileType,
            file_format: submission.file.type,
            file_size: submission.file.size,
            file_hash: submission.file.fileHash || null,
            is_original: true,
            preview_path: submission.file.previewUrl,
            thumbnail_path: (isVideo || isPDF) ? submission.file.thumbnailUrl : submission.file.previewUrl,
            metadata: {
              isWatermarked: submission.file.isWatermarked || false,
              isAiGenerated: submission.file.isAiGenerated || false,
              originalFileName: submission.file.name,
              // Store preview media type for VFX products with video previews
              previewMediaType: isVfxVideoPreview ? 'video' : undefined
            }
          });

        if (fileError) throw fileError;
      }

      // Clean up: remove from uploaded_files since it's now in content_files
      // Also clean up any uploaded_files that were linked to this draft
      if (submission.file.id) {
        await supabase
          .from('uploaded_files')
          .delete()
          .eq('id', submission.file.id);
      }
      
      // Clean up all uploaded_files linked to this submission (draft)
      if (submission.draftId) {
        await supabase
          .from('uploaded_files')
          .delete()
          .eq('draft_id', submission.draftId);
      }

      toast.success(`✅ Product published: ${submission.productData.title}`);
      return true;

    } catch (error) {
      console.error('Publish error:', error);
      toast.error(`Publish error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const publishMultipleProducts = async (submissions: ProductSubmission[]): Promise<number> => {
    setLoading(true);
    let successCount = 0;
    
    try {
      for (const submission of submissions) {
        const success = await publishProduct(submission);
        if (success) {
          successCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} produit(s) publié(s) avec succès!`);
      }
      
    } catch (error) {
      console.error('Bulk publish error:', error);
      toast.error('Erreur lors de la publication en lot');
    } finally {
      setLoading(false);
    }
    
    return successCount;
  };

  return {
    loading,
    saveProductDraft,
    publishProduct,
    publishMultipleProducts
  };
};