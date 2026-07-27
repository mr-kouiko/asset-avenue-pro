import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { LazyImage } from "@/components/LazyImage";
import { ArrowLeft } from "lucide-react";
import { fetchPexelsPhotoById, fetchPexelsVideoById, type PexelsItem } from "@/hooks/usePexelsSearch";
import { useSEO } from "@/hooks/useSEO";
import { usePexelsSEOContent } from "@/hooks/usePexelsSEOContent";
import { parsePexelsSlug, parsePexelsProductSlug, generatePexelsProductSlug } from "@/utils/pexelsSlug";
import { PexelsSchemaOrg } from "@/components/pexels/PexelsSchemaOrg";
import { PexelsDetailSidebar } from "@/components/pexels/PexelsDetailSidebar";
import { PexelsPremiumAlternatives } from "@/components/pexels/PexelsPremiumAlternatives";
import { PexelsSEOSections } from "@/components/pexels/PexelsSEOSections";
import { VideoWatermark } from "@/components/VideoWatermark";
import { AIImageStudioTrigger } from "@/components/ai-studio/AIImageStudioPanel";
import { PreviewTemplateButton } from "@/components/preview-template/PreviewTemplateButton";

const PexelsAssetDetail = () => {
  const { slug, pexelsId } = useParams<{ slug?: string; pexelsId?: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<PexelsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (slug) {
      const productParsed = parsePexelsProductSlug(slug);
      if (productParsed) return productParsed;
      return parsePexelsSlug(slug);
    }
    if (pexelsId) {
      const match = pexelsId.match(/pexels-(\d+)/);
      if (match) {
        const isLegacyVideo = window.location.pathname.startsWith('/free-video/');
        return { type: (isLegacyVideo ? 'video' : 'photo') as 'photo' | 'video', numericId: parseInt(match[1], 10) };
      }
    }
    return null;
  }, [slug, pexelsId]);

  const isVideo = parsed?.type === 'video';

  useEffect(() => {
    if (!parsed) { setError('Invalid asset URL'); setLoading(false); return; }
    const fetchItem = async () => {
      setLoading(true);
      try {
        const result = parsed.type === 'video'
          ? await fetchPexelsVideoById(parsed.numericId)
          : await fetchPexelsPhotoById(parsed.numericId);
        if (result) setItem(result); else setError('Asset not found');
      } catch { setError('Failed to load asset'); }
      finally { setLoading(false); }
    };
    fetchItem();
  }, [parsed]);

  // AI-generated SEO content
  const { content: seoContent, loading: seoLoading } = usePexelsSEOContent(item);

  // SEO metadata — prefer AI-generated
  const seoTitle = seoContent?.seo_title
    || (item ? `Free ${isVideo ? 'Stock Video' : 'Stock Photo'}${item.alt ? ` – ${item.alt}` : ''} by ${item.photographer} | VisuStock` : `Free ${isVideo ? 'Video' : 'Photo'} | VisuStock`);
  const seoDescription = seoContent?.meta_description
    || (item ? `Download this free ${isVideo ? 'stock video' : 'stock photo'}${item.alt ? ` of ${item.alt}` : ''} by ${item.photographer}. Explore premium alternatives on VisuStock.` : '');

  useSEO({ title: seoTitle, description: seoDescription, type: 'article', image: item?.largeThumbnail });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-8 max-w-6xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="aspect-video w-full rounded-xl mb-6" />
          <Skeleton className="h-6 w-64 mb-4" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Asset Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || 'This asset could not be loaded.'}</p>
          <Button onClick={() => navigate('/marketplace')}><ArrowLeft className="h-4 w-4 mr-2" /> Back to Marketplace</Button>
        </div>
      </div>
    );
  }

  const pageSlug = generatePexelsProductSlug(item.type as 'photo' | 'video', item.numericId, item.title, item.alt);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <PexelsSchemaOrg item={item} isVideo={isVideo} slug={pageSlug} productStyle seoContent={seoContent} />

      <article className="container py-8 max-w-6xl">
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* H1 — prefer AI-generated */}
            <h1 className="text-2xl font-bold text-foreground mb-4">
              {seoContent?.h1 || item.alt || item.title}
            </h1>

            <div className="relative rounded-xl overflow-hidden bg-muted">
              {isVideo && item.videoUrl ? (
                <>
                  <video className="w-full aspect-video object-contain bg-black" controls muted playsInline poster={item.thumbnail} preload="metadata">
                    <source src={item.videoUrl} type="video/mp4" />
                  </video>
                  <VideoWatermark size="large" />
                </>
              ) : (
                <div className="relative">
                  <LazyImage src={item.largeThumbnail || item.thumbnail} alt={item.alt || item.title} className="w-full object-contain" />
                  <VideoWatermark size="large" />
                  <div className="absolute top-3 left-3 z-10">
                    <AIImageStudioTrigger
                      imageUrl={item.largeThumbnail || item.thumbnail}
                      filenameBase={`pexels-${item.id}`}
                      source="pexels"
                    />
                  </div>
                </div>
              )}
              <div className="absolute top-3 right-3 z-10">
                <PreviewTemplateButton
                  assetUrl={isVideo ? (item.videoUrl || item.largeThumbnail || item.thumbnail) : (item.largeThumbnail || item.thumbnail)}
                  assetType={isVideo ? 'video' : 'image'}
                  title={item.alt || item.title}
                  variant="secondary"
                  size="sm"
                  className="h-9 backdrop-blur-sm bg-white/90 hover:bg-white border border-white/20 shadow-sm text-xs"
                  label="Preview"
                />
              </div>
            </div>

            {/* Attribution */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                {isVideo ? 'Video' : 'Photo'} by{' '}
                <a href={item.photographerUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:underline">{item.photographer}</a>
                {' '}on{' '}
                <a href={item.pexelsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:underline">Pexels</a>
              </p>
            </div>

            {/* AI-generated rich SEO sections */}
            {seoContent ? (
              <PexelsSEOSections content={seoContent} isVideo={isVideo} />
            ) : (
              /* Fallback: thin content while AI generates or if unavailable */
              item.alt && (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-foreground mb-2">About this {isVideo ? 'video' : 'photo'}</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    This free {isVideo ? 'stock video' : 'stock photo'} — "{item.alt}" — was created by {item.photographer} and is available for download.
                    It can be used for personal and commercial projects. Looking for similar premium content? Browse the VisuStock marketplace for exclusive, high-quality {isVideo ? 'videos' : 'photos'}.
                  </p>
                  {seoLoading && <Skeleton className="h-32 w-full mt-4 rounded-lg" />}
                </div>
              )
            )}
          </div>

          <PexelsDetailSidebar item={item} isVideo={isVideo} keywords={seoContent?.visual_style} />
        </div>

        <Separator className="my-12" />
        <PexelsPremiumAlternatives item={item} isVideo={isVideo} />

        {/* Static internal links (fallback + SEO) */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Explore More on VisuStock</h2>
          <nav className="flex flex-wrap gap-3">
            <Link to="/marketplace" className="text-sm text-primary hover:underline">Browse Marketplace</Link>
            <Link to="/free-stock-library" className="text-sm text-primary hover:underline">Free Stock Library</Link>
            <Link to="/collections" className="text-sm text-primary hover:underline">Curated Collections</Link>
            <Link to="/become-seller" className="text-sm text-primary hover:underline">Sell Your Content</Link>
          </nav>
        </div>
      </article>
    </div>
  );
};

export default PexelsAssetDetail;
