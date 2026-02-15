import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Volume2, Download, Loader2, Play, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to convert");
      return;
    }

    if (text.length > 5000) {
      toast.error("Text must be 5000 characters or less");
      return;
    }

    setIsGenerating(true);
    setAudioUrl(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("Please sign in to use Text to Speech");
        return;
      }

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

    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.play();
      setIsPlaying(true);
    }
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/studio-ai")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Studio AI
        </Button>

        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Volume2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Text to Speech</h1>
            <p className="text-muted-foreground">
              Convert your text into natural-sounding speech with AI voices
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Generate Speech</CardTitle>
              <CardDescription>
                Enter your text and select a voice to generate audio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Voice</label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <span className="font-medium">{voice.name}</span>
                        <span className="text-muted-foreground ml-2">- {voice.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Text</label>
                  <span className="text-xs text-muted-foreground">
                    {text.length}/5000 characters
                  </span>
                </div>
                <Textarea
                  placeholder="Enter the text you want to convert to speech..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  maxLength={5000}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Volume2 className="mr-2 h-4 w-4" />
                    Generate Speech
                  </>
                )}
              </Button>

              {audioUrl && (
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Generated Audio</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={togglePlayback}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Play
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <audio src={audioUrl} controls className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
