import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.js';

interface WaveformEditorProps {
  audioUrl: string;
  duration: number;
  onRegionChange: (start: number, end: number) => void;
  onReady?: () => void;
}

export function WaveformEditor({ audioUrl, duration, onRegionChange, onReady }: WaveformEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const regionRef = useRef<Region | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'hsl(220 20% 40%)',
      progressColor: 'hsl(217 90% 60%)',
      cursorColor: 'hsl(217 90% 60%)',
      cursorWidth: 2,
      height: 120,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
      plugins: [regions],
    });

    wsRef.current = ws;

    ws.load(audioUrl);

    ws.on('ready', () => {
      setIsReady(true);
      onReady?.();

      // Create initial region spanning full track
      const dur = ws.getDuration();
      const r = regions.addRegion({
        start: 0,
        end: Math.min(dur, 30),
        color: 'hsla(217, 90%, 60%, 0.18)',
        drag: true,
        resize: true,
      });
      regionRef.current = r;
      onRegionChange(r.start, r.end);
    });

    ws.on('timeupdate', (t) => setCurrentTime(t));

    regions.on('region-updated', (region: Region) => {
      regionRef.current = region;
      onRegionChange(region.start, region.end);
    });

    return () => {
      ws.destroy();
      wsRef.current = null;
      regionsRef.current = null;
      regionRef.current = null;
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!wsRef.current || !isReady) return;
    const pxPerSec = zoom === 0 ? 0 : 20 + zoom * 30;
    wsRef.current.zoom(pxPerSec);
  }, [zoom, isReady]);

  const playRegion = useCallback(() => {
    if (!wsRef.current || !regionRef.current) return;
    regionRef.current.play();
  }, []);

  const playFull = useCallback(() => {
    if (!wsRef.current) return;
    wsRef.current.playPause();
  }, []);

  const setRegionBounds = useCallback((start: number, end: number) => {
    if (!regionRef.current || !wsRef.current) return;
    const dur = wsRef.current.getDuration();
    const s = Math.max(0, Math.min(start, dur));
    const e = Math.max(s + 0.1, Math.min(end, dur));
    regionRef.current.setOptions({ start: s, end: e });
    onRegionChange(s, e);
  }, [onRegionChange]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Zoom control */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>
          Cursor: {formatTime(currentTime)}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>Zoom</span>
          <input
            type="range"
            min={0}
            max={10}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-24 h-1 accent-[hsl(217,90%,60%)]"
          />
        </div>
      </div>

      {/* Waveform */}
      <div
        ref={containerRef}
        className="rounded-lg border overflow-hidden"
        style={{
          background: 'hsl(225 40% 10%)',
          borderColor: 'hsl(var(--editor-border))',
        }}
      />

      {!isReady && (
        <div className="flex items-center justify-center py-8">
          <span className="text-xs animate-pulse" style={{ color: 'hsl(var(--editor-text))' }}>
            Loading waveform...
          </span>
        </div>
      )}
    </div>
  );
}

export type { WaveformEditorProps };
