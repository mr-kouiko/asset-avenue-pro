import { useState, useEffect, useRef } from "react";
import { Heart, Download, Play, Pause, Bookmark, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useAudioWatermark } from "@/hooks/useAudioWatermark";
import WaveSurfer from "wavesurfer.js";

interface AudioContentCardProps {
  id: string;
  slug?: string;
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
  slug,
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
  const [currentTime, setCurrentTime] = useState("0:00");
  const [volume, setVolume] = useState(1);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const playing = isPlaying(id);
  const isCurrentlyPlaying = playing && currentPlayingId === id;

  // Audio watermark - plays every 15 seconds when this track is playing
  useAudioWatermark({
    isPlaying: isCurrentlyPlaying,
    mainVolume: volume,
    isMuted: false
  });

  useEffect(() => {
    if (!waveformRef.current || !audioUrl) {
      console.warn('⚠️ AudioContentCard: Missing waveform ref or audioUrl', { 
        hasRef: !!waveformRef.current, 
        audioUrl,
        title 
      });
      return;
    }

    console.log('🎵 AudioContentCard: Initializing WaveSurfer', { title, audioUrl });

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#9CA3AF',
      progressColor: '#4F46E5',
      cursorColor: '#4F46E5',
      cursorWidth: 1,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      height: 48,
      normalize: false,
      backend: 'MediaElement',
      interact: true,
      hideScrollbar: true,
      fillParent: true,
    });

    wavesurfer.load(audioUrl);
    console.log('📡 Loading audio from:', audioUrl);

    wavesurfer.on('ready', () => {
      console.log('✅ WaveSurfer ready for:', title);
      const duration = wavesurfer.getDuration();
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      setAudioDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      // Sync volume state
      setVolume(wavesurfer.getVolume());
    });

    wavesurfer.on('error', (error) => {
      console.error('❌ WaveSurfer error for:', title, error);
    });

    wavesurfer.on('finish', () => {
      pause();
    });

    wavesurfer.on('audioprocess', () => {
      const current = wavesurfer.getCurrentTime();
      const minutes = Math.floor(current / 60);
      const seconds = Math.floor(current % 60);
      setCurrentTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      console.log('🧹 Destroying WaveSurfer for:', title);
      wavesurfer.destroy();
    };
  }, [audioUrl, pause, title]);

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

  const handleCardClick = () => {
    const urlPath = slug?.trim() ? `/products/${slug}` : `/product/${id}`;
    navigate(urlPath);
  };

  return (
    <div
      className="group relative flex items-center gap-3 md:gap-4 rounded-lg cursor-pointer transition-all duration-200 bg-white border border-stock-border/50 hover:border-stock-blue/30 hover:shadow-md p-2 md:p-3"
      style={{ boxShadow: 'var(--card-shadow)' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Compact album art with play button */}
      <div className="relative shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePlayPause}
          className="h-10 w-10 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-sm transition-transform group-hover:scale-105"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <Pause className="h-4 w-4 text-white" fill="white" />
          ) : (
            <Play className="h-4 w-4 text-white ml-0.5" fill="white" />
          )}
        </Button>
      </div>

      {/* Title + author + waveform */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-medium text-sm md:text-[15px] text-stock-dark leading-tight truncate">
              {title}
            </h3>
            <p className="text-xs text-stock-dark/60 mt-0.5 truncate">{author}</p>
          </div>
          <div className="hidden md:flex items-center gap-3 shrink-0 text-xs text-stock-dark/50">
            {bpm && <span>{bpm} BPM</span>}
            {audioDuration && <span className="tabular-nums">{audioDuration}</span>}
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {likes}
            </span>
          </div>
        </div>

        {/* Full-width waveform */}
        <div
          ref={waveformRef}
          className="w-full h-10"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Right: price + cart */}
      <div className="shrink-0 flex flex-col items-end gap-2">
        <div className="font-bold text-sm md:text-base text-stock-dark whitespace-nowrap">
          {price === null || price === 0 ? 'Free' : `$${price}`}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddToCart}
          className="h-8 px-2.5"
          aria-label="Add to cart"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};