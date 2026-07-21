import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const NotFound = () => {
  useSEO({ title: "Page Not Found", description: "The page you're looking for doesn't exist on VisuStock.", noindex: true });
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );

    const DEFAULT_TITLE = "VisuStock - Creative Content Marketplace";

    // Ensure proper 404 signal for crawlers via meta tag
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const hadRobotsMeta = !!robotsMeta;
    const previousRobotsContent = robotsMeta?.content;

    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }

    robotsMeta.content = 'noindex, follow';

    // Set document title
    document.title = 'Page Not Found | VisuStock';

    return () => {
      // Restore defaults when leaving the 404 page
      document.title = DEFAULT_TITLE;

      if (robotsMeta) {
        if (hadRobotsMeta) {
          robotsMeta.content = previousRobotsContent || 'index, follow';
        } else {
          // We created it only for 404—remove it so other pages can manage robots.
          robotsMeta.remove();
        }
      }
    };
  }, [location.pathname]);

  // Suggest closest pages based on path
  const suggestedLinks = [
    { path: '/marketplace', label: 'Browse Marketplace', icon: Search },
    { path: '/', label: 'Go to Homepage', icon: Home },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container py-16 flex flex-col items-center justify-center text-center">
        <div className="max-w-md">
          {/* 404 Visual */}
          <div className="text-8xl font-bold text-primary/20 mb-4">404</div>
          
          <h1 className="text-3xl font-bold mb-4 text-foreground">
            Page Not Found
          </h1>
          
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or may have been moved.
            Let's get you back on track.
          </p>

          {/* Suggested Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {suggestedLinks.map((link) => (
              <Button 
                key={link.path} 
                asChild 
                variant={link.path === '/' ? 'default' : 'outline'}
              >
                <Link to={link.path}>
                  <link.icon className="mr-2 h-4 w-4" />
                  {link.label}
                </Link>
              </Button>
            ))}
          </div>

          {/* Back Link */}
          <Button variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>

        {/* SEO: Hidden content for crawlers */}
        <div className="sr-only">
          <p>This page was not found on VisuStock.</p>
          <p>Visit our marketplace to browse stock photos, videos, audio, and illustrations.</p>
          <nav>
            <a href="/">Home</a>
            <a href="/marketplace">Marketplace</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
