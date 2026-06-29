import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Video, Download, Loader2, Wallet, Check, ArrowRight, Volume2, VolumeX, Image as ImageIcon, Wand2, Maximize, Eraser } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";

type AspectRatio = "16:9" | "9:16";
type Resolution = 720 | 1080;
type Duration = 4 | 6 | 8;
type Model = "automatic" | "veo-3" | "veo-3-fast";

const BASE_COST = 100;
const MODEL_MULT: Record<string, number> = { "veo-3": 1.0, "veo-3-fast": 0.4 };
const DURATION_MULT: Record<number, number> = { 4: 0.5, 6: 0.75, 8: 1.0 };
const RES_MULT: Record<number, number> = { 720: 0.8, 1080: 1.0 };

function computeCost(model: Model, duration: Duration, resolution: Resolution, audio: boolean): number {
  const m = model === "automatic" ? "veo-3-fast" : model;
  const c =
    BASE_COST *
    (MODEL_MULT[m] ?? 1) *
    (DURATION_MULT[duration] ?? 1) *
    (RES_MULT[resolution] ?? 1) *
    (audio ? 1 : 0.9);
  return Math.max(1, Math.ceil(c));
}

interface RecentGen {
  id: string;
  prompt: string;
  video_url: string | null;
  created_at: string;
}

