import { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Heart, 
  Download, 
  ShoppingCart, 
  Share2, 
  Shield, 
  User,
  Calendar,
  Eye,
  Star,
  Loader2,
  FileVideo,
  Music,
  Flag
} from "lucide-react";
import { useProductDetail } from "@/hooks/useProductDetail";
import { supabase } from "@/integrations/supabase/client";
import { MediaPlayer } from "@/components/media/MediaPlayer";
import { AudioHeroPlayer } from "@/components/AudioHeroPlayer";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useWatermarkedPreview } from "@/hooks/useWatermarkedPreview";
import { useVideoPricing } from "@/hooks/useVideoPricing";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { useCart } from "@/hooks/useCart";
import { useLikes } from "@/hooks/useLikes";
import { SocialShareLazy } from "@/components/SocialShareLazy";
import { useSEO } from "@/hooks/useSEO";
import { ReportModal } from "@/components/ReportModal";
import { ProductReviews } from "@/components/product/ProductReviews";
import mockPhoto1 from "@/assets/mock-photo1.jpg";
import { isPexelsProductSlug } from "@/utils/pexelsSlug";
import { lazy } from "react";
const PexelsAssetDetail = lazy(() => import("./PexelsAssetDetail"));

/** Prominent download preview button - fetches as blob for proper file download */
const DownloadPreviewButton = ({ previewUrl, title, type }: { previewUrl: string; title: string; type: 'video' | 'audio' }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    const filenameBase = (title || 'preview').replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
    const ext = type === 'video' ? 'mp4' : 'mp3';
    const filename = `${filenameBase}_preview.${ext}`;
    const cleanUrl = previewUrl.split('#')[0];

    try {
      const response = await fetch(cleanUrl, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      const a = document.createElement('a');
      a.href = cleanUrl;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full gap-2 border-dashed border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
      onClick={handleDownload}
      disabled={downloading}
    >
      {downloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Downloading preview…
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download Watermarked Preview (Free)
        </>
      )}
    </Button>
  );
};

