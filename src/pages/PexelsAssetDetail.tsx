import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { LazyImage } from "@/components/LazyImage";
import { ArrowLeft, Download, ExternalLink, Camera, Video, Sparkles } from "lucide-react";
import { fetchPexelsPhotoById, fetchPexelsVideoById, type PexelsItem } from "@/hooks/usePexelsSearch";
import { useMarketplace, type MarketplaceFilters } from "@/hooks/useMarketplace";
import { useSEO } from "@/hooks/useSEO";
import { parsePexelsSlug } from "@/utils/pexelsSlug";
import { PexelsSchemaOrg } from "@/components/pexels/PexelsSchemaOrg";
import { PexelsDetailSidebar } from "@/components/pexels/PexelsDetailSidebar";
import { PexelsPremiumAlternatives } from "@/components/pexels/PexelsPremiumAlternatives";

const PexelsAssetDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<PexelsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse slug to get type + id
  const parsed = useMemo(() => {
    if (!slug) return null;
    // Support new /pexels/{slug} format
    return parsePexelsSlug(slug);
  }, [slug]);

  const isVideo = parsed?.type === 'video';

  // Fetch the Pexels item
  useEffect(() => {
    if (!parsed) {
      setError('Invalid asset URL');
      setLoading(false);
      return;
    }

    const fetchItem = async () => {
      setLoading(true);
      try {
        const result = parsed.type === 'video'
          ? await fetchPexelsVideoById(parsed.numericId)
          : await fetchPexelsPhotoById(parsed.numericId);

        if (result) {
          setItem(result);
        } else {
          setError('Asset not found');
        }
      } catch {
        setError('Failed to load asset');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [parsed]);

  // SEO metadata
  const seoTitle = item
    ? `Free ${isVideo ? 'Stock Video' : 'Stock Photo'}${item.alt ? ` – ${item.alt}` : ''} by ${item.photographer} | VisuStock`
    : `Free ${isVideo ? 'Video' : 'Photo'} | VisuStock`;

  const seoDescription = item
    ? `Download this free ${isVideo ? 'stock video' : 'stock photo'}${item.alt ? ` of ${item.alt}` : ''} by ${item.photographer} from Pexels. Explore premium alternatives on VisuStock.`
    : `Free ${isVideo ? 'video' : 'photo'} from Pexels. Browse premium alternatives on VisuStock.`;

  useSEO({
    title: seoTitle,
    description: seoDescription,
    type: 'article',
    image: item?.largeThumbnail,
  });

  // ── Render ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
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
        <Header />
        <Navigation />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Asset Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || 'This Pexels asset could not be loaded.'}</p>
          <Button onClick={() => navigate('/marketplace')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      {/* Schema.org structured data */}
      <PexelsSchemaOrg item={item} isVideo={isVideo} slug={slug || ''} />

      <article className="container py-8 max-w-6xl">
        {/* Back button */}
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main preview */}
          <div className="lg:col-span-2">
            {/* H1 title for SEO */}
            <h1 className="text-2xl font-bold text-foreground mb-4">
              {item.alt || item.title}
            </h1>

            <div className="relative rounded-xl overflow-hidden bg-muted">
              {isVideo && item.videoUrl ? (
                <video
                  className="w-full aspect-video object-contain bg-black"
                  controls
                  muted
                  playsInline
                  poster={item.thumbnail}
                  preload="metadata"
                >
                  <source src={item.videoUrl} type="video/mp4" />
                </video>
              ) : (
                <LazyImage
                  src={item.largeThumbnail || item.thumbnail}
                  alt={item.alt || item.title}
                  className="w-full object-contain"
                />
              )}
            </div>

            {/* Attribution */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                {isVideo ? 'Video' : 'Photo'} by{' '}
                <a
                  href={item.photographerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-foreground hover:underline"
                >
                  {item.photographer}
                </a>
                {' '}on{' '}
                <a
                  href={item.pexelsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-foreground hover:underline"
                >
                  Pexels
                </a>
              </p>
            </div>

            {/* SEO descriptive content */}
            {item.alt && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">About this {isVideo ? 'video' : 'photo'}</h2>
                <p className="text-muted-foreground leading-relaxed">
                  This free {isVideo ? 'stock video' : 'stock photo'} — "{item.alt}" — was created by {item.photographer} and is available for download via Pexels.
                  It can be used for personal and commercial projects. Looking for similar premium content? Browse the VisuStock marketplace for exclusive, high-quality {isVideo ? 'videos' : 'photos'}.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <PexelsDetailSidebar item={item} isVideo={isVideo} />
        </div>

        {/* Premium Alternatives */}
        <Separator className="my-12" />
        <PexelsPremiumAlternatives item={item} isVideo={isVideo} />

        {/* Internal links for SEO */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Explore More on VisuStock</h2>
          <nav className="flex flex-wrap gap-3">
            <Link to="/marketplace" className="text-sm text-primary hover:underline">Browse Marketplace</Link>
            <Link to="/free-stock-library" className="text-sm text-primary hover:underline">Free Stock Library</Link>
            <Link to="/collections" className="text-sm text-primary hover:underline">Curated Collections</Link>
            <Link to="/photos/business" className="text-sm text-primary hover:underline">Business Photos</Link>
            <Link to="/videos/nature" className="text-sm text-primary hover:underline">Nature Videos</Link>
            <Link to="/become-seller" className="text-sm text-primary hover:underline">Sell Your Content</Link>
          </nav>
        </div>
      </article>
    </div>
  );
};

export default PexelsAssetDetail;