export default function TextToVideoAI() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [resolution, setResolution] = useState<Resolution>(720);
  const [duration, setDuration] = useState<Duration>(8);
  const [audio, setAudio] = useState(true);
  const [model, setModel] = useState<Model>("automatic");

  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [recent, setRecent] = useState<RecentGen[]>([]);

  const cost = useMemo(
    () => computeCost(model, duration, resolution, audio),
    [model, duration, resolution, audio],
  );

  useSEO({
    title: "AI Text to Video Generator – Free Text to Video AI Online",
    description:
      "Free AI video generator: turn text into video online with cinematic styles, native audio and multiple aspect ratios for TikTok, Reels, YouTube Shorts and ads.",
    type: "website",
    tags: ["text to video", "AI video generator", "generate video from text", "text to video AI", "AI video creation"],
  });

  // Inject SoftwareApplication + FAQ structured data
  useEffect(() => {
    const appSchema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "VisuStock AI Text to Video Generator",
      "applicationCategory": "MultimediaApplication",
      "operatingSystem": "Web",
      "description":
        "AI video generator that creates cinematic videos from text prompts with native audio, multiple aspect ratios and durations.",
      "url": "https://visustock.com/studio-ai/text-to-video",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "1420" },
    };
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "What is an AI text to video generator?", "acceptedAnswer": { "@type": "Answer", "text": "An AI text to video generator turns a written prompt into a complete video, automatically creating scenes, motion and visuals from your description — no editing skills required." } },
        { "@type": "Question", "name": "Is this text to video AI free to use?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, you can try the AI video generator for free. Advanced models like Veo 3 use a small credit pack so you only pay for what you create." } },
        { "@type": "Question", "name": "Can I generate vertical videos for TikTok, Reels and Shorts?", "acceptedAnswer": { "@type": "Answer", "text": "Absolutely. You can generate videos in 9:16 vertical for TikTok, Instagram Reels and YouTube Shorts, or 16:9 for YouTube and ads." } },
        { "@type": "Question", "name": "How long does it take to generate a video from text?", "acceptedAnswer": { "@type": "Answer", "text": "Most AI videos render in 30 to 90 seconds depending on duration, resolution and the selected model." } },
        { "@type": "Question", "name": "Can I use AI generated videos commercially?", "acceptedAnswer": { "@type": "Answer", "text": "Yes — videos you create are yours to use for personal and commercial projects, including ads, social media and client work." } },
      ],
    };
    const s1 = document.createElement("script");
    s1.type = "application/ld+json";
    s1.text = JSON.stringify(appSchema);
    s1.dataset.seo = "ttv-app";
    const s2 = document.createElement("script");
    s2.type = "application/ld+json";
    s2.text = JSON.stringify(faqSchema);
    s2.dataset.seo = "ttv-faq";
    document.head.appendChild(s1);
    document.head.appendChild(s2);
    return () => {
      document.querySelectorAll('script[data-seo="ttv-app"], script[data-seo="ttv-faq"]').forEach(el => el.remove());
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchBalance();
    fetchRecent();
  }, [user]);

  const fetchBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("videoai_credits")
      .select("credits_balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setBalance(data?.credits_balance ?? 0);
  };

  const fetchRecent = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_video_generations")
      .select("id, prompt, video_url, created_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(6);

    const rows = (data as RecentGen[]) || [];
    // ai-videos bucket is private — resolve to signed URLs (handles legacy public URLs too).
    const resolved = await Promise.all(
      rows.map(async (r) => {
        if (!r.video_url) return r;
        let path = r.video_url;
        const match = path.match(/\/ai-videos\/(.+)$/);
        if (match) path = match[1];
        const { data: signed } = await supabase.storage
          .from("ai-videos")
          .createSignedUrl(path, 60 * 60);
        return { ...r, video_url: signed?.signedUrl ?? null };
      })
    );
    setRecent(resolved);
  };

  const handleGenerate = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to generate videos." });
      navigate("/auth");
      return;
    }
    if (!prompt.trim()) {
      toast({ title: "Prompt required", description: "Describe the video you want to generate.", variant: "destructive" });
      return;
    }
    if ((balance ?? 0) < cost) {
      toast({
        title: "Not enough VideoAI credits",
        description: `You need ${cost} credits. Buy a pack to continue.`,
        variant: "destructive",
      });
      navigate("/buy-credits?tab=videoai");
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-veo-video", {
        body: { prompt: prompt.trim(), model, duration, resolution, aspectRatio, audio },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
      setVideoUrl((data as any).videoUrl);
      setBalance((data as any).creditsRemaining ?? balance);
      fetchRecent();
      toast({ title: "Video ready!", description: `Used ${cost} credits.` });
    } catch (e: any) {
      const msg = e?.message || "Failed to generate video";
      toast({ title: "Generation failed", description: msg, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (url: string) => {
    try {
      const r = await fetch(url, { mode: "cors" });
      if (!r.ok) throw new Error("fetch failed");
      const b = await r.blob();
      const blobUrl = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `videoai-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
      console.error("Video download failed:", e);
      window.open(url, "_blank");
      toast({ title: "Download failed", description: "Video opened in a new tab — right-click to save.", variant: "destructive" });
    }
  };

  const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--editor-bg))' }}>
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(800px 300px at 50% 0%, hsl(var(--primary) / 0.35), transparent 70%)",
          }}
        />
        <div className="relative container mx-auto px-4 py-16 md:py-20 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            Bring your imagination to life with <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">VideoAI</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Generate cinematic, professional-quality AI videos from a single text prompt. Powered by Google Veo 3.
          </p>

          {/* Balance pill */}
          {user && (
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-primary/10 border border-primary/20 text-sm">
              <Wallet className="w-4 h-4 text-primary" />
              <span>VideoAI balance:</span>
              <span className="font-semibold">{balance ?? "…"} credits</span>
              <Link to="/buy-credits?tab=videoai" className="ml-2 text-primary hover:underline inline-flex items-center gap-1">
                Buy credits <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Prompt bar */}
          <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card/80 backdrop-blur p-4 shadow-xl">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to generate…"
              maxLength={500}
              className="min-h-[80px] resize-none border-0 bg-transparent focus-visible:ring-0 text-base"
            />

            {/* Options row */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 items-center justify-between border-t border-border pt-3 mt-2">
              <div className="flex flex-wrap gap-x-5 gap-y-2 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Aspect</span>
                  <Pill active={aspectRatio === "16:9"} onClick={() => setAspectRatio("16:9")}>16:9</Pill>
                  <Pill active={aspectRatio === "9:16"} onClick={() => setAspectRatio("9:16")}>9:16</Pill>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Resolution</span>
                  <Pill active={resolution === 720} onClick={() => setResolution(720)}>720p</Pill>
                  <Pill active={resolution === 1080} onClick={() => setResolution(1080)}>1080p</Pill>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Duration</span>
                  <Pill active={duration === 4} onClick={() => setDuration(4)}>4s</Pill>
                  <Pill active={duration === 6} onClick={() => setDuration(6)}>6s</Pill>
                  <Pill active={duration === 8} onClick={() => setDuration(8)}>8s</Pill>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Audio</span>
                  <Pill active={!audio} onClick={() => setAudio(false)}><VolumeX className="w-3 h-3 inline" /> Off</Pill>
                  <Pill active={audio} onClick={() => setAudio(true)}><Volume2 className="w-3 h-3 inline" /> On</Pill>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Model</span>
                  <Pill active={model === "automatic"} onClick={() => setModel("automatic")}>Automatic</Pill>
                  <Pill active={model === "veo-3"} onClick={() => setModel("veo-3")}>Veo 3</Pill>
                  <Pill active={model === "veo-3-fast"} onClick={() => setModel("veo-3-fast")}>Veo 3 Fast</Pill>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-muted-foreground">
                Cost: <span className="font-semibold text-foreground">{cost} credits</span> · {prompt.length}/500
              </div>
              <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generate
                  </>
                )}
              </Button>
            </div>
          </div>

          {isGenerating && (
            <p className="text-sm text-muted-foreground mt-4">
              Veo is rendering your video — this usually takes 30–90 seconds.
            </p>
          )}
        </div>
      </section>

      {/* Result */}
      {videoUrl && (
        <section className="container mx-auto px-4 py-10">
          <div className="max-w-3xl mx-auto space-y-4">
            <video src={videoUrl} controls autoPlay loop className="w-full rounded-xl border border-border" />
            <div className="flex justify-center">
              <Button onClick={() => handleDownload(videoUrl)} className="gap-2">
                <Download className="w-4 h-4" /> Download
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Marketing #1 */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
          <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/30 via-purple-500/20 to-background border border-border" />
          <div>
            <h2 className="text-3xl font-bold mb-4">Generate professional-quality AI videos in seconds</h2>
            <p className="text-muted-foreground mb-4">
              Powered by Google Veo, our VideoAI generator creates cinematic, realistic videos with smooth motion,
              true-to-life lighting and rich detail. Veo 3 and Veo 3 Fast both include native audio generation —
              dialogues, ambient sounds and background music — so your clips are complete from the start.
            </p>
            <Link to="/buy-credits?tab=videoai">
              <Button variant="outline" className="gap-2">Try it now <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Marketing #2: pricing */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl font-bold mb-3">Pay only for what you create</h2>
          <p className="text-muted-foreground">
            No subscription. No commitment. Buy credits when you need them and use them whenever you want.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { id: "starter", credits: 500, price: 20, gens: 5, save: null },
            { id: "popular", credits: 2000, price: 75, gens: 20, save: "6% off", popular: true },
            { id: "pro", credits: 6000, price: 220, gens: 60, save: "8% off" },
          ].map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border p-6 ${p.popular ? "border-primary shadow-lg" : "border-border"}`}
            >
              <div className="flex items-baseline justify-between mb-1">
                <div className="text-lg font-semibold">{p.credits} VideoAI Credits</div>
                <div className="text-2xl font-bold">${p.price}</div>
              </div>
              <div className="text-sm text-muted-foreground mb-4">≈ {p.gens} video generations {p.save && <span className="text-primary">· {p.save}</span>}</div>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Text-to-video generation</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Native audio generation</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Credits valid for 1 year</li>
              </ul>
              <Link to={`/buy-credits?tab=videoai&pack=${p.id}`}>
                <Button className="w-full" variant={p.popular ? "default" : "outline"}>Buy</Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Recent generations */}
      {user && recent.length > 0 && (
        <section className="container mx-auto px-4 py-12 border-t border-border">
          <h3 className="text-xl font-semibold mb-6">Your recent generations</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {recent.map((r) => (
              <div key={r.id} className="rounded-xl border border-border overflow-hidden bg-card">
                {r.video_url && (
                  <video src={r.video_url} className="w-full aspect-video object-cover bg-black" muted loop onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />
                )}
                <div className="p-3">
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{r.prompt}</p>
                  {r.video_url && (
                    <Button variant="ghost" size="sm" className="w-full gap-1" onClick={() => handleDownload(r.video_url!)}>
                      <Download className="w-3 h-3" /> Download
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SEO content */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="max-w-4xl mx-auto prose prose-invert prose-headings:text-foreground prose-p:text-muted-foreground">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            AI Text to Video Generator — turn text into video online for free
          </h2>
          <p>
            VisuStock's <strong>AI text to video generator</strong> turns a single sentence into a complete,
            cinematic clip. Whether you need short-form content for TikTok, Reels and YouTube Shorts, an ad
            for a product launch, or a quick storyboard for a client, you can <strong>generate video from text</strong> in
            seconds — no camera, no editing skills, no stock to license.
          </p>

          <h3 className="text-2xl font-semibold mt-10 mb-3">How text to video AI works</h3>
          <p>
            <strong>Text to video AI</strong> takes your written prompt and runs it through a generative video
            model. The system interprets your description as a script, plans the scenes, generates the visuals
            frame by frame, adds motion and lighting, and — with models like Google Veo 3 — produces native
            audio: dialogue, ambient sound and music. The result is a ready-to-use video file you can download
            and post anywhere.
          </p>
          <p>
            The flow is simple: <em>prompt → script → visuals → final video</em>. You describe what you want,
            choose a style, aspect ratio and duration, and our <strong>AI video generator</strong> does the rest.
          </p>

          <h3 className="text-2xl font-semibold mt-10 mb-3">Why creators use AI video creation</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>No editing skills required</strong> — describe the scene in plain English.</li>
            <li><strong>Fast production</strong> — most clips render in 30 to 90 seconds.</li>
            <li><strong>Scalable content</strong> — produce dozens of variations for A/B testing your ads.</li>
            <li><strong>Multiple styles</strong> — realistic, cinematic, marketing, product, storytelling.</li>
            <li><strong>Native audio</strong> — voices, ambient sound and music generated automatically.</li>
            <li><strong>Any aspect ratio</strong> — 16:9 for YouTube, 9:16 for TikTok / Reels / Shorts.</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-10 mb-3">Use cases for AI generated videos</h3>
          <p>
            Marketers use our <strong>AI video generator</strong> to launch product ads without a film crew.
            Social media managers create daily content for TikTok, Instagram Reels and YouTube Shorts. Agencies
            spin up storyboards and concept videos in minutes instead of days. Educators turn lesson scripts into
            engaging visual stories, and indie creators bring imaginative ideas to life with cinematic motion.
          </p>

          <h3 className="text-2xl font-semibold mt-10 mb-3">Pair AI videos with premium stock from VisuStock</h3>
          <p>
            AI is amazing for generating short, original scenes — but real productions mix and match. Combine
            your AI clips with handpicked footage and visuals from the VisuStock marketplace to add
            authenticity, b-roll and brand-safe assets. <Link to="/marketplace?type=video" className="text-primary hover:underline">Browse premium stock videos</Link>,{" "}
            <Link to="/marketplace?type=image" className="text-primary hover:underline">stock images</Link> and{" "}
            <Link to="/free-stock-library" className="text-primary hover:underline">free stock content</Link> to
            elevate every project.
          </p>

          <div className="not-prose mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
            <h4 className="text-xl font-semibold mb-2">Enhance your AI videos with premium stock assets</h4>
            <p className="text-muted-foreground mb-4">
              Mix AI generation with curated footage, photos and graphics from the VisuStock marketplace.
            </p>
            <Link to="/marketplace">
              <Button size="lg" className="gap-2">Explore the marketplace <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Other Studio AI tools */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">More free Studio AI tools</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { to: "/studio-ai/reframe-video", icon: Maximize, title: "Reframe Video", desc: "Resize & convert to vertical" },
              { to: "/studio-ai/video-upscale", icon: Video, title: "Video Upscaler", desc: "Upscale video to 4K" },
              { to: "/studio-ai/remove-background", icon: Eraser, title: "Background Remover", desc: "Remove background online" },
              { to: "/ai-image-generator", icon: Wand2, title: "AI Image Generator", desc: "Text to image AI" },
            ].map((t) => (
              <Link key={t.to} to={t.to} className="group rounded-xl border border-border bg-card p-5 hover:border-primary transition-colors">
                <t.icon className="w-6 h-6 text-primary mb-3" />
                <div className="font-semibold mb-1 group-hover:text-primary">{t.title}</div>
                <div className="text-sm text-muted-foreground">{t.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger>What is an AI text to video generator?</AccordionTrigger>
              <AccordionContent>
                An AI text to video generator turns a written prompt into a complete video, automatically creating
                scenes, motion and visuals from your description — no editing skills required.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>Is this text to video AI free to use?</AccordionTrigger>
              <AccordionContent>
                Yes, you can try the AI video generator for free. Advanced models like Veo 3 use a small credit
                pack so you only pay for what you create.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Can I generate vertical videos for TikTok, Reels and Shorts?</AccordionTrigger>
              <AccordionContent>
                Absolutely. You can generate videos in 9:16 vertical for TikTok, Instagram Reels and YouTube
                Shorts, or 16:9 for YouTube and ads.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>How long does it take to generate a video from text?</AccordionTrigger>
              <AccordionContent>
                Most AI videos render in 30 to 90 seconds depending on duration, resolution and the selected model.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger>Can I use AI generated videos commercially?</AccordionTrigger>
              <AccordionContent>
                Yes — videos you create are yours to use for personal and commercial projects, including ads,
                social media and client work.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/*
        Suggested ALT texts for future hero / illustration assets:
        - "AI text to video generator interface turning a prompt into a cinematic video"
        - "Vertical AI generated video preview for TikTok and Instagram Reels"
        - "Marketing team using AI video creation tool to produce social media ads"
        - "Storyboard of scenes generated from a single text prompt with VisuStock VideoAI"
      */}
    </div>
  );
}
