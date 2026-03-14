import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentCard } from "@/components/ContentCard";
import { Sparkles } from "lucide-react";
import { useMarketplace, type MarketplaceFilters } from "@/hooks/useMarketplace";
import type { PexelsItem } from "@/hooks/usePexelsSearch";

interface Props {
  item: PexelsItem;
  isVideo: boolean;
}

export const PexelsPremiumAlternatives = ({ item, isVideo }: Props) => {
  const searchQuery = useMemo(() => {
    const text = item.alt || item.title || '';
    return text.split(/\s+/).filter(w => w.length > 3).slice(0, 3).join(' ');
  }, [item]);

  const filters = useMemo<MarketplaceFilters>(() => ({
    category: isVideo ? 'video' : 'photo',
    searchQuery: searchQuery || undefined,
    sortBy: 'popular',
    page: 1,
  }), [isVideo, searchQuery]);

  const { content, loading } = useMarketplace(
    searchQuery ? filters : { page: 1, category: isVideo ? 'video' : 'photo', sortBy: 'popular' }
  );

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Premium Alternatives</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Looking for higher quality or exclusive content? Explore these premium {isVideo ? 'videos' : 'photos'} from VisuStock creators.
      </p>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : content.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {content.slice(0, 10).map((c) => (
            <ContentCard key={c.id} {...c} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>Browse our <Link to="/marketplace" className="text-primary hover:underline">marketplace</Link> for premium content.</p>
        </div>
      )}
    </section>
  );
};
