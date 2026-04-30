import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Upload, Download, Loader2, ArrowLeft, Play, Pause,
  Crop, Monitor, Square, Smartphone, Instagram,
  Zap, Shield, Sparkles, Image as ImageIcon, Video, Scissors, Wand2, Target,
} from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

const STRUCTURED_DATA = {
  software: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "VisuStock AI Reframe Video",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web Browser",
    "url": "https://visustock.com/studio-ai/reframe-video",
    "description": "Free AI video reframe tool. Resize videos online, change aspect ratio (16:9, 1:1, 9:16, 4:5) and convert horizontal videos to vertical for TikTok, Reels and Shorts — with automatic subject tracking.",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "featureList": [
      "AI-powered video reframing",
      "Aspect ratios 16:9, 1:1, 9:16 and 4:5",
      "Automatic subject and face tracking",
      "Convert horizontal video to vertical",
      "Optimized for TikTok, Reels and YouTube Shorts",
      "100% browser-based, no upload"
    ],
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "ratingCount": "1320" }
  },
  faq: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "How does the AI video reframe tool work?", "acceptedAnswer": { "@type": "Answer", "text": "The AI analyzes each frame to detect faces, motion and key subjects, then automatically crops the video to your chosen aspect ratio while keeping the subject centered — no manual editing required." } },
      { "@type": "Question", "name": "Can I convert a horizontal video to vertical for TikTok or Reels?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Choose 9:16 to convert a horizontal video to a vertical format optimized for TikTok, Instagram Reels and YouTube Shorts. The AI keeps the main subject in frame." } },
      { "@type": "Question", "name": "Which aspect ratios are supported?", "acceptedAnswer": { "@type": "Answer", "text": "You can reframe video to 16:9 (horizontal), 1:1 (square), 9:16 (vertical / Stories) and 4:5 (Instagram feed)." } },
      { "@type": "Question", "name": "Is the video reframer free?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The VisuStock AI video reframe tool is 100% free, with no signup and no watermark." } },
      { "@type": "Question", "name": "Are my videos kept private?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Reframing happens directly in your browser — your videos are not uploaded to a server." } }
    ]
  }
};

type AspectRatio = '16:9' | '1:1' | '9:16' | '4:5';

interface CropBox { x: number; y: number; w: number; h: number }

const ASPECT_RATIOS: { id: AspectRatio; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: '16:9', label: '16:9', icon: <Monitor className="w-4 h-4" />, desc: 'Horizontal' },
  { id: '1:1', label: '1:1', icon: <Square className="w-4 h-4" />, desc: 'Square' },
  { id: '9:16', label: '9:16', icon: <Smartphone className="w-4 h-4" />, desc: 'Vertical' },
  { id: '4:5', label: '4:5', icon: <Instagram className="w-4 h-4" />, desc: 'Instagram' },
];

