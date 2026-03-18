import { memo, useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Download, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LazyImage } from "./LazyImage";
import { useNavigate } from "react-router-dom";
import type { PexelsItem } from "@/hooks/usePexelsSearch";
import { generatePexelsProductSlug } from "@/utils/pexelsSlug";

interface PexelsCardProps {
  item: PexelsItem;
}

export const PexelsCard = memo(({ item }: PexelsCardProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleClick = () => {
    const slug = generatePexelsProductSlug(item.type, item.numericId, item.title, item.alt);
    navigate(`/products/${slug}`);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(item.originalUrl, '_blank', 'noopener,noreferrer');
  };

  // Video hover autoplay
  const attemptPlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = true;
      v.playsInline = true;
      if (v.readyState >= 2) {
        await v.play();
        setIsVideoReady(true);
      } else {
        v.oncanplay = async () => {
          try {
            await v.play();
            setIsVideoReady(true);
          } catch { /* silent */ }
        };
      }
    } catch { /* silent */ }
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (item.type === 'video' && item.videoUrl) attemptPlay();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsVideoReady(false);
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  const isVideo = item.type === 'video';

  return (
    <Card
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer bg-card border border-border/50 hover:border-primary/20 touch-manipulation"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative bg-muted overflow-hidden" style={{ aspectRatio: 'var(--thumbnail-aspect, 4/3)' }}>
        {/* Video element for hover preview */}
        {isVideo && item.videoUrl && (
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 z-10 ${
              isHovered && isVideoReady ? 'opacity-100' : 'opacity-0'
            }`}
            muted
            loop
            playsInline
            preload="none"
            poster={item.thumbnail}
          >
            <source src={item.videoUrl} type="video/mp4" />
          </video>
        )}

        {/* Thumbnail image */}
        <LazyImage
          src={item.thumbnail}
          alt={item.title}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            isVideo && isHovered && isVideoReady ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 z-20">
          <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 font-bold border-0 shadow-sm">
            FREE
          </Badge>
          <Badge variant="secondary" className="bg-white/95 text-foreground text-[10px] px-2 py-0.5 font-medium border-0 shadow-sm">
            Pexels
          </Badge>
        </div>

        {/* Video play indicator */}
        {isVideo && !isHovered && (
          <div className="absolute bottom-2 left-2 z-20">
            <div className="bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <Play className="h-3 w-3" fill="white" />
              {item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : 'Video'}
            </div>
          </div>
        )}

        {/* Download button */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
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
