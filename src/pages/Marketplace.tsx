import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Grid, List, SlidersHorizontal } from "lucide-react";
import mockPhoto1 from "@/assets/mock-photo1.jpg";
import mockPhoto2 from "@/assets/mock-photo2.jpg";
import mockIllustration1 from "@/assets/mock-illustration1.jpg";

const Marketplace = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Mock data for marketplace content
  const contentTypes = ["photo", "video", "audio", "illustration"] as const;
  const marketplaceContent = Array.from({ length: 24 }, (_, i) => ({
    id: `${i + 1}`,
    title: `Contenu créatif ${i + 1}`,
    author: `Créateur ${i + 1}`,
    price: Math.floor(Math.random() * 30),
    type: contentTypes[Math.floor(Math.random() * 4)],
    thumbnail: [mockPhoto1, mockPhoto2, mockIllustration1][Math.floor(Math.random() * 3)],
    likes: Math.floor(Math.random() * 2000),
    downloads: Math.floor(Math.random() * 1000),
    isLiked: Math.random() > 0.7,
  }));

  const categories = [
    { value: "all", label: "Toutes les catégories", count: "4.8M" },
    { value: "photo", label: "Photos", count: "2.1M" },
    { value: "video", label: "Vidéos", count: "430K" },
    { value: "audio", label: "Audio", count: "180K" },
    { value: "illustration", label: "Illustrations", count: "950K" },
  ];

  const priceRanges = [
    { value: "all", label: "Tous les prix" },
    { value: "free", label: "Gratuit" },
    { value: "0-10", label: "0€ - 10€" },
    { value: "10-25", label: "10€ - 25€" },
    { value: "25+", label: "25€ et plus" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <div className="container py-8">
        {/* Search and Filters Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans la marketplace..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label} ({category.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Prix" />
                </SelectTrigger>
                <SelectContent>
                  {priceRanges.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Results Info and View Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                24 résultats trouvés
              </span>
              <Badge variant="secondary">Tous</Badge>
            </div>

            <div className="flex items-center gap-2">
              <Select defaultValue="popular">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Populaires</SelectItem>
                  <SelectItem value="recent">Récents</SelectItem>
                  <SelectItem value="price-low">Prix croissant</SelectItem>
                  <SelectItem value="price-high">Prix décroissant</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex border rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 p-0"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className={`grid gap-6 ${
          viewMode === "grid" 
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
            : "grid-cols-1"
        }`}>
          {marketplaceContent.map((content) => (
            <ContentCard key={content.id} {...content} />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-12">
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled>
              Précédent
            </Button>
            <Button variant="default">1</Button>
            <Button variant="outline">2</Button>
            <Button variant="outline">3</Button>
            <span className="text-muted-foreground">...</span>
            <Button variant="outline">10</Button>
            <Button variant="outline">
              Suivant
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;