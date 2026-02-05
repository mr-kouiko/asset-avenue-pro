import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/useSEO";
import { useSEONoIndex } from "@/hooks/useSEONoIndex";
import { supabase } from "@/integrations/supabase/client";
import { getCollectionBySlug, getRelatedCollections } from "@/data/seoCollections";
import { 
  filterProductsForCollection,
  shouldNoIndexCollection,
  shouldShowEmptyState,
  MIN_ITEMS_FOR_INDEX,
} from "@/utils/collectionMatcher";
import { 
  Briefcase, 
  Cpu, 
  Trees, 
  Plane, 
  UtensilsCrossed, 
  Heart, 
  GraduationCap, 
  Users, 
  Music, 
  Palette,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { memo } from "react";
import { WatermarkedVideoThumbnail } from "@/components/WatermarkedVideoThumbnail";

// Map collection IDs to icons
const collectionIcons: Record<string, React.ElementType> = {
  business: Briefcase,
  technology: Cpu,
  nature: Trees,
  travel: Plane,
  food: UtensilsCrossed,
  health: Heart,
  education: GraduationCap,
  lifestyle: Users,
  music: Music,
  abstract: Palette,
};

interface Product {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  thumbnail_path: string | null;
  preview_path: string | null;
  file_type: string | null;
  confidenceScore: number;
}

const ProductCard = memo(({ product }: { product: Product }) => {
  const thumbnailUrl = product.thumbnail_path || '/placeholder.svg';
  const isVideo = product.file_type?.startsWith('video/');

  return (
    <Link to={`/product/${product.slug}`} className="group block">
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group-hover:border-primary/50">
        <div className="aspect-[4/3] relative bg-muted">
          {isVideo ? (
            <WatermarkedVideoThumbnail 
              thumbnail={thumbnailUrl}
              title={product.title}
              videoUrl={product.preview_path || undefined}
              className="w-full h-full"
            />
          ) : (
            <img 
              src={thumbnailUrl}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          )}
          {product.price === 0 && (
            <Badge className="absolute top-2 left-2 bg-green-600">Free</Badge>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          {product.price !== null && product.price > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              ${product.price.toFixed(2)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
});

ProductCard.displayName = 'ProductCard';

const CollectionDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const collection = slug ? getCollectionBySlug(slug) : undefined;
  const relatedCollections = slug ? getRelatedCollections(slug) : [];

  // Fetch ALL approved products, then filter with confidence scoring
  const { data: products, isLoading } = useQuery({
    queryKey: ['collection-products-v2', slug],
    queryFn: async () => {
      if (!collection) return [];
      
      // Fetch broad set of candidates using OR query
      // The confidence scorer will filter down to relevant items
      const orConditions = collection.searchQueries
        .flatMap(term => [
          `title.ilike.%${term}%`,
          `description.ilike.%${term}%`,
          `tags.cs.{${term}}`,
        ])
        .join(',');

      const { data, error } = await supabase
        .from('content_submissions')
        .select(`
          id,
          title,
          description,
          tags,
          slug,
          price,
          content_files(thumbnail_path, preview_path, file_type)
        `)
        .eq('status', 'approved')
        .not('slug', 'is', null)
        .or(orConditions)
        .limit(200); // Fetch more candidates for filtering

      if (error) {
        console.error('Error fetching collection products:', error);
        return [];
      }

      // Apply confidence-based filtering
      const filteredProducts = filterProductsForCollection(
        data || [],
        collection,
        15 // Minimum confidence score
      );

      // Log for debugging (remove in production)
      console.log(`[Collection: ${collection.id}] Candidates: ${data?.length}, After filtering: ${filteredProducts.length}`);

      return filteredProducts.slice(0, 48); // Limit display to 48
    },
    enabled: !!collection,
    staleTime: 5 * 60 * 1000,
  });

  // SEO: Apply noindex for thin collections
  const validItemCount = products?.length || 0;
  const shouldNoIndex = shouldNoIndexCollection(validItemCount);
  const showEmptyState = shouldShowEmptyState(validItemCount);

  useSEONoIndex(
    shouldNoIndex && !isLoading,
    `Collection "${collection?.name}" has only ${validItemCount} valid items (minimum: ${MIN_ITEMS_FOR_INDEX})`
  );

  useSEO({
    title: collection?.title || 'Collection | VisuStock',
    description: collection?.description || 'Explore our curated stock media collection.',
  });

  if (!collection) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <main className="container py-12 text-center">
          <h1 className="text-3xl font-bold mb-4">Collection Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The collection you're looking for doesn't exist.
          </p>
          <Link to="/collections" className="text-primary hover:underline">
            View all collections
          </Link>
        </main>
      </div>
    );
  }

  const Icon = collectionIcons[collection.id] || Briefcase;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <main className="container py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/collections" className="hover:text-primary">Collections</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{collection.name}</span>
        </nav>

        {/* Collection Header */}
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">{collection.h1}</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {collection.description}
          </p>
        </header>

        {/* SEO Content */}
        <section className="prose prose-lg max-w-none mb-10 text-muted-foreground">
          <div dangerouslySetInnerHTML={{ 
            __html: collection.seoContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>')
          }} />
        </section>

        {/* Products Grid */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">
            {collection.name} Stock Media
            {products && products.length > 0 && (
              <span className="text-muted-foreground font-normal text-lg ml-2">
                ({products.length} items)
              </span>
            )}
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-[4/3] w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : showEmptyState ? (
            // Empty state - not enough quality content
            <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
              <p className="text-muted-foreground text-lg mb-6 max-w-md mx-auto">
                We're curating high-quality {collection.name.toLowerCase()} content for this collection.
                Check back soon or explore our marketplace.
              </p>
              <Link 
                to="/marketplace" 
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Browse Marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : null}
        </section>

        {/* Related Collections */}
        {relatedCollections.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Related Collections</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {relatedCollections.map((related) => {
                const RelatedIcon = collectionIcons[related.id] || Briefcase;
                return (
                  <Link
                    key={related.id}
                    to={`/collections/${related.slug}`}
                    className="group flex items-center gap-4 p-4 rounded-lg border hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <RelatedIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {related.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {related.description.slice(0, 60)}...
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* FAQ Section - only show if we have content */}
        {collection.faq.length > 0 && !showEmptyState && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {collection.faq.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">{item.question}</h3>
                  <p className="text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Collections Link */}
        <div className="text-center">
          <Link 
            to="/collections" 
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            View all thematic collections
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
};

export default CollectionDetail;
