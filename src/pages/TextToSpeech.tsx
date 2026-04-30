import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Volume2, Download, Loader2, Play, Pause, Gauge, Music2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Text to Speech – AI Voice Generator",
      url: "https://visustock.com/studio-ai/text-to-speech",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      description:
        "Free online AI text to speech generator with realistic neural voices in English, French, Spanish, German and Arabic. Perfect for YouTube voiceovers, ads, TikTok, e-learning and podcasts.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", ratingCount: "247" },
      featureList: [
        "16 realistic AI voices",
        "Multilingual text to speech (EN, FR, ES, DE, AR)",
        "Adjustable speed and pitch",
        "MP3 download, no signup",
        "Free voice over generator for videos",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is this AI text to speech generator free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, the VisuStock Studio AI text to speech tool is 100% free. Type your script, pick a realistic AI voice and download the MP3 — no credit card or watermark.",
          },
        },
        {
          "@type": "Question",
          name: "Which languages and voices are supported?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The AI voice generator supports English (US, UK, AU), French, Spanish, German and Arabic with 16 natural neural voices, both male and female.",
          },
        },
        {
          "@type": "Question",
          name: "Can I use the AI voice for YouTube videos and ads?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. The generated MP3 can be used for YouTube voiceovers, TikTok videos, Instagram Reels, ads, podcasts and e-learning courses, both personal and commercial.",
          },
        },
        {
          "@type": "Question",
          name: "How realistic are the AI voices?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We use Microsoft Neural TTS, one of the most realistic AI voice generators available, with natural intonation, breathing and emotion that sound close to a human voiceover artist.",
          },
        },
        {
          "@type": "Question",
          name: "Can I combine the AI voice with stock videos and images?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Absolutely. Pair your AI voiceover with VisuStock royalty-free stock videos and images to produce complete, professional content in minutes.",
          },
        },
      ],
    },
  ],
};

const VOICES = [
  { id: "en-US-JennyNeural", name: "Jenny", description: "Warm female (US)", lang: "English" },
  { id: "en-US-AriaNeural", name: "Aria", description: "Friendly female (US)", lang: "English" },
  { id: "en-US-GuyNeural", name: "Guy", description: "Casual male (US)", lang: "English" },
  { id: "en-US-DavisNeural", name: "Davis", description: "Deep male (US)", lang: "English" },
  { id: "en-GB-SoniaNeural", name: "Sonia", description: "Warm female (UK)", lang: "English" },
  { id: "en-GB-RyanNeural", name: "Ryan", description: "Articulate male (UK)", lang: "English" },
  { id: "en-AU-NatashaNeural", name: "Natasha", description: "Friendly female (AU)", lang: "English" },
  { id: "en-AU-WilliamNeural", name: "William", description: "Natural male (AU)", lang: "English" },
  { id: "fr-FR-DeniseNeural", name: "Denise", description: "Douce féminine (FR)", lang: "French" },
  { id: "fr-FR-HenriNeural", name: "Henri", description: "Masculin naturel (FR)", lang: "French" },
  { id: "es-ES-ElviraNeural", name: "Elvira", description: "Cálida femenina (ES)", lang: "Spanish" },
  { id: "es-ES-AlvaroNeural", name: "Alvaro", description: "Masculino natural (ES)", lang: "Spanish" },
  { id: "de-DE-KatjaNeural", name: "Katja", description: "Warme Stimme (DE)", lang: "German" },
  { id: "de-DE-ConradNeural", name: "Conrad", description: "Natürlich männlich (DE)", lang: "German" },
  { id: "ar-SA-ZariyahNeural", name: "Zariyah", description: "أنثوية دافئة (AR)", lang: "Arabic" },
  { id: "ar-SA-HamedNeural", name: "Hamed", description: "ذكوري طبيعي (AR)", lang: "Arabic" },
];

