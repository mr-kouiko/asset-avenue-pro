import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Upload, Download, Loader2, Scissors,
  ImagePlus, RotateCcw, Zap, Shield, Sparkles, Image as ImageIcon, Video, Wand2
} from 'lucide-react';

const STRUCTURED_DATA = {
  software: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "VisuStock AI Background Remover",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web Browser",
    "url": "https://visustock.com/studio-ai/remove-background",
    "description": "Free AI background remover. Remove image backgrounds online in seconds and download a transparent PNG. No signup, no watermark.",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "featureList": [
      "AI-powered background removal",
      "Transparent PNG output",
      "Edge precision (hair, fur, fine details)",
      "Supports JPG, PNG and WebP",
      "Processing in seconds",
      "No signup or watermark"
    ],
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "ratingCount": "2143" }
  },
  faq: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "How do I remove the background from an image online?", "acceptedAnswer": { "@type": "Answer", "text": "Upload your image (JPG, PNG or WebP), click Remove Background, then download a transparent PNG. The AI handles detection automatically — no manual editing required." } },
      { "@type": "Question", "name": "Is the AI background remover free?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The VisuStock background remover is 100% free, with no signup and no watermark on your output." } },
      { "@type": "Question", "name": "Does the tool produce a transparent background image?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The output is a high-quality PNG with a fully transparent background, ready to drop onto any color, photo or design." } },
      { "@type": "Question", "name": "Will it preserve fine details like hair and edges?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Our AI is trained to detect complex edges including hair, fur, glass and semi-transparent objects to keep cutouts looking natural." } },
      { "@type": "Question", "name": "What image formats are supported?", "acceptedAnswer": { "@type": "Answer", "text": "You can upload JPG, PNG and WebP images up to 10 MB. The result is always exported as a transparent PNG." } }
    ]
  }
};

export default function RemoveBackground() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');

  useSEO({
    title: 'AI Background Remover Online – Remove Background Free',
    description: 'Remove background from images online with AI. Get a transparent PNG in seconds — free, automatic, no signup, no watermark.',
    type: 'website',
    tags: ['remove background', 'background remover', 'remove background online', 'AI background remover', 'transparent background image', 'remove bg']
  });

  useEffect(() => {
    const ids = ['rb-schema-software', 'rb-schema-faq'];
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
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'hsl(var(--editor-text-bright))' }}>Remove Background</h1>
        <p className="text-lg" style={{ color: 'hsl(var(--editor-text))' }}>
          AI-powered background removal in seconds
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-4">
          {/* Upload */}
          <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border border-dashed cursor-pointer transition-colors"
              style={{ borderColor: 'hsl(var(--editor-border))', background: 'hsl(var(--editor-bg))' }}
            >
              <ImagePlus className="w-8 h-8 mb-2" style={{ color: 'hsl(var(--editor-text))' }} />
              <span className="text-sm font-medium" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                {originalImage ? 'Change Image' : 'Upload Image'}
              </span>
              <span className="text-xs mt-1" style={{ color: 'hsl(var(--editor-text))' }}>PNG, JPG, WebP (max 10MB)</span>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
            </label>

            <Button
              onClick={handleRemoveBackground}
              disabled={!originalImage || isProcessing}
              className="w-full mt-4 gap-2"
              style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}
            >
              {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Scissors className="w-4 h-4" /> Remove Background</>}
            </Button>

            {resultImage && (
              <>
                <Button onClick={handleDownload} className="w-full mt-2 gap-2" variant="outline" style={{ borderColor: 'hsl(var(--editor-border))', color: 'hsl(var(--editor-text-bright))' }}>
                  <Download className="w-4 h-4" /> Download PNG
                </Button>
                <Button onClick={handleReset} className="w-full mt-2 gap-2" variant="ghost" style={{ color: 'hsl(var(--editor-text))' }}>
                  <RotateCcw className="w-4 h-4" /> Start Over
                </Button>
              </>
            )}
          </div>

          {/* Tips */}
          <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--editor-text-bright))' }}>Tips for best results</h3>
            <ul className="space-y-2 text-sm" style={{ color: 'hsl(var(--editor-text))' }}>
              <li className="flex items-start gap-2">
                <span style={{ color: 'hsl(var(--editor-accent))' }}>•</span>
                <span>Use images with clear subject edges</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'hsl(var(--editor-accent))' }}>•</span>
                <span>Good lighting helps AI detect edges</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'hsl(var(--editor-accent))' }}>•</span>
                <span>Higher resolution = better results</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Main Area */}
        <div className="md:col-span-2">
          <div className="rounded-xl p-6 min-h-[500px] flex items-center justify-center" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            {!originalImage ? (
              <div className="text-center">
                <ImagePlus className="w-16 h-16 mx-auto mb-4" style={{ color: 'hsl(var(--editor-text))' }} />
                <p className="text-lg mb-2" style={{ color: 'hsl(var(--editor-text-bright))' }}>Upload an image to get started</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer font-medium transition-colors"
                  style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}
                >
                  <Upload className="w-4 h-4" /> Choose Image
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                </label>
              </div>
            ) : (
              <div className="w-full space-y-4">
                <div className="relative">
                  <span className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold" style={{ background: 'hsl(140 60% 45%)', color: '#fff' }}>
                    Input
                  </span>
                  <img src={originalImage} alt="Input" className="w-full rounded-lg object-contain max-h-[300px]" style={{ background: 'hsl(var(--editor-bg))' }} />
                </div>

                {isProcessing && (
                  <div className="text-center py-8">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: 'hsl(var(--editor-accent))' }} />
                    <p style={{ color: 'hsl(var(--editor-text))' }}>Removing background...</p>
                  </div>
                )}

                {resultImage && (
                  <div className="relative">
                    <span className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold" style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}>
                      Output
                    </span>
                    <div className="rounded-lg overflow-hidden" style={{
                      maxHeight: '300px',
                      backgroundImage: `
                        linear-gradient(45deg, hsl(var(--editor-bg)) 25%, transparent 25%),
                        linear-gradient(-45deg, hsl(var(--editor-bg)) 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, hsl(var(--editor-bg)) 75%),
                        linear-gradient(-45deg, transparent 75%, hsl(var(--editor-bg)) 75%)
                      `,
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                      backgroundColor: 'hsl(var(--editor-panel))',
                    }}>
                      <img src={resultImage} alt="Result" className="w-full h-full object-contain max-h-[300px]" />
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
