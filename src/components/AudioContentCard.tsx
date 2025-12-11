import { useState, useEffect, useRef } from "react";
import { Heart, Download, Play, Pause, Bookmark, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
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
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const playing = isPlaying(id);

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
      className="flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md"
      style={{ backgroundColor: '#F9FAFB' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Left Section: Play Button */}
      <Button
        variant="default"
        size="icon"
        onClick={handlePlayPause}
        className="h-12 w-12 rounded-full flex-shrink-0 shadow-md transition-transform hover:scale-105"
        style={{ backgroundColor: '#4F46E5' }}
      >
        {playing ? (
          <Pause className="h-5 w-5 text-white" fill="white" />
        ) : (
          <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
        )}
      </Button>

      {/* Left Section: Meta Data */}
      <div className="flex flex-col min-w-[120px] flex-shrink-0">
        <h3 className="font-medium text-sm line-clamp-1" style={{ color: '#374151' }}>
          {title}
        </h3>
        <p className="text-xs" style={{ color: '#9CA3AF' }}>Music</p>
      </div>

      {/* Center Section: Timer */}
      <span className="text-xs flex-shrink-0 whitespace-nowrap" style={{ color: '#6B7280' }}>
        {currentTime} / {audioDuration || "0:00"}
      </span>

      {/* Center Section: Waveform */}
      <div 
        ref={waveformRef} 
        className="flex-1 h-12 cursor-pointer min-w-[100px]"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Right Section: BPM */}
      {bpm && (
        <span className="text-xs flex-shrink-0" style={{ color: '#9CA3AF' }}>
          {bpm} BPM
        </span>
      )}

      {/* Right Section: Action Group */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Bookmark/Save Icon */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-2 rounded-full transition-colors hover:bg-gray-200"
        >
          <Bookmark className="h-5 w-5" style={{ color: '#6B7280' }} />
        </button>

        {/* Circle/Contrast Icon */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-2 rounded-full transition-colors hover:bg-gray-200"
        >
          <Circle className="h-5 w-5" style={{ color: '#6B7280' }} />
        </button>

        {/* Download Button */}
        <Button
          variant="default"
          size="icon"
          onClick={handleAddToCart}
          className="h-10 w-10 rounded-full shadow-sm transition-transform hover:scale-105"
          style={{ backgroundColor: '#10B981' }}
        >
          <Download className="h-4 w-4 text-white" />
        </Button>
      </div>
    </div>
  );
};