import { Heart, Download, ShoppingCart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { VideoPlayer } from "@/components/VideoPlayer";
import { AudioPlayer } from "@/components/AudioPlayer";

interface ContentCardProps {
  id: string;
  title: string;
  author: string;
  price: number;
  type: "photo" | "video" | "audio" | "illustration";
  thumbnail: string;
  videoUrl?: string;
  audioUrl?: string;
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
  likes,
  downloads,
  isLiked = false,
}) => {
  const { addToCart } = useCart();

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video": return "bg-red-100 text-red-800";
      case "audio": return "bg-green-100 text-green-800";
      case "illustration": return "bg-purple-100 text-purple-800";
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
        audioUrl
      });
  };

  // Debug logging for video content
  if (type === "video") {
    console.log('ContentCard - Video item:', title, 'Video URL:', videoUrl, 'Thumbnail:', thumbnail);
  }

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="relative aspect-[4/3] overflow-hidden">
        {type === "video" ? (
          <VideoPlayer 
            src={videoUrl}
            thumbnail={thumbnail}
            className="w-full h-full object-cover"
            showThumbnailFirst={true}
            controls={true}
            autoPlay={false}
          />
        ) : type === "audio" ? (
          <div className="relative w-full h-full">
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-full max-w-[90%] px-4">
                <AudioPlayer 
                  audioPaths={audioUrl ? [audioUrl] : []}
                  watermarkUrl="https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/sign/Audio%20VisuStock/ElevenLabs_2025-08-21T17_27_20_David%20-%20ASMR%20Whisper_pvc_sp100_s50_sb75_v3.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jZTIyNjk0My1iMWRhLTRlZTAtYjk3Yi00MjY2NzQ4M2VhMjAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJBdWRpbyBWaXN1U3RvY2svRWxldmVuTGFic18yMDI1LTA4LTIxVDE3XzI3XzIwX0RhdmlkIC0gQVNNUiBXaGlzcGVyX3B2Y19zcDEwMF9zNTBfc2I3NV92My5tcDMiLCJpYXQiOjE3NTU4MDczODIsImV4cCI6MjUzMzQwNzM4Mn0.X1wAUqA7uWHgB3F_szPfM7nEeKHAiHCzovHLHO_jT6I"
                />
              </div>
            </div>
          </div>
        ) : (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
          <div className="absolute top-2 left-2">
            <Badge className={getTypeColor(type)}>
              {type}
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