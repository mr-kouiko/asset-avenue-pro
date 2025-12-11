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
      waveColor: '#a5b4fc', // indigo-300 for a softer look
      progressColor: '#6366f1', // indigo-500 for the played portion
      cursorColor: '#4f46e5', // indigo-600
      cursorWidth: 2,
      barWidth: 4,
      barGap: 2,
      barRadius: 4,
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
    <div className="w-full h-full flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 dark:from-indigo-950/20 dark:via-slate-900 dark:to-purple-950/20">
      {/* Premium Floating Card */}
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl p-8 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)]">
        {/* Title & Author */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{title}</h2>
          {author && <p className="text-slate-500 dark:text-slate-400">{author}</p>}
          {category && (
            <span className="inline-block mt-2 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm font-medium rounded-full">
              {category}
            </span>
          )}
        </div>

        {/* Waveform Visualization - Tall and Prominent */}
        <div className="relative mb-6">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 dark:bg-slate-800/80 rounded-lg z-10">
              <div className="flex items-center gap-2 text-slate-500">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading waveform...</span>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg z-10">
              <p className="text-red-600 dark:text-red-400">Failed to load audio</p>
            </div>
          )}
          <div 
            ref={waveformRef} 
            className="w-full rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800/50"
            style={{ minHeight: '120px' }}
          />
        </div>
        {/* Controls Row */}
        <div className="flex items-center gap-4">
          {/* Large Play Button */}
          <button
            onClick={togglePlay}
            disabled={isLoading || error}
            className="w-14 h-14 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6" fill="currentColor" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
            )}
          </button>

          {/* Timer & Progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                {formatTime(currentTime)}
              </span>
              <span className="text-sm font-mono text-slate-400 dark:text-slate-500">
                {formatTime(duration)}
              </span>
            </div>
            <Slider
              value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              disabled={isLoading || error}
              className="[&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-indigo-500"
            />
          </div>

          {/* Volume Controls */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-slate-400" />
              ) : (
                <Volume2 className="w-5 h-5 text-slate-500" />
              )}
            </button>
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.01}
              className="w-20 [&_[role=slider]]:bg-slate-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
