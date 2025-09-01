import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { HeroSection } from "@/components/HeroSection";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useContentStats } from "@/hooks/useContentStats";
import { Camera, Video, Music, Palette, Zap, Shield, Globe, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const IndexEN = () => {
  const { content, loading } = useMarketplace();
  const { stats } = useContentStats();

  // Get first 6 items for featured section
  const featuredContent = content.slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <main>
        {/* Hero Section */}
        <HeroSection />

        {/* Featured Content */}
        <section className="py-16 bg-surface">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Featured Creative Content</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Discover high-quality photos, videos, illustrations, and audio from talented creators worldwide
              </p>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted rounded-lg h-64 mb-4"></div>
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : featuredContent.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {featuredContent.map((item) => (
                    <ContentCard 
                      key={item.id} 
                      id={item.id}
                      title={item.title}
                      author={item.author}
                      price={item.price}
                      type={item.type}
                      thumbnail={item.thumbnail}
                      videoUrl={item.videoUrl}
                      audioUrl={item.type === 'audio' ? item.videoUrl : undefined}
                      likes={item.likes}
                      downloads={item.downloads}
                      isLiked={item.isLiked}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <Button size="lg" asChild className="md:hidden">
                    <Link to="/en/marketplace">View All Content</Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No featured content available yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* Categories */}
        <section className="py-16">
          <div className="container">
            <h2 className="text-3xl font-bold text-center mb-12">Explore by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
                <Camera className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Photos</h3>
                <Badge variant="secondary">{stats.photos} items</Badge>
              </Card>
              <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
                <Video className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Videos</h3>
                <Badge variant="secondary">{stats.videos} items</Badge>
              </Card>
              <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
                <Music className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Audio</h3>
                <Badge variant="secondary">{stats.audios} items</Badge>
              </Card>
              <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
                <Palette className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Illustrations</h3>
                <Badge variant="secondary">{stats.illustrations} items</Badge>
              </Card>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 bg-surface">
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
                    <Link to="/en/marketplace">Browse Content</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
                    <Link to="/en/auth/seller">Become a Seller</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-muted py-12">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <Link to="/en" className="block mb-4">
                  <img 
                    src="/lovable-uploads/visustock-logo-no-bg.png" 
                    alt="VisuStock" 
                    className="h-10 w-auto"
                  />
                </Link>
                <p className="text-sm text-muted-foreground">
                  The leading marketplace for creative digital content.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Products</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/en/marketplace" className="text-muted-foreground hover:text-foreground">Browse Content</Link></li>
                  <li><Link to="/en/packages-pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link></li>
                  <li><Link to="/en/infinity" className="text-muted-foreground hover:text-foreground">Infinity</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/en/about" className="text-muted-foreground hover:text-foreground">About</Link></li>
                  <li><Link to="/en/support" className="text-muted-foreground hover:text-foreground">Support</Link></li>
                  <li><Link to="/en/contact" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/en/terms" className="text-muted-foreground hover:text-foreground">Terms</Link></li>
                  <li><Link to="/en/privacy-policy" className="text-muted-foreground hover:text-foreground">Privacy</Link></li>
                  <li><Link to="/en/licenses" className="text-muted-foreground hover:text-foreground">Licenses</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
              <p>&copy; 2024 VisuStock. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default IndexEN;