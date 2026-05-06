import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ContentCard } from '@/components/ContentCard';
import { CalendarCurations } from '@/components/CalendarCurations';
import { CollectionsGrid } from '@/components/CollectionsGrid';
import { useTrendingContent } from '@/hooks/useTrendingContent';
import { useFreeContent } from '@/hooks/useFreeContent';

const ContentSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-muted rounded-lg h-64 mb-4" />
        <div className="h-4 bg-muted rounded mb-2" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-12">
    <p className="text-muted-foreground">{message}</p>
  </div>
);

interface HomepageTabsProps {
  className?: string;
}

export const HomepageTabs = memo(({ className }: HomepageTabsProps) => {
  const { content: trendingContent, loading: trendingLoading } = useTrendingContent(6);
  const { content: freeContent, loading: freeLoading } = useFreeContent(6);

  return (
    <section className={`py-16 bg-surface ${className || ''}`}>
      <div className="container">
        <Tabs defaultValue="trending" className="w-full">
          <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-4 mb-8 h-14 p-1.5">
            <TabsTrigger value="trending" className="py-3 text-sm sm:text-base font-bold">
              Trending
            </TabsTrigger>
            <TabsTrigger value="free" className="py-3 text-sm sm:text-base font-bold">
              Free Stock
            </TabsTrigger>
            <TabsTrigger value="collections" className="py-3 text-sm sm:text-base font-bold">
              Collections
            </TabsTrigger>
            <TabsTrigger value="calendar" className="py-3 text-sm sm:text-base font-bold">
              Calendar
            </TabsTrigger>
          </TabsList>

          {/* Trending Tab */}
          <TabsContent value="trending" className="mt-0">
            {trendingLoading ? (
              <ContentSkeleton />
            ) : trendingContent.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {trendingContent.map((item, index) => (
                    <ContentCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      author={item.author}
                      price={item.price}
                      type={item.type}
                      thumbnail={item.thumbnail}
                      videoUrl={item.videoUrl}
                      likes={item.likes}
                      downloads={item.downloads}
                      isLiked={item.isLiked}
                      priority={index < 3}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <Button variant="outline" asChild>
                    <Link to="/marketplace" className="inline-flex items-center gap-2">
                      View All Content
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState message="No trending content available yet. Check back soon!" />
            )}
          </TabsContent>

          {/* Free Stock Tab */}
          <TabsContent value="free" className="mt-0">
            {freeLoading ? (
              <ContentSkeleton />
            ) : freeContent.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {freeContent.map((item, index) => (
                    <ContentCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      author={item.author}
                      price={item.price}
                      type={item.type}
                      thumbnail={item.thumbnail}
                      videoUrl={item.videoUrl}
                      likes={item.likes}
                      downloads={item.downloads}
                      isLiked={item.isLiked}
                      priority={index < 3}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <Button variant="outline" asChild>
                    <Link to="/marketplace?price=free" className="inline-flex items-center gap-2">
                      Browse All Free Content
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState message="No free content available yet. Check back soon!" />
            )}
          </TabsContent>

          {/* Collections Tab */}
          <TabsContent value="collections" className="mt-0">
            <CollectionsGrid limit={10} />
            <div className="text-center mt-8">
              <Button variant="outline" asChild>
                <a href="/collections" className="inline-flex items-center gap-2">
                  View All Collections
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </TabsContent>

          {/* Calendar Curations Tab */}
          <TabsContent value="calendar" className="mt-0">
            <CalendarCurations limit={8} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
});

HomepageTabs.displayName = 'HomepageTabs';
