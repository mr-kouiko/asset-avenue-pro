import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { useGFPGANEnhancer } from '@/hooks/useGFPGANEnhancer';
import { ComparisonSlider } from '@/components/upscale/ComparisonSlider';
import {
  Upload, Download, Loader2, Image as ImageIcon,
  ScanFace, ChevronLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface HistoryEntry {
  id: number;
  thumb: string;
  full: string;
  original: string;
  label: string;
}

let historyCounter = 0;

export default function FaceEnhancer() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ai = useGFPGANEnhancer();

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [blendStrength, setBlendStrength] = useState(50);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useSEO({
    title: 'AI Face & Skin Enhancer – GFPGAN | Studio AI',
    description: 'Enhance facial details with GFPGAN AI. 100% client-side, no uploads.',
    type: 'website',
  });

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
    reader.onload = (ev) => setOriginalImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleEnhance = useCallback(async () => {
    if (!originalImage) return;
    setResultImage(null);
    const result = await ai.enhance(originalImage, blendStrength / 100);
    if (result) {
      setResultImage(result);
      toast({ title: `${ai.facesDetected} face(s) enhanced!` });
      setHistory((h) => {
        const entry: HistoryEntry = {
          id: ++historyCounter,
          thumb: result,
          full: result,
          original: originalImage!,
          label: `${blendStrength}% strength`,
        };
        return [entry, ...h].slice(0, 8);
      });
    } else if (ai.step === 'no-faces') {
      toast({ title: 'No faces detected', description: 'Try a photo with visible faces.', variant: 'destructive' });
    } else {
      toast({ title: 'Error', description: 'Face enhancement failed.', variant: 'destructive' });
    }
  }, [originalImage, ai, toast, blendStrength]);

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = fileName.replace(/\.[^/.]+$/, '') + '-face-enhanced.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const restoreHistory = (entry: HistoryEntry) => {
    setOriginalImage(entry.original);
    setResultImage(entry.full);
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: 'hsl(var(--editor-bg))' }}>
      {/* ── Top bar ───────────────────────────────────────────────── */}
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
            AI Face & Skin Enhancer
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {ai.statusMessage && (
            <span className="text-xs mr-2" style={{ color: 'hsl(var(--editor-text))' }}>
              {ai.statusMessage}
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

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left sidebar ────────────────────────────────────────── */}
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
                  border: '1px solid hsl(var(--editor-border))',
                }}
              >
                {originalImage ? (
                  <><ImageIcon className="w-4 h-4" /> Change Image</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload Portrait</>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
              </label>
            </div>

            {/* Strength slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(var(--editor-text))' }}>
                  <ScanFace className="w-3.5 h-3.5" /> Enhancement Strength
                </label>
                <span className="text-xs tabular-nums" style={{ color: 'hsl(var(--editor-text))' }}>
                  {blendStrength}%
                </span>
              </div>
              <Slider
                value={[blendStrength]}
                onValueChange={([v]) => setBlendStrength(v)}
                min={0} max={100} step={5}
              />
              <div className="flex justify-between text-[10px] mt-1" style={{ color: 'hsl(var(--editor-text) / .5)' }}>
                <span>Natural</span><span>Full</span>
              </div>
            </div>

            {/* Separator */}
            <div className="h-px" style={{ background: 'hsl(var(--editor-border))' }} />

            {/* Face info */}
            {ai.facesDetected > 0 && (
              <div className="flex items-center gap-2">
                <ScanFace className="w-4 h-4" style={{ color: 'hsl(330 80% 60%)' }} />
                <span className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>
                  {ai.facesDetected} face(s) detected
                </span>
              </div>
            )}

            {/* Engine status */}
            <div>
              <p className="text-[11px] mb-1" style={{ color: 'hsl(var(--editor-text) / .5)' }}>Engine</p>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: ai.gpuAccelerated
                      ? 'hsl(140 70% 50%)'
                      : 'hsl(var(--editor-text) / .3)',
                  }}
                />
                <span className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>
                  {ai.backend.toUpperCase()}
                </span>
              </div>
              {ai.modelStatus === 'downloading' && (
                <div className="mt-2 space-y-1">
                  <Progress value={ai.downloadProgress} className="h-1.5" />
                  <p className="text-[10px]" style={{ color: 'hsl(var(--editor-text) / .5)' }}>
                    Downloading GFPGAN…
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Enhance button */}
          <div className="p-4 border-t" style={{ borderColor: 'hsl(var(--editor-border))' }}>
            <Button
              className="w-full h-10 font-semibold"
              onClick={handleEnhance}
              disabled={!originalImage || ai.isProcessing || ai.backend === 'canvas-only'}
              style={{
                background: ai.isProcessing ? 'hsl(var(--editor-panel))' : 'hsl(330 80% 55%)',
                color: '#fff',
              }}
            >
              {ai.isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
              ) : (
                <><ScanFace className="w-4 h-4 mr-2" /> Enhance Faces</>
              )}
            </Button>
            {ai.isProcessing && ai.processingProgress > 0 && (
              <Progress value={ai.processingProgress} className="h-1 mt-2" />
            )}
          </div>
        </aside>

        {/* ── Center viewer ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex items-center justify-center p-6 min-h-0">
            {!originalImage ? (
              <label
                className="w-full max-w-[1100px] aspect-[16/10] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-[hsl(330_80%_55%/.5)]"
                style={{ borderColor: 'hsl(var(--editor-border))', background: 'hsl(var(--editor-panel) / .5)' }}
              >
                <ScanFace className="w-10 h-10 mb-3" style={{ color: 'hsl(var(--editor-text) / .4)' }} />
                <p className="text-sm" style={{ color: 'hsl(var(--editor-text))' }}>
                  <span className="font-medium" style={{ color: 'hsl(330 80% 55%)' }}>Click to upload</span> a portrait
                </p>
                <p className="text-xs mt-1" style={{ color: 'hsl(var(--editor-text) / .4)' }}>
                  Works best with visible faces · Max 25 MB
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
                {ai.isProcessing ? (
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'hsl(330 80% 55%)' }} />
                    <p className="text-sm" style={{ color: 'hsl(var(--editor-text))' }}>{ai.statusMessage}</p>
                    {ai.processingProgress > 0 && (
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--editor-text) / .5)' }}>{ai.processingProgress}%</p>
                    )}
                  </div>
                ) : (
                  <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain" />
                )}
              </div>
            )}
          </div>

          {/* ── Bottom history strip ──────────────────────────────── */}
          {history.length > 0 && (
            <div
              className="h-20 border-t flex items-center gap-2 px-4 overflow-x-auto shrink-0 scrollbar-hide"
              style={{ borderColor: 'hsl(var(--editor-border))', background: 'hsl(var(--editor-sidebar))' }}
            >
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => restoreHistory(entry)}
                  className="h-14 w-14 shrink-0 rounded-md overflow-hidden border-2 transition-all hover:border-[hsl(330_80%_55%)]"
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
