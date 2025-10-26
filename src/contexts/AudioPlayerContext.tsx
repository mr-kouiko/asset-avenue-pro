import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AudioPlayerContextType {
  currentPlayingId: string | null;
  play: (id: string) => void;
  pause: () => void;
  isPlaying: (id: string) => boolean;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  const play = useCallback((id: string) => {
    setCurrentPlayingId(id);
  }, []);

  const pause = useCallback(() => {
    setCurrentPlayingId(null);
  }, []);

  const isPlaying = useCallback((id: string) => {
    return currentPlayingId === id;
  }, [currentPlayingId]);

  return (
    <AudioPlayerContext.Provider value={{ currentPlayingId, play, pause, isPlaying }}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
};
