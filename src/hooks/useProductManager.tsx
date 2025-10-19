import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAIMetadata } from './useAIMetadata';

interface ProductFile {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  thumbnailUrl?: string;
  isWatermarked?: boolean;
}

interface ProductMetadata {
  title: string;
  description: string;
  category_id?: string;
  tags: string[];
}

interface ProductSubmission {
  file: ProductFile;
  productData: ProductMetadata;
}

export const useProductManager = () => {
  const [loading, setLoading] = useState(false);
  const { generateMetadata, loading: aiLoading } = useAIMetadata();

  const saveProductDraft = async (submission: ProductSubmission): Promise<boolean> => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create content submission as draft
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

      toast.success(`Brouillon sauvegardé: ${submission.productData.title}`);
      return true;

    } catch (error) {
      console.error('Save draft error:', error);
      toast.error(`Erreur lors de la sauvegarde: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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

      // Automatically set price to $3.99 USD for eBooks (PDF files)
      const productPrice = submission.file.type === 'application/pdf' ? 3.99 : null;

      // Create content submission
      const { data: submissionData, error: submissionError } = await supabase
        .from('content_submissions')
        .insert({
          creator_id: user.id,
          title: submission.productData.title,
          description: submission.productData.description,
          category_id: submission.productData.category_id || null,
          tags: submission.productData.tags,
          price: productPrice,
          status: 'approved' // Auto-approve for now
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      // Determine file type for database
      let fileType = submission.file.type.split('/')[0]; // 'image', 'video', etc.
      if (submission.file.type === 'application/pdf') {
        fileType = 'document'; // Store PDFs as 'document' type
      }

      // Create content file entry with proper thumbnail handling
      const isVideo = fileType === 'video';
      const isPDF = submission.file.type === 'application/pdf';
      
      const { error: fileError } = await supabase
        .from('content_files')
        .insert({
          submission_id: submissionData.id,
          file_name: submission.file.name,
          file_path: submission.file.url,
          file_type: fileType,
          file_format: submission.file.type,
          file_size: submission.file.size,
          is_original: true,
          preview_path: submission.file.previewUrl,
          // For videos: use thumbnailUrl, for PDFs: use thumbnailUrl (cover), for images: use previewUrl
          thumbnail_path: (isVideo || isPDF) ? submission.file.thumbnailUrl : submission.file.previewUrl,
          metadata: {
            isWatermarked: submission.file.isWatermarked || false
          }
        });

      if (fileError) throw fileError;

      toast.success(`✅ Produit publié avec succès: ${submission.productData.title}`);
      return true;

    } catch (error) {
      console.error('Publish error:', error);
      toast.error(`Erreur lors de la publication: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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

  const generateProductMetadata = async (file: ProductFile, sellerDescription?: string) => {
    const metadata = await generateMetadata({
      fileName: file.name,
      fileType: file.type,
      sellerDescription,
      language: 'fr' // Default to French, could be made dynamic
    });

    return metadata;
  };

  return {
    loading: loading || aiLoading,
    saveProductDraft,
    publishProduct,
    publishMultipleProducts,
    generateProductMetadata
  };
};