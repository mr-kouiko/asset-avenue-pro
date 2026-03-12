import { useState, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { useAIUpscaler, type UpscaleMode } from '@/hooks/useAIUpscaler';
import { ComparisonSlider } from '@/components/upscale/ComparisonSlider';
import { ZoomInspector } from '@/components/upscale/ZoomInspector';
import { ModelStatusIndicator } from '@/components/upscale/ModelStatusIndicator';
import {
  Upload,
  Download,
  Loader2,
  ArrowLeft,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  ZoomIn,
  Zap,
  Brain,
  ShieldCheck,
  Eye,
  ScanFace,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SCALE_OPTIONS = [
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
];

export default function ImageUpscale() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ai = useAIUpscaler();

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [scale, setScale] = useState(2);
  const [originalDimensions, setOriginalDimensions] = useState<{ w: number; h: number } | null>(null);
  const [sharpness, setSharpness] = useState(50);
  const [mode, setMode] = useState<UpscaleMode>('fast');
  const [showZoom, setShowZoom] = useState(false);
  const [faceEnhance, setFaceEnhance] = useState(false);

  useSEO({
    title: 'AI Image Upscale & Face Enhancement | Studio AI',
    description:
      'Upscale images with ESRGAN AI and enhance faces with GFPGAN restoration. WebGPU accelerated, 100% client-side, no uploads.',
    type: 'website',
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please upload an image (JPG, PNG, WebP).', variant: 'destructive' });
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
      img.onload = () => setOriginalDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleUpscale = useCallback(async () => {
    if (!originalImage) return;
    setResultImage(null);
    const result = await ai.upscale(originalImage, scale, mode, sharpness, faceEnhance);
    if (result) {
      setResultImage(result);
      const label = faceEnhance && ai.facesDetected > 0
        ? `Upscaled + ${ai.facesDetected} face(s) enhanced!`
        : mode === 'ai' ? 'AI Upscale Complete!' : 'Upscale Complete!';
      toast({ title: label });
    } else {
      toast({ title: 'Error', description: 'Processing failed. Try fast mode.', variant: 'destructive' });
    }
  }, [originalImage, scale, mode, sharpness, faceEnhance, ai, toast]);

  const handleDownload = () => {
    if (!resultImage) return;
    const suffix = faceEnhance ? `-${scale}x-${mode}-face-enhanced` : `-${scale}x-${mode}-upscaled`;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = fileName.replace(/\.[^/.]+$/, '') + `${suffix}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setOriginalImage(null);
    setResultImage(null);
    setFileName('');
    setOriginalDimensions(null);
    setShowZoom(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const outputW = originalDimensions ? originalDimensions.w * scale : 0;
  const outputH = originalDimensions ? originalDimensions.h * scale : 0;
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Link to="/studio-ai" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Studio AI
        </Link>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6">
            <ZoomIn className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">AI-Powered · 100% Browser-Based</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            AI Image{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Upscale & Face Enhance
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Enlarge images with ESRGAN and restore facial details with GFPGAN — entirely in your browser.
          </p>

          <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-xs text-green-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Your images are processed locally. No uploads required.
          </div>
        </div>

        {/* Model / Device Status */}
        <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm mb-6">
          <CardContent className="p-5">
            <ModelStatusIndicator state={ai} />
          </CardContent>
        </Card>

        {/* Settings */}
        {originalImage && (
          <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm mb-6">
            <CardContent className="p-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Mode */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Processing Mode</label>
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      variant={mode === 'fast' ? 'default' : 'outline'}
                      className={mode === 'fast' ? 'bg-yellow-600 hover:bg-yellow-500' : 'border-slate-600 text-slate-300'}
                      onClick={() => { setMode('fast'); setResultImage(null); }}
                    >
                      <Zap className="w-4 h-4 mr-1" /> Fast
                    </Button>
                    <Button
                      size="sm"
                      variant={mode === 'ai' ? 'default' : 'outline'}
                      className={mode === 'ai' ? 'bg-purple-600 hover:bg-purple-500' : 'border-slate-600 text-slate-300'}
                      onClick={() => { setMode('ai'); setResultImage(null); }}
                      disabled={ai.backend === 'canvas-only'}
                    >
                      <Brain className="w-4 h-4 mr-1" /> AI (HD)
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {mode === 'fast' ? 'Instant canvas interpolation' : 'ESRGAN neural network'}
                  </p>
                </div>

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

                {/* Face Enhancement Toggle */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Face Enhancement (AI)</label>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={faceEnhance}
                      onCheckedChange={(checked) => { setFaceEnhance(checked); setResultImage(null); }}
                      disabled={ai.backend === 'canvas-only'}
                    />
                    <ScanFace className={`w-5 h-5 ${faceEnhance ? 'text-pink-400' : 'text-slate-500'}`} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {faceEnhance
                      ? 'GFPGAN restores facial details'
                      : 'Enhances faces using AI restoration'}
                  </p>
                  {faceEnhance && isMobile && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠ Face enhancement may be slower on mobile
                    </p>
                  )}
                </div>

                {/* Sharpness (fast mode only) */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Sharpness: {sharpness}%{mode === 'ai' && ' (fast only)'}
                  </label>
                  <Slider
                    value={[sharpness]}
                    onValueChange={([v]) => { setSharpness(v); setResultImage(null); }}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                    disabled={mode === 'ai'}
                  />
                  <p className="text-xs text-slate-500 mt-1">Edge sharpening for fast mode</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload / Comparison area */}
        {!originalImage ? (
          <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-400" /> Upload Image
              </h3>
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/30 transition-all">
                <Upload className="w-10 h-10 text-slate-500 mb-3" />
                <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Click to upload</span> or drag & drop</p>
                <p className="text-xs text-slate-500">PNG, JPG or WebP (max 25 MB)</p>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
              </label>
            </CardContent>
          </Card>
        ) : resultImage ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-400" /> Result Comparison
                {ai.facesDetected > 0 && faceEnhance && (
                  <span className="text-sm font-normal text-pink-400 ml-2">
                    ({ai.facesDetected} face{ai.facesDetected > 1 ? 's' : ''} enhanced)
                  </span>
                )}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300"
                  onClick={() => setShowZoom(!showZoom)}
                >
                  <Eye className="w-4 h-4 mr-1" /> {showZoom ? 'Hide' : 'Show'} Zoom
                </Button>
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-1" /> New Image
                </Button>
              </div>
            </div>

            <ComparisonSlider
              originalSrc={originalImage}
              resultSrc={resultImage}
              className="h-[400px] md:h-[500px]"
            />

            {showZoom && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-2 font-medium">Original — hover to zoom</p>
                  <ZoomInspector src={originalImage} alt="Original zoom" className="h-64" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-2 font-medium">Enhanced — hover to zoom</p>
                  <ZoomInspector src={resultImage} alt="Result zoom" className="h-64" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-400" /> Original
                </h3>
                <div className="relative">
                  <img src={originalImage} alt="Original" className="w-full h-64 object-contain rounded-xl bg-slate-800" />
                  <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={handleReset}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Change
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-400" /> Result
                </h3>
                {ai.isProcessing ? (
                  <div className="flex flex-col items-center justify-center w-full h-64 rounded-xl bg-slate-800/50">
                    <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-3" />
                    <p className="text-sm text-slate-400">{ai.statusMessage || 'Processing…'}</p>
                    {ai.processingProgress > 0 && (
                      <p className="text-xs text-slate-500 mt-1">{ai.processingProgress}%</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-64 rounded-xl bg-slate-800/30 border border-slate-700/50">
                    <ZoomIn className="w-10 h-10 text-slate-600 mb-3" />
                    <p className="text-sm text-slate-500">Press Upscale to begin</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Button
            size="lg"
            className={
              mode === 'ai'
                ? 'bg-purple-600 hover:bg-purple-500 text-white px-8'
                : 'bg-blue-600 hover:bg-blue-500 text-white px-8'
            }
            onClick={handleUpscale}
            disabled={!originalImage || ai.isProcessing}
          >
            {ai.isProcessing ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {ai.statusMessage || 'Processing…'}</>
            ) : mode === 'ai' ? (
              <><Brain className="w-5 h-5 mr-2" /> {faceEnhance ? 'AI Upscale + Face Enhance' : 'AI Upscale'}</>
            ) : (
              <><Zap className="w-5 h-5 mr-2" /> {faceEnhance ? 'Fast Upscale + Face Enhance' : 'Fast Upscale'}</>
            )}
          </Button>

          {resultImage && (
            <Button size="lg" variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/10 px-8" onClick={handleDownload}>
              <Download className="w-5 h-5 mr-2" /> Download PNG
            </Button>
          )}

          {mode === 'ai' && ai.modelStatus !== 'ready' && ai.modelStatus !== 'downloading' && ai.modelStatus !== 'loading' && ai.backend !== 'canvas-only' && (
            <Button size="lg" variant="outline" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 px-8" onClick={ai.preloadModel}>
              <Download className="w-5 h-5 mr-2" /> Pre-load ESRGAN
            </Button>
          )}

          {faceEnhance && ai.faceEnhanceStatus === 'idle' && ai.backend !== 'canvas-only' && (
            <Button size="lg" variant="outline" className="border-pink-500/50 text-pink-400 hover:bg-pink-500/10 px-8" onClick={ai.preloadFaceModel}>
              <ScanFace className="w-5 h-5 mr-2" /> Pre-load GFPGAN
            </Button>
          )}
        </div>

        {/* Tips */}
        <div className="mt-16 text-center">
          <h2 className="text-xl font-semibold text-white mb-6">Tips for Best Results</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'AI Mode for Photos', description: 'ESRGAN produces sharper detail on photographs and realistic images.' },
              { title: 'Face Enhancement', description: 'Enable face enhancement for portraits — GFPGAN restores eyes, skin texture, and facial details.' },
              { title: 'Fast Mode for Art', description: 'Canvas interpolation is instant and great for illustrations and vector graphics.' },
              { title: 'Keep Input Small', description: 'Images under 2000 px process faster and use less memory, especially in AI mode.' },
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
