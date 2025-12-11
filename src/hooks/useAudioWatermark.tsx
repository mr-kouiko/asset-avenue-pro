import { useEffect, useRef, useCallback } from 'react';

const WATERMARK_URL = "https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/sign/Audio%20VisuStock/ElevenLabs_2025-08-21T17_27_20_David%20-%20ASMR%20Whisper_pvc_sp100_s50_sb75_v3.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jZTIyNjk0MS1iMWRhLTRlZTAtYjk3Yi00MjY2NzQ4M2VhMjAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJBdWRpbyBWaXN1U3RvY2svRWxldmVuTGFic18yMDI1LTA4LTIxVDE3XzI3XzIwX0RhdmlkIC0gQVNNUiBXaGlzcGVyX3B2Y19zcDEwMF9zNTBfc2I3NV92My5tcDMiLCJpYXQiOjE3NjEzMDg2NzYsImV4cCI6NDkxNDkwODY3Nn0.mEg3fksa-Pmh5eakM_7DKigJg_tizxOY-ehgzDnYbo0";
const WATERMARK_INTERVAL = 15000; // 15 seconds between watermarks
// -12dB = 10^(-12/20) ≈ 0.25 - audible but backgrounded
const WATERMARK_RELATIVE_VOLUME = 1.0; // 4x previous volume (was 0.25)

interface UseAudioWatermarkProps {
  isPlaying: boolean;
  mainVolume: number;
  isMuted: boolean;
}

export const useAudioWatermark = ({ isPlaying, mainVolume, isMuted }: UseAudioWatermarkProps) => {
  const watermarkRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPlayTimeRef = useRef<number>(0);

  // Create the watermark audio element
  useEffect(() => {
    const watermarkAudio = new Audio(WATERMARK_URL);
    watermarkAudio.preload = 'auto';
    // Set watermark at -12dB relative to main volume (backgrounded, not shocking)
    watermarkAudio.volume = Math.min(1, Math.max(0, WATERMARK_RELATIVE_VOLUME * mainVolume));
    watermarkRef.current = watermarkAudio;

    // Preload the watermark
    watermarkAudio.load();

    return () => {
      if (watermarkRef.current) {
        watermarkRef.current.pause();
        watermarkRef.current.src = '';
      }
    };
  }, []);

  // Function to play the watermark (backgrounded, no ducking)
  const playWatermark = useCallback(async () => {
    const watermark = watermarkRef.current;
    console.log('🎯 playWatermark called', { hasWatermark: !!watermark, isMuted, mainVolume });
    
    if (!watermark) {
      console.error('❌ No watermark audio element!');
      return;
    }
    if (isMuted) {
      console.log('🔇 Skipping watermark - muted');
      return;
    }

    const now = Date.now();
    // Avoid playing too frequently
    if (now - lastPlayTimeRef.current < 8000) {
      console.log('⏳ Skipping watermark - too soon since last play');
      return;
    }

    try {
      watermark.currentTime = 0;
      const targetVolume = Math.min(1, Math.max(0, WATERMARK_RELATIVE_VOLUME * mainVolume));
      watermark.volume = targetVolume;
      console.log('🔊 Attempting to play watermark at volume:', targetVolume);
      await watermark.play();
      lastPlayTimeRef.current = now;
      console.log('✅ Audio watermark played successfully!');
    } catch (error) {
      console.error('❌ Error playing watermark:', error);
    }
  }, [mainVolume, isMuted]);

  // Manage watermark playback interval
  useEffect(() => {
    if (isPlaying && !isMuted) {
      // Play watermark shortly after start (2 seconds delay for natural feel)
      const initialTimeout = setTimeout(() => {
        playWatermark();
      }, 2000);

      // Set up the interval for subsequent plays
      intervalRef.current = setInterval(() => {
        playWatermark();
      }, WATERMARK_INTERVAL);

      console.log('▶️ Audio watermark activated (every 15 seconds, -12dB background)');

      return () => {
        clearTimeout(initialTimeout);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // Stop the interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('⏸️ Audio watermark paused');
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, isMuted, playWatermark]);

  // Update watermark volume when main volume changes
  useEffect(() => {
    if (watermarkRef.current) {
      watermarkRef.current.volume = Math.min(1, Math.max(0, WATERMARK_RELATIVE_VOLUME * mainVolume));
    }
  }, [mainVolume]);

  return {
    watermarkRef,
    playWatermark
  };
};
