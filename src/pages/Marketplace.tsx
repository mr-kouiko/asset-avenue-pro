import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, Video, Camera, Sparkles, Gift } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useSearchParams, useParams, useLocation, useNavigate } from "react-router-dom";
import { useMarketplace, PAGE_SIZE, type MarketplaceFilters } from "@/hooks/useMarketplace";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { useSEONoIndex, shouldNoIndexPage } from "@/hooks/useSEONoIndex";
import { SearchWithSuggestions } from "@/components/SearchWithSuggestions";
import type { SearchableContent } from "@/utils/fuzzySearch";
import VideoFiltersPanel, { type VideoFilters } from "@/components/VideoFiltersPanel";
import PhotoFiltersPanel, { type PhotoFilters } from "@/components/PhotoFiltersPanel";
import {
  resolveFilterTags,
  resolveDurationTags,
  SUBJECT_TAGS,
  STYLE_TAGS,
  USE_CASE_TAGS,
  ORIENTATION_TAGS,
  COLOR_TAGS,
  AI_PHOTO_SUBJECT_TAGS,
  VIDEO_USE_CASE_TAGS,
  VIDEO_STYLE_TAGS,
  VIDEO_FORMAT_TAGS,
  VIDEO_EFFECT_TAGS,
  VIDEO_PLATFORM_TAGS,
  VIDEO_RESOLUTION_TAGS,
  VIDEO_LOOPABLE_TAGS,
  VIDEO_COPY_SPACE_TAGS,
} from "@/utils/filterTagMapper";
import {
  DEFAULT_VIDEO_FILTERS,
  videoFiltersToParams,
  videoFiltersFromParams,
  VIDEO_FILTER_PARAM_KEYS,
} from "@/utils/videoFiltersUrl";

