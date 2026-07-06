import { useState, useRef, useEffect } from "react";
import { Upload, Video, Download, Loader2, Sparkles, X, ChevronLeft, Wand2, Maximize, Eraser, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const ImageToVideo = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  useSEO({
    title: "AI Image to Video – Animate Image Online Free | Photo to Video",
    description:
      "Free AI image to video: animate any image online, turn photos into cinematic videos with motion, zoom and pan. Perfect for TikTok, Reels & Shorts. No signup.",
    type: "website",
    tags: ["image to video", "AI image to video", "animate image online", "photo to video AI", "image animation AI"],
  });

  useEffect(() => {
    const appSchema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "VisuStock AI Image to Video",
      "applicationCategory": "MultimediaApplication",
      "operatingSystem": "Web",
      "description":
        "AI image to video tool that animates static images into dynamic short videos with cinematic motion, camera moves and natural transitions.",
      "url": "https://visustock.com/studio-ai/image-to-video",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "1180" },
    };
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "What is AI image to video?", "acceptedAnswer": { "@type": "Answer", "text": "AI image to video turns a static image into a short animated video by generating new frames with motion, camera movement and natural transitions — no editing required." } },
        { "@type": "Question", "name": "Is the photo to video AI free to use?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, you can animate images online for free. Generations use a small credit pack so you only pay for what you create." } },
        { "@type": "Question", "name": "Can I animate any photo?", "acceptedAnswer": { "@type": "Answer", "text": "Yes — portraits, products, landscapes, illustrations and AI-generated images all work. Higher-quality images with a clear subject give the best results." } },
        { "@type": "Question", "name": "How long are the generated videos?", "acceptedAnswer": { "@type": "Answer", "text": "Generated clips are around 5 seconds, ideal for TikTok, Instagram Reels, YouTube Shorts and ads." } },
        { "@type": "Question", "name": "Can I use the videos commercially?", "acceptedAnswer": { "@type": "Answer", "text": "Yes — videos you create with the AI image to video tool are yours to use for personal and commercial projects." } },
      ],
    };
    const s1 = document.createElement("script");
    s1.type = "application/ld+json"; s1.dataset.seo = "i2v-app"; s1.text = JSON.stringify(appSchema);
    const s2 = document.createElement("script");
    s2.type = "application/ld+json"; s2.dataset.seo = "i2v-faq"; s2.text = JSON.stringify(faqSchema);
    document.head.appendChild(s1); document.head.appendChild(s2);
    return () => { document.querySelectorAll('script[data-seo="i2v-app"], script[data-seo="i2v-faq"]').forEach(el => el.remove()); };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file (JPG, PNG, WebP)", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image under 10MB", variant: "destructive" });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setSelectedImage(e.target?.result as string);
    reader.readAsDataURL(file);
    setGeneratedVideoUrl(null);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    setGeneratedVideoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast({ title: "No image selected", description: "Please upload an image first", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGeneratedVideoUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke("image-to-video", {
        body: {
          imageUrl: selectedImage,
          prompt: prompt || "Animate this image with smooth, natural motion",
          duration: 5,
        },
      });

      if (error) throw new Error(error.message || "Failed to generate video");
      if (data?.error) throw new Error(data.error);

      if (data?.videoUrl) {
        setGeneratedVideoUrl(data.videoUrl);
        toast({ title: "Video generated!", description: "Your animated video is ready to view" });
      } else {
        throw new Error("No video URL returned");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({ title: "Generation failed", description: error instanceof Error ? error.message : "Failed to generate video", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedVideoUrl) return;
    try {
      const response = await fetch(generatedVideoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `animated-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Download started", description: "Your video is being downloaded" });
    } catch {
      toast({ title: "Download failed", description: "Could not download the video", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--editor-bg))' }}>
      <Header />
      <div className="flex flex-col" style={{ height: '100vh' }}>
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
            Image to Video
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {generatedVideoUrl && (
            <Button size="sm" variant="ghost" onClick={handleDownload} className="h-8 w-8 p-0" style={{ color: 'hsl(var(--editor-text))' }}>
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
            {!selectedImage ? (
              <label
                className="flex flex-col items-center justify-center w-full h-[180px] rounded-xl border border-dashed cursor-pointer transition-colors"
                style={{ borderColor: 'hsl(var(--editor-border))', background: 'hsl(var(--editor-bg))' }}
              >
                <Upload className="w-8 h-8 mb-2" style={{ color: 'hsl(var(--editor-text))' }} />
                <span className="text-sm font-medium" style={{ color: 'hsl(var(--editor-text))' }}>
                  Upload Image
                </span>
                <span className="text-xs mt-1" style={{ color: 'hsl(var(--editor-text))' }}>
                  JPG, PNG or WebP (max 10MB)
                </span>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
              </label>
            ) : (
              <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--editor-border))' }}>
                <img src={selectedImage} alt="Selected" className="w-full h-[180px] object-contain" style={{ background: 'hsl(var(--editor-bg))' }} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={clearImage}
                  style={{ background: 'hsl(0 60% 50% / 0.8)', color: '#fff' }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Prompt */}
            <div className="space-y-2">
              <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(var(--editor-text))' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'hsl(var(--editor-accent))' }} />
                Animation Prompt
              </label>
              <Textarea
                placeholder="Describe how you want the image to animate..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[80px] resize-none text-sm"
                maxLength={500}
                style={{
                  background: 'hsl(var(--editor-bg))',
                  borderColor: 'hsl(var(--editor-border))',
                  color: 'hsl(var(--editor-text-bright))',
                }}
              />
              <p className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>
                {prompt.length}/500 characters
              </p>
            </div>

            {/* Generate button */}
            <Button
              className="w-full h-10 rounded-lg font-medium text-sm gap-2"
              onClick={handleGenerate}
              disabled={!selectedImage || isGenerating}
              style={{
                background: 'hsl(var(--editor-accent))',
                color: '#fff',
                opacity: (!selectedImage || isGenerating) ? 0.5 : 1,
              }}
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Video className="w-4 h-4" /> Generate Video</>
              )}
            </Button>

            {isGenerating && (
              <p className="text-xs text-center" style={{ color: 'hsl(var(--editor-text))' }}>
                This may take 1-2 minutes...
              </p>
            )}

            {/* Tips */}
            <div className="rounded-lg p-3 space-y-1.5" style={{ background: 'hsl(var(--editor-bg))' }}>
              <h3 className="text-xs font-semibold" style={{ color: 'hsl(var(--editor-text-bright))' }}>Tips</h3>
              <ul className="text-xs space-y-1" style={{ color: 'hsl(var(--editor-text))' }}>
                <li>• High-quality images with clear subjects</li>
                <li>• Images with depth for parallax effects</li>
                <li>• Motion prompts like "waves crashing"</li>
                <li>• Videos are ~5 seconds in length</li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Main workspace */}
        <main className="flex-1 flex items-center justify-center p-6 overflow-auto" style={{ background: 'hsl(var(--editor-bg))' }}>
          <div className="w-full max-w-[900px]">
            {generatedVideoUrl ? (
              <div className="space-y-4">
                <video
                  src={generatedVideoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full rounded-xl"
                  style={{ border: '1px solid hsl(var(--editor-border))' }}
                />
                <div className="flex justify-center">
                  <Button onClick={handleDownload} className="gap-2" style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}>
                    <Download className="h-4 w-4" />
                    Download Video
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] rounded-xl" style={{ border: '1px dashed hsl(var(--editor-border))', background: 'hsl(var(--editor-panel))' }}>
                <Video className="w-16 h-16 mb-4" style={{ color: 'hsl(var(--editor-text))' }} />
                <p className="text-sm" style={{ color: 'hsl(var(--editor-text))' }}>
                  {isGenerating ? "Your video is being generated..." : "Upload an image and click generate"}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
      </div>

      {/* SEO content */}
      <section className="bg-background text-foreground">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto prose prose-invert prose-headings:text-foreground prose-p:text-muted-foreground">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              AI Image to Video — animate any image online for free
            </h2>
            <p>
              VisuStock's <strong>AI image to video</strong> tool turns a single photo into a short, cinematic
              video clip. Upload a portrait, product shot, landscape or AI-generated image and let our{" "}
              <strong>photo to video AI</strong> add motion, depth and camera movement automatically — no
              editing software, no timeline, no keyframes.
            </p>

            <h3 className="text-2xl font-semibold mt-10 mb-3">How AI image to video works</h3>
            <p>
              The model analyses your image, understands the scene (subject, depth, background) and generates
              new frames around it. The flow is simple: <em>image → motion planning → generated video frames
              → final clip</em>. You can guide the result with a short prompt — describe the camera move (zoom
              in, slow pan), an action ("waves crashing", "hair gently moving"), or a mood ("cinematic, slow
              motion"). The <strong>image animation AI</strong> handles the rest.
            </p>

            <h3 className="text-2xl font-semibold mt-10 mb-3">Why creators love it</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>No editing skills</strong> — upload, prompt, generate.</li>
              <li><strong>Fast animation</strong> — short clips ready in 1–2 minutes.</li>
              <li><strong>Cinematic results</strong> — natural motion, camera moves, depth and parallax.</li>
              <li><strong>Scene understanding</strong> — subjects stay consistent across frames.</li>
              <li><strong>Social-ready</strong> — perfect 5-second clips for TikTok, Reels and Shorts.</li>
            </ul>

            <h3 className="text-2xl font-semibold mt-10 mb-3">Use cases for image to video AI</h3>
            <p>
              Marketers <strong>animate product images</strong> into scroll-stopping ads. Social media
              managers turn portraits and lifestyle shots into TikTok and Instagram Reels. Photographers
              repurpose their best stills for YouTube Shorts. Storytellers bring AI-generated artwork to life,
              and brands convert static catalogues into engaging video content — all from a single image.
            </p>

            <h3 className="text-2xl font-semibold mt-10 mb-3">Combine your AI videos with premium stock</h3>
            <p>
              Animated images shine even more when paired with curated b-roll, backgrounds and graphics.
              Browse the VisuStock marketplace to add depth to every project:{" "}
              <Link to="/marketplace?type=video" className="text-primary hover:underline">premium stock videos</Link>,{" "}
              <Link to="/marketplace?type=image" className="text-primary hover:underline">stock images</Link> and{" "}
              <Link to="/free-stock-library" className="text-primary hover:underline">free stock content</Link>.
            </p>

            <div className="not-prose mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
              <h4 className="text-xl font-semibold mb-2">Combine AI videos with premium stock assets</h4>
              <p className="text-muted-foreground mb-4">
                Mix your animated images with handpicked footage, photos and graphics from the VisuStock marketplace.
              </p>
              <Link to="/marketplace">
                <Button size="lg" className="gap-2">Explore the marketplace</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Other Studio AI tools */}
        <div className="container mx-auto px-4 py-16 border-t border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">More free Studio AI tools</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { to: "/studio-ai/text-to-video", icon: Type, title: "Text to Video", desc: "Generate videos from text" },
                { to: "/studio-ai/video-upscale", icon: Video, title: "Video Upscaler", desc: "Upscale video to 4K" },
                { to: "/studio-ai/reframe-video", icon: Maximize, title: "Reframe Video", desc: "Resize & convert to vertical" },
                { to: "/studio-ai/remove-background", icon: Eraser, title: "Background Remover", desc: "Remove background online" },
              ].map((t) => (
                <Link key={t.to} to={t.to} className="group rounded-xl border border-border bg-card p-5 hover:border-primary transition-colors">
                  <t.icon className="w-6 h-6 text-primary mb-3" />
                  <div className="font-semibold mb-1 group-hover:text-primary">{t.title}</div>
                  <div className="text-sm text-muted-foreground">{t.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="container mx-auto px-4 py-16 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Frequently asked questions</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="q1">
                <AccordionTrigger>What is AI image to video?</AccordionTrigger>
                <AccordionContent>
                  AI image to video turns a static image into a short animated video by generating new frames
                  with motion, camera movement and natural transitions — no editing required.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger>Is the photo to video AI free to use?</AccordionTrigger>
                <AccordionContent>
                  Yes, you can animate images online for free. Generations use a small credit pack so you only
                  pay for what you create.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3">
                <AccordionTrigger>Can I animate any photo?</AccordionTrigger>
                <AccordionContent>
                  Yes — portraits, products, landscapes, illustrations and AI-generated images all work.
                  Higher-quality images with a clear subject give the best results.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q4">
                <AccordionTrigger>How long are the generated videos?</AccordionTrigger>
                <AccordionContent>
                  Generated clips are around 5 seconds, ideal for TikTok, Instagram Reels, YouTube Shorts and ads.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q5">
                <AccordionTrigger>Can I use the videos commercially?</AccordionTrigger>
                <AccordionContent>
                  Yes — videos you create with the AI image to video tool are yours to use for personal and
                  commercial projects.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/*
          Suggested ALT texts for future visual assets:
          - "AI image to video tool animating a portrait photo into a short cinematic clip"
          - "Product image transformed into a vertical TikTok-ready video with camera motion"
          - "Photo to video AI interface showing motion prompt and generated video preview"
          - "Landscape photo animated with parallax depth using VisuStock image animation AI"
        */}
      </section>
    <Footer />
    </div>
  );
};

export default ImageToVideo;
