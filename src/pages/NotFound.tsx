import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );

    // Ensure proper 404 signal for crawlers via meta tag
    const robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
    if (robotsMeta) {
      robotsMeta.content = 'noindex, follow';
    } else {
      const meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex, follow';
      document.head.appendChild(meta);
    }

    // Set document title
    document.title = 'Page Not Found | VisuStock';
  }, [location.pathname]);

  // Suggest closest pages based on path
  const suggestedLinks = [
    { path: '/marketplace', label: 'Browse Marketplace', icon: Search },
    { path: '/', label: 'Go to Homepage', icon: Home },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
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
