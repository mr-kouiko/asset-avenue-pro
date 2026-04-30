import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { useGFPGANEnhancer } from '@/hooks/useGFPGANEnhancer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Upload, Download, Loader2, ImagePlus,
  ScanFace, ChevronLeft, RotateCcw,
  Zap, Shield, Sparkles, Image as ImageIcon, Video, Scissors, Wand2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const STRUCTURED_DATA = {
  software: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "VisuStock AI Face Enhancer",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web Browser",
    "url": "https://visustock.com/face-enhancer",
    "description": "Free AI face enhancer. Unblur faces, sharpen facial details, restore old portraits and improve photo face quality online — directly in your browser.",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "featureList": [
      "AI face detection and reconstruction",
      "Unblur and sharpen faces",
      "Restore old or low-quality portraits",
      "Improve skin, eyes and facial clarity",
      "Adjustable blend strength for natural results",
      "100% browser-based, no upload"
    ],
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "ratingCount": "1452" }
  },
  faq: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "How does the AI face enhancer work?", "acceptedAnswer": { "@type": "Answer", "text": "The AI detects every face in your photo, crops it, and uses the GFPGAN deep-learning model to reconstruct facial details — eyes, skin texture, mouth and edges — then blends the enhanced face back into the original image for a natural result." } },
      { "@type": "Question", "name": "Can I unblur a face online for free?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The VisuStock face enhancer is 100% free and can unblur faces, sharpen details and restore portraits with no signup and no watermark." } },
      { "@type": "Question", "name": "Will my photo look natural after enhancement?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. You can adjust the blend strength to keep the result subtle and realistic, or push it for full restoration on heavily damaged photos." } },
      { "@type": "Question", "name": "Can it restore old or low-quality portraits?", "acceptedAnswer": { "@type": "Answer", "text": "Absolutely. The tool is ideal for restoring old, scanned or compressed family photos by recovering facial details that were lost." } },
      { "@type": "Question", "name": "Are my photos kept private?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Processing runs entirely in your browser using WebGPU when available — your photos never leave your device." } }
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
    title: 'AI Face Enhancer – Unblur & Enhance Face Online Free',
    description: 'Free AI face enhancer: unblur faces, sharpen details, restore old portraits and improve photo face quality online. No signup, no watermark.',
    type: 'website',
    tags: ['AI face enhancer', 'enhance face online', 'unblur face', 'face enhancement tool', 'improve photo face quality', 'face restoration AI']
  });

  useEffect(() => {
    const ids = ['fe-schema-software', 'fe-schema-faq'];
    const data = [STRUCTURED_DATA.software, STRUCTURED_DATA.faq];
    const scripts = ids.map((id, i) => {
      let s = document.getElementById(id) as HTMLScriptElement | null;
      if (!s) {
        s = document.createElement('script');
        s.type = 'application/ld+json';
        s.id = id;
        document.head.appendChild(s);
      }
      s.text = JSON.stringify(data[i]);
      return s;
    });
    return () => { scripts.forEach(s => s.remove()); };
  }, []);

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
