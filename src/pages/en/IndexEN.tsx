import { Navigation } from "@/components/Navigation";
import { HeroSection } from "@/components/HeroSection";
import { HomepageTabs } from "@/components/HomepageTabs";
import { CollectionsGrid } from "@/components/CollectionsGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContentStats } from "@/hooks/useContentStats";
import { useAuth } from "@/hooks/useAuth";
import { Camera, Video, Music, BookOpen, Zap, Shield, Globe, Heart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { seoCollections } from "@/data/seoCollections";
import { useSEO } from "@/hooks/useSEO";

const IndexEN = () => {
  useSEO({
    title: "VisuStock – Stock Photos, Videos, Audio, Vectors & Digital Assets",
    description: "Discover millions of stock photos, videos, audio files, vectors, ebooks, AI-generated content and creative assets on VisuStock.",
    type: "website",
  });
  const { stats } = useContentStats();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main>
        {/* Hero Section */}
        <HeroSection />

        {/* Tabbed Content Discovery */}
        <HomepageTabs />

        {/* Categories */}
        <section className="py-16">
          <div className="container">
            <h2 className="text-3xl font-bold text-center mb-12">Explore by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Link to="/s/categories/photo" className="block">
                <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <Camera className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-2">Photos</h3>
                  {isAdmin && <Badge variant="secondary">{stats.photos} items</Badge>}
                </Card>
              </Link>
              <Link to="/s/categories/video" className="block">
                <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <Video className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-2">Videos</h3>
                  {isAdmin && <Badge variant="secondary">{stats.videos} items</Badge>}
                </Card>
              </Link>
              <Link to="/s/categories/audio" className="block">
                <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <Music className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-2">Audio</h3>
                  {isAdmin && <Badge variant="secondary">{stats.audios} items</Badge>}
                </Card>
              </Link>
              <Link to="/s/categories/ebooks" className="block">
                <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-2">Ebooks</h3>
                  {isAdmin && <Badge variant="secondary">{stats.ebooks} items</Badge>}
                </Card>
              </Link>
            </div>
          </div>
        </section>

        {/* Collections Section */}
        <section className="py-16 bg-surface">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Explore Collections</h2>
              <a 
                href="/collections" 
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                View All <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <CollectionsGrid limit={5} />
          </div>
        </section>
        {/* Features */}
        <section className="py-16">
          <div className="container">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose VisuStock?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground">Instant downloads and seamless browsing experience</p>
              </div>
              <div className="text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Licensed Content</h3>
                <p className="text-sm text-muted-foreground">All content is properly licensed and ready to use</p>
              </div>
              <div className="text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Global Community</h3>
                <p className="text-sm text-muted-foreground">Content from creators around the world</p>
              </div>
              <div className="text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Creator Friendly</h3>
                <p className="text-sm text-muted-foreground">Fair revenue sharing for all contributors</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="container">
            <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
              <CardContent className="p-12 text-center">
                <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
                <p className="text-xl mb-8 opacity-90">
                  Join thousands of creators and find the perfect content for your projects
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <Link to="/marketplace">Browse Content</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
                    <Link to="/auth/seller">Become a Seller</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

      </main>
    </div>
  );
};

export default IndexEN;