import { useState, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { useGFPGANEnhancer } from '@/hooks/useGFPGANEnhancer';
import { ComparisonSlider } from '@/components/upscale/ComparisonSlider';
import { ZoomInspector } from '@/components/upscale/ZoomInspector';
import { Slider } from '@/components/ui/slider';
import {
  Upload, Download, Loader2, ArrowLeft, Image as ImageIcon, Sparkles,
  RefreshCw, ScanFace, ShieldCheck, Eye, Cpu, Zap,
  CheckCircle2, AlertTriangle, MonitorSmartphone, UserCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

function FaceModelStatus({ state }: { state: ReturnType<typeof useGFPGANEnhancer> }) {
  const backendIcons: Record<string, React.ReactNode> = {
    webgpu: <Zap className="w-4 h-4 text-green-400" />,
    webgl: <Zap className="w-4 h-4 text-yellow-400" />,
    cpu: <Cpu className="w-4 h-4 text-blue-400" />,
    'canvas-only': <MonitorSmartphone className="w-4 h-4 text-slate-400" />,
  };
  const statusIcons: Record<string, React.ReactNode> = {
    idle: null,
    'checking-cache': <Loader2 className="w-4 h-4 animate-spin text-pink-400" />,
    downloading: <Download className="w-4 h-4 text-pink-400" />,
    loading: <Loader2 className="w-4 h-4 animate-spin text-pink-400" />,
    ready: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    error: <AlertTriangle className="w-4 h-4 text-red-400" />,
    unsupported: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  };

  const stepLabels: Record<string, { icon: React.ReactNode; text: string } | null> = {
    idle: null,
    'detecting-faces': { icon: <ScanFace className="w-4 h-4 text-pink-400 animate-pulse" />, text: 'Detecting faces…' },
    'enhancing-faces': { icon: <ScanFace className="w-4 h-4 text-pink-400 animate-pulse" />, text: 'Enhancing faces…' },
    blending: { icon: <Loader2 className="w-4 h-4 animate-spin text-pink-400" />, text: 'Blending restored faces…' },
    complete: { icon: <UserCheck className="w-4 h-4 text-green-400" />, text: 'Face enhancement complete' },
    'no-faces': { icon: <ScanFace className="w-4 h-4 text-slate-400" />, text: 'No faces detected' },
    error: { icon: <AlertTriangle className="w-4 h-4 text-red-400" />, text: 'Face enhancement failed' },
  };

  const stepInfo = stepLabels[state.step];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300">
          {backendIcons[state.backend]}
          {state.backend === 'webgpu' && 'WebGPU Accelerated'}
          {state.backend === 'webgl' && 'WebGL Accelerated'}
          {state.backend === 'cpu' && 'CPU Processing'}
          {state.backend === 'canvas-only' && 'Basic Mode'}
        </span>
        {state.gpuAccelerated && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-xs text-green-400 font-medium">
            <Zap className="w-3 h-3" /> GPU Enabled
          </span>
        )}
        {state.facesDetected > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-xs text-pink-400 font-medium">
            <ScanFace className="w-3 h-3" /> {state.facesDetected} face(s)
          </span>
        )}
      </div>
      {state.statusMessage && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          {statusIcons[state.modelStatus]}
          <span>{state.statusMessage}</span>
        </div>
      )}
      {stepInfo && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          {stepInfo.icon}
          <span>{stepInfo.text}</span>
        </div>
      )}
      {state.modelStatus === 'downloading' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>GFPGAN Model</span>
            <span>{state.downloadProgress}%</span>
          </div>
          <Progress value={state.downloadProgress} className="h-2" />
        </div>
      )}
      {state.isProcessing && state.processingProgress > 0 && state.modelStatus !== 'downloading' && (
        <div className="space-y-1">
          <Progress value={state.processingProgress} className="h-2" />
          <p className="text-xs text-slate-500 text-right">Processing: {state.processingProgress}%</p>
        </div>
      )}
    </div>
  );
}

