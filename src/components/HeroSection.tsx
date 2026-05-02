import { TrendingUp, Play } from "lucide-react";
import { useContentStats } from "@/hooks/useContentStats";
import { useLanguage } from "@/contexts/LanguageContext";
import { SearchWithSuggestions } from "@/components/SearchWithSuggestions";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@/assets/hero-image.jpg";

export const HeroSection = () => {
  const { stats, loading } = useContentStats();
  const { language } = useLanguage();
  const { user } = useAuth();

  // Empty array for search suggestions - SearchWithSuggestions handles its own data fetching
  // This avoids loading 200 marketplace items on homepage just for suggestions
  const searchableItems: { id: string; title: string; tags: string[]; type: string }[] = [];

  const content = {
    fr: {
      title: "La marketplace digitale premium pour",
      titleHighlight: "créateurs et professionnels",
      subtitle: "Photos, vidéos, musiques, ebooks et contenus IA — téléchargements instantanés, licences commerciales claires et outils créatifs IA intégrés. Vendez vos créations ou trouvez l'asset parfait pour votre projet.",
      searchPlaceholder: "Rechercher photos, vidéos, audio, ebooks...",
      statsLabels: {
        photos: "Photos",
        videos: "Vidéos",
        audio: "Audio",
        ebooks: "Ebooks"
      }
    },
    en: {
      title: "The premium digital marketplace for",
      titleHighlight: "creators and professionals",
      subtitle: "Stock photos, videos, music, ebooks and AI-generated assets — instant downloads, clear commercial licensing and built-in AI creative tools. Sell your work or find the perfect asset for your next project.",
      searchPlaceholder: "Search photos, videos, audio, ebooks...",
      statsLabels: {
        photos: "Photos",
        videos: "Videos",
        audio: "Audio",
        ebooks: "Ebooks"
      }
    }
  };

  const t = content[language as 'en' | 'fr'] ?? content.en;

  return (
    <section className="relative py-6 sm:py-12 md:py-20 overflow-hidden min-h-[40vh] sm:min-h-[55vh] md:min-h-[70vh] flex items-center">
      {/* Fallback Background for when video fails to load - lowest z-index */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Background Video - Cropped on mobile to focus on center subject */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster={heroImage}
        className="absolute inset-0 w-full h-[120%] sm:h-full object-cover object-center sm:object-center z-[1] -top-[10%] sm:top-0"
      >
        <source src="https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/public/video%20hero%202/2025_EMEA_Reel.mp4" type="video/mp4" />
      </video>
      
      {/* Gradient Overlay - Stronger on mobile for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 sm:bg-gradient-to-r sm:from-black/50 sm:via-black/40 sm:to-black/50 z-[2]"></div>
      
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

            {/* Search Bar with Suggestions */}
            <div className="max-w-lg mx-auto lg:mx-0 w-full">
              <SearchWithSuggestions
                items={searchableItems}
                placeholder={t.searchPlaceholder}
                onSearch={() => {}}
                variant="hero"
              />
            </div>

          </div>

          {/* Right Image - Hidden on mobile and tablet */}
          <div className="hidden xl:flex flex-1 max-w-lg">
            <div className="relative">
              <img
                src={heroImage}
                alt="Hero"
                loading="eager"
                fetchPriority="high"
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