// ── Section Header ────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, count, variant = "default" }: {
  icon: React.ElementType;
  title: string;
  count?: number;
  variant?: "default" | "free" | "pexels";
}) => {
  const colors = {
    default: "text-primary border-primary/20 bg-primary/5",
    free: "text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/30",
    pexels: "text-muted-foreground border-border bg-muted/50",
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors[variant]} mb-4`}>
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="font-semibold text-sm">{title}</span>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="text-xs ml-auto">{count}</Badge>
      )}
    </div>
  );
};

const Marketplace = () => {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
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

  useSEO({
    title: "Marketplace - Browse Creative Content",
    description: "Browse thousands of professional photos, videos, audio tracks and illustrations. Find the perfect creative content for your projects.",
    type: 'website',
    noindex: hasFilterParams,
  });

  // ── Core state ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  
  const [page, setPage] = useState(1);
  const { searchQuery: routeSearchQuery } = useParams<{ searchQuery?: string }>();

  const getInitialCategory = () => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) return categoryParam;
    const path = location.pathname;
    const categoryPathMap: Record<string, string> = {
      '/videos': 'video', '/photos': 'photo', '/illustrations': 'illustration',
      '/audio': 'audio', '/ebooks': 'ebook'
    };
    for (const [urlPath, category] of Object.entries(categoryPathMap)) {
      if (path.startsWith(urlPath)) return category;
    }
    return 'all';
  };

  const [selectedCategory, setSelectedCategory] = useState(() => getInitialCategory());

  // ── Filter state ────────────────────────────────────────────
  const [photoFilters, setPhotoFilters] = useState<PhotoFilters>({
    useCase: [], aiPhotos: [], style: [], subject: [], orientation: [],
    aiGenerated: null, withPeople: null, numberOfPeople: null, copySpace: null, color: null,
  });

  // Initialize video filters from URL on first render (deep-linkable filters).
  const [videoFilters, setVideoFilters] = useState<VideoFilters>(() =>
    videoFiltersFromParams(searchParams)
  );
  // Debounced copy used to build the RPC payload (priority 2 — 180ms).
  const [debouncedVideoFilters, setDebouncedVideoFilters] = useState<VideoFilters>(videoFilters);

  const [isMobileVideoFilterOpen, setIsMobileVideoFilterOpen] = useState(false);
  const [isMobilePhotoFilterOpen, setIsMobilePhotoFilterOpen] = useState(false);

  // Audio filter states
  const [isAudioFilterOpen, setIsAudioFilterOpen] = useState(false);
  const [audioSortBy, setAudioSortBy] = useState("relevant");
  const [infinityFilter, setInfinityFilter] = useState("all");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [lengthRange, setLengthRange] = useState([0, 300]);
  const [bpmRange, setBpmRange] = useState([60, 180]);

  const isVideoSection = selectedCategory === "video";
  const isPhotoSection = selectedCategory === "photo";
  const isAudioSection = selectedCategory === "audio";

  // ── Debounce search ─────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Debounce video filters (priority 2) ────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedVideoFilters(videoFilters), 180);
    return () => clearTimeout(timer);
  }, [videoFilters]);

  // ── Sync video filters → URL (priority 3) ──────────────────
  useEffect(() => {
    if (!isVideoSection) return;
    const next = new URLSearchParams(searchParams);
    VIDEO_FILTER_PARAM_KEYS.forEach(k => next.delete(k));
    const vfParams = videoFiltersToParams(debouncedVideoFilters);
    Object.entries(vfParams).forEach(([k, v]) => next.set(k, v));
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedVideoFilters, isVideoSection]);

  // ── Reset page on filter changes ───────────────────────────
  useEffect(() => { setPage(1); }, [selectedCategory, debouncedSearch, sortBy, photoFilters, debouncedVideoFilters]);

  // ── URL sync ────────────────────────────────────────────────
  useEffect(() => {
    const path = location.pathname;
    const categoryPathMap: Record<string, string> = {
      '/videos': 'video', '/photos': 'photo', '/illustrations': 'illustration',
      '/audio': 'audio', '/ebooks': 'ebook'
    };
    for (const [urlPath, category] of Object.entries(categoryPathMap)) {
      if (path.startsWith(urlPath)) { setSelectedCategory(category); break; }
    }
    if (routeSearchQuery) setSearchQuery(routeSearchQuery.replace(/-/g, ' '));
  }, [location.pathname, routeSearchQuery]);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');
    const themeParam = searchParams.get('theme');
    if (categoryParam) setSelectedCategory(categoryParam);
    if (searchParam) setSearchQuery(searchParam);
    if (themeParam) setSearchQuery(themeParam);
  }, [searchParams]);

  // ── Build server-side filters ───────────────────────────────
  const marketplaceFilters = useMemo<MarketplaceFilters>(() => {
    const f: MarketplaceFilters = {
      category: selectedCategory,
      searchQuery: debouncedSearch || undefined,
      sortBy: sortBy === "all-videos" || sortBy === "all-photos" ? "recent" : sortBy,
      page,
    };

    if (isPhotoSection) {
      if (photoFilters.useCase.length) f.useCaseTags = resolveFilterTags(photoFilters.useCase, USE_CASE_TAGS);
      if (photoFilters.subject.length) f.subjectTags = resolveFilterTags(photoFilters.subject, SUBJECT_TAGS);
      if (photoFilters.style.length) f.styleTags = resolveFilterTags(photoFilters.style, STYLE_TAGS);
      if (photoFilters.orientation.length) f.orientationTags = resolveFilterTags(photoFilters.orientation, ORIENTATION_TAGS);
      if (photoFilters.color) f.colorTags = resolveFilterTags([photoFilters.color], COLOR_TAGS);
      if (photoFilters.withPeople !== null) f.withPeople = photoFilters.withPeople;
      if (photoFilters.aiGenerated !== null) f.aiGenerated = photoFilters.aiGenerated;
      if (photoFilters.aiPhotos.length > 0) {
        f.aiGenerated = true;
        if (!photoFilters.aiPhotos.includes("ai-generated")) {
          const aiSubjectTags = resolveFilterTags(photoFilters.aiPhotos, AI_PHOTO_SUBJECT_TAGS);
          f.subjectTags = [...(f.subjectTags || []), ...aiSubjectTags];
        }
      }
    }

    if (isVideoSection) {
      const vf = debouncedVideoFilters;

      // Tag-array filters (multi-select)
      if (vf.useCase.length)  f.useCaseTags    = resolveFilterTags(vf.useCase,  VIDEO_USE_CASE_TAGS);
      if (vf.style.length)    f.styleTags      = resolveFilterTags(vf.style,    VIDEO_STYLE_TAGS);
      if (vf.effects.length)  f.effectTags     = resolveFilterTags(vf.effects,  VIDEO_EFFECT_TAGS);
      if (vf.platform.length) f.platformTags   = resolveFilterTags(vf.platform, VIDEO_PLATFORM_TAGS);

      // Orientation: merge "format" multi-select AND single "orientation" quick filter.
      const orientationSelections: string[] = [...vf.format];
      if (vf.orientation) orientationSelections.push(vf.orientation);
      if (orientationSelections.length) {
        f.orientationTags = resolveFilterTags(orientationSelections, VIDEO_FORMAT_TAGS);
      }

      // Priority 1 — connect the 4 previously inactive filters.
      // Each goes through its own dedicated parameter so a later migration
      // can swap any one of them to a typed DB column without side-effects.
      if (vf.resolution) {
        f.resolutionTags = resolveFilterTags([vf.resolution], VIDEO_RESOLUTION_TAGS);
      }
      if (vf.loopable === true) {
        f.loopableTags = VIDEO_LOOPABLE_TAGS;
      }
      if (vf.copySpace === true) {
        f.copySpaceTags = VIDEO_COPY_SPACE_TAGS;
      }
      const durationTags = resolveDurationTags(vf.duration[0], vf.duration[1]);
      if (durationTags.length) f.durationTags = durationTags;

      // Booleans
      if (vf.aiGenerated !== null) f.aiGenerated = vf.aiGenerated;
      if (vf.withPeople !== null) f.withPeople = vf.withPeople;
      if (vf.aiVideos.length > 0) f.aiGenerated = true;
    }

    return f;
  }, [selectedCategory, debouncedSearch, sortBy, page, photoFilters, debouncedVideoFilters, isPhotoSection, isVideoSection]);

  // ── Fetch marketplace data ──────────────────────────────────
  const { content: marketplaceContent, loading, totalCount, totalPages } = useMarketplace(marketplaceFilters);


  // ── Split marketplace content into paid & free ──────────────
  const { premiumContent, freeCreatorContent } = useMemo(() => {
    const premium: typeof marketplaceContent = [];
    const free: typeof marketplaceContent = [];
    for (const item of marketplaceContent) {
      if (item.isFree || item.price === 0) {
        free.push(item);
      } else {
        premium.push(item);
      }
    }
    return { premiumContent: premium, freeCreatorContent: free };
  }, [marketplaceContent]);

  // ── Reset handlers ──────────────────────────────────────────
  const resetPhotoFilters = () => setPhotoFilters({
    useCase: [], aiPhotos: [], style: [], subject: [], orientation: [],
    aiGenerated: null, withPeople: null, numberOfPeople: null, copySpace: null, color: null,
  });

  const resetVideoFilters = () => setVideoFilters({
    useCase: [], aiVideos: [], style: [], format: [], effects: [],
    orientation: null, resolution: null, aiGenerated: null, loopable: null,
    withPeople: null, copySpace: null, platform: [], duration: [0, 60],
  });

  // ── Searchable content for suggestions ──────────────────────
  const searchableContent: SearchableContent[] = useMemo(() =>
    marketplaceContent.map(item => ({
      id: item.id, title: item.title || '', tags: item.tags || [],
      author: item.author || '', type: item.type || '', price: item.price || 0,
      downloads: item.downloads || 0, likes: item.likes || 0
    })),
    [marketplaceContent]
  );

  // ── Audio moods ─────────────────────────────────────────────
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
    setSelectedMoods(prev => prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]);
  };

  // ── SEO noindex ─────────────────────────────────────────────
  const hasEmptyResults = !loading && marketplaceContent.length === 0;
  const shouldApplyNoIndex = shouldNoIndexPage({
    hasResults: marketplaceContent.length > 0,
    resultCount: marketplaceContent.length,
    minResultsForIndex: 1,
    hasFilters: hasFilterParams,
    hasSearch: !!debouncedSearch.trim(),
  });
  useSEONoIndex(shouldApplyNoIndex || hasEmptyResults,
    hasEmptyResults ? 'Empty results (soft 404)' : 'Filter/search variation');

  // ── Categories for dropdown ─────────────────────────────────
  const [categories, setCategories] = useState([
    { value: "all", label: "All Categories", count: "0" }
  ]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data: categoriesData } = await supabase.from('categories').select('id, name, slug');
      if (categoriesData) {
        setCategories([
          { value: "all", label: "All Categories", count: totalCount.toString() },
          ...categoriesData.map(cat => ({ value: cat.slug || cat.id, label: cat.name, count: "" }))
        ]);
      }
    };
    fetchCategories();
  }, [totalCount]);

  const priceRanges = [
    { value: "all", label: "All prices" },
    { value: "free", label: "Free" },
    { value: "0-10", label: "€0 - €10" },
    { value: "10-25", label: "€10 - €25" },
    { value: "25-50", label: "€25 - €50" },
    { value: "50+", label: "€50 and up" },
  ];

  // ── Grid class helper ───────────────────────────────────────
  const gridClass = isAudioSection
    ? "flex flex-col gap-4 w-full"
    : isVideoSection
      ? "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
      : isPhotoSection
        ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3"
        : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3";

  // ── Render content sections ─────────────────────────────────
  const renderContentSections = () => {
    const hasPremium = premiumContent.length > 0;
    const hasFreeCreator = freeCreatorContent.length > 0;
    const showSectionHeaders = hasPremium && hasFreeCreator;

    return (
      <>
        {/* Premium Marketplace Assets */}
        {hasPremium && (
          <div className="mb-8">
            {showSectionHeaders && (
              <SectionHeader icon={Sparkles} title="Premium Assets" count={premiumContent.length} variant="default" />
            )}
            <div className={gridClass}>
              {premiumContent.map((content) => (
                <ContentCard key={content.id} {...content} />
              ))}
            </div>
          </div>
        )}

        {/* Free Creator Assets */}
        {hasFreeCreator && (
          <div className="mb-8">
            {showSectionHeaders && (
              <SectionHeader icon={Gift} title="Free Creator Assets" count={freeCreatorContent.length} variant="free" />
            )}
            <div className={gridClass}>
              {freeCreatorContent.map((content) => (
                <ContentCard key={content.id} {...content} />
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  // ── Pagination ──────────────────────────────────────────────
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const maxVisible = 5;
    const pages: number[] = [];
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div className="flex items-center justify-center gap-2 mt-12">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {start > 1 && (
          <>
            <Button variant={page === 1 ? "default" : "outline"} size="sm" onClick={() => setPage(1)}>1</Button>
            {start > 2 && <span className="text-muted-foreground px-1">…</span>}
          </>
        )}
        {pages.map(p => (
          <Button key={p} variant={page === p ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>
            {p}
          </Button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="text-muted-foreground px-1">…</span>}
            <Button variant={page === totalPages ? "default" : "outline"} size="sm" onClick={() => setPage(totalPages)}>
              {totalPages}
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground ml-2">
          Page {page} of {totalPages}
        </span>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <div className="container py-8">
        {/* Search and Filters Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <SearchWithSuggestions
                items={searchableContent}
                placeholder={language === 'fr' ? "Rechercher dans la marketplace..." : "Search the marketplace..."}
                onSearch={setSearchQuery}
                initialValue={searchQuery}
                categoryFilter={selectedCategory}
              />
            </div>

            <div className="flex gap-3">
              {!isVideoSection && !isPhotoSection && !isAudioSection && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {isVideoSection && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md">
                  <Video className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Videos</span>
                </div>
              )}

              {isPhotoSection && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md">
                  <Camera className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Photos</span>
                </div>
              )}

              {!isVideoSection && !isPhotoSection && !isAudioSection && (
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Price" />
                  </SelectTrigger>
                  <SelectContent>
                    {priceRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {isAudioSection && !isVideoSection && !isPhotoSection && (
                <div className="relative">
                  <Button variant="outline" onClick={() => setIsAudioFilterOpen(!isAudioFilterOpen)} className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    {t('audio.filters')}
                    <ChevronDown className={`h-4 w-4 transition-transform ${isAudioFilterOpen ? 'rotate-180' : ''}`} />
                  </Button>

                  {isAudioFilterOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg p-6 z-50">
                      <div className="mb-6">
                        <Label className="text-sm font-semibold mb-3 block">{t('audio.sortBy')}</Label>
                        <Select value={audioSortBy} onValueChange={setAudioSortBy}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="popular">{t('audio.popular')}</SelectItem>
                            <SelectItem value="relevant">{t('audio.relevant')}</SelectItem>
                            <SelectItem value="fresh">{t('audio.fresh')}</SelectItem>
                            <SelectItem value="random">{t('audio.random')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="mb-6">
                        <Label className="text-sm font-semibold mb-3 block">{t('audio.infinity')}</Label>
                        <Select value={infinityFilter} onValueChange={setInfinityFilter}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('audio.all')}</SelectItem>
                            <SelectItem value="infinity">{t('audio.includedInfinity')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="mb-6">
                        <Label className="text-sm font-semibold mb-3 block">{t('audio.moods')}</Label>
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                          {moods.map((mood) => (
                            <div key={mood.key} className="flex items-center space-x-2">
                              <Checkbox id={mood.key} checked={selectedMoods.includes(mood.key)} onCheckedChange={() => toggleMood(mood.key)} />
                              <label htmlFor={mood.key} className="text-sm cursor-pointer leading-none">{mood.label}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mb-6">
                        <Label className="text-sm font-semibold mb-3 block">
                          {t('audio.length')}: {Math.floor(lengthRange[0] / 60)}:{(lengthRange[0] % 60).toString().padStart(2, '0')} - {Math.floor(lengthRange[1] / 60)}:{(lengthRange[1] % 60).toString().padStart(2, '0')}
                        </Label>
                        <Slider value={lengthRange} onValueChange={setLengthRange} min={0} max={300} step={5} className="w-full" />
                      </div>
                      <div className="mb-4">
                        <Label className="text-sm font-semibold mb-3 block">
                          {t('audio.bpm')}: {bpmRange[0]} - {bpmRange[1]}
                        </Label>
                        <Slider value={bpmRange} onValueChange={setBpmRange} min={60} max={180} step={5} className="w-full" />
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => {
                        setAudioSortBy("relevant"); setInfinityFilter("all");
                        setSelectedMoods([]); setLengthRange([0, 300]); setBpmRange([60, 180]);
                      }}>
                        {t('audio.reset')}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {!isAudioSection && !isVideoSection && !isPhotoSection && (
                <Button variant="outline" size="icon"><SlidersHorizontal className="h-4 w-4" /></Button>
              )}

              {isVideoSection && (
                <Button variant="outline" className="lg:hidden gap-2" onClick={() => setIsMobileVideoFilterOpen(!isMobileVideoFilterOpen)}>
                  <SlidersHorizontal className="h-4 w-4" />
                  {language === 'en' ? "Filters" : "Filtres"}
                </Button>
              )}

              {isPhotoSection && (
                <Button variant="outline" className="lg:hidden gap-2" onClick={() => setIsMobilePhotoFilterOpen(!isMobilePhotoFilterOpen)}>
                  <SlidersHorizontal className="h-4 w-4" />
                  {language === 'en' ? "Filters" : "Filtres"}
                </Button>
              )}
            </div>
          </div>

          {/* Results Info and Sort */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {loading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <span className="text-sm text-muted-foreground">
                  {totalCount.toLocaleString()} marketplace results
                </span>
              )}
              {page > 1 && (
                <Badge variant="secondary">Page {page}</Badge>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isVideoSection && (
                    <SelectItem value="all-videos">All videos</SelectItem>
                  )}
                  {isPhotoSection && (
                    <SelectItem value="all-photos">All photos</SelectItem>
                  )}
                  <SelectItem value="popular">Most popular</SelectItem>
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile Filter Panels */}
          {isVideoSection && isMobileVideoFilterOpen && (
            <div className="lg:hidden mb-6">
              <VideoFiltersPanel filters={videoFilters} onFiltersChange={setVideoFilters} onReset={resetVideoFilters} />
            </div>
          )}
          {isPhotoSection && isMobilePhotoFilterOpen && (
            <div className="lg:hidden mb-6">
              <PhotoFiltersPanel filters={photoFilters} onFiltersChange={setPhotoFilters} onReset={resetPhotoFilters} />
            </div>
          )}
        </div>

        {/* Content */}
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
        ) : marketplaceContent.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-muted-foreground text-lg">No content found</div>
            <p className="text-muted-foreground/60 mt-2">Try adjusting your search filters</p>
            <p className="text-muted-foreground/40 mt-4 text-sm">
              Browse our <a href="/marketplace" className="text-primary hover:underline">marketplace</a> to discover creative content.
            </p>
          </div>
        ) : (
          <>
            {(isVideoSection || isPhotoSection) ? (
              <div className="flex gap-6">
                <div className="hidden lg:block flex-shrink-0 sticky top-4 self-start">
                  {isVideoSection ? (
                    <VideoFiltersPanel filters={videoFilters} onFiltersChange={setVideoFilters} onReset={resetVideoFilters} />
                  ) : (
                    <PhotoFiltersPanel filters={photoFilters} onFiltersChange={setPhotoFilters} onReset={resetPhotoFilters} />
                  )}
                </div>
                <div className="flex-1">
                  {renderContentSections()}
                </div>
              </div>
            ) : (
              renderContentSections()
            )}

            {/* Pagination (marketplace only) */}
            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
