import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { ContentCard } from "@/components/ContentCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Store, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMarketplace } from "@/hooks/useMarketplace";

interface SellerProfile {
  store_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  user_id: string;
}

const SellerPortfolio = () => {
  const { creatorHash } = useParams<{ creatorHash: string }>();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { content: marketplaceContent } = useMarketplace();

  useEffect(() => {
    const fetchSellerData = async () => {
      if (!creatorHash) {
        setError("Seller not found");
        setLoading(false);
        return;
      }

      try {
        // Get creator profiles using the public function
        const { data: creators, error: creatorsError } = await supabase
          .rpc('get_creator_profiles_public');

        if (creatorsError) {
          console.error('Error fetching creators:', creatorsError);
          throw creatorsError;
        }

        // Find the creator by matching the hash
        const matchedCreator = (creators as any[])?.find(c => {
          // Generate the same hash that we use in useProductDetail
          const hash = btoa(c.user_id).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
          return hash === creatorHash;
        });

        if (!matchedCreator) {
          setError("Seller not found");
          setLoading(false);
          return;
        }

        setSeller({
          store_name: matchedCreator.store_name,
          display_name: matchedCreator.display_name,
          avatar_url: matchedCreator.avatar_url,
          user_id: matchedCreator.user_id
        });
      } catch (err) {
        console.error('Error loading seller:', err);
        setError("Failed to load seller profile");
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [creatorHash]);

  // Filter marketplace content by matching the hash against creator store name or user_id
  const sellerProducts = marketplaceContent.filter(item => {
    if (!seller) return false;
    // Match by author (store name) since that's what we have
    return item.author === (seller.store_name || seller.display_name);
  });

  const getInitials = (name: string | null) => {
    if (!name) return "S";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading seller profile...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-8 text-center">
          <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Seller Not Found</h1>
          <p className="text-muted-foreground">
            {error || "The seller you're looking for doesn't exist or has no published content."}
          </p>
        </div>
      </div>
    );
  }

  const storeName = seller.store_name || seller.display_name || "Anonymous Store";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-8">
        {/* Seller Header */}
        <div className="mb-8 pb-8 border-b">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 ring-2 ring-primary/20">
              <AvatarImage src={seller.avatar_url || undefined} alt={storeName} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials(storeName)}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h1 className="text-3xl font-bold mb-2">{storeName}</h1>
              <p className="text-muted-foreground mb-3">VisuStock Creator</p>
              <div className="flex gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  {sellerProducts.length} {sellerProducts.length === 1 ? 'item' : 'items'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Seller Products */}
        <div>
          <h2 className="text-xl font-semibold mb-6">All Content</h2>
          
          {sellerProducts.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                This seller has no published content yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {sellerProducts.map((item) => (
                <ContentCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  author={storeName}
                  type={item.type}
                  thumbnail={item.thumbnail}
                  videoUrl={item.videoUrl}
                  audioUrl={item.audioUrl}
                  price={item.price ?? 0}
                  slug={item.slug}
                  likes={item.likes}
                  downloads={item.downloads}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerPortfolio;
