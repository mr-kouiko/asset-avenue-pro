import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Upload, Download, Loader2, ZoomIn, Film } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UpscaleOption = "2x" | "4x";

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a valid video file");
      return;
    }

    // Max 50MB for video
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video must be less than 50MB");
      return;
    }

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

      // Wait for video metadata
      await new Promise<void>((resolve) => {
        if (video.readyState >= 1) {
          resolve();
        } else {
          video.onloadedmetadata = () => resolve();
        }
      });

      const factor = upscaleFactor === "2x" ? 2 : 4;
      const targetWidth = video.videoWidth * factor;
      const targetHeight = video.videoHeight * factor;

      // Check if dimensions are reasonable
      if (targetWidth > 3840 || targetHeight > 2160) {
        toast.error("Resulting video would exceed 4K resolution. Please use a smaller video or lower upscale factor.");
        setIsProcessing(false);
        return;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Get video duration and fps estimate
      const duration = video.duration;
      const fps = 30; // Assume 30fps
      const totalFrames = Math.floor(duration * fps);

      // Collect frames
      const frames: ImageData[] = [];
      
      for (let i = 0; i < totalFrames && i < 300; i++) { // Cap at 300 frames (10 seconds at 30fps)
        const time = (i / fps);
        video.currentTime = time;
        
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
        });

        // Draw and upscale using high-quality interpolation
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        
        frames.push(ctx.getImageData(0, 0, targetWidth, targetHeight));
        setProgress(Math.round((i / Math.min(totalFrames, 300)) * 50));
      }

      // Create upscaled video using MediaRecorder
      const stream = canvas.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 8000000, // 8 Mbps for quality
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          resolve(new Blob(chunks, { type: "video/webm" }));
        };
      });

      mediaRecorder.start();

      // Playback frames to record
      for (let i = 0; i < frames.length; i++) {
        ctx.putImageData(frames[i], 0, 0);
        await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
        setProgress(50 + Math.round((i / frames.length) * 50));
      }

      mediaRecorder.stop();
      const blob = await recordingPromise;

      const resultUrl = URL.createObjectURL(blob);
      setProcessedVideo(resultUrl);
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/studio-ai">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Video Upscale</h1>
              <p className="text-muted-foreground text-sm">
                Enhance video quality and upscale to HD or 4K
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Upload Section */}
          <Card className="p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Film className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Upload Your Video</h2>
                <p className="text-muted-foreground">
                  MP4, WebM, MOV up to 50MB • Max 10 seconds recommended
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                size="lg"
                className="gap-2"
              >
                <Upload className="h-5 w-5" />
                Select Video
              </Button>
            </div>
          </Card>

          {/* Options */}
          {originalVideo && (
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <ZoomIn className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Upscale Factor</span>
                </div>
                <Select
                  value={upscaleFactor}
                  onValueChange={(value: UpscaleOption) => setUpscaleFactor(value)}
                  disabled={isProcessing}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2x">2x (HD)</SelectItem>
                    <SelectItem value="4x">4x (4K)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>
          )}

          {/* Video Preview */}
          {originalVideo && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Original */}
              <Card className="p-4">
                <h3 className="font-medium mb-3 text-center">Original</h3>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={originalVideo}
                    className="w-full h-full object-contain"
                    controls
                    crossOrigin="anonymous"
                  />
                </div>
              </Card>

              {/* Result */}
              <Card className="p-4">
                <h3 className="font-medium mb-3 text-center">
                  Upscaled ({upscaleFactor})
                </h3>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  {isProcessing ? (
                    <div className="text-center space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Processing... {progress}%
                      </p>
                      <div className="w-48 h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : processedVideo ? (
                    <video
                      src={processedVideo}
                      className="w-full h-full object-contain"
                      controls
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Upscaled video will appear here
                    </p>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Actions */}
          {originalVideo && (
            <div className="flex justify-center gap-4">
              <Button
                onClick={upscaleVideo}
                disabled={isProcessing}
                size="lg"
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ZoomIn className="h-5 w-5" />
                    Upscale Video
                  </>
                )}
              </Button>

              {processedVideo && (
                <Button
                  onClick={downloadResult}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <Download className="h-5 w-5" />
                  Download
                </Button>
              )}
            </div>
          )}

          {/* Info */}
          <Card className="p-6 bg-muted/50">
            <h3 className="font-medium mb-2">Tips for best results</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use short videos (under 10 seconds) for faster processing</li>
              <li>• Higher quality source videos produce better upscaled results</li>
              <li>• 2x upscaling is faster and recommended for most uses</li>
              <li>• Processing happens in your browser - no upload needed</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VideoUpscale;
