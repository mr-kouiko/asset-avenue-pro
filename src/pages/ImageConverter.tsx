import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, Download, RefreshCw, ChevronLeft,
  ImagePlus, FileType, ArrowRightLeft, Check, RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
    title: 'Image Converter - Free Online Format Converter | Studio AI',
    description: 'Convert images between PNG, JPEG, WebP and PDF for free. No upload needed — everything runs in your browser.',
    type: 'website'
  });

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
    <div className="h-screen flex flex-col" style={{ background: 'hsl(var(--editor-bg))' }}>
      <canvas ref={canvasRef} className="hidden" />

      {/* Top bar */}
      <header
        className="h-12 flex items-center justify-between px-4 shrink-0 z-20"
        style={{ borderBottom: '1px solid hsl(var(--editor-border))', background: 'hsl(var(--editor-sidebar))' }}
      >
        <div className="flex items-center gap-3">
          <Link to="/studio-ai" className="flex items-center gap-1 text-sm hover:opacity-80 transition-opacity" style={{ color: 'hsl(var(--editor-text))' }}>
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-sm font-semibold" style={{ color: 'hsl(var(--editor-text-bright))' }}>
            Image Converter
          </h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'hsl(140 60% 45% / 0.2)', color: 'hsl(140 60% 55%)' }}>FREE</span>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <Button size="sm" variant="ghost" onClick={handleDownload} className="h-8 w-8 p-0" style={{ color: 'hsl(var(--editor-text))' }}>
              <Download className="w-4 h-4" />
            </Button>
          )}
          {originalImage && (
            <Button size="sm" variant="ghost" onClick={handleReset} className="h-8 w-8 p-0" style={{ color: 'hsl(var(--editor-text))' }}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <aside
          className="w-[280px] shrink-0 overflow-y-auto flex flex-col"
          style={{ background: 'hsl(var(--editor-sidebar))', borderRight: '1px solid hsl(var(--editor-border))' }}
        >
          <div className="p-4 space-y-4 flex-1">
            {/* Upload area */}
            <label
              className="flex flex-col items-center justify-center w-full h-[140px] rounded-xl border border-dashed cursor-pointer transition-colors"
              style={{ borderColor: 'hsl(var(--editor-border))', background: 'hsl(var(--editor-bg))' }}
            >
              <ImagePlus className="w-8 h-8 mb-2" style={{ color: 'hsl(var(--editor-text))' }} />
              <span className="text-sm font-medium" style={{ color: 'hsl(var(--editor-text))' }}>
                {originalImage ? 'Change Image' : 'Add Image'}
              </span>
              {originalImage && (
                <span className="text-[10px] mt-1" style={{ color: 'hsl(var(--editor-text))' }}>
                  {originalFormat} · {formatFileSize(originalSize)}
                </span>
              )}
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
            </label>

            {/* Output Format */}
            <div>
              <span className="text-xs font-semibold tracking-wide uppercase block mb-2" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                Output Format
              </span>
              <div className="grid grid-cols-2 gap-2">
                {formats.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => { setOutputFormat(f.value); setResult(null); }}
                    className="relative flex flex-col items-center p-3 rounded-lg transition-all text-xs"
                    style={{
                      background: outputFormat === f.value ? 'hsl(var(--editor-accent) / 0.15)' : 'hsl(var(--editor-bg))',
                      border: `1px solid ${outputFormat === f.value ? 'hsl(var(--editor-accent))' : 'hsl(var(--editor-border))'}`,
                      color: outputFormat === f.value ? 'hsl(var(--editor-text-bright))' : 'hsl(var(--editor-text))',
                    }}
                  >
                    {outputFormat === f.value && <Check className="absolute top-1.5 right-1.5 w-3 h-3" style={{ color: 'hsl(var(--editor-accent))' }} />}
                    <span className="font-bold">{f.label}</span>
                    <span className="text-[10px] opacity-60">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality slider */}
            {showQuality && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium" style={{ color: 'hsl(var(--editor-text))' }}>Quality</label>
                  <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--editor-text))' }}>{quality}%</span>
                </div>
                <Slider
                  value={[quality]}
                  onValueChange={(v) => { setQuality(v[0]); setResult(null); }}
                  min={10} max={100} step={5}
                />
                <div className="flex justify-between text-[9px] opacity-40" style={{ color: 'hsl(var(--editor-text))' }}>
                  <span>Smaller</span><span>Higher quality</span>
                </div>
              </div>
            )}

            {/* Size comparison */}
            {result && (
              <div className="flex items-center justify-between p-2.5 rounded-lg text-[11px]" style={{ background: 'hsl(var(--editor-bg))', border: '1px solid hsl(var(--editor-border))' }}>
                <div className="text-center">
                  <p className="opacity-50" style={{ color: 'hsl(var(--editor-text))' }}>Original</p>
                  <p className="font-medium" style={{ color: 'hsl(var(--editor-text-bright))' }}>{formatFileSize(originalSize)}</p>
                </div>
                <ArrowRightLeft className="w-3.5 h-3.5" style={{ color: 'hsl(var(--editor-text))' }} />
                <div className="text-center">
                  <p className="opacity-50" style={{ color: 'hsl(var(--editor-text))' }}>Converted</p>
                  <p className="font-medium" style={{ color: 'hsl(var(--editor-text-bright))' }}>{formatFileSize(result.size)}</p>
                </div>
                <div className="text-center">
                  <p className="opacity-50" style={{ color: 'hsl(var(--editor-text))' }}>Δ</p>
                  <p className="font-medium" style={{ color: result.size < originalSize ? 'hsl(140 60% 55%)' : 'hsl(40 80% 60%)' }}>
                    {result.size < originalSize ? '-' : '+'}{Math.abs(Math.round((1 - result.size / originalSize) * 100))}%
                  </p>
                </div>
              </div>
            )}

            {/* Convert button */}
            <Button
              className="w-full h-10 rounded-lg font-medium text-sm gap-2"
              onClick={handleConvert}
              disabled={!originalImage}
              style={{
                background: 'hsl(var(--editor-accent))',
                color: '#fff',
                opacity: !originalImage ? 0.5 : 1,
              }}
            >
              <RefreshCw className="w-4 h-4" /> Convert to {outputFormat.toUpperCase()}
            </Button>

            {result && (
              <Button
                className="w-full h-10 rounded-lg font-medium text-sm gap-2"
                variant="ghost"
                onClick={handleDownload}
                style={{ color: 'hsl(var(--editor-text))', border: '1px solid hsl(var(--editor-border))' }}
              >
                <Download className="w-4 h-4" /> Download
              </Button>
            )}
          </div>
        </aside>

        {/* Main workspace */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto" style={{ background: 'hsl(var(--editor-bg))' }}>
          {!originalImage ? (
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                Add an Image to convert
              </h2>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg cursor-pointer text-sm font-medium transition-colors"
                style={{ background: 'hsl(var(--editor-panel))', color: 'hsl(var(--editor-text))', border: '1px solid hsl(var(--editor-border))' }}
              >
                <Upload className="w-4 h-4" /> Add an image
                <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
              </label>
            </div>
          ) : (
            <div className="w-full max-w-[800px] space-y-6">
              {/* Original */}
              <div className="relative">
                <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: 'hsl(140 60% 45%)', color: '#fff' }}>
                  Input · {originalFormat}
                </span>
                <img src={originalImage} alt="Input" className="w-full rounded-lg object-contain"
                  style={{ maxHeight: result ? '280px' : '450px', background: 'hsl(var(--editor-panel))' }} />
              </div>

              {/* Result */}
              {result && (
                <div className="relative">
                  <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}>
                    Output · {result.format.toUpperCase()}
                  </span>
                  {result.format === 'pdf' ? (
                    <div className="flex flex-col items-center justify-center h-[200px] rounded-lg" style={{ background: 'hsl(var(--editor-panel))' }}>
                      <FileType className="w-12 h-12 mb-3" style={{ color: 'hsl(0 60% 55%)' }} />
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--editor-text-bright))' }}>PDF Ready</p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--editor-text))' }}>{formatFileSize(result.size)}</p>
                    </div>
                  ) : (
                    <img src={result.url} alt="Converted" className="w-full rounded-lg object-contain"
                      style={{ maxHeight: '350px', background: 'hsl(var(--editor-panel))' }} />
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
