import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateSlug, ensureUniqueSlug, generateSlugifiedFileName } from '@/utils/slugGenerator';
import { getImageDimensions, getVideoDimensions } from '@/utils/mediaDimensions';

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
  aiDeclaration?: 'fully_ai_generated' | 'ai_assisted' | 'no_ai_used';
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
      const resp = await fetch('https://visustock.com/api/ensure-creator-role', {
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

      // Determine product price — MUST never be NULL.
      // Marketplace pricing rules by media type.
      const mime = (submission.file.type || '').toLowerCase();
      const name = (submission.file.name || '').toLowerCase();
      const isArchiveFile = mime.includes('rar') || mime.includes('zip') ||
        name.endsWith('.rar') || name.endsWith('.zip');
      const isVectorFile = mime === 'image/svg+xml' || name.endsWith('.svg');
      const isPdfFile = mime === 'application/pdf' || name.endsWith('.pdf');
      const isVideoFile = mime.startsWith('video/');
      const isAudioFile = mime.startsWith('audio/');
      const isImageFile = mime.startsWith('image/') && !isVectorFile;

      let productPrice: number;
      if (submission.productData.isFreeContent) {
        productPrice = 0;
      } else if (isVideoFile) {
        productPrice = 20.00;
      } else if (isArchiveFile) {
        // VFX archives
        productPrice = 20.00;
      } else if (isVectorFile) {
        productPrice = 4.99;
      } else if (isAudioFile) {
        productPrice = 4.99;
      } else if (isPdfFile) {
        productPrice = 3.99;
      } else if (isImageFile) {
        productPrice = 2.99;
      } else {
        productPrice = 2.99;
      }

      // Safeguard: publishing must never proceed with a NULL/invalid price.
      if (productPrice === null || productPrice === undefined || Number.isNaN(productPrice)) {
        throw new Error('Publish blocked: computed price is invalid. Please retry.');
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

      // If draftId is provided, update existing draft to pending_review
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
            ai_declaration: submission.productData.aiDeclaration || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', submission.draftId)
          .eq('creator_id', user.id)
          .select()
          .single();

        if (updateError) throw updateError;
        submissionId = updatedSubmission.id;
        console.log('📝 Updated draft to approved:', submissionId);
      } else {
        // Create new content submission with pending_review
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
            status: 'approved',
            ai_declaration: submission.productData.aiDeclaration || null
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

      // Videos no longer use the old server-side MP4 preview pipeline.
      // They publish with the original MP4 and are protected at playback time
      // by the CSS watermark overlay in the video player.
      const previewPath = isVideo ? null : submission.file.previewUrl || null;

      // Best-effort: detect intrinsic pixel dimensions so orientation filters
      // (vertical / horizontal / square) work from real aspect ratio.
      let detectedWidth: number | undefined;
      let detectedHeight: number | undefined;
      try {
        if (isVideo && submission.file.url) {
          const d = await getVideoDimensions(submission.file.url);
          if (d) { detectedWidth = d.width; detectedHeight = d.height; }
        } else if (fileType === 'image' && (submission.file.previewUrl || submission.file.url)) {
          const d = await getImageDimensions(submission.file.previewUrl || submission.file.url);
          if (d) { detectedWidth = d.width; detectedHeight = d.height; }
        }
      } catch (dimErr) {
        console.warn('[useProductManager] dimension detection failed:', dimErr);
      }

      const fileMetadata: Record<string, any> = {
        isWatermarked: submission.file.isWatermarked || false,
        isAiGenerated: submission.file.isAiGenerated || false,
        originalFileName: submission.file.name,
        previewMediaType: isVfxVideoPreview ? 'video' : undefined,
      };
      if (detectedWidth && detectedHeight) {
        fileMetadata.width = detectedWidth;
        fileMetadata.height = detectedHeight;
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
            preview_path: previewPath,
            thumbnail_path: (isVideo || isPDF) ? submission.file.thumbnailUrl : submission.file.previewUrl,
            metadata: fileMetadata,
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
            preview_path: previewPath,
            thumbnail_path: (isVideo || isPDF) ? submission.file.thumbnailUrl : submission.file.previewUrl,
            metadata: fileMetadata,
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

      // Automatic AI content scan disabled — submissions go directly to manual admin review.

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