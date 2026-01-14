import { Camera, Video, Music, FileImage, TrendingUp, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useContentStats } from "@/hooks/useContentStats";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

export const Navigation = () => {
  const { stats, loading } = useContentStats();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  
  const categories = [
    { name: t('nav.photos'), icon: Camera, count: loading ? "..." : stats.photos.toString(), category: "photo" },
    { name: t('nav.videos'), icon: Video, count: loading ? "..." : stats.videos.toString(), category: "video" },
    { name: t('nav.audio'), icon: Music, count: loading ? "..." : stats.audios.toString(), category: "audio" },
    { name: "Ebooks", icon: BookOpen, count: loading ? "..." : stats.ebooks.toString(), category: "ebook" },
    { name: t('nav.vectors'), icon: FileImage, count: "0", category: "vector" },
    { name: t('nav.trending'), icon: TrendingUp, count: t('common.new'), category: "trending" },
  ];

  return (
    <nav className="border-b bg-surface overflow-hidden">
      <div className="container px-2 md:px-4">
        <div className="flex items-center gap-1 py-2 md:py-3 overflow-x-auto scrollbar-hide -mx-2 px-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.name}
                variant="ghost"
                size="sm"
                className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap hover:bg-primary/10 px-2.5 md:px-3 h-9 md:h-10 shrink-0"
                asChild
              >
                <Link to={`/marketplace?category=${category.category}`}>
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{category.name}</span>
                  {user && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {category.count}
                    </span>
                  )}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};