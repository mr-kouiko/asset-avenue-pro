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
      className="relative overflow-hidden flex flex-col rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md bg-white border border-stock-border/50 hover:border-stock-blue/20"
      style={{ boxShadow: 'var(--card-shadow)' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Thumbnail area - maintains consistent aspect ratio with other cards */}
      <div className="relative bg-stock-gray overflow-hidden" style={{ aspectRatio: 'var(--thumbnail-aspect)' }}>
        {/* Album art / thumbnail background */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
        >
          {/* Large centered play button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayPause}
            className="h-16 w-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-transform hover:scale-110"
          >
            {playing ? (
              <Pause className="h-8 w-8 text-white" fill="white" />
            ) : (
              <Play className="h-8 w-8 text-white ml-1" fill="white" />
            )}
          </Button>
        </div>

        {/* Waveform overlay at bottom of thumbnail area */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 to-transparent">
          <div 
            ref={waveformRef} 
            className="absolute bottom-1 left-2 right-2 h-10"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Type Badge */}
        <div className="absolute top-2 left-2">
          <span className="bg-white/95 text-stock-dark text-[10px] px-2 py-0.5 font-medium rounded shadow-sm">
            AUDIO
          </span>
        </div>

        {/* Duration badge */}
        {audioDuration && (
          <div className="absolute top-2 right-2">
            <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 font-medium rounded">
              {audioDuration}
            </span>
          </div>
        )}

        {/* Quick actions - visible on hover */}
        <div className={`absolute bottom-2 right-2 transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-100 md:opacity-0'}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddToCart}
            className="h-8 w-8 md:h-7 md:w-7 p-0 bg-white/95 hover:bg-white border-0 shadow-sm"
          >
            <Download className="h-4 w-4 md:h-3.5 md:w-3.5 text-stock-dark" />
          </Button>
        </div>
      </div>

      {/* Metadata - matches ContentCard style */}
      <div className="p-2.5 md:p-3 space-y-1.5 md:space-y-2">
        <div>
          <h3 className="font-medium text-sm text-stock-dark leading-tight line-clamp-2 min-h-[2.5rem]">
            {title}
          </h3>
          <p className="text-xs text-stock-dark/60 mt-1 font-medium truncate">{author}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 text-xs text-stock-dark/50">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {likes}
            </span>
            {bpm && (
              <span>{bpm} BPM</span>
            )}
          </div>
          <div className="font-bold text-sm text-stock-dark">
            {price === null || price === 0 ? 'Free' : `${price}€`}
          </div>
        </div>
      </div>
    </div>
  );
};