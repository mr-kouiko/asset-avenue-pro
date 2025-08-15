import { Camera, Video, Music, Palette, FileImage, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = [
  { name: "Photos", icon: Camera, count: "2.1M" },
  { name: "Vidéos", icon: Video, count: "430K" },
  { name: "Audio", icon: Music, count: "180K" },
  { name: "Illustrations", icon: Palette, count: "950K" },
  { name: "Vecteurs", icon: FileImage, count: "1.2M" },
  { name: "Tendances", icon: TrendingUp, count: "Nouveau" },
];

export const Navigation = () => {
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
              >
                <Icon className="h-4 w-4" />
                <span>{category.name}</span>
                <span className="text-xs text-muted-foreground">
                  {category.count}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};