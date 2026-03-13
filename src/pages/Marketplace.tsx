import { useState, useEffect, useRef, useMemo } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, ChevronDown, Video, Camera } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams, useParams, useLocation, useNavigate } from "react-router-dom";
import { useMarketplace } from "@/hooks/useMarketplace";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { useSEONoIndex, shouldNoIndexPage } from "@/hooks/useSEONoIndex";
import { SearchWithSuggestions } from "@/components/SearchWithSuggestions";
import { fuzzySearch, type SearchableContent, type ScoredResult } from "@/utils/fuzzySearch";
import { themeSearch, shouldUseThemeSearch, findThemeForQuery } from "@/utils/themeSearch";
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
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect ?price=free to the unified Free Stock Library page
  useEffect(() => {
    if (searchParams.get('price') === 'free') {
      navigate('/free-stock-library', { replace: true });
    }
  }, [searchParams, navigate]);
  
  // Detect if page has filters/search that should not be indexed
  const hasFilterParams = useMemo(() => {
    const paramsToCheck = ['price', 'format', 'license', 'orientation', 'duration', 'search', 'sort', 'page', 'theme'];
    return paramsToCheck.some(param => searchParams.has(param));
  }, [searchParams]);

  // SEO Configuration - base marketplace page
  useSEO({
    title: language === 'en'
      ? "Marketplace - Browse Creative Content"
      : "Marketplace - Browse Creative Content",
    description: language === 'en'
      ? "Browse thousands of professional photos, videos, audio tracks and illustrations. Find the perfect creative content for your projects."
      : "Browse thousands of professional photos, videos, audio tracks and illustrations. Find the perfect creative content for your projects.",
    type: 'website',
    noindex: hasFilterParams // noindex filter variations
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [pexelsTotalCount, setPexelsTotalCount] = useState(0);
  const [categories, setCategories] = useState([
    { value: "all", label: "All Categories", count: "0" }
  ]);
  const { searchQuery: routeSearchQuery } = useParams<{ searchQuery?: string }>();
  
  // Compute initial category from URL
  const getInitialCategory = () => {
    // First check query params
    const categoryParam = searchParams.get('category');
    if (categoryParam) return categoryParam;
    
    // Then check path-based routes
    const path = location.pathname;
    const categoryPathMap: Record<string, string> = {
      '/videos': 'video',
      '/photos': 'photo',
      '/illustrations': 'illustration',
      '/audio': 'audio',
      '/ebooks': 'ebook'
    };
    for (const [urlPath, category] of Object.entries(categoryPathMap)) {
      if (path.startsWith(urlPath)) return category;
    }
    return 'all';
  };
  
  // Initialize with URL category
  const [selectedCategory, setSelectedCategory] = useState(() => getInitialCategory());
  
  // Use server-side category filtering
  const { content: marketplaceContent, loading, hasMore, loadMore } = useMarketplace(200, selectedCategory);
  
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

  // Map URL path to category (for route changes after initial load)
  useEffect(() => {
    const path = location.pathname;
    
    // Check for SEO-friendly category routes
    const categoryPathMap: Record<string, string> = {
      '/videos': 'video',
      '/photos': 'photo',
      '/illustrations': 'illustration',
      '/audio': 'audio',
      '/ebooks': 'ebook'
    };
    
    // Find matching category from path
    for (const [urlPath, category] of Object.entries(categoryPathMap)) {
      if (path.startsWith(urlPath)) {
        setSelectedCategory(category);
        break;
      }
    }
    
    // Extract search query from route param (e.g., /videos/dubai -> "dubai")
    if (routeSearchQuery) {
      // Convert slug back to search query (e.g., "new-york" -> "new york")
      const decodedQuery = routeSearchQuery.replace(/-/g, ' ');
      setSearchQuery(decodedQuery);
    }
  }, [location.pathname, routeSearchQuery]);

  // Track price filter from URL
  const [priceFilter, setPriceFilter] = useState<string | null>(null);

  // Also handle traditional query params and theme params for backward compatibility
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');
    const themeParam = searchParams.get('theme');
    const priceParam = searchParams.get('price');
    
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    if (searchParam) {
      setSearchQuery(searchParam);
    }
    // Theme param triggers semantic search with the theme ID
    if (themeParam) {
      setSearchQuery(themeParam);
    }
    // Handle price=free filter
    if (priceParam) {
      setPriceFilter(priceParam);
    } else {
      setPriceFilter(null);
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
    { value: "all", label: "All prices" },
    { value: "free", label: "Free" },
    { value: "0-10", label: "€0 - €10" },
    { value: "10-25", label: "€10 - €25" },
    { value: "25-50", label: "€25 - €50" },
    { value: "50+", label: "€50 and up" },
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

  // Check if we're viewing video or photo content (needed for filtering)
  const isVideoSection = selectedCategory === "video";
  const isPhotoSection = selectedCategory === "photo";

  // Category slug to UUID mapping for filtering
  const categorySlugToId: Record<string, string> = {
    'photo': 'e6eb8946-abab-4a0b-9249-da012b7a87af',
    'video': 'b4fe5f6a-554b-4409-8eaa-71c87d225b33',
    'audio': '0b9e322e-cecb-494f-ba8d-c5397e913b99',
    'illustration': '653f8437-6317-4a81-8bbf-9b8c520c0dbe',
    'vector': 'ceca4e62-559c-4dc6-98fe-64017d537192',
    'ebook': '9ec96e29-199f-4ce2-b951-4ca18c62c87c',
    'vfx': 'f8a21c7e-3d5b-4e9f-a1c2-8b6d9e4f7a3c',
  };

  // Filter content with structured hard filters + keyword ranking
  const filteredContent = useMemo(() => {
    let results = marketplaceContent;
    
    // STEP 0: Apply price filter (free content)
    // IMPORTANT: Only treat explicitly free items as free (price = 0 in DB),
    // not items with null price.
    if (priceFilter === 'free') {
      results = results.filter(content => content.isFree === true);
    }
    
    // STEP 1: Apply category filter (content type)
    if (selectedCategory !== "all") {
      const categoryUUID = categorySlugToId[selectedCategory];
      results = results.filter(content => {
        // Match by category_id UUID OR by normalized type
        if (categoryUUID && content.category_id === categoryUUID) return true;
        // Also match vector category when filtering by illustration
        if (selectedCategory === 'illustration' && content.category_id === categorySlugToId['vector']) return true;
        // Fallback: match by content.type for items without category_id
        return content.type === selectedCategory;
      });
    }
    
    // STEP 2: Apply HARD FILTERS (exact match, AND logic)
    if (isVideoSection) {
      results = applyVideoHardFilters(results, videoFilters);
    } else if (isPhotoSection) {
      results = applyPhotoHardFilters(results, photoFilters);
    }
    
    // STEP 3: Apply search - use THEME SEARCH for calendar curations, fuzzy search otherwise
    if (searchQuery.trim()) {
      const themeParam = searchParams.get('theme');
      
      // Use semantic theme search for calendar curations (STRICT relevance)
      if (themeParam) {
        // STRICT MODE: When theme param exists, ONLY show theme-matched products
        // If no matches, show EMPTY (never fallback to all products)
        const theme = findThemeForQuery(searchQuery);
        
        if (theme) {
          // Theme found - apply strict semantic filtering
          const themeResults = themeSearch(searchableContent, searchQuery, 200);
          const matchedIds = new Set(themeResults.map(r => r.item.id));
          
          // Filter to only theme-matched items and sort by theme score
          results = results
            .filter(content => matchedIds.has(content.id))
            .map(content => {
              const themeResult = themeResults.find(r => r.item.id === content.id);
              return { ...content, _themeScore: themeResult?.score || 0 };
            })
            .sort((a, b) => (b._themeScore || 0) - (a._themeScore || 0));
        } else {
          // Theme param exists but no theme definition found
          // Still try to match by simple keyword search in title/tags
          const themeWords = themeParam.toLowerCase().split(/[\s-]+/);
          results = results.filter(content => {
            const titleLower = (content.title || '').toLowerCase();
            const tagsLower = (content.tags || []).map(t => t.toLowerCase());
            const allText = `${titleLower} ${tagsLower.join(' ')}`;
            
            // Must match at least one theme word
            return themeWords.some(word => word.length > 2 && allText.includes(word));
          });
        }
      } else if (shouldUseThemeSearch(searchQuery)) {
        // No theme param but query matches a theme - use theme search
        const themeResults = themeSearch(searchableContent, searchQuery, 100);
        const matchedIds = new Set(themeResults.map(r => r.item.id));
        
        results = results
          .filter(content => matchedIds.has(content.id))
          .map(content => {
            const themeResult = themeResults.find(r => r.item.id === content.id);
            return { ...content, _themeScore: themeResult?.score || 0 };
          })
          .sort((a, b) => (b._themeScore || 0) - (a._themeScore || 0));
      } else {
        // Standard fuzzy search for regular queries
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
    }
    
    return results;
  }, [marketplaceContent, searchableContent, searchQuery, selectedCategory, videoFilters, photoFilters, isVideoSection, isPhotoSection, searchParams, priceFilter]);

  // Sort the filtered content
  // Sort the filtered content - memoized to ensure proper React updates
  const sortedContent = useMemo(() => {
    return [...filteredContent].sort((a, b) => {
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
          // Default to most recent if no valid sort option
          const defaultDateA = new Date(a.created_at || 0).getTime();
          const defaultDateB = new Date(b.created_at || 0).getTime();
          return defaultDateB - defaultDateA;
      }
    });
  }, [filteredContent, sortBy]);

  // Check if we're viewing audio content
  const isAudioSection = selectedCategory === "audio" || 
    filteredContent.some(content => content.type === "audio");

  // Apply noindex for soft 404 scenarios (empty results with search/filters)
  const hasEmptyResults = !loading && sortedContent.length === 0;
  const shouldApplyNoIndex = shouldNoIndexPage({
    hasResults: sortedContent.length > 0,
    resultCount: sortedContent.length,
    minResultsForIndex: 1,
    hasFilters: hasFilterParams,
    hasSearch: !!searchQuery.trim(),
  });
  useSEONoIndex(shouldApplyNoIndex || hasEmptyResults, 
    hasEmptyResults ? 'Empty results (soft 404)' : 'Filter/search variation');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <div className="container py-8">
        {/* Search and Filters Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search Bar with Suggestions - Category-level search */}
            <div className="flex-1">
              <SearchWithSuggestions
                items={searchableContent}
                placeholder={language === 'fr' ? "Rechercher dans la marketplace..." : "Search the marketplace..."}
                onSearch={setSearchQuery}
                initialValue={searchQuery}
                categoryFilter={selectedCategory}
              />
            </div>

            {/* Filters - hide category dropdown when in video, photo or audio section */}
            <div className="flex gap-3">
              {!isVideoSection && !isPhotoSection && !isAudioSection && (
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
                    Videos
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
                    <SelectValue placeholder="Price" />
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
              {loading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <span className="text-sm text-muted-foreground">
                  {filteredContent.length} results found
                </span>
              )}
              <Badge variant="secondary">All</Badge>
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most popular</SelectItem>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : sortedContent.length === 0 ? (
          <div className="text-center py-16">
            {/* SEO: Empty state signals to search engines this is a thin page */}
            <div className="text-stock-dark/60 text-lg">No content found</div>
            <p className="text-stock-dark/40 mt-2">Try adjusting your search filters</p>
            <p className="text-stock-dark/30 mt-4 text-sm">
              Browse our <a href="/marketplace" className="text-primary hover:underline">marketplace</a> to discover creative content.
            </p>
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
                  {loading ? 'Loading...' : 'Load more content'}
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