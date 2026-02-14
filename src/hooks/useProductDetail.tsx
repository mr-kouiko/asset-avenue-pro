import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { slugifyStoreName } from '@/utils/slugGenerator';
import { toast } from 'sonner';

interface ProductDetailData {
  id: string;
  title: string;
  description: string;
  author: string;
  authorId: string;
  authorAvatar?: string;
  authorStoreSlug?: string;
  type: string;
  thumbnail: string;
  previewUrl?: string;
  tags: string[];
  uploadDate: string;
  likes: number;
  downloads: number;
  views: number;
  price: number | null;
  original_language?: string;
  slug?: string;
  isAiGenerated?: boolean;
  files: Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    thumbnail_path?: string;
    preview_path?: string;
    is_original: boolean;
    metadata?: Record<string, any>;
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

  // Normalize route param to handle IDs with extra slugs (e.g., 
  // "/product/<uuid>-some-title" → extract the UUID). Also strips query/hash.
  // Also check if it's a slug (no UUID found)
  const normalizeId = (raw: string) => {
    if (!raw) return { id: raw, isSlug: false };
    const uuidMatch = raw.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    if (uuidMatch) return { id: uuidMatch[0], isSlug: false };
    const clean = raw.split('?')[0].split('#')[0];
    // If no UUID found, assume it's a slug
    return { id: clean, isSlug: true };
  };
  const { id: normalizedId, isSlug } = normalizeId(productId);
  console.log('🆔 useProductDetail IDs', { originalId: productId, normalizedId, isSlug });

  useEffect(() => {
    let isMounted = true;
    const fetchProductDetail = async () => {
      if (!normalizedId) {
        console.log('🔎 useProductDetail: raw id:', productId, 'normalized:', normalizedId);
        setError('ID produit manquant');
        setLoading(false);
        return;
      }

      // Helper: create timeout promise
      const createTimeout = (ms: number) => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), ms));

      // Helper: fetch marketplace fallback
      const fetchMarketplaceFallback = async (): Promise<any | null> => {
        try {
          console.warn('🔄 Attempting marketplace fallback for id:', normalizedId);
          const marketplacePromise = supabase.rpc('get_marketplace_content');
          const result = await Promise.race([marketplacePromise, createTimeout(8000)]);
          
          const { data: marketplaceData, error: marketplaceError } = result as any;
          if (marketplaceError) throw marketplaceError;
          if (!marketplaceData) return null;

          const found = (marketplaceData as any[]).find((i) => i.id === normalizedId);
          if (!found) return null;

          return {
            id: found.id,
            title: found.title || 'Untitled',
            description: found.description || '',
            creator_store_name: found.creator_store_name || 'Anonymous Store',
            created_at: found.created_at,
            price: found.price ?? null,
            tags: found.tags || [],
            category_id: found.category_id,
            category_name: (found as any).category_name,
          };
        } catch (err) {
          console.error('❌ Marketplace fallback failed:', err);
          return null;
        }
      };

