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

const PexelsAssetDetail = () => {
  const { pexelsId } = useParams<{ pexelsId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<PexelsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine type from the route path
  const isVideo = window.location.pathname.startsWith('/free-video/');

  // Extract numeric ID from "pexels-12345"
  const numericId = useMemo(() => {
    const match = pexelsId?.match(/pexels-(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }, [pexelsId]);

  // Fetch the Pexels item
  useEffect(() => {
    if (!numericId) {
      setError('Invalid asset ID');
      setLoading(false);
      return;
    }

    const fetchItem = async () => {
      setLoading(true);
      try {
        const result = isVideo
          ? await fetchPexelsVideoById(numericId)
          : await fetchPexelsPhotoById(numericId);

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
  }, [numericId, isVideo]);

  // SEO metadata
  const seoTitle = item
    ? `Free ${isVideo ? 'Video' : 'Photo'}${item.alt ? ` – ${item.alt}` : ''} by ${item.photographer} | VisuStock`
    : `Free ${isVideo ? 'Video' : 'Photo'} – Pexels | VisuStock`;

  const seoDescription = item
    ? `Download this free ${isVideo ? 'video' : 'photo'}${item.alt ? ` of ${item.alt}` : ''} by ${item.photographer} from Pexels. Explore premium alternatives on VisuStock.`
    : `Free ${isVideo ? 'video' : 'photo'} from Pexels. Browse premium alternatives on VisuStock.`;

  useSEO({
    title: seoTitle,
    description: seoDescription,
    type: 'article',
    image: item?.largeThumbnail,
  });

  // ── Premium alternatives query ──────────────────────────────
  // Extract keywords from title/alt for related content search
  const searchQuery = useMemo(() => {
    if (!item) return '';
    const text = item.alt || item.title || '';
    // Take first 3 meaningful words
    const words = text.split(/\s+/).filter(w => w.length > 3).slice(0, 3);
    return words.join(' ');
  }, [item]);

  const alternativesFilters = useMemo<MarketplaceFilters>(() => ({
    category: isVideo ? 'video' : 'photo',
    searchQuery: searchQuery || undefined,
    sortBy: 'popular',
    page: 1,
  }), [isVideo, searchQuery]);

  const { content: premiumAlternatives, loading: alternativesLoading } = useMarketplace(
    searchQuery ? alternativesFilters : { page: 1, category: isVideo ? 'video' : 'photo', sortBy: 'popular' }
  );

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

      <div className="container py-8 max-w-6xl">
        {/* Back button */}
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main preview */}
          <div className="lg:col-span-2">
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
                  alt={item.title}
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Title & info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-emerald-500 text-white font-bold">FREE</Badge>
                <Badge variant="secondary">Pexels</Badge>
                <Badge variant="outline" className="gap-1">
                  {isVideo ? <Video className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
                  {isVideo ? 'Video' : 'Photo'}
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">{item.title}</h1>
              {item.alt && item.alt !== item.title && (
                <p className="text-sm text-muted-foreground">{item.alt}</p>
              )}
            </div>

            {/* Details */}
            <Card className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dimensions</span>
                <span className="font-medium text-foreground">{item.width} × {item.height}</span>
              </div>
              {item.duration && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium text-foreground">
                    {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">License</span>
                <span className="font-medium text-foreground">Free to use</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium text-foreground">Pexels</span>
              </div>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Button className="w-full gap-2" size="lg" asChild>
                <a href={item.originalUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                  Download Free
                </a>
              </Button>
              <Button variant="outline" className="w-full gap-2" asChild>
                <a href={item.pexelsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  View on Pexels
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Premium Alternatives */}
        <Separator className="my-12" />
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Premium Alternatives</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Looking for higher quality or exclusive content? Explore these premium {isVideo ? 'videos' : 'photos'} from VisuStock creators.
          </p>

          {alternativesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : premiumAlternatives.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {premiumAlternatives.slice(0, 10).map((content) => (
                <ContentCard key={content.id} {...content} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Browse our <Link to="/marketplace" className="text-primary hover:underline">marketplace</Link> for premium content.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PexelsAssetDetail;
