import { useState, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Upload, Clock, Play, Pause, Download, Loader2, Music, ArrowLeft } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function AdjustMusicDuration() {
  const navigate = useNavigate();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [originalDuration, setOriginalDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
      const dur = Math.ceil(audio.duration);
      setOriginalDuration(dur);
      setMinutes(Math.floor(dur / 60));
      setSeconds(dur % 60);
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

  const togglePlay = () => {
    const audio = resultUrl ? resultAudioRef.current : audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleGenerate = async () => {
    if (!audioFile) {
      toast.error('Please upload an audio file first');
      return;
    }
    const targetDuration = minutes * 60 + seconds;
    if (targetDuration <= 0) {
      toast.error('Please set a valid duration');
      return;
    }

    setIsProcessing(true);
    try {
      // Client-side trimming using Web Audio API
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const targetSamples = Math.min(targetDuration * audioBuffer.sampleRate, audioBuffer.length);
      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        targetSamples,
        audioBuffer.sampleRate
      );

      const source = offlineCtx.createBufferSource();

      if (targetDuration <= audioBuffer.duration) {
        // Trim: just play shorter
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start(0, 0, targetDuration);
      } else {
        // Extend: loop the audio
        const loopSamples = targetDuration * audioBuffer.sampleRate;
        const extendedBuffer = offlineCtx.createBuffer(
          audioBuffer.numberOfChannels,
          loopSamples,
          audioBuffer.sampleRate
        );
        for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
          const srcData = audioBuffer.getChannelData(ch);
          const dstData = extendedBuffer.getChannelData(ch);
          for (let i = 0; i < loopSamples; i++) {
            dstData[i] = srcData[i % srcData.length];
          }
        }
        source.buffer = extendedBuffer;
        source.connect(offlineCtx.destination);
        source.start(0);
      }

      const renderedBuffer = await offlineCtx.startRendering();

      // Encode to WAV
      const wavBlob = encodeWav(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);
      setResultUrl(url);
      toast.success('Audio adjusted successfully!');
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
    const length = buffer.length * numCh * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, length - 8, true);
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
    view.setUint32(40, buffer.length * numCh * 2, true);

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numCh; ch++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `adjusted-${audioFile?.name || 'audio'}.wav`;
    a.click();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--editor-bg))' }}>
      <Header />

      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Left Sidebar */}
        <aside
          className="w-[380px] shrink-0 border-r flex flex-col overflow-y-auto"
          style={{
            background: 'hsl(var(--editor-sidebar))',
            borderColor: 'hsl(var(--editor-border))',
          }}
        >
          {/* Back button */}
          <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--editor-border))' }}>
            <button
              onClick={() => navigate('/studio-ai')}
              className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
              style={{ color: 'hsl(var(--editor-text))' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Studio AI
            </button>
          </div>

          <div className="p-6 flex flex-col gap-6 flex-1">
            {/* Title */}
            <div>
              <h1 className="text-xl font-bold mb-1" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                Adjust music duration
              </h1>
              <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--editor-text))' }}>
                Easily trim or extend your music tracks with AI-powered audio editing.
              </p>
            </div>

            {/* Source music */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                Source music
              </label>
              <div
                className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors hover:border-[hsl(var(--editor-accent))]"
                style={{
                  borderColor: 'hsl(var(--editor-border))',
                  background: 'hsl(var(--editor-panel))',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Upload className="w-6 h-6" style={{ color: 'hsl(var(--editor-text))' }} />
                <span className="text-sm text-center" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                  Click to upload or drop music file
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>

              {audioFile && (
                <div
                  className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'hsl(var(--editor-panel))', color: 'hsl(var(--editor-text-bright))' }}
                >
                  <Music className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--editor-accent))' }} />
                  <span className="truncate">{audioFile.name}</span>
                  <span className="shrink-0 ml-auto text-xs" style={{ color: 'hsl(var(--editor-text))' }}>
                    {formatTime(originalDuration)}
                  </span>
                </div>
              )}
            </div>

            {/* Desired duration */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                Desired duration (mm:ss)
              </label>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
                style={{
                  background: 'hsl(var(--editor-panel))',
                  borderColor: 'hsl(var(--editor-border))',
                }}
              >
                <Clock className="w-4 h-4" style={{ color: 'hsl(var(--editor-text))' }} />
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={String(minutes).padStart(2, '0')}
                  onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-10 bg-transparent text-center text-sm outline-none"
                  style={{ color: 'hsl(var(--editor-text-bright))' }}
                />
                <span style={{ color: 'hsl(var(--editor-text))' }}>:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={String(seconds).padStart(2, '0')}
                  onChange={(e) => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-10 bg-transparent text-center text-sm outline-none"
                  style={{ color: 'hsl(var(--editor-text-bright))' }}
                />
              </div>
            </div>

            {/* Generate button */}
            <Button
              className="w-full bg-[hsl(var(--editor-accent))] hover:bg-[hsl(var(--editor-accent-soft))] text-white"
              onClick={handleGenerate}
              disabled={!audioFile || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Generate'
              )}
            </Button>
          </div>
        </aside>

        {/* Main workspace */}
        <main className="flex-1 flex flex-col items-center justify-center p-8" style={{ background: 'hsl(var(--editor-bg))' }}>
          {!audioFile && !resultUrl && (
            <div className="text-center flex flex-col items-center gap-4">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: 'hsl(var(--editor-panel))' }}
              >
                <Music className="w-10 h-10" style={{ color: 'hsl(var(--editor-text))' }} />
              </div>
              <p className="text-lg" style={{ color: 'hsl(var(--editor-text))' }}>
                Upload a music file to get started
              </p>
              <p className="text-sm max-w-md" style={{ color: 'hsl(var(--editor-text))' }}>
                Easily trim or extend your music tracks with our AI-powered online audio shortener and song lengthener.
              </p>
            </div>
          )}

          {(audioUrl || resultUrl) && (
            <div className="w-full max-w-[700px] flex flex-col gap-6">
              {/* Original audio */}
              {audioUrl && (
                <div
                  className="rounded-xl p-6 border"
                  style={{
                    background: 'hsl(var(--editor-panel))',
                    borderColor: 'hsl(var(--editor-border))',
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-1 rounded text-xs font-semibold text-white" style={{ background: 'hsl(140 60% 45%)' }}>
                      Original
                    </span>
                    <span className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>
                      {audioFile?.name} — {formatTime(originalDuration)}
                    </span>
                  </div>
                  <audio ref={audioRef} src={audioUrl} className="w-full" controls
                    style={{ filter: 'invert(1) hue-rotate(180deg)', height: '40px' }}
                  />
                </div>
              )}

              {/* Result audio */}
              {resultUrl && (
                <div
                  className="rounded-xl p-6 border"
                  style={{
                    background: 'hsl(var(--editor-panel))',
                    borderColor: 'hsl(var(--editor-border))',
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded text-xs font-semibold text-white" style={{ background: 'hsl(220 80% 55%)' }}>
                        Adjusted
                      </span>
                      <span className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>
                        {formatTime(minutes * 60 + seconds)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownload}
                      className="border-[hsl(var(--editor-border))] text-[hsl(var(--editor-text-bright))] hover:bg-[hsl(var(--editor-panel))]"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                  <audio ref={resultAudioRef} src={resultUrl} className="w-full" controls
                    style={{ filter: 'invert(1) hue-rotate(180deg)', height: '40px' }}
                  />
                </div>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex items-center justify-center gap-3 py-8">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'hsl(var(--editor-accent))' }} />
                  <span style={{ color: 'hsl(var(--editor-text-bright))' }}>Processing audio...</span>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
