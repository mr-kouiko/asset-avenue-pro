import { Camera, Video, Music, Palette, FileImage, TrendingUp, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useContentStats } from "@/hooks/useContentStats";
import { useLanguage } from "@/contexts/LanguageContext";

export const Navigation = () => {
  const { stats, loading } = useContentStats();
  const { language, t } = useLanguage();
  
  const categories = [
    { name: t('nav.photos'), icon: Camera, count: loading ? "..." : stats.photos.toString(), category: "photo" },
    { name: t('nav.videos'), icon: Video, count: loading ? "..." : stats.videos.toString(), category: "video" },
    { name: t('nav.audio'), icon: Music, count: loading ? "..." : stats.audios.toString(), category: "audio" },
    { name: t('nav.illustrations'), icon: Palette, count: loading ? "..." : stats.illustrations.toString(), category: "illustration" },
    { name: t('nav.ebooks'), icon: BookOpen, count: loading ? "..." : stats.ebooks.toString(), category: "ebook" },
    { name: t('nav.vectors'), icon: FileImage, count: "0", category: "vector" },
    { name: t('nav.trending'), icon: TrendingUp, count: t('common.new'), category: "trending" },
  ];

  return (
    <nav className="border-b bg-surface">
      <div className="container">
        <div className="flex items-center space-x-1 py-3 overflow-x-auto">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.name}
                variant="ghost"
                className="flex items-center space-x-2 whitespace-nowrap hover:bg-primary/10"
                asChild
              >
                <Link to={`/${language}/marketplace?category=${category.category}`}>
                  <Icon className="h-4 w-4" />
                  <span>{category.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {category.count}
                  </span>
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};