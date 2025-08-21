import React, { useEffect, useRef, useState } from "react";

// Props du lecteur
interface AudioPlayerProps {
  audioPaths: string[]; // URLs des différents buckets
  watermarkUrl: string; // URL du watermark
  watermarkInterval?: number; // en secondes
  watermarkVolume?: number; // 0 à 1
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioPaths,
  watermarkUrl,
  watermarkInterval = 25,
  watermarkVolume = 0.3,
}) => {
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const watermarkRef = useRef<HTMLAudioElement | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  // Fonction pour trouver le premier audio accessible
  const loadAudio = async () => {
    for (const url of audioPaths) {
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok) {
          setCurrentUrl(url);
          return;
        }
      } catch (e) {
        console.warn("URL inaccessible:", url);
      }
    }
    console.error("Aucune URL audio accessible !");
  };

  // Charger l'audio au montage
  useEffect(() => {
    loadAudio();
  }, [audioPaths]);

  // Lancer le watermark toutes les n secondes
  useEffect(() => {
    if (!audioLoaded || !watermarkRef.current) return;

    const intervalId = setInterval(() => {
      if (mainAudioRef.current && !mainAudioRef.current.paused) {
        watermarkRef.current!.currentTime = 0;
        watermarkRef.current!.play().catch(() => {
          console.warn("Watermark non jouable pour le moment.");
        });
      }
    }, watermarkInterval * 1000);

    return () => clearInterval(intervalId);
  }, [audioLoaded, watermarkInterval]);

  // Quand l'URL principale est prête
  useEffect(() => {
    if (currentUrl && mainAudioRef.current) {
      mainAudioRef.current.src = currentUrl;
      mainAudioRef.current.load();
      setAudioLoaded(true);
    }
  }, [currentUrl]);

  return (
    <div>
      <audio
        ref={mainAudioRef}
        controls
        onPlay={() => {
          if (watermarkRef.current) watermarkRef.current.volume = watermarkVolume;
        }}
      >
        Votre navigateur ne supporte pas l'audio.
      </audio>

      {/* Watermark audio caché */}
      <audio
        ref={watermarkRef}
        src={watermarkUrl}
        preload="auto"
      />
    </div>
  );
};

export { AudioPlayer };