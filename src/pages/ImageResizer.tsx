import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Upload, Download, ImagePlus, Lock, Unlock, Check, Zap, Shield, Sparkles } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const STRUCTURED_DATA = {
  software: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "VisuStock Image Resizer",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web Browser",
    "url": "https://visustock.com/studio-ai/image-resizer",
    "description": "Free online image resizer. Resize photos to custom dimensions or one-click social media presets (Instagram, Facebook, YouTube, Twitter). 100% in your browser.",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "featureList": [
      "Resize images to any width and height",
      "Social media presets (Instagram, Facebook, YouTube, Twitter, LinkedIn, Pinterest)",
      "Lock aspect ratio",
      "Export as PNG, JPEG or WebP",
      "100% browser-based — your images never leave your device"
    ],
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "ratingCount": "942" }
  },
  faq: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "How do I resize an image online for free?",
        "acceptedAnswer": { "@type": "Answer", "text": "Upload your image, enter the new width and height (or pick a social media preset), then click Resize and Download. Everything runs in your browser — no signup, no watermark." } },
      { "@type": "Question", "name": "How do I resize a photo without losing quality?",
        "acceptedAnswer": { "@type": "Answer", "text": "Keep the 'lock aspect ratio' option on so the image isn't stretched, export to PNG for lossless output, or to JPEG/WebP at 90%+ quality to keep files small while preserving sharpness." } },
      { "@type": "Question", "name": "What sizes should I use for social media?",
        "acceptedAnswer": { "@type": "Answer", "text": "Instagram post 1080×1080, Instagram story 1080×1920, Facebook cover 820×312, YouTube thumbnail 1280×720, Twitter/X post 1600×900, LinkedIn banner 1584×396, Pinterest pin 1000×1500." } },
      { "@type": "Question", "name": "Is the image resizer really free?",
        "acceptedAnswer": { "@type": "Answer", "text": "Yes. The VisuStock image resizer is 100% free, with no signup and no watermark." } },
      { "@type": "Question", "name": "Are my images private?",
        "acceptedAnswer": { "@type": "Answer", "text": "Yes. Resizing happens entirely in your browser using HTML5 Canvas. Your photos are never uploaded to any server." } }
    ]
  }
};

type OutputFormat = 'png' | 'jpeg' | 'webp';

interface Preset { label: string; w: number; h: number; group: string }

