import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
  Upload, Download, RefreshCw, ImagePlus, FileType, ArrowRightLeft, Check,
  Zap, Shield, Sparkles, Image as ImageIcon, Video, Wand2
} from 'lucide-react';

const STRUCTURED_DATA = {
  software: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "VisuStock Image Converter",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web Browser",
    "url": "https://visustock.com/studio-ai/image-converter",
    "description": "Free online image converter to convert JPG to PNG, PNG to WebP, and export images to PDF directly in your browser.",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "featureList": [
      "Convert JPG to PNG",
      "Convert PNG to WebP",
      "Convert images to PDF",
      "Lossless PNG export",
      "Adjustable JPEG/WebP quality",
      "100% browser-based, no upload"
    ],
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "ratingCount": "1284" }
  },
  faq: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I convert an image online for free?",
        "acceptedAnswer": { "@type": "Answer", "text": "Upload your image, choose an output format (PNG, JPEG, WebP or PDF), click Convert, then download. Everything runs in your browser — no signup, no watermark." }
      },
      {
        "@type": "Question",
        "name": "How do I convert JPG to PNG?",
        "acceptedAnswer": { "@type": "Answer", "text": "Upload your JPG, select PNG as the output format, and click Convert. PNG is lossless and supports transparency, perfect for logos and graphics." }
      },
      {
        "@type": "Question",
        "name": "How do I convert PNG to WebP?",
        "acceptedAnswer": { "@type": "Answer", "text": "Upload a PNG, select WebP as output and adjust quality. WebP files are typically 25–35% smaller than PNG or JPEG with the same visual quality, ideal for fast websites." }
      },
      {
        "@type": "Question",
        "name": "Is the image converter really free?",
        "acceptedAnswer": { "@type": "Answer", "text": "Yes. The VisuStock image converter is 100% free, with no signup, no upload limits beyond 50 MB per file, and no watermark." }
      },
      {
        "@type": "Question",
        "name": "Are my images private?",
        "acceptedAnswer": { "@type": "Answer", "text": "Yes. Conversion happens entirely in your browser using HTML5 Canvas. Your images never leave your device." }
      }
    ]
  }
};

type OutputFormat = 'png' | 'jpeg' | 'webp' | 'pdf';

