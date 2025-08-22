import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, SkipBack, SkipForward } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';

interface AudioPlayerProps {
  src: string;
  title?: string;
  className?: string;
  compact?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  src, 
  title, 
  className = "", 
  compact = false 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        await audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Erreur de lecture audio:', error);
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const newTime = (value[0] / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = value[0] / 100;
    audio.volume = newVolume;
    setVolume(newVolume);
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(audio.currentTime + 10, duration);
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(audio.currentTime - 10, 0);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-card border rounded-lg ${className}`}>
        <audio ref={audioRef} src={src} preload="metadata" />
        
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlayPause}
          disabled={isLoading}
          className="flex-shrink-0"
        >
          {isLoading ? (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 space-y-1">
          {title && (
            <p className="text-sm font-medium truncate">{title}</p>
          )}
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <div className="flex-1">
              <Slider
                value={[progressPercentage]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="w-full"
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card border rounded-lg p-4 space-y-4 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {title && (
        <div className="text-center">
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>
      )}

      {/* Waveform Visualization Placeholder */}
      <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-lg flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-end gap-1 h-12">
            {Array.from({ length: 50 }, (_, i) => (
              <div
                key={i}
                className={`bg-primary transition-all duration-200 ${
                  isPlaying ? 'animate-pulse' : ''
                }`}
                style={{
                  width: '2px',
                  height: `${Math.random() * 100}%`,
                  opacity: progressPercentage > (i * 2) ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Slider
          value={[progressPercentage]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={skipBackward}
          disabled={isLoading}
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          size="lg"
          onClick={togglePlayPause}
          disabled={isLoading}
          className="rounded-full w-12 h-12"
        >
          {isLoading ? (
            <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={skipForward}
          disabled={isLoading}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <Slider
          value={[volume * 100]}
          onValueChange={handleVolumeChange}
          max={100}
          step={1}
          className="flex-1"
        />
      </div>
    </div>
  );
};