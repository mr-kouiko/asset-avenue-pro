import { Search, Play, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useSearch } from "@/hooks/useSearch";
import { useContentStats } from "@/hooks/useContentStats";
import { useLanguage } from "@/contexts/LanguageContext";
import heroImage from "@/assets/hero-image.jpg";

export const HeroSection = () => {
  const [searchInput, setSearchInput] = useState("");
  const { performSearch } = useSearch();
  const { stats, loading } = useContentStats();
  const { language } = useLanguage();

  const content = {
    fr: {
      title: "Découvrez des millions de",
      titleHighlight: "contenus créatifs",
      subtitle: "Photos, vidéos, illustrations, sons et bien plus. Trouvez le contenu parfait pour vos projets créatifs et professionnels.",
      searchPlaceholder: "Rechercher...",
      searchButton: "Rechercher",
      statsLabels: {
        photos: "Photos",
        videos: "Vidéos", 
        illustrations: "Illustrations",
        audio: "Audio",
        ebooks: "Ebooks"
      }
    },
    en: {
      title: "Discover millions of",
      titleHighlight: "creative content",
      subtitle: "Photos, videos, illustrations, audio and more. Find the perfect content for your creative and professional projects.",
      searchPlaceholder: "Search...",
      searchButton: "Search",
      statsLabels: {
        photos: "Photos",
        videos: "Videos",
        illustrations: "Illustrations", 
        audio: "Audio",
        ebooks: "Ebooks"
      }
    }
  };

  const t = content[language];

  const handleSearch = () => {
    if (searchInput.trim()) {
      performSearch(searchInput.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  return (
    <section className="relative py-12 md:py-20 overflow-hidden min-h-[60vh] md:min-h-[70vh] flex items-center">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/public/video%20hero%202/2025_EMEA_Reel.mp4" type="video/mp4" />
      </video>
      
      {/* Fallback Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary-glow/5 to-primary/5"></div>
      
      {/* Overlay - Darker on mobile for better text readability */}
      <div className="absolute inset-0 bg-black/50 md:bg-black/40"></div>
      
      <div className="container relative z-10 px-4">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left Content */}
          <div className="flex-1 space-y-5 md:space-y-6 text-center lg:text-left">
            <div className="space-y-3 md:space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 md:mb-6 drop-shadow-lg leading-tight">
                {t.title}{" "}
                <span className="text-primary drop-shadow-lg block sm:inline">{t.titleHighlight}</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-6 md:mb-8 max-w-3xl mx-auto lg:mx-0 drop-shadow-md">
                {t.subtitle}
              </p>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto lg:mx-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t.searchPlaceholder}
                  className="pl-10 h-12 text-base bg-white/95"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <Button size="lg" className="px-6 sm:px-8 h-12 w-full sm:w-auto" onClick={handleSearch}>
                {t.searchButton}
              </Button>
            </div>

            {/* Stats - Grid on mobile */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 sm:gap-6 md:gap-8 pt-4 md:pt-6 max-w-lg mx-auto lg:mx-0 lg:max-w-none">
              <div className="text-center lg:text-left">
                <div className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">
                  {loading ? "..." : stats.photos.toLocaleString()}
                </div>
                <div className="text-xs sm:text-sm text-white/80 drop-shadow-sm">{t.statsLabels.photos}</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">
                  {loading ? "..." : stats.videos.toLocaleString()}
                </div>
                <div className="text-xs sm:text-sm text-white/80 drop-shadow-sm">{t.statsLabels.videos}</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">
                  {loading ? "..." : stats.illustrations.toLocaleString()}
                </div>
                <div className="text-xs sm:text-sm text-white/80 drop-shadow-sm">{t.statsLabels.illustrations}</div>
              </div>
              <div className="text-center lg:text-left hidden sm:block">
                <div className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">
                  {loading ? "..." : stats.audios.toLocaleString()}
                </div>
                <div className="text-xs sm:text-sm text-white/80 drop-shadow-sm">{t.statsLabels.audio}</div>
              </div>
              <div className="text-center lg:text-left hidden sm:block">
                <div className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">
                  {loading ? "..." : stats.ebooks.toLocaleString()}
                </div>
                <div className="text-xs sm:text-sm text-white/80 drop-shadow-sm">{t.statsLabels.ebooks}</div>
              </div>
            </div>
          </div>

          {/* Right Image - Hidden on mobile and tablet */}
          <div className="hidden xl:flex flex-1 max-w-lg">
            <div className="relative">
              <img
                src={heroImage}
                alt="Hero"
                className="w-full rounded-2xl shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
              
              {/* Floating Cards */}
              <div className="absolute -top-4 -right-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg shadow-lg p-3 animate-bounce">
                <TrendingUp className="h-6 w-6 text-white drop-shadow-md" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg shadow-lg p-3 flex items-center gap-2">
                <Play className="h-5 w-5 text-primary drop-shadow-md" />
                <span className="text-sm font-medium text-white drop-shadow-sm">4K Video</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};