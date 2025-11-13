import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useMarketplace } from "@/hooks/useMarketplace";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";

const Marketplace = () => {
  const { t, language } = useLanguage();

  // SEO Configuration
  useSEO({
    title: language === 'en'
      ? "Marketplace - Browse Creative Content"
      : "Marketplace - Parcourez le Contenu Créatif",
    description: language === 'en'
      ? "Browse thousands of professional photos, videos, audio tracks and illustrations. Find the perfect creative content for your projects."
      : "Parcourez des milliers de photos, vidéos, pistes audio et illustrations professionnelles. Trouvez le contenu créatif parfait pour vos projets.",
    type: 'website'
  });
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [categories, setCategories] = useState([
    { value: "all", label: "Toutes les catégories", count: "0" }
  ]);
  const [searchParams] = useSearchParams();
  const { content: marketplaceContent, loading } = useMarketplace();
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Audio filter states
  const [isAudioFilterOpen, setIsAudioFilterOpen] = useState(false);
  const [audioSortBy, setAudioSortBy] = useState("relevant");
  const [infinityFilter, setInfinityFilter] = useState("all");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [lengthRange, setLengthRange] = useState([0, 300]); // 0-5 minutes in seconds
  const [bpmRange, setBpmRange] = useState([60, 180]);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');
    
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    if (searchParam) {
      setSearchQuery(searchParam);
    }
    
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [searchParams, selectedCategory, searchQuery, sortBy]);

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

  // Close audio filter panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setIsAudioFilterOpen(false);
      }
    };

    if (isAudioFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAudioFilterOpen]);

  const moods = [
    { key: 'action', label: t('audio.mood.action') },
    { key: 'corporate', label: t('audio.mood.corporate') },
    { key: 'comedy', label: t('audio.mood.comedy') },
    { key: 'drama', label: t('audio.mood.drama') },
    { key: 'epic', label: t('audio.mood.epic') },
    { key: 'future', label: t('audio.mood.future') },
    { key: 'fashion', label: t('audio.mood.fashion') },
    { key: 'games', label: t('audio.mood.games') },
    { key: 'happy', label: t('audio.mood.happy') },
    { key: 'horror', label: t('audio.mood.horror') },
    { key: 'religious', label: t('audio.mood.religious') },
    { key: 'inspiration', label: t('audio.mood.inspiration') },
    { key: 'romantic', label: t('audio.mood.romantic') },
    { key: 'solo', label: t('audio.mood.solo') },
    { key: 'sad', label: t('audio.mood.sad') },
  ];

  const toggleMood = (mood: string) => {
    setSelectedMoods(prev =>
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    );
  };

  // Filter content based on search and category
  const filteredContent = marketplaceContent.filter(content => {
    const matchesSearch = (content.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (content.author || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
                           content.category_id === selectedCategory ||
                           content.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort the filtered content
  const sortedContent = [...filteredContent].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        // Sort by downloads + likes
        const popularityA = (a.downloads || 0) + (a.likes || 0);
        const popularityB = (b.downloads || 0) + (b.likes || 0);
        return popularityB - popularityA;
      case "recent":
        // Sort by upload date (most recent first)
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      case "price-low":
        // Sort by price ascending
        return (a.price || 0) - (b.price || 0);
      case "price-high":
        // Sort by price descending
        return (b.price || 0) - (a.price || 0);
      default:
        return 0;
    }
  });

  // Check if we're viewing audio content
  const isAudioSection = selectedCategory === "audio" || 
    filteredContent.some(content => content.type === "audio");

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

              {isAudioSection && (
                <div className="relative" ref={filterPanelRef}>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAudioFilterOpen(!isAudioFilterOpen)}
                    className="gap-2"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {t('audio.filters')}
                    <ChevronDown className={`h-4 w-4 transition-transform ${isAudioFilterOpen ? 'rotate-180' : ''}`} />
                  </Button>

                  {isAudioFilterOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg p-6 z-50">
                      {/* Sort By */}
                      <div className="mb-6">
                        <Label className="text-sm font-semibold mb-3 block">{t('audio.sortBy')}</Label>
                        <Select value={audioSortBy} onValueChange={setAudioSortBy}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="popular">{t('audio.popular')}</SelectItem>
                            <SelectItem value="relevant">{t('audio.relevant')}</SelectItem>
                            <SelectItem value="fresh">{t('audio.fresh')}</SelectItem>
                            <SelectItem value="random">{t('audio.random')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Visustock Infinity */}
                      <div className="mb-6">
                        <Label className="text-sm font-semibold mb-3 block">{t('audio.infinity')}</Label>
                        <Select value={infinityFilter} onValueChange={setInfinityFilter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('audio.all')}</SelectItem>
                            <SelectItem value="infinity">{t('audio.includedInfinity')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Moods */}
                      <div className="mb-6">
                        <Label className="text-sm font-semibold mb-3 block">{t('audio.moods')}</Label>
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                          {moods.map((mood) => (
                            <div key={mood.key} className="flex items-center space-x-2">
                              <Checkbox
                                id={mood.key}
                                checked={selectedMoods.includes(mood.key)}
                                onCheckedChange={() => toggleMood(mood.key)}
                              />
                              <label
                                htmlFor={mood.key}
                                className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {mood.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Length */}
                      <div className="mb-6">
                        <Label className="text-sm font-semibold mb-3 block">
                          {t('audio.length')}: {Math.floor(lengthRange[0] / 60)}:{(lengthRange[0] % 60).toString().padStart(2, '0')} - {Math.floor(lengthRange[1] / 60)}:{(lengthRange[1] % 60).toString().padStart(2, '0')}
                        </Label>
                        <Slider
                          value={lengthRange}
                          onValueChange={setLengthRange}
                          min={0}
                          max={300}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      {/* BPM */}
                      <div className="mb-4">
                        <Label className="text-sm font-semibold mb-3 block">
                          {t('audio.bpm')}: {bpmRange[0]} - {bpmRange[1]}
                        </Label>
                        <Slider
                          value={bpmRange}
                          onValueChange={setBpmRange}
                          min={60}
                          max={180}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      {/* Reset Button */}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setAudioSortBy("relevant");
                          setInfinityFilter("all");
                          setSelectedMoods([]);
                          setLengthRange([0, 300]);
                          setBpmRange([60, 180]);
                        }}
                      >
                        {t('audio.reset')}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {!isAudioSection && (
                <Button variant="outline" size="icon">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              )}
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

            <Select value={sortBy} onValueChange={setSortBy}>
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
        ) : sortedContent.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-stock-dark/60 text-lg">Aucun contenu trouvé</div>
            <p className="text-stock-dark/40 mt-2">Essayez d'ajuster vos filtres de recherche</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {sortedContent
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((content) => (
                  <ContentCard key={content.id} {...content} />
                ))}
            </div>

            {/* Pagination - Only show if more than one page */}
            {Math.ceil(sortedContent.length / itemsPerPage) > 1 && (
              <div className="flex justify-center mt-12">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) {
                            setCurrentPage(currentPage - 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>

                    {Array.from({ length: Math.ceil(sortedContent.length / itemsPerPage) }, (_, i) => i + 1).map((page) => {
                      const totalPages = Math.ceil(sortedContent.length / itemsPerPage);
                      
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < Math.ceil(sortedContent.length / itemsPerPage)) {
                            setCurrentPage(currentPage + 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className={
                          currentPage === Math.ceil(sortedContent.length / itemsPerPage)
                            ? 'pointer-events-none opacity-50'
                            : ''
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Marketplace;