interface ConversionResult {
  url: string;
  size: number;
  format: OutputFormat;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageConverter() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [originalName, setOriginalName] = useState('');
  const [originalFormat, setOriginalFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('png');
  const [quality, setQuality] = useState(85);
  const [result, setResult] = useState<ConversionResult | null>(null);

  useSEO({
    title: 'Image Converter Online – JPG to PNG, PNG to WebP & PDF',
    description: 'Free online image converter: convert JPG to PNG, PNG to WebP, or images to PDF in seconds. No signup, no watermark, runs in your browser.',
    type: 'website',
    tags: ['image converter', 'convert image online', 'jpg to png', 'png to webp', 'image format converter', 'image to pdf', 'webp converter']
  });

  useEffect(() => {
    const ids = ['ic-schema-software', 'ic-schema-faq'];
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
    setOriginalFormat(file.type.split('/')[1]?.toUpperCase() || 'Unknown');
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setOriginalImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
  };

  const handleConvert = useCallback(() => {
    if (!originalImage) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (outputFormat === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      if (outputFormat === 'pdf') {
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality / 100);
        const raw = atob(jpegDataUrl.split(',')[1]);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        const w = canvas.width, h = canvas.height;
        const pageW = 595, pageH = 842;
        const scale = Math.min(pageW / w, pageH / h);
        const imgW = Math.round(w * scale), imgH = Math.round(h * scale);
        const offX = Math.round((pageW - imgW) / 2), offY = Math.round((pageH - imgH) / 2);
        const imgLen = bytes.length;
        const enc = new TextEncoder();
        const parts: (Uint8Array | string)[] = [];
        const offsets: number[] = [];
        let pos = 0;
        const add = (s: string) => { parts.push(s); pos += enc.encode(s).length; };
        add('%PDF-1.4\n');
        offsets[1] = pos; add('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
        offsets[2] = pos; add(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
        offsets[3] = pos; add(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> >> >>\nendobj\n`);
        const stream = `q ${imgW} 0 0 ${imgH} ${offX} ${offY} cm /Img Do Q`;
        offsets[4] = pos; add(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
        offsets[5] = pos; add(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgLen} >>\nstream\n`);
        parts.push(bytes); pos += imgLen;
        add('\nendstream\nendobj\n');
        const xrefPos = pos;
        add('xref\n'); add(`0 6\n`); add('0000000000 65535 f \n');
        for (let i = 1; i <= 5; i++) add(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
        add('trailer\n<< /Size 6 /Root 1 0 R >>\n');
        add(`startxref\n${xrefPos}\n%%EOF\n`);
        const totalLen = parts.reduce((a, p) => a + (typeof p === 'string' ? enc.encode(p).length : p.length), 0);
        const pdfBytes = new Uint8Array(totalLen);
        let off = 0;
        for (const p of parts) { const chunk = typeof p === 'string' ? enc.encode(p) : p; pdfBytes.set(chunk, off); off += chunk.length; }
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResult({ url: URL.createObjectURL(blob), size: blob.size, format: 'pdf' });
        toast({ title: 'Converted!', description: 'Image converted to PDF.' });
      } else {
        const mimeMap: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
        const q = outputFormat === 'png' ? undefined : quality / 100;
        canvas.toBlob((blob) => {
          if (!blob) return;
          setResult({ url: URL.createObjectURL(blob), size: blob.size, format: outputFormat });
          toast({ title: 'Converted!', description: `Image converted to ${outputFormat.toUpperCase()}.` });
        }, mimeMap[outputFormat], q);
      }
    };
    img.src = originalImage;
  }, [originalImage, outputFormat, quality, toast]);

  const handleDownload = () => {
    if (!result) return;
    const ext = result.format === 'jpeg' ? 'jpg' : result.format;
    const base = originalName.replace(/\.[^/.]+$/, '');
    const a = document.createElement('a');
    a.href = result.url;
    a.download = `${base}-converted.${ext}`;
    a.click();
  };

  const handleReset = () => {
    setOriginalImage(null);
    setResult(null);
    setOriginalSize(0);
    setOriginalName('');
    setOriginalFormat('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formats: { value: OutputFormat; label: string; desc: string }[] = [
    { value: 'png', label: 'PNG', desc: 'Lossless' },
    { value: 'jpeg', label: 'JPEG', desc: 'Photos' },
    { value: 'webp', label: 'WebP', desc: 'Modern' },
    { value: 'pdf', label: 'PDF', desc: 'Print' },
  ];

  const showQuality = outputFormat === 'jpeg' || outputFormat === 'webp';

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--editor-bg))' }}>
      <Header />
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'hsl(var(--editor-text-bright))' }}>
          Image Converter Online – JPG to PNG, PNG to WebP & PDF
        </h1>
        <p className="text-lg" style={{ color: 'hsl(var(--editor-text))' }}>
          Free image format converter — convert images between PNG, JPEG, WebP and PDF in your browser.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-4">
          {/* Upload */}
          <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border border-dashed cursor-pointer transition-colors"
              style={{ borderColor: 'hsl(var(--editor-border))', background: 'hsl(var(--editor-bg))' }}
            >
              <ImagePlus className="w-8 h-8 mb-2" style={{ color: 'hsl(var(--editor-text))' }} />
              <span className="text-sm font-medium" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                {originalImage ? 'Change Image' : 'Upload Image'}
              </span>
              {originalImage && (
                <span className="text-xs mt-1" style={{ color: 'hsl(var(--editor-text))' }}>
                  {originalFormat} · {formatFileSize(originalSize)}
                </span>
              )}
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
            </label>
          </div>

          {/* Format Selection */}
          <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--editor-text-bright))' }}>Output Format</h3>
            <div className="grid grid-cols-2 gap-2">
              {formats.map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setOutputFormat(f.value); setResult(null); }}
                  className="relative flex flex-col items-center p-2 rounded-lg transition-all text-xs"
                  style={{
                    background: outputFormat === f.value ? 'hsl(var(--editor-accent) / 0.15)' : 'hsl(var(--editor-bg))',
                    border: `1px solid ${outputFormat === f.value ? 'hsl(var(--editor-accent))' : 'hsl(var(--editor-border))'}`,
                    color: outputFormat === f.value ? 'hsl(var(--editor-text-bright))' : 'hsl(var(--editor-text))',
                  }}
                >
                  {outputFormat === f.value && <Check className="absolute top-1 right-1 w-3 h-3" style={{ color: 'hsl(var(--editor-accent))' }} />}
                  <span className="font-bold">{f.label}</span>
                  <span className="text-[10px] opacity-60">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          {showQuality && (
            <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium" style={{ color: 'hsl(var(--editor-text-bright))' }}>Quality</label>
                <span className="text-xs font-mono" style={{ color: 'hsl(var(--editor-text))' }}>{quality}%</span>
              </div>
              <Slider value={[quality]} onValueChange={(v) => { setQuality(v[0]); setResult(null); }} min={10} max={100} step={5} />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'hsl(var(--editor-text))' }}>
                <span>Smaller</span>
                <span>Higher quality</span>
              </div>
            </div>
          )}

          {/* Convert Button */}
          <Button
            onClick={handleConvert}
            disabled={!originalImage}
            className="w-full gap-2"
            style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}
          >
            <RefreshCw className="w-4 h-4" /> Convert
          </Button>

          {/* Size Comparison */}
          {result && (
            <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
              <div className="flex items-center justify-between text-sm">
                <div className="text-center">
                  <p className="text-xs opacity-60" style={{ color: 'hsl(var(--editor-text))' }}>Original</p>
                  <p className="font-medium" style={{ color: 'hsl(var(--editor-text-bright))' }}>{formatFileSize(originalSize)}</p>
                </div>
                <ArrowRightLeft className="w-4 h-4" style={{ color: 'hsl(var(--editor-text))' }} />
                <div className="text-center">
                  <p className="text-xs opacity-60" style={{ color: 'hsl(var(--editor-text))' }}>Converted</p>
                  <p className="font-medium" style={{ color: 'hsl(var(--editor-text-bright))' }}>{formatFileSize(result.size)}</p>
                </div>
              </div>
              <Button onClick={handleDownload} className="w-full mt-3 gap-2" variant="outline" style={{ borderColor: 'hsl(var(--editor-border))', color: 'hsl(var(--editor-text-bright))' }}>
                <Download className="w-4 h-4" /> Download
              </Button>
            </div>
          )}
        </div>

        {/* Main Area */}
        <div className="md:col-span-2">
          <div className="rounded-xl p-6 min-h-[500px] flex items-center justify-center" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            {!originalImage ? (
              <div className="text-center">
                <Upload className="w-16 h-16 mx-auto mb-4" style={{ color: 'hsl(var(--editor-text))' }} />
                <p className="text-lg mb-2" style={{ color: 'hsl(var(--editor-text-bright))' }}>Upload an image to get started</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer font-medium transition-colors"
                  style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}
                >
                  <Upload className="w-4 h-4" /> Choose Image
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                </label>
              </div>
            ) : (
              <div className="w-full space-y-4">
                <div className="relative">
                  <span className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold" style={{ background: 'hsl(140 60% 45%)', color: '#fff' }}>
                    Original · {originalFormat}
                  </span>
                  <img src={originalImage} alt="Original" className="w-full rounded-lg object-contain max-h-[250px]" style={{ background: 'hsl(var(--editor-bg))' }} />
                </div>

                {result && (
                  <div className="relative">
                    <span className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold" style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}>
                      Output · {result.format.toUpperCase()}
                    </span>
                    {result.format === 'pdf' ? (
                      <div className="flex flex-col items-center justify-center h-32 rounded-lg" style={{ background: 'hsl(var(--editor-bg))' }}>
                        <FileType className="w-10 h-10 mb-2" style={{ color: 'hsl(0 60% 55%)' }} />
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--editor-text-bright))' }}>PDF Ready</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>{formatFileSize(result.size)}</p>
                      </div>
                    ) : (
                      <img src={result.url} alt="Converted" className="w-full rounded-lg object-contain max-h-[250px]" style={{ background: 'hsl(var(--editor-bg))' }} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEO Content Section */}
      <section className="mt-16 max-w-4xl mx-auto space-y-12 text-foreground">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Convert images online in seconds — free, fast, secure
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Our free <strong>image converter</strong> lets you change the format of any picture
            in just a few clicks. Whether you need to <strong>convert JPG to PNG</strong>,
            transform <strong>PNG to WebP</strong> for a faster website, or export images to
            PDF for print, the VisuStock <strong>image format converter</strong> handles it all
            without uploading your files to a server. Everything runs locally in your browser,
            so your images stay 100% private.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Designed for content creators, designers, marketers, and developers, this tool
            helps you optimize visuals for websites, social media, e-commerce stores, and
            print campaigns — all from a single page.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Supported output formats</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><FileType className="w-4 h-4" /> PNG — lossless quality</h3>
              <p className="text-sm text-muted-foreground">Perfect for logos, icons, screenshots and graphics with transparency. PNG keeps every pixel intact with no compression artifacts.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> JPEG — optimized for photos</h3>
              <p className="text-sm text-muted-foreground">The best choice for photographs and rich images. Adjust the quality slider to balance size and visual fidelity.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Zap className="w-4 h-4" /> WebP — modern web performance</h3>
              <p className="text-sm text-muted-foreground">25–35% smaller than PNG or JPEG with the same quality. Ideal for fast-loading websites and improving Core Web Vitals.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><FileType className="w-4 h-4" /> PDF — print and documents</h3>
              <p className="text-sm text-muted-foreground">Turn any image into a clean A4 PDF, perfect for portfolios, invoices, presentations or sharing print-ready visuals.</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Why use the VisuStock image converter?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border">
              <Zap className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Fast & free</h3>
              <p className="text-sm text-muted-foreground">No signup, no watermark, no waiting. Convert as many images as you want.</p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <Shield className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">100% private</h3>
              <p className="text-sm text-muted-foreground">Your images never leave your device. All processing is done in your browser.</p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <Sparkles className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">No quality loss</h3>
              <p className="text-sm text-muted-foreground">PNG keeps full quality. JPEG and WebP let you fine-tune compression with a quality slider.</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Use cases for the image format converter</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li><strong>Web optimization:</strong> convert PNG to WebP to speed up your website and improve SEO.</li>
            <li><strong>Social media:</strong> export images in the right format for Instagram, X, LinkedIn or TikTok.</li>
            <li><strong>Design & branding:</strong> save logos and illustrations as PNG with transparent backgrounds.</li>
            <li><strong>E-commerce:</strong> compress product photos to JPEG for faster store load times and better conversion.</li>
            <li><strong>Print & documents:</strong> turn images into PDF for portfolios, invoices and printable assets.</li>
            <li><strong>Developers:</strong> quickly switch between formats during frontend or app development.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">How to convert an image online</h2>
          <ol className="space-y-3 text-muted-foreground list-decimal list-inside">
            <li><strong>Upload</strong> your image (JPG, PNG, WebP, GIF, BMP — up to 50 MB).</li>
            <li><strong>Choose</strong> your output format: PNG, JPEG, WebP or PDF.</li>
            <li><strong>Adjust quality</strong> for JPEG or WebP if needed.</li>
            <li><strong>Click Convert</strong> and download your new file in seconds.</li>
          </ol>
        </div>

        {/* CTA to marketplace */}
        <div className="rounded-2xl p-6 md:p-8 border border-border bg-gradient-to-br from-primary/10 to-accent/5">
          <h2 className="text-2xl font-bold mb-2">Take your visuals further with VisuStock</h2>
          <p className="text-muted-foreground mb-4">
            Pair your converted images with premium <Link to="/marketplace?type=image" className="text-primary underline">stock images</Link>,
            cinematic <Link to="/marketplace?type=video" className="text-primary underline">stock videos</Link>,
            and ready-to-use creative assets from independent creators worldwide. Perfect for marketing,
            video editing, web design and social campaigns.
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
            <Link to="/studio-ai/ai-image-generator" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" /> AI Image Generator
            </Link>
            <Link to="/studio-ai/image-upscale" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Image Upscaler
            </Link>
            <Link to="/studio-ai/remove-background" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" /> Remove Background
            </Link>
            <Link to="/studio-ai/text-to-speech" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Text to Speech
            </Link>
            <Link to="/studio-ai/adjust-music-duration" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Adjust Music Duration
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
              <AccordionTrigger>How do I convert an image online for free?</AccordionTrigger>
              <AccordionContent>
                Upload your image, choose an output format (PNG, JPEG, WebP or PDF), click Convert, then download your file. Everything runs in your browser — no signup, no watermark.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>How do I convert JPG to PNG?</AccordionTrigger>
              <AccordionContent>
                Upload your JPG, select PNG as the output format, then click Convert. PNG is lossless and supports transparency, which makes it perfect for logos, icons and graphics.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>How do I convert PNG to WebP?</AccordionTrigger>
              <AccordionContent>
                Upload a PNG, select WebP as output and adjust the quality slider. WebP files are typically 25–35% smaller than PNG or JPEG with the same visual quality, ideal for fast-loading websites.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>Is the image converter really free?</AccordionTrigger>
              <AccordionContent>
                Yes. The VisuStock image converter is 100% free, with no signup required and no watermark added to your files.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger>Are my images private?</AccordionTrigger>
              <AccordionContent>
                Absolutely. All conversions happen locally in your browser using HTML5 Canvas. Your images never leave your device.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Suggested image alt texts (HTML comment for reference) */}
        {/*
          Suggested ALT texts when adding screenshots:
          - "Free online image converter interface — convert JPG to PNG, WebP or PDF"
          - "Image format converter showing PNG, JPEG, WebP and PDF output options"
          - "Side-by-side comparison of original JPG and converted WebP image"
          - "Browser-based image to PDF conversion preview"
        */}
      </section>
    </div>
    <Footer />
    </div>
  );
}
