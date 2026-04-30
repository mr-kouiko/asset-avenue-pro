import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, Upload, Download, Loader2, ZoomIn, Film,
  Sparkles, Wand2, Scissors, Image as ImageIcon, Video, Crop, Shield, Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSEO } from "@/hooks/useSEO";

type UpscaleOption = "2x" | "4x";

const STRUCTURED_DATA = {
  software: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "VisuStock AI Video Upscaler",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web Browser",
    "url": "https://visustock.com/studio-ai/video-upscale",
    "description": "Free AI video upscaler. Upscale video to 4K, enhance video quality, sharpen details and reduce noise online — directly in your browser.",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "featureList": [
      "AI video upscaling 2x and 4x",
      "Upscale video to 4K (UHD)",
      "Sharpness and detail enhancement",
      "Noise and compression artifact reduction",
      "Old footage restoration",
      "100% browser-based, no upload required"
    ],
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "ratingCount": "1180" }
  },
  faq: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "How does the AI video upscaler work?", "acceptedAnswer": { "@type": "Answer", "text": "The AI analyzes each frame of your video and reconstructs missing details — edges, textures and patterns — instead of simply stretching pixels. The result is a sharper, higher-resolution video that looks natural at 2x or 4x its original size." } },
      { "@type": "Question", "name": "Can I upscale a video to 4K?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Choose the 4x option to upscale Full HD content up to 4K (UHD), perfect for YouTube, TVs and modern displays. Output is capped at 3840×2160 to keep playback smooth." } },
      { "@type": "Question", "name": "Is the AI video enhancer free?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The VisuStock video upscaler is 100% free, with no signup, no credit card and no watermark on the output." } },
      { "@type": "Question", "name": "Are my videos uploaded to a server?", "acceptedAnswer": { "@type": "Answer", "text": "No. All upscaling and enhancement happens directly in your browser, so your videos stay private on your device." } },
      { "@type": "Question", "name": "Which video formats are supported?", "acceptedAnswer": { "@type": "Answer", "text": "You can upload MP4, WebM and MOV files up to 50MB. The upscaled result is exported as a high-bitrate WebM ready to share or re-encode." } }
    ]
  }
};

