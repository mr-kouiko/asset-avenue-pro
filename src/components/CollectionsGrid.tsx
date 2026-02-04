import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { seoCollections, type SEOCollection } from '@/data/seoCollections';
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
  Palette 
} from 'lucide-react';

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

interface CollectionCardProps {
  collection: SEOCollection;
}

const CollectionCard = memo(({ collection }: CollectionCardProps) => {
  const Icon = collectionIcons[collection.id] || Briefcase;
  
  return (
    <a 
      href={`/s/collections/${collection.slug}`}
      className="block group"
    >
      <Card className="h-full hover:shadow-lg transition-all duration-300 group-hover:border-primary/50">
        <CardContent className="p-6 text-center">
          <div className="bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
            {collection.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {collection.description.slice(0, 80)}...
          </p>
        </CardContent>
      </Card>
    </a>
  );
});

CollectionCard.displayName = 'CollectionCard';

interface CollectionsGridProps {
  /** Number of collections to display (default: all) */
  limit?: number;
  /** CSS class for the container */
  className?: string;
  /** Whether to show title */
  showTitle?: boolean;
  /** Custom title */
  title?: string;
}

export const CollectionsGrid = memo(({ 
  limit, 
  className = '',
  showTitle = false,
  title = 'Explore Collections'
}: CollectionsGridProps) => {
  // Sort by priority and optionally limit
  const collections = [...seoCollections]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit || seoCollections.length);

  return (
    <div className={className}>
      {showTitle && (
        <h2 className="text-3xl font-bold text-center mb-8">{title}</h2>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {collections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>
    </div>
  );
});

CollectionsGrid.displayName = 'CollectionsGrid';
