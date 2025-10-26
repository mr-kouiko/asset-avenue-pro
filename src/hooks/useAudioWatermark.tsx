import { useEffect, useRef, useCallback } from 'react';

const WATERMARK_URL = "https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/sign/Audio%20VisuStock/ElevenLabs_2025-08-21T17_27_20_David%20-%20ASMR%20Whisper_pvc_sp100_s50_sb75_v3.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jZTIyNjk0MS1iMWRhLTRlZTAtYjk3Yi00MjY2NzQ4M2VhMjAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJBdWRpbyBWaXN1U3RvY2svRWxldmVuTGFic18yMDI1LTA4LTIxVDE3XzI3XzIwX0RhdmlkIC0gQVNNUiBXaGlzcGVyX3B2Y19zcDEwMF9zNTBfc2I3NV92My5tcDMiLCJpYXQiOjE3NjEzMDg2NzYsImV4cCI6NDkxNDkwODY3Nn0.mEg3fksa-Pmh5eakM_7DKigJg_tizxOY-ehgzDnYbo0";
const WATERMARK_INTERVAL = 10000; // 10 secondes
const WATERMARK_VOLUME = 0.5; // Volume du watermark à 50%

interface UseAudioWatermarkProps {
  isPlaying: boolean;
  mainVolume: number;
  isMuted: boolean;
  audioRef?: React.RefObject<HTMLAudioElement>;
}

export const useAudioWatermark = ({ isPlaying, mainVolume, isMuted, audioRef }: UseAudioWatermarkProps) => {
  const watermarkRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPlayTimeRef = useRef<number>(0);
  const originalVolumeRef = useRef<number>(1);

  // Créer l'élément audio du watermark
  useEffect(() => {
    const watermarkAudio = new Audio(WATERMARK_URL);
    watermarkAudio.preload = 'auto';
    watermarkAudio.volume = Math.min(1, Math.max(0, WATERMARK_VOLUME * mainVolume));
    watermarkRef.current = watermarkAudio;

    // Événements pour gérer le ducking audio
    const handleWatermarkPlay = () => {
      if (audioRef?.current) {
        originalVolumeRef.current = audioRef.current.volume;
        audioRef.current.volume = originalVolumeRef.current * 0.1; // 10% du volume
        console.log('🔉 Volume principal baissé à 10%');
      }
    };

    const handleWatermarkEnded = () => {
      if (audioRef?.current) {
        audioRef.current.volume = originalVolumeRef.current;
        console.log('🔊 Volume principal restauré');
      }
    };

    watermarkAudio.addEventListener('play', handleWatermarkPlay);
    watermarkAudio.addEventListener('ended', handleWatermarkEnded);

    // Précharger le watermark
    watermarkAudio.load();

    return () => {
      if (watermarkRef.current) {
        watermarkRef.current.removeEventListener('play', handleWatermarkPlay);
        watermarkRef.current.removeEventListener('ended', handleWatermarkEnded);
        watermarkRef.current.pause();
        watermarkRef.current.src = '';
      }
    };
  }, [audioRef]);

  // Fonction pour jouer le watermark
  const playWatermark = useCallback(async () => {
    const watermark = watermarkRef.current;
    if (!watermark || isMuted) return;

    const now = Date.now();
    // Éviter de jouer le watermark trop souvent
    if (now - lastPlayTimeRef.current < 5000) {
      return;
    }

    try {
      watermark.currentTime = 0;
      watermark.volume = Math.min(1, Math.max(0, WATERMARK_VOLUME * mainVolume));
      await watermark.play();
      lastPlayTimeRef.current = now;
      console.log('🔊 Watermark audio joué');
    } catch (error) {
      console.error('❌ Erreur lors de la lecture du watermark:', error);
    }
  }, [mainVolume, isMuted]);

  // Gérer l'intervalle de lecture du watermark
  useEffect(() => {
    if (isPlaying && !isMuted) {
      // Jouer le watermark immédiatement au démarrage si cela fait plus de 10 secondes
      const timeSinceLastPlay = Date.now() - lastPlayTimeRef.current;
      if (timeSinceLastPlay >= WATERMARK_INTERVAL) {
        playWatermark();
      }

      // Configurer l'intervalle
      intervalRef.current = setInterval(() => {
        playWatermark();
      }, WATERMARK_INTERVAL);

      console.log('▶️ Watermark audio activé (toutes les 10 secondes)');
    } else {
      // Arrêter l'intervalle
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('⏸️ Watermark audio désactivé');
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, isMuted, playWatermark]);

  // Mettre à jour le volume du watermark quand le volume principal change
  useEffect(() => {
    if (watermarkRef.current) {
      watermarkRef.current.volume = Math.min(1, Math.max(0, WATERMARK_VOLUME * mainVolume));
    }
  }, [mainVolume]);

  return {
    watermarkRef,
    playWatermark
  };
};
