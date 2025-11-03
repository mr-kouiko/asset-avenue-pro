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

    // Initialize WaveSurfer with MediaElement backend to avoid CORS issues
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: 'rgba(203, 213, 225, 0.8)', // Light grey waveform
      progressColor: 'rgba(99, 102, 241, 0.9)', // Blue/indigo progress
      cursorColor: 'rgba(99, 102, 241, 0.9)',
      cursorWidth: 1,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 70,
      normalize: true,
      backend: 'MediaElement', // Use MediaElement to avoid CORS issues with WebAudio
      interact: true,
      hideScrollbar: true,
      fillParent: true,
    });

    // Load audio with error handling
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
      console.error('❌ Audio URL:', audioUrl);
      console.error('❌ Error details:', JSON.stringify(error));
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

    wavesurfer.on('loading', (percent) => {
      console.log(`📥 Loading audio: ${percent}%`);
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      console.log('🧹 Destroying WaveSurfer for:', title);
      wavesurfer.destroy();
    };
  }, [audioUrl, pause, title]);

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
    console.log('🎵 Play/Pause clicked', { playing, id, title, hasWavesurfer: !!wavesurferRef.current });
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
      className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer bg-gray-50/50 border border-gray-200/60 shadow-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Horizontal Layout - Arabstock Style */}
      <div className="flex items-center gap-4 p-5">
        
        {/* Play/Pause Button - Large Circle on Left */}
        <Button
          variant="default"
          size="lg"
          onClick={handlePlayPause}
          className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-md flex-shrink-0 transition-all"
        >
          {playing ? (
            <Pause className="h-6 w-6 text-white" fill="currentColor" />
          ) : (
            <Play className="h-6 w-6 text-white ml-0.5" fill="currentColor" />
          )}
        </Button>

        {/* Title, Category and Time Display */}
        <div className="flex flex-col gap-1 min-w-[140px] flex-shrink-0">
          <h3 className="font-medium text-sm text-gray-900 line-clamp-1">
            {title}
          </h3>
          <p className="text-xs text-gray-400">Music</p>
          <span className="text-xs text-gray-600 font-medium mt-0.5">
            {currentTime} / {audioDuration || "0:00"}
          </span>
        </div>

        {/* Waveform - Takes Most Space */}
        <div 
          ref={waveformRef} 
          className="flex-1 h-[70px] cursor-pointer min-w-0 mx-3"
          onClick={(e) => e.stopPropagation()}
        />

        {/* BPM Badge */}
        {bpm && (
          <Badge 
            variant="outline" 
            className="text-xs border-gray-300 text-gray-600 bg-white px-3 py-1.5 flex-shrink-0 font-normal"
          >
            {bpm} BPM
          </Badge>
        )}

        {/* Action Buttons - Right Side */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="h-10 w-10 p-0 hover:bg-gray-100 rounded-full border border-gray-300 bg-white transition-colors"
          >
            <Heart 
              className={`h-4 w-4 ${isLiked ? "text-red-500" : "text-gray-700"}`}
              fill={isLiked ? "currentColor" : "none"}
            />
          </Button>

          {/* Info/Details Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCardClick}
            className="h-10 w-10 p-0 hover:bg-gray-100 rounded-full border border-gray-300 bg-white transition-colors"
          >
            <ShoppingCart className="h-4 w-4 text-gray-700" />
          </Button>

          {/* Download/Add to Cart Button */}
          <Button
            variant="default"
            size="sm"
            onClick={handleAddToCart}
            className="h-10 w-10 p-0 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-sm transition-all"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
