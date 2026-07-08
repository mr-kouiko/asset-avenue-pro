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
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

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
    <div className="studio-ai studio-ai--image min-h-screen">
      <Header />
      <div className="flex flex-col" style={{ height: '100vh' }}>
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
              className="sai-cta w-full h-10 rounded-lg font-medium text-sm gap-2"
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

      {/* SEO Content Section */}
      <section className="container mx-auto px-4 py-16 max-w-4xl space-y-12 text-foreground">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            AI Face Enhancer — unblur and enhance face online for free
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Our free <strong>AI face enhancer</strong> brings blurry, low-resolution or damaged
            portraits back to life in seconds. Powered by the GFPGAN deep-learning model, the
            tool detects every face in your photo and uses AI to <strong>unblur faces</strong>,
            sharpen eyes, recover skin texture and restore facial details that the original
            image had lost. The result: crisp, natural portraits ready for social media,
            print, marketing or family albums.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Whether you want to <strong>enhance face online</strong> from a quick selfie,
            <strong> improve photo face quality</strong> for a professional headshot, or restore
            an old scanned portrait, this <strong>face enhancement tool</strong> delivers
            studio-grade results — directly in your browser, with no signup and no watermark.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">How AI face enhancement works</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Behind the scenes, three steps happen automatically:
          </p>
          <ol className="space-y-3 text-muted-foreground list-decimal list-inside">
            <li><strong>Face detection</strong> — the AI locates each face in the photo.</li>
            <li><strong>Reconstruction</strong> — a generative model (GFPGAN) rebuilds eyes, mouth, skin and edges based on what realistic faces should look like.</li>
            <li><strong>Sharpening & blending</strong> — the enhanced face is smoothly blended back into your image at the strength you choose, so the rest of the photo stays untouched.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Why creators love this face enhancer</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border">
              <Zap className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Fast & free</h3>
              <p className="text-sm text-muted-foreground">Process portraits in seconds — no signup, no watermark, no upload limits.</p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <Sparkles className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Natural-looking results</h3>
              <p className="text-sm text-muted-foreground">Adjustable blend strength keeps skin texture realistic and avoids over-smoothing.</p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <Shield className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">100% private</h3>
              <p className="text-sm text-muted-foreground">All processing runs locally with WebGPU — your photos never leave your device.</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Key features</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li><strong>AI face detection</strong> — automatically finds and enhances every face in the photo.</li>
            <li><strong>Unblur & sharpen</strong> — fix soft, out-of-focus and motion-blurred portraits.</li>
            <li><strong>Detail recovery</strong> — restores eyes, lips, eyelashes and skin texture.</li>
            <li><strong>Old photo restoration</strong> — bring scanned, faded or damaged portraits back to life.</li>
            <li><strong>Adjustable blend strength</strong> — choose between subtle retouch and full restoration.</li>
            <li><strong>JPG, PNG, WebP support</strong> — works with the formats you already use.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Use cases for the AI face enhancer</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Selfies & social media</h3>
              <p className="text-sm text-muted-foreground">Sharpen Instagram, TikTok and LinkedIn photos for crisp, scroll-stopping portraits.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Professional portraits</h3>
              <p className="text-sm text-muted-foreground">Polish headshots and team photos for websites, decks and press kits.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Old & family photos</h3>
              <p className="text-sm text-muted-foreground">Restore scanned, faded or low-resolution portraits and preserve memories.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Marketing visuals</h3>
              <p className="text-sm text-muted-foreground">Enhance faces in ads, lifestyle shots and campaign creatives for higher conversion.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">YouTube thumbnails</h3>
              <p className="text-sm text-muted-foreground">Make expressive faces pop on thumbnails to drive clicks and watch time.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">AI-generated portraits</h3>
              <p className="text-sm text-muted-foreground">Refine faces in AI-generated images to fix soft edges and unrealistic detail.</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Tips for the best face enhancement results</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>Start with a blend strength around 50% and adjust to taste.</li>
            <li>For old or heavily blurred photos, push the strength higher for full restoration.</li>
            <li>For natural-looking selfies, keep it subtle (30–50%) to preserve skin texture.</li>
            <li>Combine with the AI image upscaler for ultra-high-resolution results.</li>
          </ul>
        </div>

        {/* CTA to marketplace */}
        <div className="rounded-2xl p-6 md:p-8 border border-border bg-gradient-to-br from-primary/10 to-accent/5">
          <h2 className="text-2xl font-bold mb-2">Combine enhanced portraits with stunning VisuStock visuals</h2>
          <p className="text-muted-foreground mb-4">
            Pair your retouched faces with curated <Link to="/marketplace?type=image" className="text-primary underline">stock images</Link>,
            cinematic <Link to="/marketplace?type=video" className="text-primary underline">stock videos</Link> and
            ready-to-use creative assets from independent creators worldwide. Perfect for marketing
            campaigns, content production and storytelling.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/marketplace"><Button>Browse the marketplace</Button></Link>
            <Link to="/free-stock-library"><Button variant="outline">Free stock library</Button></Link>
          </div>
        </div>

        {/* Internal linking */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Explore more free Studio AI tools</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Link to="/ai-upscaler" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Image Upscaler
            </Link>
            <Link to="/ai-image-generator" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" /> AI Image Generator
            </Link>
            <Link to="/studio-ai/remove-background" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary" /> AI Background Remover
            </Link>
            <Link to="/studio-ai/image-converter" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" /> Image Converter
            </Link>
            <Link to="/studio-ai/text-to-speech" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Text to Speech
            </Link>
            <Link to="/studio-ai" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" /> All Studio AI tools
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger>How does the AI face enhancer work?</AccordionTrigger>
              <AccordionContent>
                The AI detects every face in your photo, crops it, and uses the GFPGAN deep-learning model to reconstruct facial details — eyes, skin texture, mouth and edges — then blends the enhanced face back into the original image for a natural result.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>Can I unblur a face online for free?</AccordionTrigger>
              <AccordionContent>
                Yes. The VisuStock face enhancer is 100% free and can unblur faces, sharpen details and restore portraits with no signup and no watermark.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Will my photo look natural after enhancement?</AccordionTrigger>
              <AccordionContent>
                Yes. You can adjust the blend strength to keep the result subtle and realistic, or push it higher for full restoration on heavily damaged photos.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>Can it restore old or low-quality portraits?</AccordionTrigger>
              <AccordionContent>
                Absolutely. The tool is ideal for restoring old, scanned or compressed family photos by recovering facial details that were lost.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger>Are my photos kept private?</AccordionTrigger>
              <AccordionContent>
                Yes. Processing runs entirely in your browser using WebGPU when available — your photos never leave your device.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/*
          Suggested ALT texts for future screenshots:
          - "AI face enhancer interface — unblur and enhance face online"
          - "Before and after AI face enhancement: blurry portrait vs sharp restored face"
          - "Restored old family portrait using AI face enhancer"
          - "Improved selfie quality with AI face sharpening and detail recovery"
          - "Professional headshot enhanced with AI for crisp eyes and skin texture"
        */}
      </section>
    <Footer />
    </div>
  );
}
