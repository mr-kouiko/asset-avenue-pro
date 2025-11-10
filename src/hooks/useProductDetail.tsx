import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useContentTranslation } from './useContentTranslation';

interface ProductDetailData {
  id: string;
  title: string;
  description: string;
  author: string;
  authorId: string;
  type: string;
  thumbnail: string;
  previewUrl?: string;
  tags: string[];
  uploadDate: string;
  likes: number;
  downloads: number;
  views: number;
  price: number | null;
  files: Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    thumbnail_path?: string;
    preview_path?: string;
    is_original: boolean;
  }>;
  category?: {
    id: string;
    name: string;
  };
}

export const useProductDetail = (productId: string) => {
  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { translateContent, currentLanguage } = useContentTranslation();

  useEffect(() => {
    const fetchProductDetail = async () => {
      if (!productId) {
        setError('ID produit manquant');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Use the secure function instead of direct table access
        const { data: productDetails, error: productError } = await supabase
          .rpc('get_product_detail', { product_id: productId });

        if (productError) {
          console.error('Error fetching product detail:', productError);
          throw productError;
        }

        if (!productDetails || productDetails.length === 0) {
          setError('Produit non trouvé');
          setLoading(false);
          return;
        }

        const productInfo = productDetails[0];

        // Fetch content files for the product
        const { data: files, error: filesError } = await supabase
          .from('content_files')
          .select('*')
          .eq('submission_id', productId);

        if (filesError) {
          console.error('Error fetching files:', filesError);
        }

        // Determine thumbnail and preview URLs
        let thumbnail = '/placeholder.svg';
        let previewUrl: string | undefined;
        const filesList = files || [];
        
        if (filesList.length > 0) {
          const thumbnailFile = filesList.find((f: any) => f.thumbnail_path);
          if (thumbnailFile?.thumbnail_path) {
            if (thumbnailFile.thumbnail_path.startsWith('http')) {
              thumbnail = thumbnailFile.thumbnail_path;
            } else {
              const { data } = supabase.storage
                .from('thumbnails')
                .getPublicUrl(thumbnailFile.thumbnail_path);
              thumbnail = data.publicUrl;
            }
          }

          const previewFile = filesList.find((f: any) => f.preview_path);
          if (previewFile?.preview_path) {
            if (previewFile.preview_path.startsWith('http')) {
              previewUrl = previewFile.preview_path;
            } else {
              const { data } = supabase.storage
                .from('previews')
                .getPublicUrl(previewFile.preview_path);
              previewUrl = data.publicUrl;
            }
          } else if (!thumbnailFile) {
            // Fallback to preview if no dedicated thumbnail
            if (previewFile?.preview_path) {
              const { data } = supabase.storage
                .from('previews')
                .getPublicUrl(previewFile.preview_path);
              thumbnail = data.publicUrl;
            }
          }
        }

        // Determine content type based on files with improved video detection
        let contentType = 'unknown';
        if (filesList.length > 0) {
          const firstFile = filesList[0];
          const fileType = firstFile.file_type?.toLowerCase() || '';
          const fileName = firstFile.file_path?.toLowerCase() || '';
          
          // Enhanced video detection - check both MIME type and file extension
          if (fileType.startsWith('video/') || 
              fileName.includes('.mp4') || 
              fileName.includes('.mov') || 
              fileName.includes('.avi') || 
              fileName.includes('.webm') || 
              fileName.includes('.mkv') ||
              fileName.includes('.wmv') ||
              fileName.includes('.flv')) {
            contentType = 'video';
            console.log('✅ Video content detected:', { fileType, fileName, contentType });
          }
          else if (fileType.startsWith('image/') || 
                   fileName.includes('.jpg') || 
                   fileName.includes('.jpeg') || 
                   fileName.includes('.png') || 
                   fileName.includes('.gif') || 
                   fileName.includes('.webp')) {
            contentType = 'photo';
          }
          else if (fileType.startsWith('audio/') || 
                   fileName.includes('.mp3') || 
                   fileName.includes('.wav') || 
                   fileName.includes('.ogg') || 
                   fileName.includes('.m4a')) {
            contentType = 'audio';
          }
          else if (fileType === 'application/pdf' || fileName.includes('.pdf')) {
            contentType = 'ebook';
          }
          // Only fallback to illustration for actual illustration files
          else if (fileType.includes('svg') || 
                   fileName.includes('.svg') || 
                   fileName.includes('.ai') || 
                   fileName.includes('.eps')) {
            contentType = 'illustration';
          }
          else {
            // Log unrecognized files for debugging
            console.warn('⚠️ Unrecognized file type, defaulting to photo:', { fileType, fileName });
            contentType = 'photo'; // Default to photo instead of illustration
          }
        }

        // For audio files, use public URL from original-files bucket
        if (contentType === 'audio' && filesList.length > 0) {
          const audioFile = filesList.find((f: any) =>
            f.is_original && (
              f.file_type?.toLowerCase().startsWith('audio') ||
              f.file_format?.toLowerCase().startsWith('audio/') ||
              /\.(mp3|wav|ogg|m4a)$/.test((f.file_path || '').toLowerCase())
            )
          );
          if (audioFile?.file_path) {
            console.log('🎵 Creating public URL for audio:', audioFile.file_path);
            if (audioFile.file_path.startsWith('http')) {
              previewUrl = audioFile.file_path;
            } else {
              const { data: publicData } = supabase.storage
                .from('uploads')
                .getPublicUrl(audioFile.file_path);
              previewUrl = publicData.publicUrl;
            }
            console.log('🔊 Audio URL created:', previewUrl);
          }
        }

        // For video files, use public URL from original-files bucket  
        if (contentType === 'video' && filesList.length > 0) {
          const videoFile = filesList.find((f: any) =>
            f.is_original && (
              f.file_type?.toLowerCase().startsWith('video') ||
              f.file_format?.toLowerCase().startsWith('video/') ||
              /\.(mp4|mov|avi|webm|mkv|wmv|flv)$/.test((f.file_path || '').toLowerCase())
            )
          );
          if (videoFile?.file_path) {
            console.log('🎬 Creating public URL for video:', videoFile.file_path);
            if (videoFile.file_path.startsWith('http')) {
              previewUrl = videoFile.file_path;
            } else {
              const { data: publicData } = supabase.storage
                .from('uploads')
                .getPublicUrl(videoFile.file_path);
              previewUrl = publicData.publicUrl;
            }
            console.log('📺 Video URL created:', previewUrl);
          }
        }

        const productData: ProductDetailData = {
          id: productInfo.id,
          title: productInfo.title,
          description: productInfo.description,
          author: productInfo.creator_store_name || 'Boutique anonyme', // Use ONLY store name, no fallback to display name
          authorId: 'anonymous', // Don't expose real creator ID
          type: contentType,
          thumbnail,
          previewUrl,
          tags: productInfo.tags || [],
          uploadDate: productInfo.created_at,
          likes: 0, // Would need to implement likes system
          downloads: 0, // Would need to fetch from downloads table
          views: 0, // Would need to implement views tracking
          price: productInfo.price,
          files: filesList.map((file: any) => ({
            id: file.id,
            file_name: file.file_name,
            file_path: file.file_path,
            file_type: file.file_type,
            file_size: file.file_size,
            thumbnail_path: file.thumbnail_path,
            preview_path: file.preview_path,
            is_original: file.is_original
          })),
          category: productInfo.category_name ? {
            id: productInfo.category_id,
            name: productInfo.category_name
          } : undefined
        };

        // Translate product details to visitor's language
        const translation = await translateContent(
          productData.id,
          productData.title,
          productData.description,
          productData.tags
        );

        const translatedProduct = {
          ...productData,
          title: translation.title,
          description: translation.description,
          tags: translation.tags
        };

        setProduct(translatedProduct);
      } catch (err) {
        console.error('Error loading product:', err);
        setError('Erreur lors du chargement du produit');
        toast.error('Impossible de charger le produit');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetail();
  }, [productId, currentLanguage]);

  return {
    product,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      setError(null);
      // Re-run the effect by updating a dependency
    }
  };
};