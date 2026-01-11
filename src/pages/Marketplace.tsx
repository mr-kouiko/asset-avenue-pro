import { useState, useEffect, useRef, useMemo } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, ChevronDown, Video, Camera } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useMarketplace } from "@/hooks/useMarketplace";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { SearchWithSuggestions } from "@/components/SearchWithSuggestions";
import { fuzzySearch, type SearchableContent, type ScoredResult } from "@/utils/fuzzySearch";
import VideoFiltersPanel, { type VideoFilters } from "@/components/VideoFiltersPanel";
import PhotoFiltersPanel, { type PhotoFilters } from "@/components/PhotoFiltersPanel";
import { 
  applyVideoHardFilters, 
  applyPhotoHardFilters, 
  calculateRelevanceRank,
  countActiveVideoFilters,
  countActivePhotoFilters
} from "@/utils/filterEngine";

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
  const { content: marketplaceContent, loading, hasMore, loadMore } = useMarketplace();
  
  // Audio filter states
  const [isAudioFilterOpen, setIsAudioFilterOpen] = useState(false);
  const [isMobileVideoFilterOpen, setIsMobileVideoFilterOpen] = useState(false);
  const [audioSortBy, setAudioSortBy] = useState("relevant");
  const [infinityFilter, setInfinityFilter] = useState("all");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [lengthRange, setLengthRange] = useState([0, 300]); // 0-5 minutes in seconds
  const [bpmRange, setBpmRange] = useState([60, 180]);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Video filter states
  const [videoFilters, setVideoFilters] = useState<VideoFilters>({
    useCase: [],
    aiVideos: [],
    style: [],
    format: [],
    effects: [],
    orientation: null,
    resolution: null,
    aiGenerated: null,
    loopable: null,
    withPeople: null,
    copySpace: null,
    platform: [],
    duration: [0, 60],
  });

  const resetVideoFilters = () => {
    setVideoFilters({
      useCase: [],
      aiVideos: [],
      style: [],
      format: [],
      effects: [],
      orientation: null,
      resolution: null,
      aiGenerated: null,
      loopable: null,
      withPeople: null,
      copySpace: null,
      platform: [],
      duration: [0, 60],
    });
  };

  // Photo filter states
  const [photoFilters, setPhotoFilters] = useState<PhotoFilters>({
    useCase: [],
    aiPhotos: [],
    style: [],
    subject: [],
    format: [],
    orientation: null,
    resolution: null,
    aiGenerated: null,
    withPeople: null,
    numberOfPeople: null,
    copySpace: null,
    color: null,
    license: null,
  });

  const [isMobilePhotoFilterOpen, setIsMobilePhotoFilterOpen] = useState(false);

  const resetPhotoFilters = () => {
    setPhotoFilters({
      useCase: [],
      aiPhotos: [],
      style: [],
      subject: [],
      format: [],
      orientation: null,
      resolution: null,
      aiGenerated: null,
      withPeople: null,
      numberOfPeople: null,
      copySpace: null,
      color: null,
      license: null,
    });
  };

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

  // Convert marketplace content to searchable format
  const searchableContent: SearchableContent[] = useMemo(() => 
    marketplaceContent.map(item => ({
      id: item.id,
      title: item.title || '',
      tags: item.tags || [],
      author: item.author || '',
      type: item.type || '',
      price: item.price || 0,
      downloads: item.downloads || 0,
      likes: item.likes || 0
    })), 
    [marketplaceContent]
  );

  // Filter content with structured hard filters + keyword ranking
  const filteredContent = useMemo(() => {
    let results = marketplaceContent;
    
    // STEP 1: Apply category filter (content type)
    if (selectedCategory !== "all") {
      results = results.filter(content => 
        content.category_id === selectedCategory || content.type === selectedCategory
      );
    }
    
    // STEP 2: Apply HARD FILTERS (exact match, AND logic)
    if (isVideoSection) {
      results = applyVideoHardFilters(results, videoFilters);
    } else if (isPhotoSection) {
      results = applyPhotoHardFilters(results, photoFilters);
    }
    
    // STEP 3: Apply fuzzy search for RANKING only (soft signal)
    if (searchQuery.trim()) {
      const fuzzyResults = fuzzySearch(searchableContent, searchQuery, { minScore: 3 });
      const matchedIds = new Set(fuzzyResults.map(r => r.item.id));
      
      // Filter to matched items, then add relevance score
      results = results
        .filter(content => matchedIds.has(content.id))
        .map(content => ({
          ...content,
          _relevanceScore: calculateRelevanceRank(content, searchQuery)
        }))
        .sort((a, b) => ((b as any)._relevanceScore || 0) - ((a as any)._relevanceScore || 0));
    }
    
    return results;
  }, [marketplaceContent, searchableContent, searchQuery, selectedCategory, videoFilters, photoFilters, isVideoSection, isPhotoSection]);

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

  // Check if we're viewing audio, video, or photo content
  const isAudioSection = selectedCategory === "audio" || 
    filteredContent.some(content => content.type === "audio");
  const isVideoSection = selectedCategory === "video";
  const isPhotoSection = selectedCategory === "photo";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <div className="container py-8">
        {/* Search and Filters Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search Bar with Suggestions */}
            <div className="flex-1">
              <SearchWithSuggestions
                items={searchableContent}
                placeholder={language === 'fr' ? "Rechercher dans la marketplace..." : "Search the marketplace..."}
                onSearch={setSearchQuery}
                initialValue={searchQuery}
              />
            </div>

            {/* Filters - hide category dropdown when in video or photo section */}
            <div className="flex gap-3">
              {!isVideoSection && !isPhotoSection && (
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
              )}

              {isVideoSection && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md">
                  <Video className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {language === 'en' ? "Videos" : "Vidéos"}
                  </span>
                </div>
              )}

              {isPhotoSection && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md">
                  <Camera className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {language === 'en' ? "Photos" : "Photos"}
                  </span>
                </div>
              )}

              {!isVideoSection && !isPhotoSection && (
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
              )}

              {isAudioSection && !isVideoSection && !isPhotoSection && (
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

              {!isAudioSection && !isVideoSection && !isPhotoSection && (
                <Button variant="outline" size="icon">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              )}

              {/* Mobile Video Filter Button */}
              {isVideoSection && (
                <Button 
                  variant="outline" 
                  className="lg:hidden gap-2"
                  onClick={() => setIsMobileVideoFilterOpen(!isMobileVideoFilterOpen)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {language === 'en' ? "Filters" : "Filtres"}
                </Button>
              )}

              {/* Mobile Photo Filter Button */}
              {isPhotoSection && (
                <Button 
                  variant="outline" 
                  className="lg:hidden gap-2"
                  onClick={() => setIsMobilePhotoFilterOpen(!isMobilePhotoFilterOpen)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {language === 'en' ? "Filters" : "Filtres"}
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

          {/* Mobile Video Filters Panel */}
          {isVideoSection && isMobileVideoFilterOpen && (
            <div className="lg:hidden mb-6">
              <VideoFiltersPanel
                filters={videoFilters}
                onFiltersChange={setVideoFilters}
                onReset={resetVideoFilters}
              />
            </div>
          )}

          {/* Mobile Photo Filters Panel */}
          {isPhotoSection && isMobilePhotoFilterOpen && (
            <div className="lg:hidden mb-6">
              <PhotoFiltersPanel
                filters={photoFilters}
                onFiltersChange={setPhotoFilters}
                onReset={resetPhotoFilters}
              />
            </div>
          )}
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
            {/* Conditional layout: sidebar + grid for video/photo, vertical stack for audio, grid for others */}
            {isVideoSection ? (
              <div className="flex gap-6">
                {/* Video Filters Sidebar - Hidden on mobile */}
                <div className="hidden lg:block flex-shrink-0 sticky top-4 self-start">
                  <VideoFiltersPanel
                    filters={videoFilters}
                    onFiltersChange={setVideoFilters}
                    onReset={resetVideoFilters}
                  />
                </div>
                
                {/* Video Content Grid */}
                <div className="flex-1">
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {sortedContent.map((content) => (
                      <ContentCard key={content.id} {...content} />
                    ))}
                  </div>
                </div>
              </div>
            ) : isPhotoSection ? (
              <div className="flex gap-6">
                {/* Photo Filters Sidebar - Hidden on mobile */}
                <div className="hidden lg:block flex-shrink-0 sticky top-4 self-start">
                  <PhotoFiltersPanel
                    filters={photoFilters}
                    onFiltersChange={setPhotoFilters}
                    onReset={resetPhotoFilters}
                  />
                </div>
                
                {/* Photo Content Grid */}
                <div className="flex-1">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {sortedContent.map((content) => (
                      <ContentCard key={content.id} {...content} />
                    ))}
                  </div>
                </div>
              </div>
            ) : selectedCategory === "audio" ? (
              <div className="flex flex-col gap-4 w-full">
                {sortedContent.map((content) => (
                  <ContentCard key={content.id} {...content} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {sortedContent.map((content) => (
                  <ContentCard key={content.id} {...content} />
                ))}
              </div>
            )}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-12">
                <Button
                  onClick={loadMore}
                  disabled={loading}
                  size="lg"
                  variant="outline"
                >
                  {loading ? 'Chargement...' : 'Charger plus de contenu'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Marketplace;