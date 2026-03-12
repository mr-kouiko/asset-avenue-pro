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
  Loader2,
  ArrowLeft,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  ZoomIn
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SCALE_OPTIONS = [
  { value: 2, label: '2×' },
  { value: 3, label: '3×' },
  { value: 4, label: '4×' },
];

export default function ImageUpscale() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [scale, setScale] = useState(2);
  const [originalDimensions, setOriginalDimensions] = useState<{ w: number; h: number } | null>(null);
  const [sharpness, setSharpness] = useState(50);

  useSEO({
    title: 'Image Upscale - Enlarge Images Without Losing Quality | Studio AI',
    description: 'Upscale images to 2×, 3× or 4× their original resolution using browser-based processing. Free, fast, and no upload required.',
    type: 'website'
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please upload an image file (JPG, PNG, WebP).', variant: 'destructive' });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please upload an image smaller than 25 MB.', variant: 'destructive' });
      return;
    }

    setFileName(file.name);
    setResultImage(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setOriginalImage(src);
      const img = new Image();
      img.onload = () => setOriginalDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const upscale = useCallback(async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    setResultImage(null);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = originalImage;
      });

      const newW = img.naturalWidth * scale;
      const newH = img.naturalHeight * scale;

      // Guard against absurdly large canvases
      if (newW * newH > 100_000_000) {
        toast({ title: 'Output too large', description: 'The resulting image would be too large. Try a lower scale factor.', variant: 'destructive' });
        setIsProcessing(false);
        return;
      }

      const canvas = canvasRef.current ?? document.createElement('canvas');
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext('2d')!;

      // High-quality upscale
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, newW, newH);

      // Optional sharpening via unsharp mask (convolution)
      if (sharpness > 20) {
        const strength = sharpness / 100;
        const imageData = ctx.getImageData(0, 0, newW, newH);
        const data = imageData.data;

        // Create a blurred copy using a smaller canvas
        const blurCanvas = document.createElement('canvas');
        blurCanvas.width = newW;
        blurCanvas.height = newH;
        const blurCtx = blurCanvas.getContext('2d')!;
        blurCtx.filter = 'blur(1px)';
        blurCtx.drawImage(canvas, 0, 0);
        const blurData = blurCtx.getImageData(0, 0, newW, newH).data;

        // Unsharp mask: original + strength * (original - blurred)
        for (let i = 0; i < data.length; i += 4) {
          data[i]     = Math.min(255, Math.max(0, data[i]     + strength * (data[i]     - blurData[i])));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + strength * (data[i + 1] - blurData[i + 1])));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + strength * (data[i + 2] - blurData[i + 2])));
        }
        ctx.putImageData(imageData, 0, 0);
      }

      const dataUrl = canvas.toDataURL('image/png');
      setResultImage(dataUrl);
      toast({ title: 'Image Upscaled!', description: `Upscaled to ${newW}×${newH} pixels.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to upscale image. Please try again.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  }, [originalImage, scale, sharpness, toast]);

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = fileName.replace(/\.[^/.]+$/, '') + `-${scale}x-upscaled.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setOriginalImage(null);
    setResultImage(null);
    setFileName('');
    setOriginalDimensions(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const outputW = originalDimensions ? originalDimensions.w * scale : 0;
  const outputH = originalDimensions ? originalDimensions.h * scale : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
      <Header />
      <canvas ref={canvasRef} className="hidden" />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Link to="/studio-ai" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Studio AI
        </Link>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6">
            <ZoomIn className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">100% Free — Runs in Your Browser</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Image{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Upscale
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Enlarge images up to 4× their original resolution with sharpening — entirely in your browser, no upload needed.
          </p>
        </div>

        {/* Settings */}
        {originalImage && (
          <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm mb-6">
            <CardContent className="p-6">
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Scale Factor */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Scale Factor</label>
                  <div className="flex gap-3">
                    {SCALE_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={scale === opt.value ? 'default' : 'outline'}
                        size="sm"
                        className={scale === opt.value ? 'bg-blue-600 hover:bg-blue-500' : 'border-slate-600 text-slate-300'}
                        onClick={() => { setScale(opt.value); setResultImage(null); }}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  {originalDimensions && (
                    <p className="text-xs text-slate-500 mt-2">
                      {originalDimensions.w}×{originalDimensions.h} → {outputW}×{outputH} px
                    </p>
                  )}
                </div>

                {/* Sharpness */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Sharpness: {sharpness}%
                  </label>
                  <Slider
                    value={[sharpness]}
                    onValueChange={([v]) => { setSharpness(v); setResultImage(null); }}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">Higher values add more edge sharpening</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Image Panels */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Original */}
          <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-400" />
                Original Image
              </h3>

              {!originalImage ? (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/30 transition-all">
                  <Upload className="w-10 h-10 text-slate-500 mb-3" />
                  <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-slate-500">PNG, JPG or WebP (max 25 MB)</p>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                </label>
              ) : (
                <div className="relative">
                  <img src={originalImage} alt="Original" className="w-full h-64 object-contain rounded-xl bg-slate-800" />
                  <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={handleReset}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Change
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Result */}
          <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-400" />
                Upscaled Result
              </h3>

              {isProcessing ? (
                <div className="flex flex-col items-center justify-center w-full h-64 rounded-xl bg-slate-800/50">
                  <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-3" />
                  <p className="text-sm text-slate-400">Upscaling image…</p>
                </div>
              ) : resultImage ? (
                <img src={resultImage} alt="Upscaled" className="w-full h-64 object-contain rounded-xl bg-slate-800" />
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-64 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <ZoomIn className="w-10 h-10 text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500">Result will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white px-8" onClick={upscale} disabled={!originalImage || isProcessing}>
            {isProcessing ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing…</>
            ) : (
              <><ZoomIn className="w-5 h-5 mr-2" /> Upscale Image</>
            )}
          </Button>

          {resultImage && (
            <Button size="lg" variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/10 px-8" onClick={handleDownload}>
              <Download className="w-5 h-5 mr-2" /> Download PNG
            </Button>
          )}
        </div>

        {/* Tips */}
        <div className="mt-16 text-center">
          <h2 className="text-xl font-semibold text-white mb-6">Tips for Best Results</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { title: 'Start Small', description: 'Images under 2000 px produce the best upscale quality and process faster.' },
              { title: 'Use PNG for Lossless', description: 'PNG input avoids JPEG compression artifacts that get amplified during upscaling.' },
              { title: 'Adjust Sharpness', description: 'Increase sharpness for photos; lower it for illustrations or artwork.' },
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
