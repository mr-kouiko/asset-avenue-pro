import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { useESRGANUpscaler, type UpscaleMode } from '@/hooks/useESRGANUpscaler';
import { useGFPGANEnhancer } from '@/hooks/useGFPGANEnhancer';
import { ComparisonSlider } from '@/components/upscale/ComparisonSlider';
import {
  Upload, Download, Loader2, Image as ImageIcon,
  Zap, Brain, ScanFace, ChevronLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ── History thumbnail type ─────────────────────────────────────────────────
interface HistoryEntry {
  id: number;
  thumb: string;
  full: string;
  original: string;
  label: string;
}

let historyCounter = 0;

export default function AIUpscaler() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const esrgan = useESRGANUpscaler();
  const gfpgan = useGFPGANEnhancer();

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [scale, setScale] = useState(2);
  const [sharpness, setSharpness] = useState(50);
  const [mode, setMode] = useState<UpscaleMode>('fast');
  const [faceEnhance, setFaceEnhance] = useState(false);
  const [faceStrength, setFaceStrength] = useState(50);
  const [originalDims, setOriginalDims] = useState<{ w: number; h: number } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const isProcessing = esrgan.isProcessing || gfpgan.isProcessing;

  useSEO({
    title: 'AI Image Upscaler – Enlarge Images with ESRGAN | Studio AI',
    description: 'Upscale images 2× or 4× with Real-ESRGAN AI. WebGPU accelerated, 100% client-side.',
    type: 'website',
  });

  // ── File handling ────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Upload JPG, PNG or WebP.', variant: 'destructive' });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 25 MB.', variant: 'destructive' });
      return;
    }
    setFileName(file.name);
    setResultImage(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setOriginalImage(src);
      const img = new Image();
      img.onload = () => setOriginalDims({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // ── Process ──────────────────────────────────────────────────────────────
  const handleUpscale = useCallback(async () => {
    if (!originalImage) return;
    setResultImage(null);

    let result = await esrgan.upscale(originalImage, scale, mode, sharpness);
    if (!result) {
      toast({ title: 'Error', description: 'Upscale failed.', variant: 'destructive' });
      return;
    }

    // Optional face enhance pass
    if (faceEnhance && result) {
      const faceResult = await gfpgan.enhance(result, faceStrength / 100);
      if (faceResult) result = faceResult;
    }

    setResultImage(result);
    toast({ title: 'Done!' });

    // Add to history
    setHistory((h) => {
      const entry: HistoryEntry = {
        id: ++historyCounter,
        thumb: result!,
        full: result!,
        original: originalImage!,
        label: `${scale}× ${mode}${faceEnhance ? ' +face' : ''}`,
      };
      return [entry, ...h].slice(0, 8);
    });
  }, [originalImage, scale, mode, sharpness, faceEnhance, faceStrength, esrgan, gfpgan, toast]);

  // ── Download ─────────────────────────────────────────────────────────────
  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = fileName.replace(/\.[^/.]+$/, '') + `-${scale}x-upscaled.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Restore from history ────────────────────────────────────────────────
  const restoreHistory = (entry: HistoryEntry) => {
    setOriginalImage(entry.original);
    setResultImage(entry.full);
  };

  const outputW = originalDims ? originalDims.w * scale : 0;
  const outputH = originalDims ? originalDims.h * scale : 0;

  // ── Status message ──────────────────────────────────────────────────────
  const statusMsg = esrgan.isProcessing
    ? esrgan.statusMessage
    : gfpgan.isProcessing
      ? gfpgan.statusMessage
      : esrgan.statusMessage;

  const progress = esrgan.isProcessing
    ? esrgan.processingProgress
    : gfpgan.isProcessing
      ? gfpgan.processingProgress
      : 0;

  return (
    <div className="h-screen flex flex-col" style={{ background: 'hsl(var(--editor-bg))' }}>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header
        className="h-12 flex items-center justify-between px-4 border-b shrink-0 z-20"
        style={{ borderColor: 'hsl(var(--editor-border))', background: 'hsl(var(--editor-sidebar))' }}
      >
        <div className="flex items-center gap-3">
          <Link
            to="/studio-ai"
            className="flex items-center gap-1 text-sm hover:opacity-80 transition-opacity"
            style={{ color: 'hsl(var(--editor-text))' }}
          >
            <ChevronLeft className="w-4 h-4" /> Studio AI
          </Link>
          <span className="w-px h-5" style={{ background: 'hsl(var(--editor-border))' }} />
          <h1 className="text-sm font-semibold" style={{ color: 'hsl(var(--editor-text-bright))' }}>
            AI Image Upscaler
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {statusMsg && (
            <span className="text-xs mr-2" style={{ color: 'hsl(var(--editor-text))' }}>
              {statusMsg}
            </span>
          )}
          {resultImage && (
            <Button size="sm" variant="outline" onClick={handleDownload}
              className="h-8 gap-1.5 border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10">
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
          )}
        </div>
      </header>

      {/* ── Body: sidebar + canvas ──────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left sidebar ───────────────────────────────────────────── */}
        <aside
          className="w-64 shrink-0 overflow-y-auto border-r flex flex-col"
          style={{ background: 'hsl(var(--editor-sidebar))', borderColor: 'hsl(var(--editor-border))' }}
        >
          <div className="p-4 space-y-5 flex-1">
            {/* Upload */}
            <div>
              <label
                className="flex items-center justify-center gap-2 w-full h-10 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                style={{
                  background: originalImage ? 'hsl(var(--editor-panel))' : 'hsl(var(--editor-accent) / .15)',
                  color: originalImage ? 'hsl(var(--editor-text))' : 'hsl(var(--editor-accent))',
                  border: `1px solid hsl(var(--editor-border))`,
                }}
              >
                {originalImage ? (
                  <><ImageIcon className="w-4 h-4" /> Change Image</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload Image</>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
              </label>
              {originalDims && (
                <p className="text-xs mt-2 tabular-nums" style={{ color: 'hsl(var(--editor-text))' }}>
                  {originalDims.w} × {originalDims.h} → {outputW} × {outputH} px
                </p>
              )}
            </div>

            {/* Scale */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(var(--editor-text))' }}>
                Upscale Factor
              </label>
              <div className="flex gap-2">
                {[2, 4].map((v) => (
                  <button
                    key={v}
                    onClick={() => { setScale(v); setResultImage(null); }}
                    className="flex-1 h-9 rounded-md text-sm font-semibold transition-colors"
                    style={{
                      background: scale === v ? 'hsl(var(--editor-accent))' : 'hsl(var(--editor-panel))',
                      color: scale === v ? '#fff' : 'hsl(var(--editor-text))',
                    }}
                  >
                    {v}×
                  </button>
                ))}
              </div>
            </div>

            {/* Mode */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(var(--editor-text))' }}>
                Processing Mode
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setMode('fast'); setResultImage(null); }}
                  className="flex-1 h-9 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  style={{
                    background: mode === 'fast' ? 'hsl(45 90% 50%)' : 'hsl(var(--editor-panel))',
                    color: mode === 'fast' ? '#000' : 'hsl(var(--editor-text))',
                  }}
                >
                  <Zap className="w-3.5 h-3.5" /> Fast
                </button>
                <button
                  onClick={() => { setMode('ai'); setResultImage(null); }}
                  disabled={esrgan.backend === 'canvas-only'}
                  className="flex-1 h-9 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
                  style={{
                    background: mode === 'ai' ? 'hsl(270 70% 55%)' : 'hsl(var(--editor-panel))',
                    color: mode === 'ai' ? '#fff' : 'hsl(var(--editor-text))',
                  }}
                >
                  <Brain className="w-3.5 h-3.5" /> AI (HD)
                </button>
              </div>
            </div>

            {/* Sharpness (fast mode only) */}
            <div style={{ opacity: mode === 'ai' ? 0.35 : 1 }}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--editor-text))' }}>
                  Sharpness
                </label>
                <span className="text-xs tabular-nums" style={{ color: 'hsl(var(--editor-text))' }}>
                  {sharpness}%
                </span>
              </div>
              <Slider
                value={[sharpness]}
                onValueChange={([v]) => { setSharpness(v); setResultImage(null); }}
                min={0} max={100} step={5}
                disabled={mode === 'ai'}
              />
            </div>

            {/* Separator */}
            <div className="h-px" style={{ background: 'hsl(var(--editor-border))' }} />

            {/* Face enhance toggle */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(var(--editor-text))' }}>
                  <ScanFace className="w-3.5 h-3.5" /> Face Enhancement
                </label>
                <Switch checked={faceEnhance} onCheckedChange={setFaceEnhance} />
              </div>
              <p className="text-[11px] mt-1" style={{ color: 'hsl(var(--editor-text) / .6)' }}>
                GFPGAN face restoration
              </p>
            </div>

            {/* Face strength */}
            {faceEnhance && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ color: 'hsl(var(--editor-text))' }}>
                    Face Strength
                  </label>
                  <span className="text-xs tabular-nums" style={{ color: 'hsl(var(--editor-text))' }}>
                    {faceStrength}%
                  </span>
                </div>
                <Slider
                  value={[faceStrength]}
                  onValueChange={([v]) => setFaceStrength(v)}
                  min={0} max={100} step={5}
                />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: 'hsl(var(--editor-text) / .5)' }}>
                  <span>Natural</span><span>Full</span>
                </div>
              </div>
            )}

            {/* Separator */}
            <div className="h-px" style={{ background: 'hsl(var(--editor-border))' }} />

            {/* Model status */}
            <div>
              <p className="text-[11px] mb-1" style={{ color: 'hsl(var(--editor-text) / .5)' }}>Engine</p>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: esrgan.gpuAccelerated
                      ? 'hsl(140 70% 50%)'
                      : 'hsl(var(--editor-text) / .3)',
                  }}
                />
                <span className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>
                  {esrgan.backend.toUpperCase()}
                </span>
              </div>
              {(esrgan.modelStatus === 'downloading' || gfpgan.modelStatus === 'downloading') && (
                <div className="mt-2 space-y-1">
                  <Progress
                    value={esrgan.modelStatus === 'downloading' ? esrgan.downloadProgress : gfpgan.downloadProgress}
                    className="h-1.5"
                  />
                  <p className="text-[10px]" style={{ color: 'hsl(var(--editor-text) / .5)' }}>
                    Downloading model…
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Process button at bottom of sidebar */}
          <div className="p-4 border-t" style={{ borderColor: 'hsl(var(--editor-border))' }}>
            <Button
              className="w-full h-10 font-semibold"
              onClick={handleUpscale}
              disabled={!originalImage || isProcessing}
              style={{
                background: isProcessing ? 'hsl(var(--editor-panel))' : 'hsl(var(--editor-accent))',
                color: '#fff',
              }}
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Upscale {scale}×</>
              )}
            </Button>
            {isProcessing && progress > 0 && (
              <Progress value={progress} className="h-1 mt-2" />
            )}
          </div>
        </aside>

        {/* ── Center viewer ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex items-center justify-center p-6 min-h-0">
            {!originalImage ? (
              <label
                className="w-full max-w-[1100px] aspect-[16/10] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-[hsl(var(--editor-accent)/.5)]"
                style={{ borderColor: 'hsl(var(--editor-border))', background: 'hsl(var(--editor-panel) / .5)' }}
              >
                <Upload className="w-10 h-10 mb-3" style={{ color: 'hsl(var(--editor-text) / .4)' }} />
                <p className="text-sm" style={{ color: 'hsl(var(--editor-text))' }}>
                  <span className="font-medium" style={{ color: 'hsl(var(--editor-accent))' }}>Click to upload</span> or drag & drop
                </p>
                <p className="text-xs mt-1" style={{ color: 'hsl(var(--editor-text) / .4)' }}>
                  PNG, JPG, WebP · Max 25 MB
                </p>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
              </label>
            ) : resultImage ? (
              <div className="w-full max-w-[1100px] h-full min-h-0">
                <ComparisonSlider
                  originalSrc={originalImage}
                  resultSrc={resultImage}
                  className="w-full h-full rounded-lg"
                />
              </div>
            ) : (
              <div className="w-full max-w-[1100px] h-full min-h-0 flex items-center justify-center rounded-lg overflow-hidden"
                style={{ background: 'hsl(var(--editor-panel))' }}
              >
                {isProcessing ? (
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'hsl(var(--editor-accent))' }} />
                    <p className="text-sm" style={{ color: 'hsl(var(--editor-text))' }}>{statusMsg}</p>
                    {progress > 0 && (
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--editor-text) / .5)' }}>{progress}%</p>
                    )}
                  </div>
                ) : (
                  <img
                    src={originalImage}
                    alt="Original"
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>
            )}
          </div>

          {/* ── Bottom history strip ──────────────────────────────────── */}
          {history.length > 0 && (
            <div
              className="h-20 border-t flex items-center gap-2 px-4 overflow-x-auto shrink-0 scrollbar-hide"
              style={{ borderColor: 'hsl(var(--editor-border))', background: 'hsl(var(--editor-sidebar))' }}
            >
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => restoreHistory(entry)}
                  className="h-14 w-14 shrink-0 rounded-md overflow-hidden border-2 transition-all hover:border-[hsl(var(--editor-accent))]"
                  style={{ borderColor: 'hsl(var(--editor-border))' }}
                  title={entry.label}
                >
                  <img src={entry.thumb} alt={entry.label} className="w-full h-full object-cover" />
                </button>
              ))}
              <span className="text-[10px] shrink-0 ml-1" style={{ color: 'hsl(var(--editor-text) / .4)' }}>
                Recent results
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
