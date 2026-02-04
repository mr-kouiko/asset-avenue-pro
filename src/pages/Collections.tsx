import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { CollectionsGrid } from "@/components/CollectionsGrid";
import { useSEO } from "@/hooks/useSEO";

const Collections = () => {
  useSEO({
    title: "Stock Media Collections | Curated Themes | VisuStock",
    description: "Explore our curated thematic collections of stock photos, videos, and audio. Find the perfect media for business, technology, nature, travel, and more.",
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <main className="container py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Thematic Collections</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover curated collections of premium stock media organized by theme. 
            Each collection brings together the best photos, videos, and audio for your creative projects.
          </p>
        </div>

        <CollectionsGrid />

        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Looking for something specific?{" "}
            <a href="/marketplace" className="text-primary hover:underline">
              Browse our full marketplace
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Collections;