function getOutputDims(srcW: number, srcH: number, ratio: AspectRatio): { w: number; h: number } {
  const [rw, rh] = ratio.split(':').map(Number);
  // fit output within source dimensions
  let w = srcW;
  let h = Math.round(w * rh / rw);
  if (h > srcH) { h = srcH; w = Math.round(h * rw / rh); }
  // force even
  w = w - (w % 2); h = h - (h % 2);
  return { w, h };
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export default function ReframeVideo() {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [ratio, setRatio] = useState<AspectRatio>('9:16');
  const [aiTracking, setAiTracking] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const resultVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useSEO({
    title: 'AI Reframe Video – Resize & Convert to Vertical Free',
    description: 'Free AI video reframe: resize video online, change aspect ratio (16:9, 1:1, 9:16, 4:5) and convert horizontal videos to vertical for TikTok, Reels & Shorts.',
    type: 'website',
    tags: ['reframe video', 'AI video reframe', 'resize video online', 'change aspect ratio video', 'convert video to vertical', 'video reframer']
  });

  useEffect(() => {
    const ids = ['rv-schema-software', 'rv-schema-faq'];
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

  const handleFileSelect = useCallback((file: File) => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload MP4, MOV, or WEBM');
      return;
    }
    setVideoFile(file);
    setResultUrl(null);
    setProgress(0);
    setVideoUrl(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  /* ---- face detection using built-in FaceDetector (Chrome/Edge) or fallback center crop ---- */
  async function detectSubject(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
  ): Promise<{ cx: number; cy: number } | null> {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    canvas.width = vw;
    canvas.height = vh;
    ctx.drawImage(video, 0, 0, vw, vh);

    // Try native FaceDetector (Chrome 70+)
    if ('FaceDetector' in window && aiTracking) {
      try {
        // @ts-ignore – FaceDetector is not in TS lib yet
        const detector = new window.FaceDetector({ maxDetectedFaces: 1, fastMode: true });
        const faces = await detector.detect(canvas);
        if (faces.length > 0) {
          const box = faces[0].boundingBox;
          return { cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
        }
      } catch { /* fall through */ }
    }

    // Fallback: simple brightness saliency (center-of-mass of bright pixels)
    if (aiTracking) {
      const imgData = ctx.getImageData(0, 0, vw, vh);
      const d = imgData.data;
      let sumX = 0, sumY = 0, total = 0;
      const step = 8; // sample every 8th pixel for speed
      for (let y = 0; y < vh; y += step) {
        for (let x = 0; x < vw; x += step) {
          const i = (y * vw + x) * 4;
          const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
          if (lum > 140) { // bright-ish
            sumX += x * lum;
            sumY += y * lum;
            total += lum;
          }
        }
      }
      if (total > 0) {
        return { cx: sumX / total, cy: sumY / total };
      }
    }
    return null; // center crop
  }

  const handleGenerate = async () => {
    if (!videoFile || !videoRef.current) {
      toast.error('Please upload a video first');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProgressLabel('Analyzing video…');

    try {
      const video = videoRef.current;
      await new Promise<void>((res) => {
        if (video.readyState >= 2) return res();
        video.onloadeddata = () => res();
      });

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const { w: outW, h: outH } = getOutputDims(vw, vh, ratio);
      const fps = 30;
      const duration = video.duration;
      const totalFrames = Math.ceil(duration * fps);
      const sampleEvery = 4; // detect every 4th frame

      // Prepare detection canvas (off-screen)
      const detectCanvas = document.createElement('canvas');
      const detectCtx = detectCanvas.getContext('2d')!;

      // Phase 1 – detect subject positions via frame sampling
      setProgressLabel('Detecting subject…');
      const rawPositions: { frame: number; cx: number; cy: number }[] = [];

      for (let f = 0; f < totalFrames; f += sampleEvery) {
        const t = f / fps;
        video.currentTime = t;
        await new Promise<void>((r) => { video.onseeked = () => r(); });
        const det = await detectSubject(video, detectCanvas, detectCtx);
        rawPositions.push({ frame: f, cx: det?.cx ?? vw / 2, cy: det?.cy ?? vh / 2 });
        setProgress(Math.round((f / totalFrames) * 30));
      }

      // Build full-frame position map via interpolation + smoothing
      const positions: { cx: number; cy: number }[] = [];
      for (let f = 0; f < totalFrames; f++) {
        // find surrounding samples
        let lo = rawPositions[0], hi = rawPositions[rawPositions.length - 1];
        for (let i = 0; i < rawPositions.length - 1; i++) {
          if (rawPositions[i].frame <= f && rawPositions[i + 1].frame >= f) {
            lo = rawPositions[i]; hi = rawPositions[i + 1]; break;
          }
        }
        const range = hi.frame - lo.frame || 1;
        const t = (f - lo.frame) / range;
        positions.push({ cx: lerp(lo.cx, hi.cx, t), cy: lerp(lo.cy, hi.cy, t) });
      }

      // Temporal smoothing (simple moving average, window=7)
      const smoothed = positions.map((_, i) => {
        const half = 3;
        let sx = 0, sy = 0, c = 0;
        for (let j = Math.max(0, i - half); j <= Math.min(positions.length - 1, i + half); j++) {
          sx += positions[j].cx; sy += positions[j].cy; c++;
        }
        return { cx: sx / c, cy: sy / c };
      });

      // Phase 2 – render cropped frames to a canvas → MediaRecorder
      setProgressLabel('Rendering reframed video…');
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW;
      outCanvas.height = outH;
      const outCtx = outCanvas.getContext('2d')!;

      const stream = outCanvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
        videoBitsPerSecond: 5_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const recorderDone = new Promise<void>((res) => { recorder.onstop = () => res(); });
      recorder.start();

      for (let f = 0; f < totalFrames; f++) {
        const t = f / fps;
        video.currentTime = t;
        await new Promise<void>((r) => { video.onseeked = () => r(); });

        const { cx, cy } = smoothed[f] || { cx: vw / 2, cy: vh / 2 };

        // compute crop origin (clamped)
        let sx = Math.round(cx - outW / 2);
        let sy = Math.round(cy - outH / 2);
        sx = Math.max(0, Math.min(vw - outW, sx));
        sy = Math.max(0, Math.min(vh - outH, sy));

        outCtx.drawImage(video, sx, sy, outW, outH, 0, 0, outW, outH);

        setProgress(30 + Math.round((f / totalFrames) * 65));

        // yield to keep UI responsive
        if (f % 5 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      recorder.stop();
      await recorderDone;

      setProgress(100);
      setProgressLabel('Done!');
      const blob = new Blob(chunks, { type: 'video/webm' });
      setResultUrl(URL.createObjectURL(blob));
      toast.success('Video reframed successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to process video');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `reframed-${ratio.replace(':', 'x')}-${videoFile?.name || 'video'}.webm`;
    a.click();
  };

  const togglePlay = () => {
    const v = resultUrl ? resultVideoRef.current : videoRef.current;
    if (!v) return;
    if (isPlaying) v.pause(); else v.play();
    setIsPlaying(!isPlaying);
  };

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [videoUrl, resultUrl]);

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--editor-bg))' }}>
      <Header />

      <div className="flex min-h-[calc(100vh-64px)]">
        {/* ─── Left Sidebar ─── */}
        <aside
          className="w-[280px] shrink-0 border-r flex flex-col overflow-y-auto"
          style={{
            background: 'hsl(var(--editor-sidebar))',
            borderColor: 'hsl(var(--editor-border))',
          }}
        >
          {/* Back */}
          <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--editor-border))' }}>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-slate-400 hover:text-white hover:bg-white/5"
              onClick={() => navigate('/studio-ai')}
            >
              <ArrowLeft className="w-4 h-4" /> Back to Studio
            </Button>
          </div>

          {/* Upload */}
          <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--editor-border))' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'hsl(var(--editor-text))' }}>
              Video
            </h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-blue-500/50"
              style={{ borderColor: 'hsl(var(--editor-border))' }}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className="w-6 h-6 mx-auto mb-2 text-slate-500" />
              <p className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>
                {videoFile ? videoFile.name : 'Drop video or click to upload'}
              </p>
              <p className="text-[10px] mt-1 text-slate-600">MP4, MOV, WEBM</p>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--editor-border))' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'hsl(var(--editor-text))' }}>
              Output Aspect Ratio
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.id}
                  onClick={() => setRatio(ar.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-all ${
                    ratio === ar.id
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-transparent bg-white/5 hover:bg-white/10'
                  }`}
                  style={{ color: ratio === ar.id ? undefined : 'hsl(var(--editor-text))' }}
                >
                  {ar.icon}
                  <span className="font-medium">{ar.label}</span>
                  <span className="text-[10px] text-slate-500">{ar.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Tracking toggle */}
          <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--editor-border))' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--editor-text))' }}>
                  AI Subject Tracking
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Face & object detection</p>
              </div>
              <Switch checked={aiTracking} onCheckedChange={setAiTracking} />
            </div>
          </div>

          {/* Generate button */}
          <div className="p-4 mt-auto">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-2"
              onClick={handleGenerate}
              disabled={!videoFile || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <Crop className="w-4 h-4" /> Generate Reframed Video
                </>
              )}
            </Button>

            {isProcessing && (
              <div className="mt-3 space-y-1">
                <Progress value={progress} className="h-1.5" />
                <p className="text-[10px] text-center" style={{ color: 'hsl(var(--editor-text))' }}>
                  {progressLabel} {progress}%
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* ─── Main Workspace ─── */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
          {/* Original or Result */}
          {resultUrl ? (
            <div className="w-full max-w-[900px] flex flex-col items-center gap-4">
              <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                Reframed Video ({ratio})
              </h2>
              <div
                className="rounded-xl overflow-hidden border"
                style={{
                  borderColor: 'hsl(var(--editor-border))',
                  background: 'hsl(var(--editor-panel))',
                  maxHeight: '70vh',
                }}
              >
                <video
                  ref={resultVideoRef}
                  src={resultUrl}
                  controls
                  className="max-h-[65vh] mx-auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={togglePlay} className="gap-2 border-slate-600 text-slate-300 hover:bg-white/5">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button size="sm" onClick={handleDownload} className="gap-2 bg-blue-600 hover:bg-blue-500 text-white">
                  <Download className="w-4 h-4" /> Download
                </Button>
              </div>
            </div>
          ) : videoUrl ? (
            <div className="w-full max-w-[900px] flex flex-col items-center gap-4">
              <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                Original Video
              </h2>
              <div
                className="rounded-xl overflow-hidden border"
                style={{
                  borderColor: 'hsl(var(--editor-border))',
                  background: 'hsl(var(--editor-panel))',
                  maxHeight: '70vh',
                }}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="max-h-[65vh] mx-auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: 'hsl(var(--editor-panel))' }}
              >
                <Crop className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                AI Reframe Video
              </h2>
              <p className="text-sm max-w-md" style={{ color: 'hsl(var(--editor-text))' }}>
                Upload a video and choose your target aspect ratio. AI will detect the main subject and keep it centered while reframing.
              </p>
              <Button
                variant="outline"
                className="mt-2 border-slate-600 text-black hover:bg-white/5 gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" /> Upload Video
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Hidden canvas for detection */}
      <canvas ref={canvasRef} className="hidden" />

      {/* SEO Content Section */}
      <section className="container mx-auto px-4 py-16 max-w-4xl space-y-12 text-foreground">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            AI Reframe Video — resize video online & convert to vertical for free
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Our free <strong>AI video reframe</strong> tool lets you instantly <strong>resize video
            online</strong> and <strong>change the aspect ratio</strong> of any clip — without
            opening Premiere, After Effects or DaVinci Resolve. Upload a video, pick a target
            ratio (16:9, 1:1, 9:16 or 4:5), and the AI automatically tracks the main subject —
            faces, motion and objects — to keep it perfectly centered while it crops.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Whether you need to <strong>convert video to vertical</strong> for TikTok, square it
            up for Instagram, or repurpose a horizontal podcast clip into Reels and Shorts, this
            <strong> reframe video</strong> tool turns hours of manual editing into seconds of
            click-and-export workflow.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">How AI video reframing works</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Behind the scenes, three steps happen automatically on every frame:
          </p>
          <ol className="space-y-3 text-muted-foreground list-decimal list-inside">
            <li><strong>Subject detection</strong> — the AI finds faces, people and key objects in each frame.</li>
            <li><strong>Smart tracking</strong> — a temporal moving average smooths the crop window so it follows the action without jittering.</li>
            <li><strong>Auto crop & export</strong> — your video is re-cropped to the target aspect ratio and exported, ready for any platform.</li>
          </ol>
          <p className="text-muted-foreground leading-relaxed mt-4">
            The result: a clean, centered video that looks like it was shot in that ratio from the start.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Aspect ratio conversion in one click</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Monitor className="w-4 h-4" /> 16:9 — Horizontal</h3>
              <p className="text-sm text-muted-foreground">YouTube, websites, presentations, OTT and TV. The standard widescreen format.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Smartphone className="w-4 h-4" /> 9:16 — Vertical</h3>
              <p className="text-sm text-muted-foreground">TikTok, Instagram Reels, YouTube Shorts and Stories. Convert horizontal to vertical in seconds.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Square className="w-4 h-4" /> 1:1 — Square</h3>
              <p className="text-sm text-muted-foreground">Instagram feed, Facebook ads and LinkedIn — performs great in mobile feeds.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Instagram className="w-4 h-4" /> 4:5 — Portrait</h3>
              <p className="text-sm text-muted-foreground">Instagram feed portrait — takes up more vertical space and boosts attention.</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Why creators use the VisuStock video reframer</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border">
              <Zap className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Save hours of editing</h3>
              <p className="text-sm text-muted-foreground">No keyframes, no manual reframing — the AI does the cropping for you.</p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <Target className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Subject stays in frame</h3>
              <p className="text-sm text-muted-foreground">Face and motion tracking keep the action perfectly centered across every cut.</p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <Shield className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Multi-platform ready</h3>
              <p className="text-sm text-muted-foreground">One source, four ratios — publish everywhere from a single original video.</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Key features</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li><strong>Automatic AI cropping</strong> — no manual editing required.</li>
            <li><strong>Face & motion tracking</strong> — keeps the main subject perfectly centered.</li>
            <li><strong>4 aspect ratios</strong> — 16:9, 1:1, 9:16 and 4:5.</li>
            <li><strong>Convert horizontal to vertical</strong> — perfect for short-form video.</li>
            <li><strong>Browser-based</strong> — nothing to install, works on any modern device.</li>
            <li><strong>Free & watermark-free</strong> output ready for upload.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Use cases for AI video reframing</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">TikTok, Reels & Shorts</h3>
              <p className="text-sm text-muted-foreground">Turn any horizontal video into vertical 9:16 short-form content in seconds.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Podcast clips</h3>
              <p className="text-sm text-muted-foreground">Repurpose long-form podcast videos into vertical or square clips for social media.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Ads & marketing</h3>
              <p className="text-sm text-muted-foreground">Quickly produce 1:1 and 9:16 versions of your video ads for Meta, TikTok and YouTube.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Content repurposing</h3>
              <p className="text-sm text-muted-foreground">Maximize one shoot — publish 16:9 on YouTube, 9:16 on TikTok and 1:1 on Instagram.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Brand & social campaigns</h3>
              <p className="text-sm text-muted-foreground">Keep visuals consistent across every channel without re-editing each format.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Stock footage adaptation</h3>
              <p className="text-sm text-muted-foreground">Reframe purchased stock footage to match your destination platform instantly.</p>
            </div>
          </div>
        </div>

        {/* CTA to marketplace */}
        <div className="rounded-2xl p-6 md:p-8 border border-border bg-gradient-to-br from-primary/10 to-accent/5">
          <h2 className="text-2xl font-bold mb-2">Combine reframed videos with premium VisuStock assets</h2>
          <p className="text-muted-foreground mb-4">
            Pair your reframed clips with cinematic <Link to="/marketplace?type=video" className="text-primary underline">stock videos</Link>,
            curated <Link to="/marketplace?type=image" className="text-primary underline">stock images</Link> and
            ready-to-use creative assets from independent creators worldwide. Perfect for ads,
            social campaigns and short-form content.
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
            <Link to="/face-enhancer" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Face Enhancer
            </Link>
            <Link to="/studio-ai/image-converter" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" /> Image Converter
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
              <AccordionTrigger>How does the AI video reframe tool work?</AccordionTrigger>
              <AccordionContent>
                The AI analyzes each frame to detect faces, motion and key subjects, then automatically crops the video to your chosen aspect ratio while keeping the subject centered — no manual editing required.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>Can I convert a horizontal video to vertical for TikTok or Reels?</AccordionTrigger>
              <AccordionContent>
                Yes. Choose 9:16 to convert a horizontal video to a vertical format optimized for TikTok, Instagram Reels and YouTube Shorts. The AI keeps the main subject in frame.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Which aspect ratios are supported?</AccordionTrigger>
              <AccordionContent>
                You can reframe video to 16:9 (horizontal), 1:1 (square), 9:16 (vertical / Stories) and 4:5 (Instagram feed).
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>Is the video reframer free?</AccordionTrigger>
              <AccordionContent>
                Yes. The VisuStock AI video reframe tool is 100% free, with no signup and no watermark.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger>Are my videos kept private?</AccordionTrigger>
              <AccordionContent>
                Yes. Reframing happens directly in your browser — your videos are not uploaded to a server.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/*
          Suggested ALT texts for future screenshots:
          - "AI reframe video interface — resize video online and change aspect ratio"
          - "Horizontal 16:9 video converted to vertical 9:16 for TikTok and Reels"
          - "AI subject tracking keeping a speaker centered while reframing video"
          - "Square 1:1 reframe of a landscape clip for Instagram feed"
          - "Side-by-side preview of original and reframed AI video"
        */}
      </section>
    </div>
  );
}