const ProductDetailInner = () => {
  // Support both new /products/:slug and legacy /product/:id routes
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const productIdentifier = slug || id || '';
  const { product, loading: productLoading, error } = useProductDetail(productIdentifier);
  const { content: marketplaceContent } = useMarketplace();
  const { hasUserLiked, toggleLike } = useLikes();
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState("standard");
  
  // Hooks for cart and direct purchase
  const { addToCart } = useCart();
  const { createDirectPayment, loading: directPurchaseLoading, userCredits, canPayWithCreditsForItem, payWithCredits, getItemTotal } = useDirectPurchase();

  // Redirect from legacy /product/:uuid to SEO-friendly /products/:slug
  useEffect(() => {
    // Only redirect if we're on the legacy /product/:id route (not /products/:slug)
    if (id && !slug && product?.slug) {
      // Replace current URL with SEO-friendly version (301-like behavior for SPA)
      navigate(`/products/${product.slug}`, { replace: true });
    }
  }, [id, slug, product?.slug, navigate]);

  // Create a minimal fallback product from marketplace if detailed fetch fails
  const fallbackProduct = useMemo(() => {
    const normalizeId = (raw?: string) => {
      if (!raw) return { id: '', isSlug: false };
      const match = raw.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
      if (match) return { id: match[0], isSlug: false };
      const clean = raw.split('?')[0].split('#')[0];
      return { id: clean, isSlug: true };
    };
    const { id: normalized, isSlug } = normalizeId(productIdentifier);
    if (!normalized) return null;
    
    // Find by UUID or by slug
    const item = isSlug 
      ? marketplaceContent.find((i) => i.slug === normalized)
      : marketplaceContent.find((i) => i.id === normalized);
    if (!item) return null;
    
    return {
      id: item.id,
      title: item.title,
      description: '',
      author: item.author,
      authorId: 'anonymous',
      type: item.type,
      thumbnail: item.thumbnail,
      previewUrl: item.videoUrl || item.audioUrl,
      tags: item.tags || [],
      uploadDate: item.created_at || '',
      likes: 0,
      downloads: 0,
      views: 0,
      price: item.price ?? 0,
      files: [],
      category: item.category_id ? { id: item.category_id, name: '' } : undefined,
    } as const;
  }, [marketplaceContent, productIdentifier]);

  // Create watermarked preview for images (use product or fallback)
  const { watermarkedUrl, isProcessing } = useWatermarkedPreview({
    imageUrl:
      (product?.type === 'photo') ? product?.thumbnail :
      (fallbackProduct?.type === 'photo') ? fallbackProduct?.thumbnail :
      undefined,
    enabled:
      (product?.type === 'photo') ||
      (fallbackProduct?.type === 'photo')
  });

  // Use dynamic pricing for videos
  const { resolution, basePrice, licensePrice, totalPrice, isVideo } = useVideoPricing({
    type: product?.type || '',
    files: product?.files || [],
    selectedLicense,
    isAiGenerated: product?.isAiGenerated || false
  });

  // Probe the actual preview video duration so the UI matches the playable length exactly
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);
  const isVideoLikeProduct =
    product?.type === 'video' ||
    (product?.type === 'vfx' && !!product?.previewUrl?.toLowerCase().includes('.mp4'));

  useEffect(() => {
    setVideoDurationSec(null);
    if (!isVideoLikeProduct || !product?.id) return;

    let cancelled = false;
    const probe = (sourceUrl: string) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.crossOrigin = 'anonymous';
      v.muted = true;
      const cleanup = () => {
        v.removeEventListener('loadedmetadata', onMeta);
        v.removeEventListener('error', onErr);
        v.removeAttribute('src');
        try { v.load(); } catch (_) {}
      };
      const onMeta = () => {
        const d = v.duration;
        if (!cancelled && Number.isFinite(d) && d > 0) setVideoDurationSec(d);
        cleanup();
      };
      const onErr = () => { cleanup(); };
      v.addEventListener('loadedmetadata', onMeta);
      v.addEventListener('error', onErr);
      v.src = sourceUrl.split('#')[0];
    };

    // Try to fetch the ORIGINAL (unmasked) video URL via dedicated RPC so
    // duration reflects true full length, not the (capped) preview length.
    (async () => {
      try {
        const { data: originalUrl } = await supabase
          .rpc('get_product_original_video_url', { content_id: product.id });
        if (cancelled) return;
        if (typeof originalUrl === 'string' && originalUrl.length > 0) {
          probe(originalUrl);
          return;
        }
      } catch (_) {}
      // Fallback to preview URL (may report shorter length)
      if (!cancelled && product?.previewUrl) probe(product.previewUrl);
    })();

    return () => { cancelled = true; };
  }, [isVideoLikeProduct, product?.id, product?.previewUrl]);


  const formatDuration = (sec: number) => {
    const s = Math.max(0, Math.round(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  // SEO Configuration - Must be called before any conditional returns
  const activeProduct = product || fallbackProduct;
  const productImage = activeProduct?.thumbnail || activeProduct?.previewUrl || '';
  const productPrice = isVideo ? basePrice : (activeProduct?.price || 0);
  
  useSEO({
    title: activeProduct?.title || 'Product',
    description: activeProduct?.description || 'View product details',
    image: productImage,
    type: 'product',
    author: activeProduct?.author,
    publishedTime: activeProduct?.uploadDate,
    tags: activeProduct?.tags || [],
    price: productPrice,
    currency: isVideo ? 'USD' : 'EUR'
  });

  // Protection contre le téléchargement et l'inspection
  useEffect(() => {
    // Empêcher le clic droit
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Empêcher le drag & drop d'images/vidéos
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Empêcher les raccourcis clavier dangereux
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 - DevTools
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I - DevTools
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+J - Console
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U - Voir le code source
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+S - Enregistrer la page
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+C - Inspect element
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }
    };

    // Ajouter les event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    // Nettoyer à la sortie
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (productLoading && !fallbackProduct) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading product...</span>
          </div>
        </div>
      </div>
    );
  }

  // Fallback minimal view if detailed product failed but marketplace has the item
  if ((error || !product) && fallbackProduct) {
    const fp = fallbackProduct;
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stock-gray border border-stock-border shadow-lg">
                {fp.type === 'video' ? (
                  <MediaPlayer 
                    src={fp.previewUrl || ''}
                    type="video"
                    title={fp.title}
                    poster={fp.thumbnail}
                    className="w-full h-full"
                    autoPlay={false}
                    controls={true}
                    muted={false}
                    watermarkSize="thumbnail"
                  />
                ) : fp.type === 'audio' ? (
                  <AudioHeroPlayer
                    src={fp.previewUrl || ''}
                    title={fp.title}
                    author={fp.author}
                    category="Music"
                  />
                ) : (
                  <img
                    src={watermarkedUrl || fp.thumbnail}
                    alt={fp.title}
                    className="w-full h-full object-cover"
                    draggable="false"
                    onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                  />
                )}
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-stock-dark">{fp.title}</h1>
              <div className="text-sm text-stock-dark/60">by {fp.author}</div>
              <div className="text-sm text-muted-foreground">Displaying in reduced mode - full details currently unavailable.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <p className="text-muted-foreground">
            {error || "The product you are looking for does not exist or is no longer available."}
          </p>
        </div>
      </div>
    );
  }

  // Get file info for display with better error handling
  const originalFile = product.files?.find(f => f.is_original);
  const fileSize = originalFile ? `${(originalFile.file_size / (1024 * 1024)).toFixed(1)} MB` : 'N/A';
  const fileFormat = originalFile?.file_name?.split('.').pop()?.toUpperCase() || product.type?.toUpperCase() || 'N/A';

  // Detect if this is an MP3 file by checking file URL extension (more reliable than type field)
  const isAudioByExtension = (() => {
    const previewUrl = product.previewUrl?.toLowerCase() || '';
    const fileUrl = originalFile?.file_path?.toLowerCase() || '';
    const fileName = originalFile?.file_name?.toLowerCase() || '';
    return previewUrl.endsWith('.mp3') || fileUrl.endsWith('.mp3') || fileName.endsWith('.mp3') || product.type === 'audio';
  })();
  
  // For now, dimensions will be extracted from actual metadata when available
  const dimensions = 'TBD'; // Will be updated when metadata is properly structured

  const licenses = [
    {
      id: "standard",
      name: "Standard License",
      price: 15,
      description: "Limited commercial use, up to 500,000 impressions",
      features: [
        "Web and print usage",
        "Social media",
        "Presentations",
        "Limited commercial use"
      ]
    },
    {
      id: "extended",
      name: "Extended License",
      price: 45,
      description: "Unlimited commercial use, resale allowed",
      features: [
        "All standard license rights",
        "Unlimited commercial use",
        "Resale of derivative products",
        "Use on products for sale"
      ]
    },
    {
      id: "exclusive",
      name: "Exclusive License",
      price: 299,
      description: "Exclusive rights, image removed from sale",
      features: [
        "All previous license rights",
        "Exclusive rights",
        "Image removed from marketplace",
        "Certificate of exclusivity"
      ]
    }
  ];

  // Check if product is free (price = 0)
  const isFreeContent = product?.price === 0;

  // Calculate and format price display for each license option
  const getPriceDisplay = (license: { id: string; price: number }) => {
    if (isFreeContent) {
      return 'Free';
    }
    if (isVideo) {
      // For videos: always use base price + license price
      const currentTotal = basePrice + license.price;
      return `$${currentTotal}`;
    } else {
      // For non-videos: show license price
      return `€${license.price}`;
    }
  };

  // Get related products from marketplace with better filtering
  const relatedProducts = marketplaceContent
    .filter(item => item.id !== product.id)
    .filter(item => {
      // Prioritize same category, then same author
      const sameCategory = item.category_id === product.category?.id;
      const sameAuthor = item.author === product.author;
      return sameCategory || sameAuthor;
    })
    .sort((a, b) => {
      // Sort by category match first, then by author match
      const aCategory = a.category_id === product.category?.id ? 2 : 0;
      const bCategory = b.category_id === product.category?.id ? 2 : 0;
      const aAuthor = a.author === product.author ? 1 : 0;
      const bAuthor = b.author === product.author ? 1 : 0;
      return (bCategory + bAuthor) - (aCategory + aAuthor);
    })
    .slice(0, 6);

  const handleAddToCart = () => {
    try {
      const finalPrice = isVideo ? totalPrice : (
        selectedLicense === 'standard' ? 15 :
        selectedLicense === 'extended' ? 45 : 299
      );
      
      addToCart({
        id: product.id, // Keep for backward compatibility
        submissionId: product.id, // Explicit submission_id
        title: product.title,
        author: product.author,
        price: finalPrice,
        type: product.type,
        thumbnail: product.thumbnail,
        licenseId: selectedLicense
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleDirectPurchase = async () => {
    if (!product) return;

    // IMPORTANT:
    // - price === 0 => explicitly free (bypass PayPal)
    // - price === null => license-based pricing (PayPal)
    const finalPrice = isFreeContent ? 0 : (isVideo ? basePrice : product.price);

    const result = await createDirectPayment({
      submission_id: product.id,
      title: product.title,
      author: product.author,
      price: finalPrice,
      license_id: selectedLicense,
      type: product.type,
      thumbnail: product.thumbnail,
    }, selectedLicense);

    const redirect = (result as any)?.redirect;
    if (redirect) {
      navigate(redirect);
    }
  };

  // Generate product URL for social sharing (productImage already declared at top)
  const productUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-background">
      
      <Header />
      <Navigation />

      <div className="container py-8 select-none">
        <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Video/Image Display */}
        <div className="lg:col-span-2 space-y-6">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stock-gray border border-stock-border shadow-lg">
        {(product.type === 'video' || (product.type === 'vfx' && product.previewUrl?.includes('.mp4'))) ? (
          <div className="w-full h-full bg-black rounded-xl overflow-hidden">
            {product.previewUrl ? (
              <MediaPlayer 
                src={product.previewUrl}
                type="video"
                title={product.title}
                poster={product.thumbnail?.includes('.mp4') || product.thumbnail?.includes('placeholder') ? undefined : product.thumbnail}
                className="w-full h-full"
                autoPlay={false}
                controls={true}
                muted={false}
                watermarkSize="thumbnail"
              />
            ) : (
              /* Video not available - show loading/waiting message */
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center p-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
                    <FileVideo className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Video processing</h3>
                  <p className="text-white/70 text-sm">
                    The video is currently being prepared.<br />
                    It will be available shortly.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : isAudioByExtension ? (
          <AudioHeroPlayer
            src={product.previewUrl || ''}
            title={product.title}
            author={product.author}
            category={product.category?.name || 'Music'}
          />
        ) : (
          <div className="relative">
            <img
              src={watermarkedUrl || product.thumbnail}
              alt={product.title}
              className={`w-full h-full object-cover ${isProcessing ? 'opacity-75' : ''}`}
              draggable="false"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Applying protection watermark...</span>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsLiked(!isLiked)}
            className="h-9 w-9 p-0 backdrop-blur-sm bg-white/90 hover:bg-white border border-white/20 shadow-sm"
          >
            <Heart 
              className="h-4 w-4" 
              fill={isLiked ? "hsl(var(--primary))" : "none"}
              color={isLiked ? "hsl(var(--primary))" : "currentColor"}
            />
          </Button>
          <SocialShareLazy
            url={productUrl}
            title={product.title}
            description={product.description}
            image={productImage}
            hashtags={product.tags}
            variant="secondary"
            size="sm"
            className="h-9 w-9 p-0 backdrop-blur-sm bg-white/90 hover:bg-white border border-white/20 shadow-sm"
          />
        </div>
        
        {/* Audio/Video indicator badge - positioned top-left to avoid overlapping play controls */}
        {product.type === 'video' && (
          <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 shadow-lg z-10">
            <FileVideo className="h-3 w-3" />
            Video {resolution || 'HD'}
          </div>
        )}
        
      </div>


            {/* Download Preview Button - Prominent for video/audio */}
            {(product.type === 'video' || product.type === 'vfx' || isAudioByExtension) && product.previewUrl && product.hasWatermarkedPreview && (
              <DownloadPreviewButton 
                previewUrl={product.previewUrl} 
                title={product.title} 
                type={product.type === 'video' || product.type === 'vfx' ? 'video' : 'audio'}
              />
            )}

            {/* Technical Details - Adobe Stock Style */}
            <div className="bg-stock-gray/50 rounded-lg p-4 border border-stock-border/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-stock-dark/60 text-xs font-medium mb-1">DIMENSIONS</div>
                  <div className="font-medium text-stock-dark">{dimensions}</div>
                </div>
                <div>
                  <div className="text-stock-dark/60 text-xs font-medium mb-1">FORMAT</div>
                  <div className="font-medium text-stock-dark">{fileFormat}</div>
                </div>
                <div>
                  <div className="text-stock-dark/60 text-xs font-medium mb-1">SIZE</div>
                  <div className="font-medium text-stock-dark">{fileSize}</div>
                </div>
                <div>
                  <div className="text-stock-dark/60 text-xs font-medium mb-1">TYPE</div>
                  <Badge variant="secondary" className="capitalize bg-stock-blue/10 text-stock-blue border-stock-blue/20">
                    {product.type}
                  </Badge>
                </div>
                {isVideoLikeProduct && videoDurationSec !== null && (
                  <div>
                    <div className="text-stock-dark/60 text-xs font-medium mb-1">DURATION</div>
                    <div className="font-medium text-stock-dark">{formatDuration(videoDurationSec)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Metadata & Purchase - Adobe Stock Style */}
          <div className="space-y-6">
            {/* Title and Author */}
            <div className="pb-4 border-b border-stock-border">
              <div className="flex items-start gap-2 mb-3">
                <h1 className="text-2xl font-bold text-stock-dark leading-tight">{product.title}</h1>
                {product.isAiGenerated && (
                  <Badge 
                    variant="secondary" 
                    className="bg-purple-100 text-purple-700 border-purple-200 text-xs shrink-0"
                  >
                    🤖 AI
                  </Badge>
                )}
              </div>

              

              
              {/* Author Info - Clickable Avatar */}
              <div className="flex items-center gap-3 mb-4">
                {product.authorStoreSlug ? (
                  <Link 
                    to={`/seller/${encodeURIComponent(product.authorStoreSlug)}`}
                    className="flex items-center gap-3 group hover:opacity-90 transition-opacity"
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                      <AvatarImage src={product.authorAvatar} alt={product.author} />
                      <AvatarFallback className="bg-stock-blue/10 text-stock-blue">
                        {product.author?.[0]?.toUpperCase() || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-stock-dark group-hover:text-primary transition-colors">
                        {product.author}
                      </div>
                      <div className="text-xs text-stock-dark/60">Creator</div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={product.authorAvatar} alt={product.author} />
                      <AvatarFallback className="bg-stock-blue/10 text-stock-blue">
                        {product.author?.[0]?.toUpperCase() || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-stock-dark">{product.author}</div>
                      <div className="text-xs text-stock-dark/60">Creator</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-6 text-sm text-stock-dark/60">
                <div className="flex items-center gap-1.5">
                  <Heart className="h-4 w-4" />
                  <span className="font-medium">{product.likes}</span>
                  <span className="text-xs">likes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Download className="h-4 w-4" />
                  <span className="font-medium">{product.downloads}</span>
                  <span className="text-xs">downloads</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium">{product.views}</span>
                  <span className="text-xs">views</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Tags - Adobe Stock Style */}
            <div>
              <h3 className="font-medium mb-3 text-stock-dark text-sm">KEYWORDS</h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="cursor-pointer text-xs px-2 py-1 border-stock-border bg-stock-gray/50 text-stock-dark/70 hover:border-stock-blue hover:bg-stock-blue/5 hover:text-stock-blue transition-colors"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* License Selection */}
            <div>
              <h3 className="font-semibold mb-4">Choose a license</h3>
            {/* License Selection - Hidden for free content */}
            {isFreeContent ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">Free</div>
                <p className="text-green-700 text-sm">
                  This content is available for free download. No license fee required.
                </p>
              </div>
            ) : (
              <>
                <h3 className="font-semibold mb-4">Choose a license</h3>
                {isVideo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <FileVideo className="h-4 w-4" />
                      <span className="font-medium">Video pricing {resolution}</span>
                    </div>
                    <div className="text-sm text-blue-700">
                      Base price {resolution}: <span className="font-semibold">${basePrice}</span>
                      {licensePrice > 0 && (
                        <>
                          <br />Selected license: <span className="font-semibold">+€{licensePrice}</span>
                          <br />Total price: <span className="font-semibold text-lg">${totalPrice}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {licenses.map((license) => (
                    <div
                      key={license.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedLicense === license.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedLicense(license.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedLicense === license.id
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          }`}>
                            {selectedLicense === license.id && (
                              <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{license.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {license.description}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {getPriceDisplay(license)}
                          </div>
                          {isVideo && selectedLicense === license.id && (
                            <div className="text-xs text-muted-foreground">
                              {basePrice}$ + {license.price}€
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {isFreeContent ? (
                <Button 
                  size="lg" 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleDirectPurchase}
                  disabled={directPurchaseLoading}
                >
                  {directPurchaseLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download for Free
                    </>
                  )}
                </Button>
              ) : (
                <>
                  {/* Credit balance indicator */}
                  {userCredits > 0 && (
                    <div className="text-sm text-muted-foreground text-center py-2 bg-primary/5 rounded-lg">
                      Your balance: <span className="font-semibold text-primary">{userCredits} credits</span>
                    </div>
                  )}
                  
                  {/* Pay with Credits button (primary if user has enough) */}
                  {canPayWithCreditsForItem({
                    submission_id: product.id,
                    title: product.title,
                    author: product.author,
                    price: isVideo ? basePrice : product.price,
                    type: product.type
                  }, selectedLicense) && (
                    <Button 
                      size="lg" 
                      className="flex-1"
                      onClick={async () => {
                        const result = await payWithCredits({
                          submission_id: product.id,
                          title: product.title,
                          author: product.author,
                          price: isVideo ? basePrice : product.price,
                          type: product.type,
                          thumbnail: product.thumbnail,
                        }, selectedLicense);
                        if (result?.redirect) navigate(result.redirect);
                      }}
                      disabled={directPurchaseLoading}
                    >
                      {directPurchaseLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Buy with {getItemTotal({
                            submission_id: product.id,
                            title: product.title,
                            author: product.author,
                            price: isVideo ? basePrice : product.price,
                            type: product.type
                          }, selectedLicense)} Credits
                        </>
                      )}
                    </Button>
                  )}
                  
                  <div className="flex gap-3">
                    <Button 
                      size="lg" 
                      className="flex-1"
                      variant={canPayWithCreditsForItem({
                        submission_id: product.id,
                        title: product.title,
                        author: product.author,
                        price: isVideo ? basePrice : product.price,
                        type: product.type
                      }, selectedLicense) ? "outline" : "default"}
                      onClick={handleAddToCart}
                      disabled={directPurchaseLoading}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to cart
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={handleDirectPurchase}
                      disabled={directPurchaseLoading}
                    >
                      {directPurchaseLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Redirecting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          PayPal
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* License Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Protected license</h4>
                  <p className="text-sm text-muted-foreground">
                    All our content is protected by clear and transparent licenses.
                    Use them with confidence for your projects.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-16">
          <Tabs defaultValue="reviews" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="related">Similar content</TabsTrigger>
              <TabsTrigger value="author">More from this author</TabsTrigger>
            </TabsList>
            
            <TabsContent value="reviews" className="mt-8">
              <ProductReviews submissionId={product.id} productTitle={product.title} />
            </TabsContent>
            
            <TabsContent value="related" className="mt-8">
              <h3 className="text-xl font-semibold mb-6">Similar content</h3>
              {relatedProducts.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedProducts.map((item) => (
                    <ContentCard key={item.id} {...item} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <Eye className="h-8 w-8" />
                  </div>
                  <p>No similar content found at the moment.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="author" className="mt-8">
              <h3 className="text-xl font-semibold mb-6">More from {product.author}</h3>
              {relatedProducts.filter(item => item.author === product.author).length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedProducts
                    .filter(item => item.author === product.author)
                    .map((item) => (
                      <ContentCard key={item.id} {...item} />
                    ))
                  }
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <User className="h-8 w-8" />
                  </div>
                  <p>No other content from this author at the moment.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Report Button */}
        <div className="mt-8 flex justify-center">
          <ReportModal submissionId={product.id} contentTitle={product.title}>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
            >
              <Flag className="h-4 w-4 mr-2" />
              Report this content
            </Button>
          </ReportModal>
        </div>
      </div>
    </div>
  );
};

/** Wrapper that delegates to PexelsAssetDetail for Pexels slugs */
const ProductDetail = () => {
  const { slug } = useParams<{ slug?: string }>();
  if (slug && isPexelsProductSlug(slug)) {
    return <Suspense fallback={null}><PexelsAssetDetail /></Suspense>;
  }
  return <ProductDetailInner />;
};

export default ProductDetail;