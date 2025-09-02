import { Heart, Download, ShoppingCart, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { MediaPlayer } from "./media/MediaPlayer";
import { LazyImage } from "./LazyImage";

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
  const { createDirectPayment } = useDirectPurchase();

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
      addToCart({
        id,
        title,
        author,
        price,
        type,
        thumbnail,
        videoUrl,
        audioUrl,
        coverUrl
      });
  };

  const handleDirectBuy = async () => {
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

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="relative aspect-[4/3] overflow-hidden">
        {type === "video" ? (
          <MediaPlayer 
            src={videoUrl}
            type="video"
            title={title}
            poster={thumbnail}
            className="w-full h-full"
            controls={true}
            autoPlay={false}
          />
        ) : type === "audio" ? (
          <div className="relative w-full h-full">
            <LazyImage
              src={thumbnail}
              alt={title}
              className="w-full h-full"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-full max-w-[90%] px-4">
                <MediaPlayer 
                  src={audioUrl || ''}
                  type="audio"
                  title={title}
                  compact={true}
                  className="bg-white/90 backdrop-blur-sm"
                />
              </div>
            </div>
          </div>
        ) : type === "pdf" || type === "ebook" ? (
          <div className="relative w-full h-full">
            <LazyImage
              src={coverUrl || thumbnail}
              alt={`Couverture de ${title}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3">
                <FileText className="h-8 w-8 text-white mx-auto mb-1" />
                <span className="text-xs text-white font-medium">PDF</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <LazyImage
              src={thumbnail}
              alt={title}
              className="w-full h-full group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
          <div className="absolute top-2 left-2">
            <Badge className={getTypeColor(type)}>
              {type === "pdf" || type === "ebook" ? "ebook" : type}
            </Badge>
          </div>
          
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 bg-white/20 backdrop-blur-sm hover:bg-white/30 ${
                isLiked ? 'text-red-500' : 'text-white'
              }`}
            >
              <Heart className="h-4 w-4" fill={isLiked ? "currentColor" : "none"} />
            </Button>
          </div>

          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex space-x-2">
              <Button size="sm" className="flex-1" asChild>
                <Link to={`/product/${id}`}>
                  <Eye className="h-4 w-4 mr-1" />
                  Aperçu
                </Link>
              </Button>
              <Button size="sm" variant="secondary" onClick={handleAddToCart}>
                <ShoppingCart className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="default" onClick={handleDirectBuy}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-medium text-sm line-clamp-2 mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-3">par {author}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <span className="flex items-center space-x-1">
              <Heart className="h-3 w-3" />
              <span>{likes}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Download className="h-3 w-3" />
              <span>{downloads}</span>
            </span>
          </div>
          
          <div className="text-right">
            <div className="font-semibold text-primary">
              {price === 0 ? "Gratuit" : `${price}€`}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};