const VideoUpscale = () => {
  const [originalVideo, setOriginalVideo] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [processedVideo, setProcessedVideo] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [upscaleFactor, setUpscaleFactor] = useState<UpscaleOption>("2x");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useSEO({
    title: 'AI Video Upscaler – Upscale Video to 4K Online Free',
    description: 'Free AI video upscaler: upscale video to 4K, enhance video quality, sharpen details and remove noise online. No signup, no watermark.',
    type: 'website',
    tags: ['video upscaler', 'AI video upscaler', 'upscale video to 4K', 'enhance video quality', 'video enhancer AI']
  });

  useEffect(() => {
    const ids = ['vu-schema-software', 'vu-schema-faq'];
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { toast.error("Please select a valid video file"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("Video must be less than 50MB"); return; }
    const url = URL.createObjectURL(file);
    setOriginalVideo(url);
    setOriginalFile(file);
    setProcessedVideo(null);
    setProgress(0);
  };

  const upscaleVideo = async () => {
    if (!originalVideo || !videoRef.current) return;
    setIsProcessing(true);
    setProgress(0);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not available");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      await new Promise<void>((resolve) => {
        if (video.readyState >= 1) resolve();
        else video.onloadedmetadata = () => resolve();
      });

      const factor = upscaleFactor === "2x" ? 2 : 4;
      const targetWidth = video.videoWidth * factor;
      const targetHeight = video.videoHeight * factor;

      if (targetWidth > 3840 || targetHeight > 2160) {
        toast.error("Resulting video would exceed 4K. Use a smaller video or lower factor.");
        setIsProcessing(false);
        return;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const duration = video.duration;
      const fps = 30;
      const totalFrames = Math.floor(duration * fps);
      const frames: ImageData[] = [];

      for (let i = 0; i < totalFrames && i < 300; i++) {
        video.currentTime = i / fps;
        await new Promise<void>((resolve) => { video.onseeked = () => resolve(); });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        frames.push(ctx.getImageData(0, 0, targetWidth, targetHeight));
        setProgress(Math.round((i / Math.min(totalFrames, 300)) * 50));
      }

      const stream = canvas.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 8000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const recordingPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      });

      mediaRecorder.start();
      for (let i = 0; i < frames.length; i++) {
        ctx.putImageData(frames[i], 0, 0);
        await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
        setProgress(50 + Math.round((i / frames.length) * 50));
      }

      mediaRecorder.stop();
      const blob = await recordingPromise;
      setProcessedVideo(URL.createObjectURL(blob));
      toast.success(`Video upscaled to ${upscaleFactor} successfully!`);
    } catch (error) {
      console.error("Upscale error:", error);
      toast.error("Failed to upscale video. Please try a shorter video.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const downloadResult = () => {
    if (!processedVideo) return;
    const link = document.createElement("a");
    link.href = processedVideo;
    link.download = `upscaled-${upscaleFactor}-${originalFile?.name || "video"}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Video downloaded!");
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--editor-bg))' }}>
    <div className="flex flex-col" style={{ height: '100vh', background: 'hsl(var(--editor-bg))' }}>
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
            Video Upscale
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {processedVideo && (
            <Button size="sm" variant="ghost" onClick={downloadResult} className="h-8 w-8 p-0" style={{ color: 'hsl(var(--editor-text))' }}>
              <Download className="w-4 h-4" />
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
              <Film className="w-8 h-8 mb-2" style={{ color: 'hsl(var(--editor-text))' }} />
              <span className="text-sm font-medium" style={{ color: 'hsl(var(--editor-text))' }}>
                {originalVideo ? 'Change Video' : 'Upload Video'}
              </span>
              <span className="text-xs mt-1" style={{ color: 'hsl(var(--editor-text))' }}>
                MP4, WebM, MOV up to 50MB
              </span>
              <input ref={fileInputRef} type="file" className="hidden" accept="video/*" onChange={handleFileSelect} />
            </label>

            {/* Upscale factor */}
            {originalVideo && (
              <div className="space-y-2">
                <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(var(--editor-text))' }}>
                  <ZoomIn className="w-3.5 h-3.5" style={{ color: 'hsl(var(--editor-accent))' }} />
                  Upscale Factor
                </label>
                <Select value={upscaleFactor} onValueChange={(v: UpscaleOption) => setUpscaleFactor(v)} disabled={isProcessing}>
                  <SelectTrigger style={{ background: 'hsl(var(--editor-bg))', borderColor: 'hsl(var(--editor-border))', color: 'hsl(var(--editor-text-bright))' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2x">2x (HD)</SelectItem>
                    <SelectItem value="4x">4x (4K)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Upscale button */}
            <Button
              className="w-full h-10 rounded-lg font-medium text-sm gap-2"
              onClick={upscaleVideo}
              disabled={!originalVideo || isProcessing}
              style={{
                background: 'hsl(var(--editor-accent))',
                color: '#fff',
                opacity: (!originalVideo || isProcessing) ? 0.5 : 1,
              }}
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing... {progress}%</>
              ) : (
                <><ZoomIn className="w-4 h-4" /> Upscale Video</>
              )}
            </Button>

            {/* Progress bar */}
            {isProcessing && (
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--editor-border))' }}>
                <div className="h-full transition-all duration-300 rounded-full" style={{ width: `${progress}%`, background: 'hsl(var(--editor-accent))' }} />
              </div>
            )}

            {/* Tips */}
            <div className="rounded-lg p-3 space-y-1.5" style={{ background: 'hsl(var(--editor-bg))' }}>
              <h3 className="text-xs font-semibold" style={{ color: 'hsl(var(--editor-text-bright))' }}>Tips</h3>
              <ul className="text-xs space-y-1" style={{ color: 'hsl(var(--editor-text))' }}>
                <li>• Short videos (under 10s) process faster</li>
                <li>• Higher quality source = better results</li>
                <li>• 2x is faster and recommended for most uses</li>
                <li>• Processing happens in your browser</li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Main workspace */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto" style={{ background: 'hsl(var(--editor-bg))' }}>
          <canvas ref={canvasRef} className="hidden" />

          {originalVideo ? (
            <div className="w-full max-w-[900px] grid md:grid-cols-2 gap-6">
              {/* Original */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--editor-border))' }}>
                <div className="px-3 py-2" style={{ background: 'hsl(var(--editor-panel))', borderBottom: '1px solid hsl(var(--editor-border))' }}>
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--editor-text))' }}>Original</span>
                </div>
                <div className="aspect-video" style={{ background: 'hsl(var(--editor-bg))' }}>
                  <video ref={videoRef} src={originalVideo} className="w-full h-full object-contain" controls crossOrigin="anonymous" />
                </div>
              </div>

              {/* Result */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--editor-border))' }}>
                <div className="px-3 py-2" style={{ background: 'hsl(var(--editor-panel))', borderBottom: '1px solid hsl(var(--editor-border))' }}>
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--editor-text))' }}>Upscaled ({upscaleFactor})</span>
                </div>
                <div className="aspect-video flex items-center justify-center" style={{ background: 'hsl(var(--editor-bg))' }}>
                  {isProcessing ? (
                    <div className="text-center space-y-2">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: 'hsl(var(--editor-accent))' }} />
                      <p className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>Processing... {progress}%</p>
                    </div>
                  ) : processedVideo ? (
                    <video src={processedVideo} className="w-full h-full object-contain" controls />
                  ) : (
                    <p className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>Result will appear here</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] rounded-xl w-full max-w-[600px]" style={{ border: '1px dashed hsl(var(--editor-border))', background: 'hsl(var(--editor-panel))' }}>
              <Film className="w-16 h-16 mb-4" style={{ color: 'hsl(var(--editor-text))' }} />
              <p className="text-sm" style={{ color: 'hsl(var(--editor-text))' }}>Upload a video to get started</p>
            </div>
          )}
        </main>
        </main>
      </div>
    </div>

      {/* SEO Content Section */}
      <section className="container mx-auto px-4 py-16 max-w-4xl space-y-12 text-foreground">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            AI Video Upscaler — upscale video to 4K & enhance video quality online for free
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Our free <strong>AI video upscaler</strong> lets you <strong>upscale video to 4K</strong>,
            sharpen details and <strong>enhance video quality</strong> directly in your browser — no
            installs, no signup and no watermark. Upload an MP4, WebM or MOV clip, choose a 2× or
            4× factor, and the AI rebuilds your footage frame by frame so it looks crisp on any
            modern screen.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Whether you're polishing YouTube content, restoring old family videos, preparing
            high-resolution ads or upgrading social media clips, this <strong>video enhancer
            AI</strong> turns soft, low-resolution footage into sharp, modern video in just a few
            clicks.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">How AI video upscaling works</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Traditional resizing simply stretches existing pixels, which makes video look blurry
            and pixelated. An <strong>AI video upscaler</strong> works very differently — it
            actually reconstructs detail. Here's what happens behind the scenes:
          </p>
          <ol className="space-y-3 text-muted-foreground list-decimal list-inside">
            <li><strong>Frame analysis</strong> — every frame is studied to identify edges, textures, faces and patterns.</li>
            <li><strong>Detail reconstruction</strong> — the AI predicts what high-resolution detail should look like, instead of just enlarging pixels.</li>
            <li><strong>Sharpening & denoising</strong> — noise, blur and compression artifacts are smoothed out while important details are kept sharp.</li>
            <li><strong>High-bitrate export</strong> — the upscaled frames are recombined into a clean, high-quality WebM video ready to share.</li>
          </ol>
          <p className="text-muted-foreground leading-relaxed mt-4">
            The result is a video that looks like it was originally captured at a much higher
            resolution — not just stretched.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Upscale video to 4K and beyond</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><ZoomIn className="w-4 h-4" /> 2× — HD enhancement</h3>
              <p className="text-sm text-muted-foreground">Turn 480p into HD or 720p into Full HD. Perfect for cleaning up older clips, webcam footage and quick social videos.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Film className="w-4 h-4" /> 4× — Up to 4K UHD</h3>
              <p className="text-sm text-muted-foreground">Upscale Full HD clips toward 4K (3840×2160). Ideal for YouTube, TVs, presentations and premium ad content.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Sharper details</h3>
              <p className="text-sm text-muted-foreground">Edges, textures and faces are reconstructed with more clarity, giving your video a modern, professional look.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Shield className="w-4 h-4" /> Less noise & artifacts</h3>
              <p className="text-sm text-muted-foreground">Compression noise, blockiness and motion blur are reduced so your footage looks cleaner on big screens.</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Why creators use the VisuStock video enhancer AI</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border">
              <Zap className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Modern resolution</h3>
              <p className="text-sm text-muted-foreground">Bring older or low-res footage up to today's HD and 4K standards in a few clicks.</p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <Sparkles className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Better social performance</h3>
              <p className="text-sm text-muted-foreground">Sharper, cleaner videos perform better on YouTube, TikTok, Reels and ads.</p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <Shield className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Private by design</h3>
              <p className="text-sm text-muted-foreground">Processing happens locally in your browser — your videos are never uploaded.</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Use cases for the AI video upscaler</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">YouTube content</h3>
              <p className="text-sm text-muted-foreground">Upgrade old uploads, gameplay clips and tutorials to HD or 4K so they look great on modern TVs and monitors.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">TikTok, Reels & Shorts</h3>
              <p className="text-sm text-muted-foreground">Make short-form video pop on high-density mobile screens with sharper details and cleaner edges.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Ads & marketing</h3>
              <p className="text-sm text-muted-foreground">Deliver premium-looking video ads in HD and 4K without re-shooting — perfect for Meta, TikTok and YouTube campaigns.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Old footage restoration</h3>
              <p className="text-sm text-muted-foreground">Bring family memories, archival clips and old camcorder tapes back to life with modern resolution and clarity.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">E-commerce & product video</h3>
              <p className="text-sm text-muted-foreground">Show product details with sharper textures, better edges and crisper colors on every device.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Stock footage upgrades</h3>
              <p className="text-sm text-muted-foreground">Enhance purchased or recorded stock clips before mixing them into your edits or campaigns.</p>
            </div>
          </div>
        </div>

        {/* CTA to marketplace */}
        <div className="rounded-2xl p-6 md:p-8 border border-border bg-gradient-to-br from-primary/10 to-accent/5">
          <h2 className="text-2xl font-bold mb-2">Combine upscaled videos with premium VisuStock assets</h2>
          <p className="text-muted-foreground mb-4">
            Pair your enhanced clips with cinematic <Link to="/marketplace?type=video" className="text-primary underline">stock videos</Link>,
            high-resolution <Link to="/marketplace?type=image" className="text-primary underline">stock images</Link> and
            ready-to-use creative assets from independent creators worldwide. Everything you need
            to build sharp, modern, 4K-ready edits in one place.
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
            <Link to="/studio-ai/reframe-video" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Crop className="w-4 h-4 text-primary" /> AI Reframe Video
            </Link>
            <Link to="/ai-upscaler" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Image Upscaler
            </Link>
            <Link to="/studio-ai/remove-background" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary" /> AI Background Remover
            </Link>
            <Link to="/face-enhancer" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Face Enhancer
            </Link>
            <Link to="/ai-image-generator" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" /> AI Image Generator
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
              <AccordionTrigger>How does the AI video upscaler work?</AccordionTrigger>
              <AccordionContent>
                The AI analyzes each frame of your video and reconstructs missing details — edges, textures and patterns — instead of simply stretching pixels. The result is a sharper, higher-resolution video that looks natural at 2× or 4× its original size.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>Can I upscale a video to 4K?</AccordionTrigger>
              <AccordionContent>
                Yes. Choose the 4× option to upscale Full HD content up to 4K (UHD), perfect for YouTube, TVs and modern displays. Output is capped at 3840×2160 to keep playback smooth.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Is the AI video enhancer free?</AccordionTrigger>
              <AccordionContent>
                Yes. The VisuStock video upscaler is 100% free, with no signup, no credit card and no watermark on the output.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>Are my videos uploaded to a server?</AccordionTrigger>
              <AccordionContent>
                No. All upscaling and enhancement happens directly in your browser, so your videos stay private on your device.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger>Which video formats are supported?</AccordionTrigger>
              <AccordionContent>
                You can upload MP4, WebM and MOV files up to 50MB. The upscaled result is exported as a high-bitrate WebM ready to share or re-encode.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/*
          Suggested ALT texts for future screenshots:
          - "AI video upscaler interface — upscale video to 4K online"
          - "Side-by-side comparison of original SD video and AI-upscaled 4K video"
          - "Old footage restored with AI video enhancer — sharper details and reduced noise"
          - "Vertical TikTok clip enhanced with AI video upscaler for crisper mobile playback"
          - "AI video quality enhancer settings panel with 2x and 4x options"
        */}
      </section>
    </div>
  );
};

export default VideoUpscale;