export default function FaceEnhancer() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ai = useGFPGANEnhancer();

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [showZoom, setShowZoom] = useState(false);

  useSEO({
    title: 'AI Face & Skin Enhancer – GFPGAN Restoration | Studio AI',
    description: 'Enhance facial details, skin, eyes and mouth with GFPGAN AI. 100% client-side, no uploads required.',
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
      setOriginalImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleEnhance = useCallback(async () => {
    if (!originalImage) return;
    setResultImage(null);
    const result = await ai.enhance(originalImage);
    if (result) {
      setResultImage(result);
      toast({ title: `${ai.facesDetected} face(s) enhanced!` });
    } else if (ai.step === 'no-faces') {
      toast({ title: 'No faces detected', description: 'Try a photo with visible faces.', variant: 'destructive' });
    } else {
      toast({ title: 'Error', description: 'Face enhancement failed.', variant: 'destructive' });
    }
  }, [originalImage, ai, toast]);

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = fileName.replace(/\.[^/.]+$/, '') + '-face-enhanced.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setOriginalImage(null);
    setResultImage(null);
    setFileName('');
    setShowZoom(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pink-950/20 to-slate-950">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Link to="/studio-ai" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Studio AI
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/30 mb-6">
            <ScanFace className="w-4 h-4 text-pink-400" />
            <span className="text-sm font-medium text-pink-400">AI-Powered · 100% Browser-Based</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            AI Face &{' '}
            <span className="bg-gradient-to-r from-pink-400 via-rose-400 to-fuchsia-400 bg-clip-text text-transparent">Skin Enhancer</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Restore facial details — skin texture, eyes, mouth — using GFPGAN AI, entirely in your browser.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-xs text-green-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Your images are processed locally. No uploads required.
          </div>
        </div>

        <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm mb-6">
          <CardContent className="p-5">
            <FaceModelStatus state={ai} />
          </CardContent>
        </Card>

        {!originalImage ? (
          <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-pink-400" /> Upload a Portrait
              </h3>
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-pink-500/50 hover:bg-slate-800/30 transition-all">
                <Upload className="w-10 h-10 text-slate-500 mb-3" />
                <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Click to upload</span> or drag & drop</p>
                <p className="text-xs text-slate-500">PNG, JPG or WebP (max 25 MB) · Works best with visible faces</p>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
              </label>
            </CardContent>
          </Card>
        ) : resultImage ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-400" /> Result Comparison
                {ai.facesDetected > 0 && (
                  <span className="text-sm font-normal text-pink-400 ml-2">
                    ({ai.facesDetected} face{ai.facesDetected > 1 ? 's' : ''} enhanced)
                  </span>
                )}
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300" onClick={() => setShowZoom(!showZoom)}>
                  <Eye className="w-4 h-4 mr-1" /> {showZoom ? 'Hide' : 'Show'} Zoom
                </Button>
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-1" /> New Image
                </Button>
              </div>
            </div>
            <ComparisonSlider originalSrc={originalImage} resultSrc={resultImage} className="h-[400px] md:h-[500px]" />
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
                  <ImageIcon className="w-5 h-5 text-pink-400" /> Original
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
                    <Loader2 className="w-10 h-10 text-pink-400 animate-spin mb-3" />
                    <p className="text-sm text-slate-400">{ai.statusMessage || 'Processing…'}</p>
                    {ai.processingProgress > 0 && <p className="text-xs text-slate-500 mt-1">{ai.processingProgress}%</p>}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-64 rounded-xl bg-slate-800/30 border border-slate-700/50">
                    <ScanFace className="w-10 h-10 text-slate-600 mb-3" />
                    <p className="text-sm text-slate-500">Press Enhance to begin</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Button size="lg" className="bg-pink-600 hover:bg-pink-500 text-white px-8"
            onClick={handleEnhance} disabled={!originalImage || ai.isProcessing || ai.backend === 'canvas-only'}>
            {ai.isProcessing ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {ai.statusMessage || 'Processing…'}</>
            ) : (
              <><ScanFace className="w-5 h-5 mr-2" /> Enhance Faces</>
            )}
          </Button>
          {resultImage && (
            <Button size="lg" variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/10 px-8" onClick={handleDownload}>
              <Download className="w-5 h-5 mr-2" /> Download PNG
            </Button>
          )}
          {ai.modelStatus !== 'ready' && ai.modelStatus !== 'downloading' && ai.modelStatus !== 'loading' && ai.backend !== 'canvas-only' && (
            <Button size="lg" variant="outline" className="border-pink-500/50 text-pink-400 hover:bg-pink-500/10 px-8" onClick={ai.preloadModel}>
              <Download className="w-5 h-5 mr-2" /> Pre-load GFPGAN
            </Button>
          )}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-xl font-semibold text-white mb-6">Tips for Best Results</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Clear Portraits', description: 'Works best on photos where faces are clearly visible and reasonably sized.' },
              { title: 'Multiple Faces', description: 'Detects and enhances up to 5 faces per image automatically.' },
              { title: 'Max Resolution', description: 'For best results, use images under 4096px. Larger images will be skipped.' },
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
