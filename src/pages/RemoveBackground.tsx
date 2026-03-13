import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Upload, Download, Loader2, Scissors,
  ImagePlus, ChevronLeft, RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RemoveBackground() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');

  useSEO({
    title: 'Remove Background - AI Background Remover | Studio AI',
    description: 'Instantly remove backgrounds from images with AI. Get clean, professional results with transparent backgrounds in seconds.',
    type: 'website'
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please upload an image file (JPG, PNG, WebP).', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please upload an image smaller than 10MB.', variant: 'destructive' });
      return;
    }
    setFileName(file.name);
    setResultImage(null);
    const reader = new FileReader();
    reader.onload = (event) => setOriginalImage(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveBackground = async () => {
    if (!originalImage) {
      toast({ title: 'No image selected', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    setResultImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('remove-background', {
        body: { imageUrl: originalImage }
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error === 'rate_limited') {
          toast({ title: 'Rate Limit Reached', description: 'Please wait a few minutes before trying again.', variant: 'destructive' });
        } else if (data.error === 'payment_required') {
          toast({ title: 'Credits Exhausted', description: 'The AI service needs more credits. Please contact support.', variant: 'destructive' });
        } else {
          toast({ title: 'Processing Failed', description: data.message || 'Unable to remove background. Please try again.', variant: 'destructive' });
        }
        return;
      }
      if (data?.resultUrl) {
        setResultImage(data.resultUrl);
        toast({ title: 'Background Removed!', description: 'Your image is ready to download.' });
      } else {
        throw new Error('No result image returned');
      }
    } catch (error: any) {
      console.error('Error removing background:', error);
      toast({ title: 'Error', description: 'Failed to process image. Please try again.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = fileName.replace(/\.[^/.]+$/, '') + '-no-bg.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setOriginalImage(null);
    setResultImage(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4" style={{ color: 'hsl(var(--editor-text-bright))' }}>
          Remove Background
        </h1>
        <p className="text-lg" style={{ color: 'hsl(var(--editor-text))' }}>
          AI-powered background removal in seconds
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl p-6" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            <label 
              className="flex flex-col items-center justify-center w-full h-[180px] rounded-xl border border-dashed cursor-pointer transition-colors"
              style={{ borderColor: 'hsl(var(--editor-border))', background: 'hsl(var(--editor-bg))' }}
            >
              <ImagePlus className="w-10 h-10 mb-3" style={{ color: 'hsl(var(--editor-text))' }} />
              <span className="text-sm font-medium" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                {originalImage ? 'Change Image' : 'Upload Image'}
              </span>
              <span className="text-xs mt-1" style={{ color: 'hsl(var(--editor-text))' }}>
                PNG, JPG, WebP (max 10MB)
              </span>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
            </label>

            <Button
              className="w-full mt-4 h-11 rounded-lg font-medium gap-2"
              onClick={handleRemoveBackground}
              disabled={!originalImage || isProcessing}
              style={{
                background: 'hsl(var(--editor-accent))',
                color: '#fff',
                opacity: (!originalImage || isProcessing) ? 0.5 : 1,
              }}
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                <><Scissors className="w-4 h-4" /> Remove Background</>
              )}
            </Button>

            {resultImage && (
              <>
                <Button
                  className="w-full mt-3 h-11 rounded-lg font-medium gap-2"
                  onClick={handleDownload}
                  style={{ background: 'hsl(var(--editor-panel))', color: 'hsl(var(--editor-text-bright))', border: '1px solid hsl(var(--editor-border))' }}
                >
                  <Download className="w-4 h-4" /> Download PNG
                </Button>
                <Button
                  className="w-full mt-2 h-11 rounded-lg font-medium gap-2"
                  variant="ghost"
                  onClick={handleReset}
                  style={{ color: 'hsl(var(--editor-text))' }}
                >
                  <RotateCcw className="w-4 h-4" /> Start Over
                </Button>
              </>
            )}
          </div>

          <div className="rounded-xl p-6" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'hsl(var(--editor-text-bright))' }}>
              Tips
            </span>
            <div className="space-y-3 mt-3">
              {[
                { title: 'Clear Subject', desc: 'Distinct subject with clear edges works best.' },
                { title: 'Good Lighting', desc: 'Well-lit images with good contrast produce cleaner cutouts.' },
                { title: 'High Resolution', desc: 'Higher resolution allows for more precise edge detection.' },
              ].map((tip) => (
                <div key={tip.title} className="p-3 rounded-lg text-xs" style={{ background: 'hsl(var(--editor-bg))', border: '1px solid hsl(var(--editor-border))' }}>
                  <p className="font-medium mb-1" style={{ color: 'hsl(var(--editor-text-bright))' }}>{tip.title}</p>
                  <p style={{ color: 'hsl(var(--editor-text))' }}>{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div 
            className="rounded-xl min-h-[500px] flex flex-col items-center justify-center p-8"
            style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}
          >
            {!originalImage ? (
              <div className="text-center">
                <ImagePlus className="w-16 h-16 mx-auto mb-4" style={{ color: 'hsl(var(--editor-text))' }} />
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                  Upload an image to get started
                </h2>
                <p className="mb-4" style={{ color: 'hsl(var(--editor-text))' }}>
                  AI will automatically remove the background
                </p>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg cursor-pointer font-medium transition-colors"
                  style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}
                >
                  <Upload className="w-4 h-4" /> Choose Image
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                </label>
              </div>
            ) : (
              <div className="w-full space-y-6">
                <div className="relative">
                  <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: 'hsl(140 60% 45%)', color: '#fff' }}>
                    Original
                  </span>
                  <img 
                    src={originalImage} 
                    alt="Original" 
                    className="w-full rounded-lg object-contain max-h-[300px]"
                    style={{ background: 'hsl(var(--editor-bg))' }} 
                  />
                </div>

                {isProcessing && (
                  <div className="text-center py-8">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: 'hsl(var(--editor-accent))' }} />
                    <p style={{ color: 'hsl(var(--editor-text))' }}>Removing background with AI...</p>
                  </div>
                )}

                {resultImage && (
                  <div className="relative">
                    <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}>
                      Result
                    </span>
                    <div
                      className="w-full rounded-lg overflow-hidden"
                      style={{
                        maxHeight: '400px',
                        backgroundImage: `
                          linear-gradient(45deg, hsl(var(--editor-bg)) 25%, transparent 25%),
                          linear-gradient(-45deg, hsl(var(--editor-bg)) 25%, transparent 25%),
                          linear-gradient(45deg, transparent 75%, hsl(var(--editor-bg)) 75%),
                          linear-gradient(-45deg, transparent 75%, hsl(var(--editor-bg)) 75%)
                        `,
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                        backgroundColor: 'hsl(var(--editor-panel))',
                      }}
                    >
                      <img src={resultImage} alt="Result" className="w-full h-full object-contain max-h-[400px]" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
