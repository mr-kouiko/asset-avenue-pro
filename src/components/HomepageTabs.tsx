import { memo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Gift, Calendar, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ContentCard } from '@/components/ContentCard';
import { CalendarCurations } from '@/components/CalendarCurations';
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
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Discover Creative Content</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore trending assets, free downloads, and content curated for upcoming events
          </p>
        </div>

        <Tabs defaultValue="trending" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Trending</span>
            </TabsTrigger>
            <TabsTrigger value="free" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Free Stock</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
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
                    <Link to="/en/marketplace" className="inline-flex items-center gap-2">
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
                    <Link to="/en/marketplace?price=free" className="inline-flex items-center gap-2">
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
