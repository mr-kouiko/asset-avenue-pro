import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Volume2, Download, Loader2, Play, Pause } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const VOICES = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Warm British male" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Soft American female" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", description: "Upbeat American female" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", description: "Natural Australian male" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", description: "Articulate American male" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", description: "Friendly Australian female" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", description: "Warm British female" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", description: "Deep British male" },
];

export default function TextToSpeech() {
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) { toast.error("Please enter some text to convert"); return; }
    if (text.length > 5000) { toast.error("Text must be 5000 characters or less"); return; }

    setIsGenerating(true);
    setAudioUrl(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { toast.error("Please sign in to use Text to Speech"); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({ text: text.trim(), voiceId: selectedVoice }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      const audio = new Audio(url);
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);

      toast.success("Audio generated successfully!");
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
          <h1 className="text-sm font-semibold" style={{ color: 'hsl(var(--editor-text-bright))' }}>
            Text to Speech
          </h1>
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
                      <span className="ml-2 opacity-60">- {voice.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Text input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--editor-text))' }}>Text</label>
                <span className="text-xs" style={{ color: 'hsl(var(--editor-text))' }}>{text.length}/5000</span>
              </div>
              <Textarea
                placeholder="Enter the text you want to convert to speech..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                maxLength={5000}
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
                      style={{ color: 'hsl(var(--editor-text))', border: '1px solid hsl(var(--editor-border))' }}
                    >
                      <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                  </div>
                </div>
                <audio src={audioUrl} controls className="w-full" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] rounded-xl" style={{ border: '1px dashed hsl(var(--editor-border))', background: 'hsl(var(--editor-panel))' }}>
                <Volume2 className="w-16 h-16 mb-4" style={{ color: 'hsl(var(--editor-text))' }} />
                <p className="text-sm" style={{ color: 'hsl(var(--editor-text))' }}>
                  {isGenerating ? "Generating audio..." : "Enter text and click generate"}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