export default function TextToSpeech() {
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [rate, setRate] = useState(0);    // -50 to +100
  const [pitch, setPitch] = useState(0);  // -50 to +50
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useSEO({
    title: "AI Text to Speech Online – Realistic AI Voice Generator",
    description:
      "Free AI text to speech online: 16 realistic neural voices in 5 languages. Perfect voice over generator for YouTube, TikTok, ads & podcasts. No signup.",
    type: "website",
    tags: [
      "text to speech",
      "AI voice generator",
      "text to speech online",
      "realistic AI voice",
      "voice over generator",
      "free TTS",
      "AI voiceover for YouTube",
    ],
  });

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "text-to-speech-jsonld";
    script.text = JSON.stringify(STRUCTURED_DATA);
    document.head.appendChild(script);
    return () => {
      document.getElementById("text-to-speech-jsonld")?.remove();
    };
  }, []);

  const formatRate = (v: number) => (v >= 0 ? `+${v}%` : `${v}%`);
  const formatPitch = (v: number) => (v >= 0 ? `+${v}Hz` : `${v}Hz`);

  const handleGenerate = async () => {
    if (!text.trim()) { toast.error("Please enter some text to convert"); return; }
    if (text.length > 10000) { toast.error("Text must be 10,000 characters or less"); return; }

    // Create Audio element immediately in user gesture context (iOS Safari fix)
    const audio = new Audio();
    audio.preload = "auto";
    audio.play().catch(() => {}); // Unlock for autoplay policy

    setIsGenerating(true);
    if (audioUrl) { URL.revokeObjectURL(audioUrl); }
    setAudioUrl(null);
    if (audioElement) { audioElement.pause(); }
    setIsPlaying(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { toast.error("Please sign in to use Text to Speech"); setIsGenerating(false); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edge-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            text: text.trim(),
            voice: selectedVoice,
            rate: formatRate(rate),
            pitch: formatPitch(pitch),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      if (audioBlob.size === 0) {
        throw new Error("Received empty audio data");
      }
      console.log(`Received audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
      
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      audio.src = url;
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);

      toast.success("Audio generated successfully — 100% free!");
    } catch (error: any) {
      console.error("TTS error:", error);
      toast.error(error.message || "Failed to generate audio");
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayback = () => {
    if (!audioElement) return;
    if (isPlaying) { audioElement.pause(); setIsPlaying(false); }
    else { audioElement.play(); setIsPlaying(true); }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `speech-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Audio downloaded!");
  };

  const selectedVoiceInfo = VOICES.find(v => v.id === selectedVoice);

  return (
    <div className="h-screen flex flex-col" style={{ background: 'hsl(var(--editor-bg))' }}>
      {/* Top bar */}
      <header
        className="h-12 flex items-center justify-between px-4 shrink-0 z-20"
        style={{ borderBottom: '1px solid hsl(var(--editor-border))', background: 'hsl(var(--editor-sidebar))' }}
      >
        <div className="flex items-center gap-3">
          <Link to="/studio-ai" className="flex items-center gap-1 text-sm hover:opacity-80 transition-opacity" style={{ color: 'hsl(var(--editor-text))' }}>
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-semibold" style={{ color: 'hsl(var(--editor-text-bright))' }}>
            Text to Speech
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'hsl(var(--editor-accent) / 0.2)', color: 'hsl(var(--editor-accent))' }}>FREE</span>
        </div>
        <div className="flex items-center gap-2">
          {audioUrl && (
            <>
              <Button size="sm" variant="ghost" onClick={togglePlayback} className="h-8 w-8 p-0" style={{ color: 'hsl(var(--editor-text))' }}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDownload} className="h-8 w-8 p-0" style={{ color: 'hsl(var(--editor-text))' }}>
                <Download className="w-4 h-4" />
              </Button>
            </>
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
            {/* Voice selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(var(--editor-text))' }}>
                <Volume2 className="w-3.5 h-3.5" style={{ color: 'hsl(var(--editor-accent))' }} />
                Voice
              </label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger style={{ background: 'hsl(var(--editor-bg))', borderColor: 'hsl(var(--editor-border))', color: 'hsl(var(--editor-text-bright))' }}>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <span className="font-medium">{voice.name}</span>
                      <span className="ml-2 opacity-60">— {voice.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedVoiceInfo && (
                <p className="text-[10px] opacity-50" style={{ color: 'hsl(var(--editor-text))' }}>
                  {selectedVoiceInfo.lang} · Microsoft Neural
                </p>
              )}
            </div>

            {/* Speed slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(var(--editor-text))' }}>
                  <Gauge className="w-3.5 h-3.5" style={{ color: 'hsl(var(--editor-accent))' }} />
                  Speed
                </label>
                <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--editor-text))' }}>{formatRate(rate)}</span>
              </div>
              <Slider
                value={[rate]}
                onValueChange={([v]) => setRate(v)}
                min={-50}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-[9px] opacity-40" style={{ color: 'hsl(var(--editor-text))' }}>
                <span>Slower</span><span>Normal</span><span>Faster</span>
              </div>
            </div>

            {/* Pitch slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(var(--editor-text))' }}>
                  <Music2 className="w-3.5 h-3.5" style={{ color: 'hsl(var(--editor-accent))' }} />
                  Pitch
                </label>
                <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--editor-text))' }}>{formatPitch(pitch)}</span>
              </div>
              <Slider
                value={[pitch]}
                onValueChange={([v]) => setPitch(v)}
                min={-50}
                max={50}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-[9px] opacity-40" style={{ color: 'hsl(var(--editor-text))' }}>
                <span>Lower</span><span>Normal</span><span>Higher</span>
              </div>
            </div>

            {/* Text input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--editor-text))' }}>Script</label>
                <span className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>{text.length}/10000</span>
              </div>
              <Textarea
                placeholder="Enter the text you want to convert to speech..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                maxLength={10000}
                className="resize-none text-sm"
                style={{
                  background: 'hsl(var(--editor-bg))',
                  borderColor: 'hsl(var(--editor-border))',
                  color: 'hsl(var(--editor-text-bright))',
                }}
              />
            </div>

            {/* Generate button */}
            <Button
              className="w-full h-10 rounded-lg font-medium text-sm gap-2"
              onClick={handleGenerate}
              disabled={isGenerating || !text.trim()}
              style={{
                background: 'hsl(var(--editor-accent))',
                color: '#fff',
                opacity: (isGenerating || !text.trim()) ? 0.5 : 1,
              }}
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Volume2 className="w-4 h-4" /> Generate Speech</>
              )}
            </Button>
          </div>
        </aside>

        {/* Main workspace */}
        <main className="flex-1 flex items-center justify-center p-6 overflow-auto" style={{ background: 'hsl(var(--editor-bg))' }}>
          <div className="w-full max-w-[700px]">
            {audioUrl ? (
              <div className="rounded-xl p-6 space-y-6" style={{ border: '1px solid hsl(var(--editor-border))', background: 'hsl(var(--editor-panel))' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--editor-text-bright))' }}>Generated Audio</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost" size="sm" onClick={togglePlayback}
                      style={{ color: 'hsl(var(--editor-text))', border: '1px solid hsl(var(--editor-border))' }}
                    >
                      {isPlaying ? <><Pause className="mr-2 h-4 w-4" /> Pause</> : <><Play className="mr-2 h-4 w-4" /> Play</>}
                    </Button>
                    <Button
                      variant="ghost" size="sm" onClick={handleDownload}
                      className="text-black"
                      style={{ border: '1px solid hsl(var(--editor-border))' }}
                    >
                      <Download className="mr-2 h-4 w-4" /> Download MP3
                    </Button>
                  </div>
                </div>
                <audio src={audioUrl} controls className="w-full" />
                <p className="text-[10px] text-center opacity-40" style={{ color: 'hsl(var(--editor-text))' }}>
                  Powered by Microsoft Edge Neural TTS — Free, no API key required
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] rounded-xl" style={{ border: '1px dashed hsl(var(--editor-border))', background: 'hsl(var(--editor-panel))' }}>
                <Volume2 className="w-16 h-16 mb-4" style={{ color: 'hsl(var(--editor-text))' }} />
                <p className="text-sm" style={{ color: 'hsl(var(--editor-text))' }}>
                  {isGenerating ? "Generating audio..." : "Enter text and click generate"}
                </p>
                <p className="text-[10px] mt-2 opacity-40" style={{ color: 'hsl(var(--editor-text))' }}>
                  16 neural voices · Free · No limits
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