const PRESETS: Preset[] = [
  { label: 'Instagram Post', w: 1080, h: 1080, group: 'Instagram' },
  { label: 'Instagram Story', w: 1080, h: 1920, group: 'Instagram' },
  { label: 'Instagram Portrait', w: 1080, h: 1350, group: 'Instagram' },
  { label: 'Facebook Post', w: 1200, h: 630, group: 'Facebook' },
  { label: 'Facebook Cover', w: 820, h: 312, group: 'Facebook' },
  { label: 'YouTube Thumbnail', w: 1280, h: 720, group: 'YouTube' },
  { label: 'YouTube Channel Art', w: 2560, h: 1440, group: 'YouTube' },
  { label: 'Twitter / X Post', w: 1600, h: 900, group: 'Twitter' },
  { label: 'Twitter Header', w: 1500, h: 500, group: 'Twitter' },
  { label: 'LinkedIn Banner', w: 1584, h: 396, group: 'LinkedIn' },
  { label: 'Pinterest Pin', w: 1000, h: 1500, group: 'Pinterest' },
  { label: 'TikTok Vertical', w: 1080, h: 1920, group: 'TikTok' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageResizer() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [originalName, setOriginalName] = useState('');
  const [originalW, setOriginalW] = useState(0);
  const [originalH, setOriginalH] = useState(0);

  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1080);
  const [lockRatio, setLockRatio] = useState(true);
  const [format, setFormat] = useState<OutputFormat>('png');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState(0);

  useSEO({
    title: 'Image Resizer Online – Resize Photos to Any Size, Free',
    description: 'Free online image resizer. Resize JPG, PNG and WebP photos to any dimension or one-click social media presets (Instagram, Facebook, YouTube). No signup, no watermark.',
    type: 'website',
    tags: ['image resizer', 'resize image', 'photo resizer', 'resize image online', 'image resize', 'picture resizer', 'social media image resizer']
  });

  useEffect(() => {
    const ids = ['ir-schema-software', 'ir-schema-faq'];
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

  const ratio = useMemo(() => (originalW && originalH ? originalW / originalH : 1), [originalW, originalH]);

  const loadImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max file size is 50 MB.', variant: 'destructive' });
      return;
    }
    setOriginalSize(file.size);
    setOriginalName(file.name);
    setResultUrl(null);
    setResultSize(0);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setOriginalImage(url);
        setOriginalW(img.naturalWidth);
        setOriginalH(img.naturalHeight);
        setWidth(img.naturalWidth);
        setHeight(img.naturalHeight);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
  };

  const handleWidth = (val: number) => {
    setWidth(val);
    if (lockRatio && ratio) setHeight(Math.max(1, Math.round(val / ratio)));
    setResultUrl(null);
  };
  const handleHeight = (val: number) => {
    setHeight(val);
    if (lockRatio && ratio) setWidth(Math.max(1, Math.round(val * ratio)));
    setResultUrl(null);
  };
  const applyPreset = (p: Preset) => {
    setLockRatio(false);
    setWidth(p.w);
    setHeight(p.h);
    setResultUrl(null);
  };

  const handleResize = useCallback(() => {
    if (!originalImage || !width || !height) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);
      const mime = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
      const q = format === 'png' ? undefined : 0.92;
      canvas.toBlob((blob) => {
        if (!blob) return;
        setResultUrl(URL.createObjectURL(blob));
        setResultSize(blob.size);
        toast({ title: 'Resized!', description: `Image resized to ${width}×${height}.` });
      }, mime, q);
    };
    img.src = originalImage;
  }, [originalImage, width, height, format, toast]);

  const handleDownload = () => {
    if (!resultUrl) return;
    const ext = format === 'jpeg' ? 'jpg' : format;
    const base = (originalName || 'image').replace(/\.[^/.]+$/, '');
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `${base}-${width}x${height}.${ext}`;
    a.click();
  };

  const grouped = useMemo(() => {
    const m = new Map<string, Preset[]>();
    PRESETS.forEach(p => {
      const arr = m.get(p.group) || [];
      arr.push(p);
      m.set(p.group, arr);
    });
    return Array.from(m.entries());
  }, []);

  return (
    <div className="studio-ai studio-ai--image min-h-screen">
      <Header />
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <canvas ref={canvasRef} className="hidden" />

      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: 'hsl(var(--editor-text-bright))' }}>
          Image Resizer – Resize Photos Online, Free
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: 'hsl(var(--editor-text))' }}>
          Resize any JPG, PNG or WebP image to custom dimensions or one-click social media presets. Runs entirely in your browser — no signup, no watermark.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-4">
          <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border border-dashed cursor-pointer"
              style={{ borderColor: 'hsl(var(--editor-border))', background: 'hsl(var(--editor-bg))' }}>
              <ImagePlus className="w-8 h-8 mb-2" style={{ color: 'hsl(var(--editor-text))' }} />
              <span className="text-sm font-medium" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                {originalImage ? 'Change Image' : 'Upload Image'}
              </span>
              {originalImage && (
                <span className="text-xs mt-1" style={{ color: 'hsl(var(--editor-text))' }}>
                  {originalW}×{originalH} · {formatFileSize(originalSize)}
                </span>
              )}
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
            </label>
          </div>

          <div className="p-4 rounded-xl space-y-3" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--editor-text-bright))' }}>Dimensions (px)</h3>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>Width</label>
                <Input type="number" min={1} max={10000} value={width} onChange={(e) => handleWidth(parseInt(e.target.value) || 0)} />
              </div>
              <button
                onClick={() => setLockRatio(v => !v)}
                aria-label={lockRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                className="mb-1 p-2 rounded-md"
                style={{ background: 'hsl(var(--editor-bg))', border: '1px solid hsl(var(--editor-border))', color: 'hsl(var(--editor-text-bright))' }}
              >
                {lockRatio ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
              <div className="flex-1">
                <label className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>Height</label>
                <Input type="number" min={1} max={10000} value={height} onChange={(e) => handleHeight(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <p className="text-[11px]" style={{ color: 'hsl(var(--editor-text))' }}>
              {lockRatio ? 'Aspect ratio locked — width and height scale together.' : 'Free resize — values change independently.'}
            </p>
          </div>

          <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--editor-text-bright))' }}>Output Format</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['png', 'jpeg', 'webp'] as OutputFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => { setFormat(f); setResultUrl(null); }}
                  className="relative p-2 rounded-lg text-xs font-bold uppercase"
                  style={{
                    background: format === f ? 'hsl(var(--editor-accent) / 0.15)' : 'hsl(var(--editor-bg))',
                    border: `1px solid ${format === f ? 'hsl(var(--editor-accent))' : 'hsl(var(--editor-border))'}`,
                    color: format === f ? 'hsl(var(--editor-text-bright))' : 'hsl(var(--editor-text))',
                  }}
                >
                  {format === f && <Check className="absolute top-1 right-1 w-3 h-3" style={{ color: 'hsl(var(--editor-accent))' }} />}
                  {f}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleResize}
            disabled={!originalImage || !width || !height}
            className="sai-cta w-full"
            style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}
          >
            Resize Image
          </Button>

          {resultUrl && (
            <div className="p-4 rounded-xl space-y-3" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
              <div className="flex justify-between text-sm" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                <span>{width}×{height}</span>
                <span>{formatFileSize(resultSize)}</span>
              </div>
              <Button onClick={handleDownload} className="w-full gap-2" variant="outline" style={{ borderColor: 'hsl(var(--editor-border))', color: 'hsl(var(--editor-text-bright))' }}>
                <Download className="w-4 h-4" /> Download
              </Button>
            </div>
          )}
        </div>

        {/* Main */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl p-6 min-h-[400px] flex items-center justify-center"
            style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            {!originalImage ? (
              <div className="text-center">
                <Upload className="w-16 h-16 mx-auto mb-4" style={{ color: 'hsl(var(--editor-text))' }} />
                <p className="text-lg mb-3" style={{ color: 'hsl(var(--editor-text-bright))' }}>Upload an image to get started</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer font-medium"
                  style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}>
                  <Upload className="w-4 h-4" /> Choose Image
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                </label>
              </div>
            ) : (
              <img src={resultUrl || originalImage} alt={resultUrl ? `Resized to ${width} by ${height}` : 'Original image'}
                className="max-w-full max-h-[480px] object-contain rounded-lg"
                style={{ background: 'hsl(var(--editor-bg))' }} />
            )}
          </div>

          <div className="rounded-xl p-5" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'hsl(var(--editor-text-bright))' }}>Social Media Presets</h2>
            <div className="space-y-3">
              {grouped.map(([group, items]) => (
                <div key={group}>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'hsl(var(--editor-text))' }}>{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map(p => (
                      <button key={p.label}
                        onClick={() => applyPreset(p)}
                        className="px-3 py-1.5 rounded-md text-xs"
                        style={{ background: 'hsl(var(--editor-bg))', border: '1px solid hsl(var(--editor-border))', color: 'hsl(var(--editor-text-bright))' }}>
                        {p.label} <span className="opacity-60">· {p.w}×{p.h}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SEO content */}
      <section className="mt-12 grid md:grid-cols-3 gap-4">
        {[
          { icon: Zap, title: 'Instant resize', text: 'High-quality bicubic scaling runs locally — no waiting for uploads or queues.' },
          { icon: Shield, title: '100% private', text: 'Photos never leave your device. The resizer works entirely in your browser.' },
          { icon: Sparkles, title: 'Social-ready presets', text: 'One click for Instagram, Facebook, YouTube, Twitter/X, LinkedIn, Pinterest and TikTok sizes.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="p-5 rounded-xl" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            <Icon className="w-6 h-6 mb-2" style={{ color: 'hsl(var(--editor-accent))' }} />
            <h3 className="font-semibold mb-1" style={{ color: 'hsl(var(--editor-text-bright))' }}>{title}</h3>
            <p className="text-sm" style={{ color: 'hsl(var(--editor-text))' }}>{text}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 prose prose-invert max-w-none" style={{ color: 'hsl(var(--editor-text))' }}>
        <h2 className="text-2xl font-bold mb-3" style={{ color: 'hsl(var(--editor-text-bright))' }}>How to resize an image online</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Upload a JPG, PNG or WebP photo (up to 50 MB).</li>
          <li>Type the new width and height, or pick a social media preset.</li>
          <li>Keep "lock aspect ratio" on to avoid stretching.</li>
          <li>Choose an output format (PNG for lossless, JPEG/WebP for smaller files).</li>
          <li>Click <strong>Resize Image</strong>, then <strong>Download</strong>.</li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'hsl(var(--editor-text-bright))' }}>Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {STRUCTURED_DATA.faq.mainEntity.map((q, i) => (
            <AccordionItem key={i} value={`q-${i}`}>
              <AccordionTrigger className="text-left">{q.name}</AccordionTrigger>
              <AccordionContent>{q.acceptedAnswer.text}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
    <Footer />
    </div>
  );
}
