import { useState, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  Download,
  RefreshCw,
  ArrowLeft,
  Image as ImageIcon,
  FileType,
  ArrowRightLeft,
  Check
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
  const [isDragOver, setIsDragOver] = useState(false);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) loadImage(file);
  }, [loadImage]);

  const handleConvert = useCallback(() => {
    if (!originalImage) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // For JPEG, fill white background (no transparency)
      if (outputFormat === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      if (outputFormat === 'pdf') {
        // Build a minimal single-page PDF from the canvas JPEG data
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality / 100);
        const raw = atob(jpegDataUrl.split(',')[1]);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

        const w = canvas.width;
        const h = canvas.height;
        // Scale to fit A4-ish page (595x842 points) while keeping aspect ratio
        const pageW = 595;
        const pageH = 842;
        const scale = Math.min(pageW / w, pageH / h);
        const imgW = Math.round(w * scale);
        const imgH = Math.round(h * scale);
        const offX = Math.round((pageW - imgW) / 2);
        const offY = Math.round((pageH - imgH) / 2);

        const imgLen = bytes.length;

        // Build PDF manually
        const enc = new TextEncoder();
        const parts: (Uint8Array | string)[] = [];
        const offsets: number[] = [];
        let pos = 0;
        const add = (s: string) => { parts.push(s); pos += enc.encode(s).length; };

        add('%PDF-1.4\n');

        offsets[1] = pos;
        add('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

        offsets[2] = pos;
        add(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);

        offsets[3] = pos;
        add(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> >> >>\nendobj\n`);

        const stream = `q ${imgW} 0 0 ${imgH} ${offX} ${offY} cm /Img Do Q`;
        offsets[4] = pos;
        add(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);

        offsets[5] = pos;
        add(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgLen} >>\nstream\n`);
        parts.push(bytes);
        pos += imgLen;
        add('\nendstream\nendobj\n');

        const xrefPos = pos;
        add('xref\n');
        add(`0 6\n`);
        add('0000000000 65535 f \n');
        for (let i = 1; i <= 5; i++) {
          add(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
        }
        add('trailer\n<< /Size 6 /Root 1 0 R >>\n');
        add(`startxref\n${xrefPos}\n%%EOF\n`);

        // Combine all parts
        const totalLen = parts.reduce((a, p) => a + (typeof p === 'string' ? enc.encode(p).length : p.length), 0);
        const pdfBytes = new Uint8Array(totalLen);
        let off = 0;
        for (const p of parts) {
          const chunk = typeof p === 'string' ? enc.encode(p) : p;
          pdfBytes.set(chunk, off);
          off += chunk.length;
        }

        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResult({ url: URL.createObjectURL(blob), size: blob.size, format: 'pdf' });
        toast({ title: 'Converted!', description: `Image converted to PDF.` });
      } else {
        const mimeMap: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
        const mime = mimeMap[outputFormat];
        const q = outputFormat === 'png' ? undefined : quality / 100;

        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            setResult({ url: URL.createObjectURL(blob), size: blob.size, format: outputFormat });
            toast({ title: 'Converted!', description: `Image converted to ${outputFormat.toUpperCase()}.` });
          },
          mime,
          q
        );
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
    { value: 'png', label: 'PNG', desc: 'Lossless, transparent' },
    { value: 'jpeg', label: 'JPEG', desc: 'Small size, photos' },
    { value: 'webp', label: 'WebP', desc: 'Modern, best ratio' },
    { value: 'pdf', label: 'PDF', desc: 'Print-ready document' },
  ];

  const showQuality = outputFormat === 'jpeg' || outputFormat === 'webp';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
      <Header />
      <canvas ref={canvasRef} className="hidden" />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Link */}
        <Link
          to="/studio-ai"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Studio AI
        </Link>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6">
            <RefreshCw className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">Free — No Server Cost</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Image{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Converter
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Convert images between PNG, JPEG, WebP and PDF instantly. Everything runs in your browser — no upload, no cost.
          </p>
        </div>

        {/* Upload or Preview */}
        {!originalImage ? (
          <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm max-w-2xl mx-auto">
            <CardContent className="p-6">
              <label
                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-blue-400 bg-blue-500/10'
                    : 'border-slate-600 hover:border-blue-500/50 hover:bg-slate-800/30'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
              >
                <Upload className="w-10 h-10 text-slate-500 mb-3" />
                <p className="mb-2 text-sm text-slate-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500">JPG, PNG, WebP, BMP, GIF, TIFF (max 50 MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </label>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Side-by-side previews */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Original */}
              <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-blue-400" />
                      Original
                    </h3>
                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                      {originalFormat} · {formatFileSize(originalSize)}
                    </span>
                  </div>
                  <div className="relative">
                    <img
                      src={originalImage}
                      alt="Original"
                      className="w-full h-64 object-contain rounded-xl bg-slate-800"
                    />
                    <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={handleReset}>
                      <RefreshCw className="w-4 h-4 mr-1" /> Change
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Result */}
              <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <FileType className="w-5 h-5 text-green-400" />
                      Converted
                    </h3>
                    {result && (
                      <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                        {result.format.toUpperCase()} · {formatFileSize(result.size)}
                      </span>
                    )}
                  </div>
                  {result ? (
                    result.format === 'pdf' ? (
                      <div className="flex flex-col items-center justify-center w-full h-64 rounded-xl bg-slate-800/50">
                        <FileType className="w-12 h-12 text-red-400 mb-3" />
                        <p className="text-sm text-slate-300 font-medium">PDF Ready</p>
                        <p className="text-xs text-slate-500 mt-1">{formatFileSize(result.size)}</p>
                      </div>
                    ) : (
                      <img
                        src={result.url}
                        alt="Converted"
                        className="w-full h-64 object-contain rounded-xl bg-slate-800"
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-64 rounded-xl bg-slate-800/30 border border-slate-700/50">
                      <ArrowRightLeft className="w-10 h-10 text-slate-600 mb-3" />
                      <p className="text-sm text-slate-500">Choose a format and convert</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Format Selector + Quality + Actions */}
            <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm mb-8">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Output Format</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {formats.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => { setOutputFormat(f.value); setResult(null); }}
                      className={`relative flex flex-col items-center p-4 rounded-xl border transition-all ${
                        outputFormat === f.value
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {outputFormat === f.value && (
                        <Check className="absolute top-2 right-2 w-4 h-4 text-blue-400" />
                      )}
                      <span className="text-lg font-bold mb-1">{f.label}</span>
                      <span className="text-xs">{f.desc}</span>
                    </button>
                  ))}
                </div>

                {showQuality && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-300">Quality</span>
                      <span className="text-sm font-medium text-white">{quality}%</span>
                    </div>
                    <Slider
                      value={[quality]}
                      onValueChange={(v) => { setQuality(v[0]); setResult(null); }}
                      min={10}
                      max={100}
                      step={5}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-500">Smaller file</span>
                      <span className="text-xs text-slate-500">Higher quality</span>
                    </div>
                  </div>
                )}

                {/* Size comparison */}
                {result && (
                  <div className="flex items-center justify-center gap-4 mb-6 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Original</p>
                      <p className="text-sm font-medium text-slate-300">{formatFileSize(originalSize)}</p>
                    </div>
                    <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Converted</p>
                      <p className="text-sm font-medium text-slate-300">{formatFileSize(result.size)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Change</p>
                      <p className={`text-sm font-medium ${result.size < originalSize ? 'text-green-400' : 'text-amber-400'}`}>
                        {result.size < originalSize ? '-' : '+'}{Math.abs(Math.round((1 - result.size / originalSize) * 100))}%
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 w-full sm:w-auto"
                    onClick={handleConvert}
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Convert to {outputFormat.toUpperCase()}
                  </Button>

                  {result && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-green-500/50 text-green-400 hover:bg-green-500/10 px-8 w-full sm:w-auto"
                      onClick={handleDownload}
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Info Section */}
        <div className="mt-16 text-center">
          <h2 className="text-xl font-semibold text-white mb-6">Why Use This Converter?</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { title: '100% Free', description: 'No sign-up, no watermark, no hidden fees. Convert as many images as you want.' },
              { title: 'Private & Secure', description: 'Your images never leave your device. All processing happens locally in your browser.' },
              { title: 'All Major Formats', description: 'Convert between PNG, JPEG, WebP, and PDF. Supports BMP, GIF, and TIFF as input.' },
            ].map((tip) => (
              <div key={tip.title} className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
                <h3 className="text-white font-medium mb-2">{tip.title}</h3>
                <p className="text-sm text-slate-400">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
