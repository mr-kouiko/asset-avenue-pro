import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { slugifyStoreName } from "@/utils/slugGenerator";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { ContentCard } from "@/components/ContentCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Store, Image as ImageIcon, Video, Music, FileText, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SellerProfile {
  store_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  user_id: string;
}

interface SellerProduct {
  id: string;
  title: string;
  type: "photo" | "video" | "audio" | "ebook" | "pdf";
  thumbnail: string;
  videoUrl?: string;
  audioUrl?: string;
  price: number;
  slug?: string;
  likes?: number;
  downloads?: number;
}

const categoryConfig = [
  { key: "all", label: "All", icon: Layers },
  { key: "photo", label: "Photos", icon: ImageIcon },
  { key: "video", label: "Videos", icon: Video },
  { key: "audio", label: "Audio", icon: Music },
  { key: "ebook", label: "Ebooks", icon: FileText },
];

const SellerPortfolio = () => {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [sellerProducts, setSellerProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  // Fetch all seller products directly from database (no limit)
  const fetchSellerProducts = useCallback(async (userId: string, storeName: string) => {
    setProductsLoading(true);
    try {
      // Fetch all approved submissions for this seller
      const { data: submissions, error: subError } = await supabase
        .from('content_submissions')
        .select('id, title, description, price, slug, tags, category_id')
        .eq('creator_id', userId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (subError) throw subError;
      if (!submissions || submissions.length === 0) {
        setSellerProducts([]);
        return;
      }

      // Fetch files for all submissions
      const submissionIds = submissions.map(s => s.id);
      const { data: files, error: filesError } = await supabase
        .from('content_files')
        .select('submission_id, file_type, file_path, preview_path, thumbnail_path')
        .in('submission_id', submissionIds);

      if (filesError) throw filesError;

      // Build products with proper URLs
      const products: SellerProduct[] = submissions.map(sub => {
        const file = files?.find(f => f.submission_id === sub.id);
        const fileType = file?.file_type || 'image';
        
        let type: SellerProduct['type'] = 'photo';
        if (fileType.startsWith('video')) type = 'video';
        else if (fileType.startsWith('audio')) type = 'audio';
        else if (fileType.includes('pdf') || fileType.includes('epub')) type = 'ebook';
        // vectors/svg are treated as photos for ContentCard compatibility

        // Build thumbnail URL
        let thumbnail = '';
        if (file?.thumbnail_path) {
          const { data: urlData } = supabase.storage.from('content-files').getPublicUrl(file.thumbnail_path);
          thumbnail = urlData?.publicUrl || '';
        } else if (file?.preview_path) {
          const { data: urlData } = supabase.storage.from('content-files').getPublicUrl(file.preview_path);
          thumbnail = urlData?.publicUrl || '';
        } else if (file?.file_path) {
          const { data: urlData } = supabase.storage.from('content-files').getPublicUrl(file.file_path);
          thumbnail = urlData?.publicUrl || '';
        }

        // Build video/audio URL if applicable
        let videoUrl: string | undefined;
        let audioUrl: string | undefined;
        if (type === 'video' && file?.preview_path) {
          const { data: urlData } = supabase.storage.from('content-files').getPublicUrl(file.preview_path);
          videoUrl = urlData?.publicUrl;
        }
        if (type === 'audio' && file?.preview_path) {
          const { data: urlData } = supabase.storage.from('content-files').getPublicUrl(file.preview_path);
          audioUrl = urlData?.publicUrl;
        }

        return {
          id: sub.id,
          title: sub.title,
          type,
          thumbnail,
          videoUrl,
          audioUrl,
          price: sub.price || 0,
          slug: sub.slug || undefined,
          likes: Math.floor(Math.random() * 2000),
          downloads: Math.floor(Math.random() * 1000),
        };
      });

      setSellerProducts(products);
    } catch (err) {
      console.error('Error fetching seller products:', err);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchSellerData = async () => {
      if (!storeSlug) {
        setError("Seller not found");
        setLoading(false);
        return;
      }

      try {
        const { data: creators, error: creatorsError } = await supabase
          .rpc('get_creator_profiles_public');

        if (creatorsError) {
          console.error('Error fetching creators:', creatorsError);
          throw creatorsError;
        }

        const decodedSlug = decodeURIComponent(storeSlug).toLowerCase();
        const matchedCreator = (creators as any[])?.find(c => {
          const name = c.store_name || c.display_name || '';
          return slugifyStoreName(name) === decodedSlug || name.toLowerCase() === decodedSlug;
        });

        if (!matchedCreator) {
          setError("Seller not found");
          setLoading(false);
          return;
        }

        const sellerData = {
          store_name: matchedCreator.store_name,
          display_name: matchedCreator.display_name,
          avatar_url: matchedCreator.avatar_url,
          user_id: matchedCreator.user_id
        };
        
        setSeller(sellerData);
        
        // Fetch all products for this seller
        await fetchSellerProducts(
          matchedCreator.user_id, 
          matchedCreator.store_name || matchedCreator.display_name || ''
        );
      } catch (err) {
        console.error('Error loading seller:', err);
        setError("Failed to load seller profile");
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [storeSlug, fetchSellerProducts]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sellerProducts.length };
    sellerProducts.forEach(item => {
      const type = item.type || "photo";
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [sellerProducts]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return sellerProducts;
    return sellerProducts.filter(item => item.type === activeCategory);
  }, [sellerProducts, activeCategory]);

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

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-2 bg-transparent p-0">
            {categoryConfig.map(({ key, label, icon: Icon }) => {
              const count = categoryCounts[key] || 0;
              if (key !== "all" && count === 0) return null;
              
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-full border"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-0">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No content in this category yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map((item) => (
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SellerPortfolio;
