import { useState, useEffect, useRef } from "react";
import { Heart, Download, ShoppingCart, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import WaveSurfer from "wavesurfer.js";

interface AudioContentCardProps {
  id: string;
  title: string;
  author: string;
  price: number;
  thumbnail: string;
  audioUrl?: string;
  likes: number;
  downloads: number;
  isLiked?: boolean;
  duration?: string;
  bpm?: number;
}

export const AudioContentCard: React.FC<AudioContentCardProps> = ({
  id,
  title,
  author,
  price,
  thumbnail,
  audioUrl,
  likes,
  downloads,
  isLiked = false,
  duration,
  bpm,
}) => {
  const { addToCart } = useCart();
  const { createDirectPayment, loading: directPurchaseLoading } = useDirectPurchase();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { currentPlayingId, play, pause, isPlaying } = useAudioPlayer();
  const [isHovered, setIsHovered] = useState(false);
  const [audioDuration, setAudioDuration] = useState(duration || "");
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const playing = isPlaying(id);

  useEffect(() => {
    if (!waveformRef.current || !audioUrl) return;

    // Initialize WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: 'hsl(var(--stock-blue) / 0.3)',
      progressColor: 'hsl(var(--stock-blue))',
      cursorColor: 'hsl(var(--stock-blue))',
      cursorWidth: 2,
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: 60,
      normalize: true,
      backend: 'WebAudio',
      interact: true,
      hideScrollbar: true,
      fillParent: true,
    });

    wavesurfer.load(audioUrl);

    wavesurfer.on('ready', () => {
      const duration = wavesurfer.getDuration();
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      setAudioDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    });

    wavesurfer.on('finish', () => {
      pause();
    });

    wavesurfer.on('audioprocess', () => {
      // Force re-render during playback to ensure smooth animation
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
    };
  }, [audioUrl, pause]);

  // Sync playback with global player state
  useEffect(() => {
    if (!wavesurferRef.current) return;

    if (playing && currentPlayingId === id) {
      wavesurferRef.current.play();
    } else {
      wavesurferRef.current.pause();
    }
  }, [playing, currentPlayingId, id]);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playing) {
      pause();
    } else {
      play(id);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const itemPrice = price ?? 0;
    
    addToCart({
      id,
      submissionId: id,
      title,
      author,
      price: itemPrice,
      type: 'audio',
      thumbnail,
      audioUrl,
      licenseId: 'standard'
    });
  };

  const handleDirectPurchase = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await createDirectPayment({
      submission_id: id,
      title,
      author,
      price,
      type: 'audio',
      thumbnail
    }, 'standard');
  };

  const handleCardClick = () => {
    navigate(`/${language}/product/${id}`);
  };

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer bg-white border border-stock-border/30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Horizontal Layout - Arabstock Style */}
      <div className="flex items-center gap-4 p-4">
        
        {/* Play/Pause Button - Large Circle on Left */}
        <Button
          variant="default"
          size="lg"
          onClick={handlePlayPause}
          className="h-16 w-16 rounded-full bg-stock-blue hover:bg-stock-blue/90 shadow-md flex-shrink-0"
        >
          {playing ? (
            <Pause className="h-7 w-7 text-white" fill="currentColor" />
          ) : (
            <Play className="h-7 w-7 text-white ml-1" fill="currentColor" />
          )}
        </Button>

        {/* Title and Duration */}
        <div className="flex flex-col gap-0.5 w-32 flex-shrink-0">
          <h3 className="font-medium text-sm text-stock-dark line-clamp-1">
            {title}
          </h3>
          <p className="text-xs text-stock-dark/50">{author}</p>
          <span className="text-xs text-stock-dark/70 font-medium mt-1">
            {audioDuration || "0:00"}
          </span>
        </div>

        {/* Waveform - Takes Most Space */}
        <div 
          ref={waveformRef} 
          className="flex-1 h-[80px] cursor-pointer min-w-0"
          onClick={(e) => e.stopPropagation()}
        />

        {/* BPM Badge */}
        {bpm && (
          <Badge 
            variant="outline" 
            className="text-xs border-stock-dark/20 text-stock-dark/70 px-3 py-1 flex-shrink-0"
          >
            {bpm} BPM
          </Badge>
        )}

        {/* Action Buttons - Right Side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="h-9 w-9 p-0 hover:bg-stock-gray rounded-full"
          >
            <Heart 
              className="h-4 w-4" 
              fill={isLiked ? "hsl(var(--stock-blue))" : "none"}
              color={isLiked ? "hsl(var(--stock-blue))" : "hsl(var(--stock-dark))"}
            />
          </Button>

          {/* Info Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCardClick}
            className="h-9 w-9 p-0 hover:bg-stock-gray rounded-full"
          >
            <ShoppingCart className="h-4 w-4 text-stock-dark" />
          </Button>

          {/* Download/Purchase Button */}
          <Button
            variant="default"
            size="sm"
            onClick={handleAddToCart}
            className="h-9 w-9 p-0 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
