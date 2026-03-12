import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { useGFPGANEnhancer } from '@/hooks/useGFPGANEnhancer';
import {
  Upload, Download, Loader2, ImagePlus,
  ScanFace, ChevronLeft, RotateCcw,
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
        return [entry, ...h].slice(0, 12);
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
    <div className="h-screen flex flex-col" style={{ background: 'hsl(220 20% 7%)' }}>
      {/* Top bar */}
      <header
        className="h-12 flex items-center justify-between px-4 shrink-0 z-20"
        style={{ borderBottom: '1px solid hsl(220 15% 15%)', background: 'hsl(220 20% 9%)' }}
      >
        <div className="flex items-center gap-3">
          <Link to="/studio-ai" className="flex items-center gap-1 text-sm hover:opacity-80 transition-opacity" style={{ color: 'hsl(220 10% 60%)' }}>
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-sm font-semibold" style={{ color: 'hsl(0 0% 90%)' }}>
            Face & Skin Enhancer
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {resultImage && (
            <>
              <Button size="sm" variant="ghost" onClick={handleDownload} className="h-8 w-8 p-0" style={{ color: 'hsl(220 10% 60%)' }}>
                <Download className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResultImage(null)} className="h-8 w-8 p-0" style={{ color: 'hsl(220 10% 60%)' }}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <aside
          className="w-[280px] shrink-0 overflow-y-auto flex flex-col"
          style={{ background: 'hsl(220 20% 9%)', borderRight: '1px solid hsl(220 15% 15%)' }}
        >
          <div className="p-4 space-y-4 flex-1">
            {/* Add Image */}
            <label
              className="flex flex-col items-center justify-center w-full h-[140px] rounded-xl border border-dashed cursor-pointer transition-colors"
              style={{ borderColor: 'hsl(220 15% 20%)', background: 'hsl(220 18% 11%)' }}
            >
              <ImagePlus className="w-8 h-8 mb-2" style={{ color: 'hsl(220 10% 50%)' }} />
              <span className="text-sm font-medium" style={{ color: 'hsl(220 10% 70%)' }}>
                {originalImage ? 'Change Image' : 'Add Image'}
              </span>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
            </label>

            {/* Enhance button */}
            <Button
              className="w-full h-10 rounded-lg font-medium text-sm gap-2"
              onClick={handleEnhance}
              disabled={!originalImage || ai.isProcessing || ai.backend === 'canvas-only'}
              style={{
                background: 'hsl(220 18% 15%)',
                color: ai.isProcessing ? 'hsl(220 10% 40%)' : 'hsl(220 10% 60%)',
                border: '1px solid hsl(220 15% 18%)',
              }}
            >
              {ai.isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <><ScanFace className="w-4 h-4" /> Enhance</>
              )}
            </Button>

            {ai.isProcessing && ai.processingProgress > 0 && (
              <Progress value={ai.processingProgress} className="h-1" />
            )}

            {/* Settings header */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'hsl(0 0% 85%)' }}>
                  Enhance Settings
                </span>
                <button
                  onClick={() => { setBlendStrength(50); setResultImage(null); }}
                  className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                  style={{ color: 'hsl(220 10% 50%)' }}
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>

              {/* Enhancement Strength */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ color: 'hsl(0 0% 85%)' }}>Enhancement Strength</label>
                  <span className="text-[11px] tabular-nums" style={{ color: 'hsl(220 10% 45%)' }}>{blendStrength}%</span>
                </div>
                <Slider value={[blendStrength]} onValueChange={([v]) => setBlendStrength(v)} min={0} max={100} step={5} />
                <div className="flex justify-between text-[10px] mt-1.5" style={{ color: 'hsl(220 10% 40%)' }}>
                  <span>Natural</span><span>Full Restoration</span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px my-3" style={{ background: 'hsl(220 15% 15%)' }} />

              {/* Face info */}
              {ai.facesDetected > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <ScanFace className="w-4 h-4" style={{ color: 'hsl(330 70% 60%)' }} />
                  <span className="text-xs" style={{ color: 'hsl(220 10% 70%)' }}>
                    {ai.facesDetected} face(s) detected
                  </span>
                </div>
              )}

              {/* Engine status */}
              <div>
                <p className="text-[11px] mb-1" style={{ color: 'hsl(220 10% 40%)' }}>Engine</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: ai.gpuAccelerated ? 'hsl(140 70% 50%)' : 'hsl(220 10% 30%)' }} />
                  <span className="text-xs" style={{ color: 'hsl(220 10% 60%)' }}>{ai.backend.toUpperCase()}</span>
                </div>
                {ai.modelStatus === 'downloading' && (
                  <div className="mt-2 space-y-1">
                    <Progress value={ai.downloadProgress} className="h-1" />
                    <p className="text-[10px]" style={{ color: 'hsl(220 10% 40%)' }}>Downloading GFPGAN…</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Center area */}
        <div className="flex-1 flex flex-col min-h-0" style={{ background: 'hsl(220 15% 11%)' }}>
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-8 gap-6 min-h-0">
            {!originalImage && !resultImage ? (
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(0 0% 90%)' }}>
                  Add an Image to get started
                </h2>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg cursor-pointer text-sm font-medium transition-colors"
                  style={{ background: 'hsl(220 18% 15%)', color: 'hsl(220 10% 70%)', border: '1px solid hsl(220 15% 20%)' }}
                >
                  <Upload className="w-4 h-4" /> Add an image
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                </label>
              </div>
            ) : (
              <>
                {originalImage && (
                  <div className="relative max-w-[700px] w-full">
                    <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded text-xs font-semibold"
                      style={{ background: 'hsl(140 60% 45%)', color: '#fff' }}>
                      Input
                    </span>
                    <img src={originalImage} alt="Input" className="w-full rounded-lg object-contain"
                      style={{ maxHeight: resultImage ? '280px' : '450px', background: 'hsl(220 15% 8%)' }} />
                  </div>
                )}

                {ai.isProcessing && (
                  <div className="text-center py-6">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'hsl(330 70% 60%)' }} />
                    <p className="text-sm" style={{ color: 'hsl(220 10% 60%)' }}>{ai.statusMessage}</p>
                    {ai.processingProgress > 0 && <p className="text-xs mt-1" style={{ color: 'hsl(220 10% 40%)' }}>{ai.processingProgress}%</p>}
                  </div>
                )}

                {resultImage && (
                  <div className="relative max-w-[900px] w-full">
                    <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded text-xs font-semibold"
                      style={{ background: 'hsl(220 80% 55%)', color: '#fff' }}>
                      Output
                    </span>
                    <img src={resultImage} alt="Output" className="w-full rounded-lg object-contain"
                      style={{ maxHeight: '450px', background: 'hsl(220 15% 8%)' }} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom thumbnail strip */}
          <div
            className="h-[72px] flex items-center gap-2 px-4 overflow-x-auto shrink-0 scrollbar-hide"
            style={{ borderTop: '1px solid hsl(220 15% 15%)', background: 'hsl(220 20% 9%)' }}
          >
            {history.length > 0 ? (
              history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => restoreHistory(entry)}
                  className="h-[52px] w-[52px] shrink-0 rounded-lg overflow-hidden transition-all hover:ring-2"
                  style={{ border: '2px solid hsl(220 15% 18%)', '--tw-ring-color': 'hsl(330 70% 60%)' } as React.CSSProperties}
                  title={entry.label}
                >
                  <img src={entry.thumb} alt={entry.label} className="w-full h-full object-cover" />
                </button>
              ))
            ) : (
              <span className="text-xs mx-auto" style={{ color: 'hsl(220 10% 30%)' }}>
                Recent results will appear here
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
