import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
            const { data } = supabase.storage
              .from('thumbnails')
              .getPublicUrl(thumbnailFile.thumbnail_path);
            thumbnail = data.publicUrl;
          }

          const previewFile = filesList.find((f: any) => f.preview_path);
          if (previewFile?.preview_path) {
            const { data } = supabase.storage
              .from('previews')
              .getPublicUrl(previewFile.preview_path);
            previewUrl = data.publicUrl;
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

        // Determine content type based on files
        let contentType = 'unknown';
        if (filesList.length > 0) {
          const firstFile = filesList[0];
          if (firstFile.file_type.startsWith('image/')) contentType = 'photo';
          else if (firstFile.file_type.startsWith('video/')) contentType = 'video';
          else if (firstFile.file_type.startsWith('audio/')) contentType = 'audio';
          else contentType = 'illustration';
        }

        // For audio files, try to get signed URL for original file with mobile optimization
        if (contentType === 'audio' && filesList.length > 0) {
          const audioFile = filesList.find((f: any) => f.is_original && f.file_type.startsWith('audio/'));
          if (audioFile?.file_path) {
            try {
              console.log('🎵 Creating signed URL for audio:', audioFile.file_path);
              const { data: signedData, error: signedError } = await supabase.storage
                .from('original-files')
                .createSignedUrl(audioFile.file_path, 24 * 60 * 60); // 24 hours expiry for mobile reliability
              
              if (signedData?.signedUrl && !signedError) {
                previewUrl = signedData.signedUrl;
                console.log('✅ Signed audio URL created:', previewUrl);
              } else {
                console.warn('⚠️ Audio signed URL failed, using public fallback:', signedError);
                const { data: publicData } = supabase.storage
                  .from('original-files')
                  .getPublicUrl(audioFile.file_path);
                previewUrl = publicData.publicUrl;
                console.log('🔊 Public audio URL:', previewUrl);
              }
            } catch (error) {
              console.warn('❌ Audio URL creation failed, using public fallback:', error);
              const { data: publicData } = supabase.storage
                .from('original-files')
                .getPublicUrl(audioFile.file_path);
              previewUrl = publicData.publicUrl;
              console.log('🚨 Emergency audio URL:', previewUrl);
            }
          }
        }

        // For video files, try to get signed URL for original file with mobile optimization
        if (contentType === 'video' && filesList.length > 0) {
          const videoFile = filesList.find((f: any) => f.is_original && f.file_type.startsWith('video/'));
          if (videoFile?.file_path) {
            try {
              console.log('🎬 Creating signed URL for video:', videoFile.file_path);
              const { data: signedData, error: signedError } = await supabase.storage
                .from('original-files')
                .createSignedUrl(videoFile.file_path, 24 * 60 * 60); // 24 hours expiry for mobile reliability
              
              if (signedData?.signedUrl && !signedError) {
                previewUrl = signedData.signedUrl;
                console.log('✅ Signed video URL created:', previewUrl);
              } else {
                console.warn('⚠️ Signed URL failed, using public fallback:', signedError);
                const { data: publicData } = supabase.storage
                  .from('original-files')
                  .getPublicUrl(videoFile.file_path);
                previewUrl = publicData.publicUrl;
                console.log('📺 Public video URL:', previewUrl);
              }
            } catch (error) {
              console.error('❌ Video URL creation failed, using public fallback:', error);
              const { data: publicData } = supabase.storage
                .from('original-files')
                .getPublicUrl(videoFile.file_path);
              previewUrl = publicData.publicUrl;
              console.log('🚨 Emergency video URL:', previewUrl);
            }
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

        setProduct(productData);
      } catch (err) {
        console.error('Error loading product:', err);
        setError('Erreur lors du chargement du produit');
        toast.error('Impossible de charger le produit');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetail();
  }, [productId]);

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