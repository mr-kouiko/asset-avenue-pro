import { useState } from "react";
import { Heart, Download, ShoppingCart, Eye, FileText, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { MediaPlayer } from "./media/MediaPlayer";
import { LazyImage } from "./LazyImage";
import { WatermarkedVideoThumbnail } from "./WatermarkedVideoThumbnail";
import { useLanguage } from "@/contexts/LanguageContext";

interface ContentCardProps {
  id: string;
  title: string;
  author: string;
  price: number;
  type: "photo" | "video" | "audio" | "illustration" | "pdf" | "ebook";
  thumbnail: string;
  videoUrl?: string;
  audioUrl?: string;
  coverUrl?: string; // Pour les ebooks/PDF
  likes: number;
  downloads: number;
  isLiked?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  id,
  title,
  author,
  price,
  type,
  thumbnail,
  videoUrl,
  audioUrl,
  coverUrl,
  likes,
  downloads,
  isLiked = false,
}) => {
  const { addToCart } = useCart();
  const { createDirectPayment, loading: directPurchaseLoading } = useDirectPurchase();
  const { language } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video": return "bg-red-100 text-red-800";
      case "audio": return "bg-green-100 text-green-800";
      case "illustration": return "bg-purple-100 text-purple-800";
      case "pdf":
      case "ebook": return "bg-orange-100 text-orange-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  const handleAddToCart = () => {
      // Ensure price is set - use 0 if null/undefined, will be replaced with license pricing
      const itemPrice = price ?? 0;
      
      addToCart({
        id, // Keep for backward compatibility
        submissionId: id, // Explicit submission_id
        title,
        author,
        price: itemPrice,
        type,
        thumbnail,
        videoUrl,
        audioUrl,
        coverUrl,
        licenseId: 'standard' // Default license
      });
      
      console.log('Added to cart:', { id, title, price: itemPrice, type });
  };

  const handleDirectPurchase = async () => {
    await createDirectPayment({
      submission_id: id,
      title,
      author,
      price,
      type,
      thumbnail
    }, 'standard');
  };

  // Debug logging for video content
  if (type === "video") {
    console.log('ContentCard - Video item:', title, 'Video URL:', videoUrl, 'Thumbnail:', thumbnail);
  }

  const handleCardClick = () => {
    window.location.href = `/${language}/product/${id}`;
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer bg-white border border-stock-border/50 hover:border-stock-blue/20"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleCardClick}
          style={{ boxShadow: 'var(--card-shadow)' }}>
      
      {/* Fixed Aspect Ratio Container - Adobe Stock Style */}
      <div className="relative bg-stock-gray overflow-hidden" style={{ aspectRatio: 'var(--thumbnail-aspect)' }}>
        {type === 'video' ? (
          <WatermarkedVideoThumbnail 
            thumbnail={thumbnail} 
            title={title}
            videoUrl={videoUrl}
            className="w-full h-full"
          />
        ) : type === 'audio' ? (
          <div className="w-full h-full bg-gradient-to-br from-stock-blue/5 to-stock-blue/10 flex items-center justify-center">
            <div className="text-center p-4">
              <Music className="h-8 w-8 mx-auto mb-2 text-stock-blue/60" />
              <span className="text-xs text-stock-dark/70 font-medium">Audio Preview</span>
            </div>
          </div>
        ) : (
          <LazyImage
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {/* Subtle hover overlay */}
        <div className="absolute inset-0 bg-stock-dark/0 group-hover:bg-stock-dark/5 transition-all duration-300 pointer-events-none" />
        
        {/* Type Badge - Adobe Stock Style */}
        <div className="absolute top-2 left-2">
          <Badge 
            variant="secondary" 
            className="bg-white/95 text-stock-dark text-[10px] px-2 py-0.5 font-medium border-0 shadow-sm"
          >
            {type === 'photo' ? 'PHOTO' : 
             type === 'video' ? 'VIDÉO' : 
             type === 'audio' ? 'AUDIO' : 
             type === 'illustration' ? 'VECTOR' : 'EBOOK'}
          </Badge>
        </div>
        
        {/* Premium hover actions - Adobe Stock Style */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isHovered ? 'opacity-0' : 'opacity-0'
        } z-30`}>
          <div className="flex gap-1.5">
            <Button 
              size="sm" 
              variant="secondary"
              className="bg-white/95 hover:bg-white text-stock-dark border-0 shadow-md text-xs px-3 py-1.5 h-8 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/${language}/product/${id}`;
              }}
            >
              Aperçu
            </Button>
            <Button 
              size="sm"
              className="bg-stock-blue hover:bg-stock-blue/90 text-white border-0 shadow-md text-xs px-3 py-1.5 h-8 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                handleDirectPurchase();
              }}
              disabled={directPurchaseLoading}
            >
              {directPurchaseLoading ? (
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Licencier'
              )}
            </Button>
          </div>
        </div>

        {/* Heart button - Adobe Stock Style */}
        <div className="absolute top-2 right-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              // Handle like action
            }}
            className="h-7 w-7 p-0 bg-white/95 hover:bg-white border-0 shadow-sm"
          >
            <Heart 
              className="h-3.5 w-3.5" 
              fill={isLiked ? "hsl(var(--stock-blue))" : "none"}
              color={isLiked ? "hsl(var(--stock-blue))" : "hsl(var(--stock-dark))"}
            />
          </Button>
        </div>

        {/* Quick add to cart - Bottom right corner */}
        <div className={`absolute bottom-2 right-2 transition-all duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCart();
            }}
            className="h-7 w-7 p-0 bg-white/95 hover:bg-white border-0 shadow-sm"
          >
            <ShoppingCart className="h-3.5 w-3.5 text-stock-dark" />
          </Button>
        </div>
      </div>

      {/* Metadata - Adobe Stock Style */}
      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-medium text-sm text-stock-dark leading-tight line-clamp-2 min-h-[2.5rem]">
            {title}
          </h3>
          <p className="text-xs text-stock-dark/60 mt-1 font-medium">{author}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-stock-dark/50">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {likes}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {downloads}
            </span>
          </div>
          <div className="font-bold text-sm text-stock-dark">
            {price === null || price === 0 ? 'Gratuit' : `${price}€`}
          </div>
        </div>
      </div>
    </Card>
  );
};