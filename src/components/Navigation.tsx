import { Camera, Video, Music, Palette, FileImage, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useContentStats } from "@/hooks/useContentStats";

export const Navigation = () => {
  const { stats, loading } = useContentStats();
  
  const categories = [
    { name: "Photos", icon: Camera, count: loading ? "..." : stats.photos.toString(), category: "photo" },
    { name: "Vidéos", icon: Video, count: loading ? "..." : stats.videos.toString(), category: "video" },
    { name: "Audio", icon: Music, count: loading ? "..." : stats.audios.toString(), category: "audio" },
    { name: "Illustrations", icon: Palette, count: loading ? "..." : stats.illustrations.toString(), category: "illustration" },
    { name: "Vecteurs", icon: FileImage, count: "0", category: "vector" },
    { name: "Tendances", icon: TrendingUp, count: "Nouveau", category: "trending" },
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
                <Link to={`/marketplace?category=${category.category}`}>
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