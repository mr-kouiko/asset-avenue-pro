import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { useESRGANUpscaler, type UpscaleMode } from '@/hooks/useESRGANUpscaler';
import { useGFPGANEnhancer } from '@/hooks/useGFPGANEnhancer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Upload, Download, Loader2, ImagePlus,
  Zap, Brain, ScanFace, ChevronLeft, RotateCcw,
  Shield, Sparkles, Image as ImageIcon, Video, Scissors, Wand2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const STRUCTURED_DATA = {
  software: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "VisuStock AI Image Upscaler",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web Browser",
    "url": "https://visustock.com/ai-upscaler",
    "description": "Free AI image upscaler. Upscale images 2× or 4× online with Real-ESRGAN, enhance details, remove noise and increase resolution without losing quality.",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "featureList": [
      "AI upscaling 2× and 4×",
      "Real-ESRGAN deep-learning model",
      "Detail and texture enhancement",
      "Automatic denoise and deblur",
      "Optional GFPGAN face restoration",
      "100% browser-based, no upload"
    ],
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "ratingCount": "1876" }
  },
  faq: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "How does the AI image upscaler work?", "acceptedAnswer": { "@type": "Answer", "text": "Instead of just resizing pixels, our AI image upscaler uses a deep-learning model (Real-ESRGAN) to reconstruct missing details, sharpen edges and remove noise, producing a high-resolution result that looks natural." } },
      { "@type": "Question", "name": "Can I upscale an image 2x or 4x for free?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The VisuStock AI upscaler is 100% free and supports 2× and 4× upscaling directly in your browser, with no signup and no watermark." } },
      { "@type": "Question", "name": "Will upscaling reduce image quality?", "acceptedAnswer": { "@type": "Answer", "text": "No. AI upscaling is the opposite of basic resizing — it adds plausible detail, sharpens edges and removes noise, so your output looks crisper than the original at higher resolution." } },
      { "@type": "Question", "name": "What image formats are supported?", "acceptedAnswer": { "@type": "Answer", "text": "You can upload JPG, PNG and WebP images up to 25 MB. The upscaled output is exported as a high-quality PNG." } },
      { "@type": "Question", "name": "Is my image data private?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The AI runs entirely in your browser using WebGPU when available — your images never leave your device." } }
    ]
  }
};

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

  const handleUpscale = useCallback(async () => {
    if (!originalImage) return;
    setResultImage(null);

    let result = await esrgan.upscale(originalImage, scale, mode, sharpness);
    if (!result) {
      toast({ title: 'Error', description: 'Upscale failed.', variant: 'destructive' });
      return;
    }

    if (faceEnhance && result) {
      const faceResult = await gfpgan.enhance(result, faceStrength / 100);
      if (faceResult) result = faceResult;
    }

    setResultImage(result);
    toast({ title: 'Done!' });

    setHistory((h) => {
      const entry: HistoryEntry = {
        id: ++historyCounter,
        thumb: result!,
        full: result!,
        original: originalImage!,
        label: `${scale}× ${mode}${faceEnhance ? ' +face' : ''}`,
      };
      return [entry, ...h].slice(0, 12);
    });
  }, [originalImage, scale, mode, sharpness, faceEnhance, faceStrength, esrgan, gfpgan, toast]);

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = fileName.replace(/\.[^/.]+$/, '') + `-${scale}x-upscaled.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const restoreHistory = (entry: HistoryEntry) => {
    setOriginalImage(entry.original);
    setResultImage(entry.full);
  };

  const outputW = originalDims ? originalDims.w * scale : 0;
  const outputH = originalDims ? originalDims.h * scale : 0;

  const statusMsg = esrgan.isProcessing
    ? esrgan.statusMessage
    : gfpgan.isProcessing
      ? gfpgan.statusMessage
      : '';

  const progress = esrgan.isProcessing
    ? esrgan.processingProgress
    : gfpgan.isProcessing
      ? gfpgan.processingProgress
      : 0;

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
            Universal Upscaler
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {resultImage && (
            <>
              <Button size="sm" variant="ghost" onClick={handleDownload} className="h-8 w-8 p-0" style={{ color: 'hsl(220 10% 60%)' }}>
                <Download className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setResultImage(null); }} className="h-8 w-8 p-0" style={{ color: 'hsl(220 10% 60%)' }}>
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
            {/* Add Image area */}
            <label
              className="flex flex-col items-center justify-center w-full h-[140px] rounded-xl border border-dashed cursor-pointer transition-colors"
              style={{
                borderColor: 'hsl(220 15% 20%)',
                background: 'hsl(220 18% 11%)',
              }}
            >
              <ImagePlus className="w-8 h-8 mb-2" style={{ color: 'hsl(220 10% 50%)' }} />
              <span className="text-sm font-medium" style={{ color: 'hsl(220 10% 70%)' }}>
                {originalImage ? 'Change Image' : 'Add Image'}
              </span>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
            </label>

            {/* Upscale button */}
            <Button
              className="w-full h-10 rounded-lg font-medium text-sm gap-2"
              onClick={handleUpscale}
              disabled={!originalImage || isProcessing}
              style={{
                background: isProcessing ? 'hsl(220 18% 15%)' : 'hsl(220 18% 15%)',
                color: isProcessing ? 'hsl(220 10% 40%)' : 'hsl(220 10% 60%)',
                border: '1px solid hsl(220 15% 18%)',
              }}
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <>Upscale</>
              )}
            </Button>

            {isProcessing && progress > 0 && (
              <Progress value={progress} className="h-1" />
            )}

            {/* Divider + Settings header */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'hsl(0 0% 85%)' }}>
                  Upscale Settings
                </span>
                <button
                  onClick={() => { setScale(2); setSharpness(50); setMode('fast'); setFaceEnhance(false); setFaceStrength(50); setResultImage(null); }}
                  className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                  style={{ color: 'hsl(220 10% 50%)' }}
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>

              {/* Upscale Mode */}
              <div className="mb-4">
                <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(0 0% 85%)' }}>
                  Upscale Mode
                </label>
                <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid hsl(220 15% 18%)' }}>
                  <button
                    onClick={() => { setMode('fast'); setResultImage(null); }}
                    className="flex-1 h-9 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    style={{
                      background: mode === 'fast' ? 'hsl(220 18% 18%)' : 'transparent',
                      color: mode === 'fast' ? 'hsl(0 0% 90%)' : 'hsl(220 10% 50%)',
                    }}
                  >
                    <Zap className="w-3.5 h-3.5" /> Fast
                  </button>
                  <button
                    onClick={() => { setMode('ai'); setResultImage(null); }}
                    disabled={esrgan.backend === 'canvas-only'}
                    className="flex-1 h-9 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30"
                    style={{
                      background: mode === 'ai' ? 'hsl(270 50% 30%)' : 'transparent',
                      color: mode === 'ai' ? 'hsl(270 80% 80%)' : 'hsl(220 10% 50%)',
                    }}
                  >
                    <Brain className="w-3.5 h-3.5" /> AI (HD)
                  </button>
                </div>
              </div>

              {/* Upscale Multiplier */}
              <div className="mb-4">
                <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(0 0% 85%)' }}>
                  Upscale Multiplier
                </label>
                <Slider
                  value={[scale]}
                  onValueChange={([v]) => { setScale(v); setResultImage(null); }}
                  min={2} max={4} step={2}
                />
                <div className="flex justify-between text-[11px] mt-1.5" style={{ color: 'hsl(220 10% 45%)' }}>
                  <span>2.0x</span>
                  <span>4.0x</span>
                </div>
                {originalDims && (
                  <p className="text-[11px] mt-1 tabular-nums" style={{ color: 'hsl(220 10% 45%)' }}>
                    {originalDims.w}×{originalDims.h} → {outputW}×{outputH}
                  </p>
                )}
              </div>

              {/* Sharpness */}
              <div className="mb-4" style={{ opacity: mode === 'ai' ? 0.35 : 1 }}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ color: 'hsl(0 0% 85%)' }}>Detail Boost</label>
                  <span className="text-[11px] tabular-nums" style={{ color: 'hsl(220 10% 45%)' }}>{sharpness}%</span>
                </div>
                <Slider
                  value={[sharpness]}
                  onValueChange={([v]) => { setSharpness(v); setResultImage(null); }}
                  min={0} max={100} step={5}
                  disabled={mode === 'ai'}
                />
              </div>

              {/* Divider */}
              <div className="h-px my-3" style={{ background: 'hsl(220 15% 15%)' }} />

              {/* Face Enhancement */}
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(0 0% 85%)' }}>
                    <ScanFace className="w-3.5 h-3.5" /> Face Enhancement
                  </label>
                  <Switch checked={faceEnhance} onCheckedChange={setFaceEnhance} />
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'hsl(220 10% 40%)' }}>GFPGAN restoration</p>
              </div>

              {faceEnhance && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium" style={{ color: 'hsl(0 0% 85%)' }}>Face Strength</label>
                    <span className="text-[11px] tabular-nums" style={{ color: 'hsl(220 10% 45%)' }}>{faceStrength}%</span>
                  </div>
                  <Slider value={[faceStrength]} onValueChange={([v]) => setFaceStrength(v)} min={0} max={100} step={5} />
                  <div className="flex justify-between text-[10px] mt-1" style={{ color: 'hsl(220 10% 40%)' }}>
                    <span>Natural</span><span>Full</span>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="h-px my-3" style={{ background: 'hsl(220 15% 15%)' }} />

              {/* Engine status */}
              <div>
                <p className="text-[11px] mb-1" style={{ color: 'hsl(220 10% 40%)' }}>Engine</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: esrgan.gpuAccelerated ? 'hsl(140 70% 50%)' : 'hsl(220 10% 30%)' }} />
                  <span className="text-xs" style={{ color: 'hsl(220 10% 60%)' }}>{esrgan.backend.toUpperCase()}</span>
                </div>
                {(esrgan.modelStatus === 'downloading' || gfpgan.modelStatus === 'downloading') && (
                  <div className="mt-2 space-y-1">
                    <Progress value={esrgan.modelStatus === 'downloading' ? esrgan.downloadProgress : gfpgan.downloadProgress} className="h-1" />
                    <p className="text-[10px]" style={{ color: 'hsl(220 10% 40%)' }}>Downloading model…</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Center area */}
        <div className="flex-1 flex flex-col min-h-0" style={{ background: 'hsl(220 15% 11%)' }}>
          {/* Main viewer */}
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-8 gap-6 min-h-0">
            {!originalImage && !resultImage ? (
              /* Empty state */
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
                {/* Input image */}
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

                {/* Processing state */}
                {isProcessing && (
                  <div className="text-center py-6">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'hsl(220 10% 50%)' }} />
                    <p className="text-sm" style={{ color: 'hsl(220 10% 60%)' }}>{statusMsg}</p>
                    {progress > 0 && <p className="text-xs mt-1" style={{ color: 'hsl(220 10% 40%)' }}>{progress}%</p>}
                  </div>
                )}

                {/* Output image */}
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
                  style={{ border: '2px solid hsl(220 15% 18%)', '--tw-ring-color': 'hsl(220 80% 55%)' } as React.CSSProperties}
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
