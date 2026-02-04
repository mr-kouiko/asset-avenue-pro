import { Camera, Video, Music, FileImage, TrendingUp, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useContentStats } from "@/hooks/useContentStats";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

export const Navigation = () => {
  const { stats, loading } = useContentStats();
  const { language, t } = useLanguage();
  const { isAdmin } = useAuth();
  
  const categories = [
    { name: t('nav.photos'), icon: Camera, count: loading ? "..." : stats.photos.toString(), href: "/marketplace?category=photo" },
    { name: t('nav.videos'), icon: Video, count: loading ? "..." : stats.videos.toString(), href: "/marketplace?category=video" },
    { name: t('nav.audio'), icon: Music, count: loading ? "..." : stats.audios.toString(), href: "/marketplace?category=audio" },
    { name: "Ebooks", icon: BookOpen, count: loading ? "..." : stats.ebooks.toString(), href: "/marketplace?category=ebook" },
    { name: t('nav.vectors'), icon: FileImage, count: "0", href: "/marketplace?category=vector" },
    { name: "Collections", icon: Layers, count: "10", href: "/collections" },
    { name: t('nav.trending'), icon: TrendingUp, count: t('common.new'), href: "/marketplace?category=trending" },
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
                <Link to={category.href}>
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{category.name}</span>
                  {isAdmin && (
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