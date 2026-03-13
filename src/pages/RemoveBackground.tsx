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
            Remove Background
          </h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'hsl(var(--editor-accent) / 0.2)', color: 'hsl(var(--editor-accent))' }}>AI</span>
        </div>
        <div className="flex items-center gap-2">
          {resultImage && (
            <Button size="sm" variant="ghost" onClick={handleDownload} className="h-8 w-8 p-0" style={{ color: 'hsl(var(--editor-text))' }}>
              <Download className="w-4 h-4" />
            </Button>
          )}
          {originalImage && (
            <Button size="sm" variant="ghost" onClick={handleReset} className="h-8 w-8 p-0" style={{ color: 'hsl(var(--editor-text))' }}>
              <RotateCcw className="w-4 h-4" />
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
              <ImagePlus className="w-8 h-8 mb-2" style={{ color: 'hsl(var(--editor-text))' }} />
              <span className="text-sm font-medium" style={{ color: 'hsl(var(--editor-text))' }}>
                {originalImage ? 'Change Image' : 'Add Image'}
              </span>
              <span className="text-[10px] mt-1 opacity-50" style={{ color: 'hsl(var(--editor-text))' }}>
                PNG, JPG, WebP (max 10MB)
              </span>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
            </label>

            {/* Remove Background button */}
            <Button
              className="w-full h-10 rounded-lg font-medium text-sm gap-2"
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
              <Button
                className="w-full h-10 rounded-lg font-medium text-sm gap-2"
                variant="ghost"
                onClick={handleDownload}
                style={{ color: 'hsl(var(--editor-text))', border: '1px solid hsl(var(--editor-border))' }}
              >
                <Download className="w-4 h-4" /> Download PNG
              </Button>
            )}

            {/* Divider */}
            <div className="h-px" style={{ background: 'hsl(var(--editor-border))' }} />

            {/* Tips */}
            <div className="space-y-2">
              <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                Tips
              </span>
              {[
                { title: 'Clear Subject', desc: 'Distinct subject with clear edges works best.' },
                { title: 'Good Lighting', desc: 'Well-lit images with good contrast produce cleaner cutouts.' },
                { title: 'High Resolution', desc: 'Higher resolution allows for more precise edge detection.' },
              ].map((tip) => (
                <div key={tip.title} className="p-2.5 rounded-lg text-xs" style={{ background: 'hsl(var(--editor-bg))', border: '1px solid hsl(var(--editor-border))' }}>
                  <p className="font-medium mb-0.5" style={{ color: 'hsl(var(--editor-text-bright))' }}>{tip.title}</p>
                  <p className="opacity-60" style={{ color: 'hsl(var(--editor-text))' }}>{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main workspace */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto" style={{ background: 'hsl(var(--editor-bg))' }}>
          {!originalImage ? (
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                Add an Image to get started
              </h2>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg cursor-pointer text-sm font-medium transition-colors"
                style={{ background: 'hsl(var(--editor-panel))', color: 'hsl(var(--editor-text))', border: '1px solid hsl(var(--editor-border))' }}
              >
                <Upload className="w-4 h-4" /> Add an image
                <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
              </label>
            </div>
          ) : (
            <div className="w-full max-w-[800px] space-y-6">
              {/* Input image */}
              <div className="relative">
                <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: 'hsl(140 60% 45%)', color: '#fff' }}>
                  Input
                </span>
                <img src={originalImage} alt="Input" className="w-full rounded-lg object-contain"
                  style={{ maxHeight: resultImage ? '280px' : '450px', background: 'hsl(var(--editor-panel))' }} />
              </div>

              {/* Processing state */}
              {isProcessing && (
                <div className="text-center py-6">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'hsl(var(--editor-accent))' }} />
                  <p className="text-sm" style={{ color: 'hsl(var(--editor-text))' }}>Removing background...</p>
                </div>
              )}

              {/* Output image */}
              {resultImage && (
                <div className="relative">
                  <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}>
                    Output
                  </span>
                  <div
                    className="w-full rounded-lg overflow-hidden"
                    style={{
                      maxHeight: '400px',
                      backgroundImage: `
                        linear-gradient(45deg, hsl(var(--editor-panel)) 25%, transparent 25%),
                        linear-gradient(-45deg, hsl(var(--editor-panel)) 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, hsl(var(--editor-panel)) 75%),
                        linear-gradient(-45deg, transparent 75%, hsl(var(--editor-panel)) 75%)
                      `,
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                      backgroundColor: 'hsl(var(--editor-bg))',
                    }}
                  >
                    <img src={resultImage} alt="Result" className="w-full h-full object-contain" style={{ maxHeight: '400px' }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
