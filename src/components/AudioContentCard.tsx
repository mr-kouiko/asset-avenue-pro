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
      cursorColor: 'transparent',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 60,
      normalize: true,
      backend: 'WebAudio',
      interact: true,
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

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
    };
  }, [audioUrl]);

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
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer bg-white border border-stock-border/50 hover:border-stock-blue/20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      {/* Audio Content Section */}
      <div className="relative bg-gradient-to-br from-stock-blue/5 to-stock-blue/10 p-4">
        
        {/* Type Badge */}
        <div className="absolute top-2 left-2 z-10">
          <Badge 
            variant="secondary" 
            className="bg-white/95 text-stock-dark text-[10px] px-2 py-0.5 font-medium border-0 shadow-sm"
          >
            AUDIO
          </Badge>
        </div>

        {/* Heart Button */}
        <div className="absolute top-2 right-2 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
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

        {/* Play/Pause Button - Centered and Large */}
        <div className="flex items-center justify-center py-6">
          <Button
            variant="default"
            size="lg"
            onClick={handlePlayPause}
            className="h-14 w-14 rounded-full bg-stock-blue hover:bg-stock-blue/90 shadow-lg"
          >
            {playing ? (
              <Pause className="h-6 w-6 text-white" fill="currentColor" />
            ) : (
              <Play className="h-6 w-6 text-white ml-0.5" fill="currentColor" />
            )}
          </Button>
        </div>

        {/* Waveform */}
        <div 
          ref={waveformRef} 
          className="w-full h-[60px] cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Audio Metadata Row */}
        <div className="flex items-center justify-between mt-3 text-xs text-stock-dark/70">
          <span className="font-medium">{audioDuration || "0:00"}</span>
          {bpm && (
            <Badge variant="outline" className="text-[10px] border-stock-dark/20">
              {bpm} BPM
            </Badge>
          )}
        </div>

        {/* Quick Actions - Show on hover */}
        <div className={`absolute bottom-2 right-2 flex gap-1 transition-all duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddToCart}
            className="h-7 w-7 p-0 bg-white/95 hover:bg-white border-0 shadow-sm"
          >
            <ShoppingCart className="h-3.5 w-3.5 text-stock-dark" />
          </Button>
        </div>
      </div>

      {/* Metadata */}
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