      try {
        console.log('🔍 [PRODUCT-DETAIL] Starting fetchProduct for ID:', productId);
        const startTime = Date.now();
        
        setLoading(true);
        setError(null);

        // Normalize UUID (remove URL parts if present)
        console.log('🆔 [PRODUCT-DETAIL] Normalized product ID:', normalizedId);

        let productInfo: any | null = null;
        // Track the actual UUID for file fetching (may differ from normalizedId if we looked up by slug)
        let actualProductUuid = normalizedId;
        
          try {
            console.log('📊 [PRODUCT-DETAIL] Fetching product...', { isSlug, normalizedId });
            const rpcStart = Date.now();
            
            // If it's a slug, fetch by slug first, otherwise use UUID
            let result;
            if (isSlug) {
              console.log('🔗 [PRODUCT-DETAIL] Fetching by slug:', normalizedId);
              // Fetch by slug
              const slugPromise = supabase
                .from('content_submissions')
                .select(`
                  id,
                  title,
                  description,
                  created_at,
                  price,
                  tags,
                  category_id,
                  slug,
                  creator_id
                `)
                .eq('slug', normalizedId)
                .eq('status', 'approved')
                .single();
              
              result = await Promise.race([slugPromise, createTimeout(8000)]);
              const { data: slugData, error: slugError } = result as any;
              
              if (slugError) {
                console.error('❌ [PRODUCT-DETAIL] Slug lookup error:', slugError);
                throw slugError;
              }
              
              if (slugData) {
                // Update actualProductUuid with the real UUID from slug lookup
                actualProductUuid = slugData.id;
                console.log('✅ [PRODUCT-DETAIL] Product loaded by slug, UUID:', actualProductUuid);
                
                // Now fetch creator info using secure public RPC (works for anonymous users)
                const { data: creatorData } = await supabase
                  .rpc('get_creator_public_info', { creator_ids: [slugData.creator_id] });
                
                const creator = (creatorData as any[])?.[0];
                productInfo = {
                  ...slugData,
                  creator_store_name: creator?.store_name || creator?.display_name || 'Anonymous Store',
                  creator_avatar: creator?.avatar_url || null,
                  creator_store_slug: slugifyStoreName(creator?.store_name || creator?.display_name || ''),
                };
              }
            } else {
              // Use existing UUID-based RPC call
              const rpcPromise = supabase.rpc('get_product_detail', { product_id: normalizedId });
              result = await Promise.race([rpcPromise, createTimeout(8000)]);
              const { data: productDetails, error: productError } = result as any;
              
              const rpcTime = Date.now() - rpcStart;
              console.log(`📦 [PRODUCT-DETAIL] RPC get_product_detail completed in ${rpcTime}ms`);
              
              if (productError) {
                console.error('❌ [PRODUCT-DETAIL] RPC ERROR get_product_detail:', productError);
                throw productError;
              }
              const count = Array.isArray(productDetails) ? productDetails.length : 0;
              console.log('📥 [PRODUCT-DETAIL] RPC result count:', count);
              if (count > 0) {
                productInfo = productDetails[0];
                console.log('✅ [PRODUCT-DETAIL] Product loaded:', productInfo.title);
                
                // RPC doesn't return slug or avatar, so fetch them separately
                const { data: submissionData } = await supabase
                  .from('content_submissions')
                  .select('slug, creator_id')
                  .eq('id', normalizedId)
                  .single();
                if (submissionData?.slug) {
                  productInfo.slug = submissionData.slug;
                }
                
                // Fetch creator avatar and name using secure public RPC (works for anonymous users)
                if (submissionData?.creator_id) {
                  const { data: creatorProfiles } = await supabase
                    .rpc('get_creator_public_info', { creator_ids: [submissionData.creator_id] });
                  
                  const creatorProfile = (creatorProfiles as any[])?.[0];
                  productInfo.creator_avatar = creatorProfile?.avatar_url || null;
                  productInfo.creator_store_slug = slugifyStoreName(creatorProfile?.store_name || creatorProfile?.display_name || '');
                  // Apply fallback if RPC returned 'Anonymous Store'
                  if (!productInfo.creator_store_name || productInfo.creator_store_name === 'Anonymous Store') {
                    productInfo.creator_store_name = creatorProfile?.store_name || creatorProfile?.display_name || 'Anonymous Store';
                  }
                }
              } else {
                console.warn('⚠️ [PRODUCT-DETAIL] RPC returned empty array for id:', normalizedId);
              }
            }
          } catch (err: any) {
            const isTimeout = typeof err?.message === 'string' && err.message.toLowerCase().includes('timeout');
            console.warn(isTimeout ? '⏳ RPC timeout reached' : '⚠️ RPC failed', { normalizedId, error: err });
            console.warn('🔄 Will try marketplace fallback next');
          }

        // If RPC failed, use marketplace fallback
        if (!productInfo) {
          productInfo = await fetchMarketplaceFallback();
          if (productInfo) {
            actualProductUuid = productInfo.id;
          }
        }

        // If still no product info, set error but don't block render (ProductDetail has UI fallback)
        if (!productInfo) {
          setError('Produit non trouvé');
          setLoading(false);
          return;
        }

        // Fetch content files for the product using the actual UUID (not the slug!)
        console.log('📁 [PRODUCT-DETAIL] Fetching files for product UUID:', actualProductUuid);
        const filesStartTime = Date.now();
        
        const { data: files, error: filesError } = await supabase
          .rpc('get_product_files', { content_id: actualProductUuid });

        const filesFetchTime = Date.now() - filesStartTime;
        console.log(`📁 [PRODUCT-DETAIL] Files fetch completed in ${filesFetchTime}ms`);
        
        if (filesError) {
          console.error('❌ [PRODUCT-DETAIL] Error fetching files:', filesError);
          console.error('   Product ID:', actualProductUuid);
          console.error('   Error details:', JSON.stringify(filesError, null, 2));
        } else {
          console.log(`✅ [PRODUCT-DETAIL] Files fetched: ${files?.length || 0} files`);
          if (files && files.length > 0) {
            console.log('   File types:', files.map(f => f.file_type).join(', '));
            console.log('   Total size:', (files.reduce((sum, f) => sum + (f.file_size || 0), 0) / 1024 / 1024).toFixed(2), 'MB');
            files.forEach(file => {
              console.log(`  📄 [PRODUCT-DETAIL] File: ${file.file_name} | Path: ${file.file_path} | Preview: ${file.is_preview} | Original: ${file.is_original}`);
            });
          }
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
          const fileFormat = firstFile.file_format?.toLowerCase() || '';
          
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
          // VFX detection - archive files with video preview
          else if (fileType === 'document' || 
                   fileFormat.includes('rar') ||
                   fileFormat.includes('zip') ||
                   fileFormat.includes('7z') ||
                   fileName.includes('.rar') || 
                   fileName.includes('.zip') || 
                   fileName.includes('.7z') ||
                   fileName.includes('.tar')) {
            // Check if this archive has a video preview - indicates VFX content
            const hasVideoPreview = filesList.some((f: any) => 
              f.preview_path?.toLowerCase().includes('.mp4') ||
              f.thumbnail_path?.toLowerCase().includes('.mp4')
            );
            if (hasVideoPreview) {
              contentType = 'vfx';
              console.log('✅ VFX content detected (archive with video preview):', { fileType, fileName, fileFormat });
            } else {
              contentType = 'ebook'; // Archive without video preview treated as downloadable
              console.log('📦 Archive content detected (no video preview):', { fileType, fileName });
            }
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

        // SECURITY: For video files, ONLY use preview_path (720p watermarked)
        // Original HD files are stored in a private bucket and NEVER exposed to frontend
        if (contentType === 'video' && filesList.length > 0) {
          // First try: use preview_path from any video file (server-generated 720p preview)
          const videoFileWithPreview = filesList.find((f: any) =>
            f.preview_path && (
              f.file_type?.toLowerCase().startsWith('video') ||
              f.file_format?.toLowerCase().startsWith('video/')
            )
          );
          if (videoFileWithPreview?.preview_path) {
            previewUrl = videoFileWithPreview.preview_path;
            console.log('🔒 Using secure 720p preview for video:', previewUrl);
          } else {
            // Fallback: use thumbnail_path if no preview generated yet
            const videoFileWithThumb = filesList.find((f: any) =>
              f.thumbnail_path && (
                f.file_type?.toLowerCase().startsWith('video') ||
                f.file_format?.toLowerCase().startsWith('video/')
              )
            );
            if (videoFileWithThumb?.thumbnail_path) {
              previewUrl = videoFileWithThumb.thumbnail_path;
              console.log('🖼️ Using thumbnail as video preview (no 720p preview yet):', previewUrl);
            } else {
              console.warn('⚠️ No preview or thumbnail available for video - preview generation needed');
            }
          }
        }

        // Check if any file has isAiGenerated flag in metadata
        const isAiGenerated = filesList.some((file: any) => 
          file.metadata?.isAiGenerated === true
        );

        const productData: ProductDetailData = {
          id: productInfo.id,
          title: productInfo.title,
          description: productInfo.description,
          author: productInfo.creator_store_name || 'Anonymous Store', // Use ONLY store name, no fallback to display name
          authorId: 'anonymous', // Don't expose real creator ID
          authorAvatar: productInfo.creator_avatar || undefined,
          authorStoreSlug: productInfo.creator_store_slug || undefined,
          type: contentType,
          thumbnail,
          previewUrl,
          tags: productInfo.tags || [],
          uploadDate: productInfo.created_at,
          likes: 0, // Would need to implement likes system
          downloads: 0, // Would need to fetch from downloads table
          views: 0, // Would need to implement views tracking
          price: productInfo.price,
          original_language: productInfo.original_language || 'en',
          slug: productInfo.slug,
          isAiGenerated,
          files: filesList.map((file: any) => ({
            id: file.id,
            file_name: file.file_name,
            file_path: file.file_path,
            file_type: file.file_type,
            file_size: file.file_size,
            thumbnail_path: file.thumbnail_path,
            preview_path: file.preview_path,
            is_original: file.is_original,
            metadata: file.metadata
          })),
          category: productInfo.category_name ? {
            id: productInfo.category_id,
            name: productInfo.category_name
          } : undefined
        };

        // Site is 100% English now - no translation needed
        console.log('📦 Final productData', productData);
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
    return () => { isMounted = false; };
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