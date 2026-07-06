import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
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
    <div className="min-h-screen" style={{ background: 'hsl(var(--editor-bg))' }}>
      <Header />
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'hsl(var(--editor-text-bright))' }}>
          AI Background Remover – Remove Background Online Free
        </h1>
        <p className="text-lg" style={{ color: 'hsl(var(--editor-text))' }}>
          Remove image backgrounds automatically with AI and get a transparent PNG in seconds.
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

      {/* SEO Content Section */}
      <section className="mt-16 max-w-4xl mx-auto space-y-12 text-foreground">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Remove background from images online — free, fast, AI-powered
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Our free <strong>AI background remover</strong> instantly cuts out the subject of any
            photo and gives you a clean <strong>transparent background image</strong> in seconds.
            No manual selections, no Photoshop, no design skills required — just upload your
            picture and let the AI do the work. Whether you need to <strong>remove background online</strong> for
            a product photo, profile picture, marketing visual or YouTube thumbnail, this tool
            delivers professional results in one click.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Built for creators, e-commerce sellers, designers, and marketers, the VisuStock
            <strong> background remover</strong> uses advanced AI segmentation to detect the
            subject precisely and preserve fine edges like hair, fur, glass and complex shapes.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Why use the VisuStock AI background remover?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border">
              <Zap className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Automatic & instant</h3>
              <p className="text-sm text-muted-foreground">No brushes, no masks. Upload, click once and your cutout is ready in seconds.</p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <Sparkles className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">High edge precision</h3>
              <p className="text-sm text-muted-foreground">AI keeps fine details like hair, fur and edges intact for a clean, natural result.</p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <Shield className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Free, no watermark</h3>
              <p className="text-sm text-muted-foreground">100% free output as a transparent PNG. No signup required.</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Key features</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li><strong>AI subject detection</strong> — automatically identifies people, products and objects.</li>
            <li><strong>Transparent PNG output</strong> — drop your subject onto any background instantly.</li>
            <li><strong>Edge precision</strong> — clean cutouts even on hair, fur and translucent edges.</li>
            <li><strong>Multi-format support</strong> — works with JPG, PNG and WebP up to 10 MB.</li>
            <li><strong>Browser-based</strong> — no software to install, works on any device.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Use cases for the background remover</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">E-commerce product photos</h3>
              <p className="text-sm text-muted-foreground">Create clean white-background product shots for Shopify, Amazon, Etsy and your own store.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Social media content</h3>
              <p className="text-sm text-muted-foreground">Make scroll-stopping posts and stories for Instagram, TikTok and LinkedIn.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Marketing & ads</h3>
              <p className="text-sm text-muted-foreground">Drop subjects onto branded backgrounds for high-converting display ads and banners.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">YouTube thumbnails</h3>
              <p className="text-sm text-muted-foreground">Cut out faces and props to design click-worthy thumbnails in minutes.</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">How to remove a background online in 3 steps</h2>
          <ol className="space-y-3 text-muted-foreground list-decimal list-inside">
            <li><strong>Upload</strong> a JPG, PNG or WebP image (up to 10 MB).</li>
            <li><strong>Click Remove Background</strong> — the AI processes your image automatically.</li>
            <li><strong>Download</strong> the transparent PNG and use it anywhere.</li>
          </ol>
        </div>

        {/* CTA to marketplace */}
        <div className="rounded-2xl p-6 md:p-8 border border-border bg-gradient-to-br from-primary/10 to-accent/5">
          <h2 className="text-2xl font-bold mb-2">Combine your cutouts with stunning stock visuals</h2>
          <p className="text-muted-foreground mb-4">
            Drop your transparent subject onto premium <Link to="/marketplace?type=image" className="text-primary underline">stock images</Link>,
            cinematic <Link to="/marketplace?type=video" className="text-primary underline">stock videos</Link> and
            ready-to-use creative assets from independent creators. Perfect for marketing visuals,
            product mockups, video editing and social campaigns.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/marketplace"><Button>Browse the marketplace</Button></Link>
            <Link to="/free-stock-library"><Button variant="outline">Free stock library</Button></Link>
          </div>
        </div>

        {/* Internal linking */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Explore more free Studio AI tools</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Link to="/studio-ai/ai-image-generator" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" /> AI Image Generator
            </Link>
            <Link to="/studio-ai/image-upscale" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Image Upscaler
            </Link>
            <Link to="/studio-ai/image-converter" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" /> Image Converter
            </Link>
            <Link to="/studio-ai/face-enhancer" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Face Enhancer
            </Link>
            <Link to="/studio-ai/text-to-speech" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Text to Speech
            </Link>
            <Link to="/studio-ai" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" /> All Studio AI tools
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger>How do I remove the background from an image online?</AccordionTrigger>
              <AccordionContent>
                Upload your image (JPG, PNG or WebP), click Remove Background, then download a transparent PNG. The AI handles detection automatically — no manual editing required.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>Is the AI background remover free?</AccordionTrigger>
              <AccordionContent>
                Yes. The VisuStock background remover is 100% free, with no signup and no watermark on your output.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Does the tool produce a transparent background image?</AccordionTrigger>
              <AccordionContent>
                Yes. The output is a high-quality PNG with a fully transparent background, ready to drop onto any color, photo or design.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>Will it preserve fine details like hair and edges?</AccordionTrigger>
              <AccordionContent>
                Yes. Our AI is trained to detect complex edges including hair, fur, glass and semi-transparent objects to keep cutouts looking natural.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger>What image formats are supported?</AccordionTrigger>
              <AccordionContent>
                You can upload JPG, PNG and WebP images up to 10 MB. The result is always exported as a transparent PNG.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/*
          Suggested ALT texts for future screenshots:
          - "AI background remover interface — upload image and remove background online"
          - "Before and after comparison: original photo vs transparent PNG cutout"
          - "Product photo with background removed for e-commerce listing"
          - "Portrait with hair edges preserved by AI background remover"
        */}
      </section>
    </div>
    <Footer />
    </div>
  );
}
