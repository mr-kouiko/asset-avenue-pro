import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Grid, List, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useMarketplace } from "@/hooks/useMarketplace";
import { supabase } from "@/integrations/supabase/client";

const Marketplace = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState([
    { value: "all", label: "Toutes les catégories", count: "0" }
  ]);
  const [searchParams] = useSearchParams();
  const { content: marketplaceContent, loading } = useMarketplace();

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');
    
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParams]);

  // Récupérer les catégories depuis la base
  useEffect(() => {
    const fetchCategories = async () => {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, slug');
      
      if (categoriesData) {
        const formattedCategories = [
          { value: "all", label: "Toutes les catégories", count: marketplaceContent.length.toString() },
          ...categoriesData.map(cat => ({
            value: cat.id,
            label: cat.name,
            count: marketplaceContent.filter(content => content.category_id === cat.id).length.toString()
          }))
        ];
        setCategories(formattedCategories);
      }
    };

    if (marketplaceContent.length > 0) {
      fetchCategories();
    }
  }, [marketplaceContent]);

  const priceRanges = [
    { value: "all", label: "Tous les prix" },
    { value: "free", label: "Gratuit" },
    { value: "0-10", label: "0€ - 10€" },
    { value: "10-25", label: "10€ - 25€" },
    { value: "25-50", label: "25€ - 50€" },
    { value: "50+", label: "50€ et plus" },
  ];

  // Filter content based on search and category
  const filteredContent = marketplaceContent.filter(content => {
    const matchesSearch = (content.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (content.author || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
                           content.category_id === selectedCategory ||
                           content.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                {filteredContent.length} résultats trouvés
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

        {/* Content Grid - Adobe Stock Style */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-stock-blue/30 border-t-stock-blue rounded-full animate-spin mx-auto mb-4" />
              <div className="text-stock-dark/60 font-medium">Chargement des contenus...</div>
            </div>
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-stock-dark/60 text-lg">Aucun contenu trouvé</div>
            <p className="text-stock-dark/40 mt-2">Essayez d'ajuster vos filtres de recherche</p>
          </div>
        ) : (
          <div 
            className={`grid ${
              viewMode === "grid" 
                ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" 
                : "grid-cols-1 max-w-4xl mx-auto"
            }`}
            style={{ gap: 'var(--grid-gap)' }}
          >
            {filteredContent.map((content) => (
              <ContentCard key={content.id} {...content} />
            ))}
          </div>
        )}

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