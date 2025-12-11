import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import WaveSurfer from 'wavesurfer.js';

interface AudioHeroPlayerProps {
  src: string;
  title: string;
  author?: string;
  category?: string;
}

export const AudioHeroPlayer = ({ src, title, author, category }: AudioHeroPlayerProps) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(false);

  // Format time in MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !src) return;

    setIsLoading(true);
    setError(false);

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#94a3b8', // slate-400
      progressColor: '#4F46E5', // indigo-600
      cursorColor: '#4F46E5',
      cursorWidth: 2,
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: 120,
      normalize: true,
      backend: 'WebAudio',
    });

    wavesurferRef.current = wavesurfer;

    wavesurfer.on('ready', () => {
      setIsLoading(false);
      setDuration(wavesurfer.getDuration());
      wavesurfer.setVolume(volume);
    });

    wavesurfer.on('audioprocess', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on('finish', () => {
      setIsPlaying(false);
    });

    wavesurfer.on('error', (err) => {
      console.error('WaveSurfer error:', err);
      setIsLoading(false);
      setError(true);
    });

    wavesurfer.load(src);

    return () => {
      wavesurfer.destroy();
    };
  }, [src]);

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (!wavesurferRef.current) return;
    
    if (isPlaying) {
      wavesurferRef.current.pause();
    } else {
      wavesurferRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Handle volume change
  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(newVolume);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!wavesurferRef.current) return;
    
    if (isMuted) {
      wavesurferRef.current.setVolume(volume || 0.8);
      setIsMuted(false);
    } else {
      wavesurferRef.current.setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Seek handler
  const handleSeek = useCallback((value: number[]) => {
    if (!wavesurferRef.current || !duration) return;
    const seekTime = (value[0] / 100) * duration;
    wavesurferRef.current.seekTo(value[0] / 100);
    setCurrentTime(seekTime);
  }, [duration]);

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#4F46E5]/10 to-[#4F46E5]/5">
        <div className="text-center text-muted-foreground">
          <p>No audio file available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#4F46E5]/10 via-background to-[#4F46E5]/5 flex flex-col justify-center p-8">
      {/* Title & Author */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-1">{title}</h2>
        {author && <p className="text-muted-foreground">{author}</p>}
        {category && (
          <span className="inline-block mt-2 px-3 py-1 bg-[#4F46E5]/10 text-[#4F46E5] text-sm rounded-full">
            {category}
          </span>
        )}
      </div>

      {/* Main Player Card */}
      <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-6 shadow-lg">
        {/* Play Button & Timer Row */}
        <div className="flex items-center gap-6 mb-6">
          {/* Large Play Button */}
          <button
            onClick={togglePlay}
            disabled={isLoading || error}
            className="w-16 h-16 flex-shrink-0 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] transition-all duration-200 flex items-center justify-center text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-7 h-7" fill="currentColor" />
            ) : (
              <Play className="w-7 h-7 ml-1" fill="currentColor" />
            )}
          </button>

          {/* Timer */}
          <div className="flex-1">
            <div className="text-lg font-mono text-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            {/* Progress Slider */}
            <Slider
              value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="mt-2"
              disabled={isLoading || error}
            />
          </div>

          {/* Volume Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Volume2 className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.01}
              className="w-24"
            />
          </div>
        </div>

        {/* Waveform Visualization */}
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Loading waveform...</span>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 rounded-lg">
              <p className="text-destructive">Failed to load audio</p>
            </div>
          )}
          <div 
            ref={waveformRef} 
            className="w-full rounded-lg overflow-hidden"
            style={{ minHeight: '120px' }}
          />
        </div>
      </div>
    </div>
  );
};
