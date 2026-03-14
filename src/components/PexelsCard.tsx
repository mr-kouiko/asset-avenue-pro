import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LazyImage } from "./LazyImage";
import type { PexelsItem } from "@/hooks/usePexelsSearch";

interface PexelsCardProps {
  item: PexelsItem;
}

export const PexelsCard = memo(({ item }: PexelsCardProps) => {
  const handleClick = () => {
    window.open(item.pexelsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(item.originalUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer bg-card border border-border/50 hover:border-primary/20 touch-manipulation"
      onClick={handleClick}
    >
      <div className="relative bg-muted overflow-hidden" style={{ aspectRatio: 'var(--thumbnail-aspect, 4/3)' }}>
        <LazyImage
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 font-bold border-0 shadow-sm">
            FREE
          </Badge>
          <Badge variant="secondary" className="bg-white/95 text-foreground text-[10px] px-2 py-0.5 font-medium border-0 shadow-sm">
            Pexels
          </Badge>
        </div>

        {/* External link icon */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 bg-white/95 hover:bg-white border-0 shadow-sm">
            <ExternalLink className="h-3.5 w-3.5 text-foreground" />
          </Button>
        </div>

        {/* Download button */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-7 w-7 p-0 bg-white/95 hover:bg-white border-0 shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-foreground" />
          </Button>
        </div>
      </div>

      <div className="p-2.5 md:p-3 space-y-1">
        <h3 className="font-medium text-sm text-foreground leading-tight line-clamp-2 min-h-[2.5rem]">
          {item.title}
        </h3>
        <p className="text-xs text-muted-foreground truncate">
          {item.type === 'video' ? 'Video' : 'Photo'} by{' '}
          <span className="font-medium">{item.photographer}</span> on Pexels
        </p>
      </div>
    </Card>
  );
});

PexelsCard.displayName = 'PexelsCard';
