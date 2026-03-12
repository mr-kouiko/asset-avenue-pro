import { useState, useRef, useCallback, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Upload, Clock, Play, Pause, Download, Loader2, Music, Scissors, Move } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WaveformEditor } from '@/components/audio/WaveformEditor';

type SelectionMode = 'manual' | 'duration';

export default function AdjustMusicDuration() {
  const navigate = useNavigate();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [originalDuration, setOriginalDuration] = useState(0);
  const [regionStart, setRegionStart] = useState(0);
  const [regionEnd, setRegionEnd] = useState(0);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('manual');
  const [targetDurationSec, setTargetDurationSec] = useState(30);
  const resultAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useSEO({
    title: 'Adjust Music Duration - AI Audio Tool | Studio AI',
    description: 'Easily trim or extend your music tracks with AI-powered audio shortener and song lengthener. Create precise, professional edits in seconds.',
    type: 'website'
  });

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file');
      return;
    }
    setAudioFile(file);
    setResultUrl(null);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      const dur = audio.duration;
      setOriginalDuration(dur);
      setRegionStart(0);
      setRegionEnd(Math.min(dur, 30));
      setTargetDurationSec(Math.min(Math.ceil(dur), 30));
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleRegionChange = useCallback((start: number, end: number) => {
    setRegionStart(start);
    setRegionEnd(end);
    if (selectionMode === 'duration') {
      setTargetDurationSec(Math.round(end - start));
    }
  }, [selectionMode]);

  // In duration mode, when target changes, shift region
  useEffect(() => {
    if (selectionMode !== 'duration' || !originalDuration) return;
    const dur = Math.min(targetDurationSec, originalDuration);
    const newEnd = Math.min(regionStart + dur, originalDuration);
    setRegionEnd(newEnd);
  }, [targetDurationSec, selectionMode]);

  const selectedDuration = regionEnd - regionStart;

  const handleGenerate = async () => {
    if (!audioFile) {
      toast.error('Please upload an audio file first');
      return;
    }
    if (selectedDuration <= 0.1) {
      toast.error('Please select a valid region');
      return;
    }

    setIsProcessing(true);
    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const startSample = Math.floor(regionStart * audioBuffer.sampleRate);
      const endSample = Math.min(Math.floor(regionEnd * audioBuffer.sampleRate), audioBuffer.length);
      const numSamples = endSample - startSample;

      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        numSamples,
        audioBuffer.sampleRate
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start(0, regionStart, regionEnd - regionStart);

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = encodeWav(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);
      setResultUrl(url);
      toast.success('Audio trimmed successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const encodeWav = (buffer: AudioBuffer): Blob => {
    const numCh = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const totalSamples = buffer.length * numCh;
    const dataSize = totalSamples * 2;
    const headerSize = 44;
    const ab = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(ab);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, headerSize + dataSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numCh, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numCh * 2, true);
    view.setUint16(32, numCh * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const pcm = new Int16Array(ab, headerSize);
    const channels = Array.from({ length: numCh }, (_, ch) => buffer.getChannelData(ch));
    for (let i = 0; i < buffer.length; i++) {
      const base = i * numCh;
      for (let ch = 0; ch < numCh; ch++) {
        const s = channels[ch][i];
        pcm[base + ch] = s < 0 ? (s * 0x8000) | 0 : (s * 0x7FFF) | 0;
      }
    }
    return new Blob([ab], { type: 'audio/wav' });
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `trimmed-${audioFile?.name || 'audio'}.wav`;
    a.click();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const formatTimePrecise = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--editor-bg))' }}>
      <Header />

      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Left Sidebar */}
        <aside
          className="w-[280px] shrink-0 border-r flex flex-col overflow-y-auto"
          style={{
            background: 'hsl(var(--editor-sidebar))',
            borderColor: 'hsl(var(--editor-border))',
          }}
        >
          <div className="p-6 flex flex-col gap-5 flex-1">
            <h1 className="text-lg font-bold" style={{ color: 'hsl(var(--editor-text-bright))' }}>
              Adjust music duration
            </h1>

            {/* Source music upload */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'hsl(var(--editor-text))' }}>
                Source music
              </label>
              <div
                className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors hover:border-[hsl(var(--editor-accent))]"
                style={{
                  borderColor: 'hsl(var(--editor-border))',
                  background: 'hsl(var(--editor-panel))',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {audioFile ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                    <Music className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--editor-accent))' }} />
                    <span className="truncate max-w-[180px]">{audioFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Music className="w-5 h-5" style={{ color: 'hsl(var(--editor-text))' }} />
                    <span className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>
                      Drop audio file or click
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>
            </div>

            {/* Selection mode */}
            {audioFile && (
              <>
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: 'hsl(var(--editor-text))' }}>
                    Selection mode
                  </label>
                  <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'hsl(var(--editor-panel))' }}>
                    <button
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        selectionMode === 'manual' ? 'text-white' : ''
                      }`}
                      style={{
                        background: selectionMode === 'manual' ? 'hsl(var(--editor-accent))' : 'transparent',
                        color: selectionMode === 'manual' ? 'white' : 'hsl(var(--editor-text))',
                      }}
                      onClick={() => setSelectionMode('manual')}
                    >
                      <Scissors className="w-3 h-3" />
                      Manual
                    </button>
                    <button
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors`}
                      style={{
                        background: selectionMode === 'duration' ? 'hsl(var(--editor-accent))' : 'transparent',
                        color: selectionMode === 'duration' ? 'white' : 'hsl(var(--editor-text))',
                      }}
                      onClick={() => setSelectionMode('duration')}
                    >
                      <Clock className="w-3 h-3" />
                      Duration
                    </button>
                  </div>
                </div>

                {/* Selection info */}
                <div
                  className="rounded-lg p-3 border flex flex-col gap-2"
                  style={{
                    background: 'hsl(var(--editor-panel))',
                    borderColor: 'hsl(var(--editor-border))',
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>Start</span>
                    <span className="text-xs font-mono font-medium" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                      {formatTimePrecise(regionStart)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>End</span>
                    <span className="text-xs font-mono font-medium" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                      {formatTimePrecise(regionEnd)}
                    </span>
                  </div>
                  <div
                    className="border-t pt-2 flex justify-between items-center"
                    style={{ borderColor: 'hsl(var(--editor-border))' }}
                  >
                    <span className="text-xs font-medium" style={{ color: 'hsl(var(--editor-accent))' }}>Duration</span>
                    <span className="text-xs font-mono font-bold" style={{ color: 'hsl(var(--editor-accent))' }}>
                      {formatTimePrecise(selectedDuration)}
                    </span>
                  </div>
                </div>

                {/* Duration mode: target input */}
                {selectionMode === 'duration' && (
                  <div>
                    <label className="text-xs font-medium mb-2 block" style={{ color: 'hsl(var(--editor-text))' }}>
                      Target duration (seconds)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={Math.ceil(originalDuration)}
                      value={targetDurationSec}
                      onChange={(e) => setTargetDurationSec(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none"
                      style={{
                        borderColor: 'hsl(var(--editor-border))',
                        color: 'hsl(var(--editor-text-bright))',
                      }}
                    />
                  </div>
                )}

                {/* Generate / Clear */}
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    className="bg-[hsl(var(--editor-accent))] hover:bg-[hsl(var(--editor-accent-soft))] text-white px-5"
                    onClick={handleGenerate}
                    disabled={!audioFile || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Generate'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[hsl(var(--editor-border))] text-[hsl(var(--editor-text))] hover:text-[hsl(var(--editor-text-bright))] hover:bg-[hsl(var(--editor-panel))]"
                    onClick={() => {
                      setAudioFile(null);
                      setAudioUrl(null);
                      setResultUrl(null);
                      setRegionStart(0);
                      setRegionEnd(0);
                      setOriginalDuration(0);
                    }}
                  >
                    Clear all
                  </Button>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Main workspace */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {!audioUrl && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
              <svg width="80" height="50" viewBox="0 0 80 50" fill="none" style={{ color: 'hsl(var(--editor-text))' }}>
                <rect x="4" y="18" width="3" height="14" rx="1.5" fill="currentColor" opacity="0.5" />
                <rect x="10" y="12" width="3" height="26" rx="1.5" fill="currentColor" opacity="0.6" />
                <rect x="16" y="8" width="3" height="34" rx="1.5" fill="currentColor" opacity="0.7" />
                <rect x="22" y="14" width="3" height="22" rx="1.5" fill="currentColor" opacity="0.8" />
                <rect x="28" y="4" width="3" height="42" rx="1.5" fill="currentColor" />
                <rect x="34" y="10" width="3" height="30" rx="1.5" fill="currentColor" />
                <rect x="40" y="2" width="3" height="46" rx="1.5" fill="currentColor" />
                <rect x="46" y="10" width="3" height="30" rx="1.5" fill="currentColor" />
                <rect x="52" y="4" width="3" height="42" rx="1.5" fill="currentColor" />
                <rect x="58" y="14" width="3" height="22" rx="1.5" fill="currentColor" opacity="0.8" />
                <rect x="64" y="8" width="3" height="34" rx="1.5" fill="currentColor" opacity="0.7" />
                <rect x="70" y="12" width="3" height="26" rx="1.5" fill="currentColor" opacity="0.6" />
                <rect x="76" y="18" width="3" height="14" rx="1.5" fill="currentColor" opacity="0.5" />
              </svg>
              <p className="text-sm" style={{ color: 'hsl(var(--editor-text))' }}>
                Upload an audio file to get started
              </p>
            </div>
          )}

          {audioUrl && (
            <div className="flex-1 flex flex-col p-6 gap-5">
              {/* Waveform editor */}
              <div
                className="rounded-xl p-5 border"
                style={{ background: 'hsl(var(--editor-panel))', borderColor: 'hsl(var(--editor-border))' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                    {audioFile?.name}
                  </span>
                  <span className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>
                    — {formatTime(Math.ceil(originalDuration))}
                  </span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded" style={{ background: 'hsl(var(--editor-accent) / 0.15)', color: 'hsl(var(--editor-accent))' }}>
                    Drag handles to select region
                  </span>
                </div>

                <WaveformEditor
                  audioUrl={audioUrl}
                  duration={originalDuration}
                  onRegionChange={handleRegionChange}
                />
              </div>

              {/* Processing indicator */}
              {isProcessing && (
                <div
                  className="rounded-xl p-5 border flex items-center justify-center gap-3"
                  style={{ background: 'hsl(var(--editor-panel))', borderColor: 'hsl(var(--editor-border))' }}
                >
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'hsl(var(--editor-accent))' }} />
                  <span className="text-sm" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                    Trimming audio...
                  </span>
                </div>
              )}

              {/* Result */}
              {resultUrl && (
                <div
                  className="rounded-xl p-5 border"
                  style={{ background: 'hsl(var(--editor-panel))', borderColor: 'hsl(var(--editor-border))' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold text-white" style={{ background: 'hsl(217 80% 55%)' }}>
                        Trimmed
                      </span>
                      <span className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>
                        {formatTimePrecise(regionStart)} → {formatTimePrecise(regionEnd)} ({formatTimePrecise(selectedDuration)})
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownload}
                      className="border-[hsl(var(--editor-border))] text-black hover:bg-[hsl(var(--editor-panel))] h-7 text-xs"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> Download WAV
                    </Button>
                  </div>
                  <audio
                    ref={resultAudioRef}
                    src={resultUrl}
                    className="w-full"
                    controls
                    style={{ filter: 'invert(1) hue-rotate(180deg)', height: '36px' }}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
