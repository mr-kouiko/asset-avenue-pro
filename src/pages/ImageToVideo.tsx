import { useState, useRef, useEffect } from "react";
import { Upload, Video, Download, Loader2, Sparkles, X, ChevronLeft, Wand2, Maximize, Eraser, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";

const ImageToVideo = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

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
  );
};

export default ImageToVideo;
