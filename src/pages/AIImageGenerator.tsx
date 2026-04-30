import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Loader2, Sparkles, Wand2, Download, AlertTriangle, ImagePlus, X,
  Zap, Shield, Image as ImageIcon, Video, Scissors, Palette
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSEO } from '@/hooks/useSEO';

const STRUCTURED_DATA = {
  software: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "VisuStock AI Image Generator",
    "applicationCategory": "DesignApplication",
    "operatingSystem": "Web Browser",
    "url": "https://visustock.com/ai-image-generator",
    "description": "Free AI image generator. Turn text prompts into high-quality images in seconds. Choose styles, aspect ratios and use them for commercial or creative projects.",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "featureList": [
      "Text to image generation",
      "Multiple aspect ratios (1:1, 16:9, 9:16, 4:3, 3:4, 21:9)",
      "Reference image to image",
      "High-resolution downloads",
      "Realistic, artistic and marketing styles",
      "Commercial use friendly"
    ],
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "ratingCount": "3120" }
  },
  faq: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "What is an AI image generator?", "acceptedAnswer": { "@type": "Answer", "text": "An AI image generator turns a text description (prompt) into a unique image using a generative AI model. You describe what you want and the model creates a brand-new visual in seconds." } },
      { "@type": "Question", "name": "How do I generate images with AI?", "acceptedAnswer": { "@type": "Answer", "text": "Type a prompt describing the scene, choose an aspect ratio (square, landscape, portrait, story or cinematic), then click Generate. Your AI image is ready to download in seconds." } },
      { "@type": "Question", "name": "Can I use the generated images commercially?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Images created with the VisuStock AI image generator can be used for commercial and creative projects such as ads, social media, thumbnails and branding." } },
      { "@type": "Question", "name": "What aspect ratios and formats are supported?", "acceptedAnswer": { "@type": "Answer", "text": "You can generate images in 1:1, 16:9, 9:16, 4:3, 3:4 and 21:9. Output is delivered as a high-quality PNG suitable for web, social and print." } },
      { "@type": "Question", "name": "Do I need design skills to create images with AI?", "acceptedAnswer": { "@type": "Answer", "text": "No. Anyone can create stunning visuals with a simple text prompt. The AI handles composition, lighting and style for you." } }
    ]
  }
};

export default function AIImageGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [aiErrorCode, setAiErrorCode] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: language === 'en' ? 'Invalid file' : 'Fichier invalide', description: language === 'en' ? 'Please upload an image.' : 'Veuillez uploader une image.', variant: 'destructive' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: language === 'en' ? 'File too large' : 'Fichier trop volumineux', description: language === 'en' ? 'Max 8 MB.' : 'Max 8 Mo.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const ASPECT_RATIOS: { value: string; label: string; desc: string }[] = [
    { value: '1:1', label: '1:1', desc: language === 'en' ? 'Square' : 'Carré' },
    { value: '16:9', label: '16:9', desc: language === 'en' ? 'Landscape' : 'Paysage' },
    { value: '9:16', label: '9:16', desc: language === 'en' ? 'Portrait / Story' : 'Portrait / Story' },
    { value: '4:3', label: '4:3', desc: language === 'en' ? 'Classic' : 'Classique' },
    { value: '3:4', label: '3:4', desc: language === 'en' ? 'Vertical' : 'Vertical' },
    { value: '21:9', label: '21:9', desc: language === 'en' ? 'Cinematic' : 'Cinéma' },
  ];

  // Forcefully prepend explicit aspect ratio + dimensions to steer the model
  const RATIO_DIMENSIONS: Record<string, { w: number; h: number; orientation: string }> = {
    '1:1':  { w: 1024, h: 1024, orientation: 'perfectly square' },
    '16:9': { w: 1536, h: 864,  orientation: 'wide horizontal landscape' },
    '9:16': { w: 864,  h: 1536, orientation: 'tall vertical portrait (mobile / story)' },
    '4:3':  { w: 1280, h: 960,  orientation: 'horizontal landscape' },
    '3:4':  { w: 960,  h: 1280, orientation: 'vertical portrait' },
    '21:9': { w: 1680, h: 720,  orientation: 'ultra-wide cinematic letterbox' },
  };

  const buildFinalPrompt = (raw: string, ratio: string) => {
    const dims = RATIO_DIMENSIONS[ratio] ?? RATIO_DIMENSIONS['1:1'];
    const directive = language === 'en'
      ? `IMPORTANT: Generate the image with an exact aspect ratio of ${ratio} (${dims.w}x${dims.h} pixels), in a ${dims.orientation} orientation. The full canvas MUST be filled — do NOT add black bars, padding, borders, or letterboxing. Compose the scene specifically for a ${ratio} frame.\n\nSubject: `
      : `IMPORTANT : Génère l'image avec un ratio d'aspect strictement ${ratio} (${dims.w}x${dims.h} pixels), en orientation ${dims.orientation}. Tout le canvas DOIT être rempli — n'ajoute AUCUNE barre noire, marge, bordure ni letterbox. Compose la scène spécifiquement pour un cadre ${ratio}.\n\nSujet : `;
    return directive + raw.trim();
  };

  useSEO({
    title: language === 'en'
      ? 'AI Image Generator – Free Text to Image Online'
      : "Générateur d'Images IA – Texte vers Image Gratuit",
    description: language === 'en'
      ? 'Free AI image generator: turn text into stunning images in seconds. Choose styles & ratios. Use them for ads, social media and creative projects.'
      : "Générateur d'images IA gratuit : transformez du texte en visuels époustouflants en quelques secondes. Idéal pour les pubs, réseaux et projets créatifs.",
    type: 'website',
    tags: ['AI image generator', 'text to image', 'generate images with AI', 'AI art generator', 'create images online', 'AI image creator']
  });

  useEffect(() => {
    const ids = ['aig-schema-software', 'aig-schema-faq'];
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

  const t = language === 'en' ? {
    title: 'AI Image Generator',
    promptLabel: 'Describe the image you want to create',
    promptPlaceholder: 'For example: A majestic mountain landscape at sunset...',
    generating: 'Generating...',
    generate: 'Generate Image',
    download: 'Download Image',
    buyCredits: 'Buy Credits',
    creditsAvailable: (n: number) => `${n} credit${n > 1 ? 's' : ''} available`,
    loginRequired: 'Login Required',
    loginDescription: 'Please log in to generate AI images.',
    promptRequired: 'Prompt Required',
    promptRequiredDesc: 'Please enter a description to generate an image.',
    insufficientCredits: 'Insufficient Credits',
    insufficientCreditsDesc: 'Please purchase credits to continue generating images.',
    workspaceCreditsError: 'Insufficient Workspace Credits',
    workspaceCreditsDesc: 'The Lovable AI account needs more credits. Contact the administrator.',
    rateLimitedTitle: 'Rate Limit Reached',
    rateLimitedDesc: 'Please try again in a few minutes.',
    quotaTitle: 'Quota Exceeded',
    quotaDesc: 'The daily Google API quota has been reached. Try again tomorrow.',
    error: 'Error',
    errorDesc: 'Unable to generate image. Please try again.',
    successTitle: 'Image generated successfully!',
    successDesc: (n: number) => `You have ${n} credit${n > 1 ? 's' : ''} remaining.`,
    noImageError: 'No image generated in the response.',
    suggestions: 'Prompt Suggestions',
    examplePrompts: [
      "A vibrant sunset over a futuristic city with illuminated skyscrapers",
      "An artistic portrait of an astronaut cat exploring a colorful planet",
      "An enchanted forest with glowing trees and fantastic creatures",
      "A snowy mountain landscape under a spectacular aurora borealis",
      "A modern urban scene with neon lights and a cyberpunk atmosphere"
    ]
  } : {
    title: "Générateur d'images IA",
    promptLabel: "Décrivez l'image que vous souhaitez créer",
    promptPlaceholder: "Par exemple : Un paysage de montagne majestueux au coucher du soleil...",
    generating: 'Génération en cours...',
    generate: "Générer l'image",
    download: "Télécharger l'image",
    buyCredits: 'Acheter des crédits',
    creditsAvailable: (n: number) => `${n} crédit${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}`,
    loginRequired: 'Connexion requise',
    loginDescription: "Veuillez vous connecter pour générer des images IA.",
    promptRequired: 'Prompt requis',
    promptRequiredDesc: "Veuillez entrer une description pour générer une image.",
    insufficientCredits: 'Crédits insuffisants',
    insufficientCreditsDesc: "Veuillez acheter des crédits pour continuer à générer des images.",
    workspaceCreditsError: 'Crédits workspace insuffisants',
    workspaceCreditsDesc: "Le compte Lovable AI nécessite plus de crédits. Contactez l'administrateur.",
    rateLimitedTitle: 'Limite de requêtes atteinte',
    rateLimitedDesc: 'Veuillez réessayer dans quelques minutes.',
    quotaTitle: 'Quota dépassé',
    quotaDesc: 'Le quota quotidien Google API a été atteint. Réessayez demain.',
    error: 'Erreur',
    errorDesc: 'Impossible de générer l\'image. Veuillez réessayer.',
    successTitle: 'Image générée avec succès !',
    successDesc: (n: number) => `Il vous reste ${n} crédit${n > 1 ? 's' : ''}.`,
    noImageError: "Aucune image générée dans la réponse.",
    suggestions: 'Suggestions de prompts',
    examplePrompts: [
      "Un coucher de soleil vibrant sur une ville futuriste avec des gratte-ciels illuminés",
      "Un portrait artistique d'un chat astronaute explorant une planète colorée",
      "Une forêt enchantée avec des arbres lumineux et des créatures fantastiques",
      "Un paysage de montagne enneigé sous une aurore boréale spectaculaire",
      "Une scène urbaine moderne avec des néons et une ambiance cyberpunk"
    ]
  };

  useEffect(() => {
    if (user) fetchCreditsBalance();
  }, [user]);

  const fetchCreditsBalance = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_credits')
      .select('credits_balance')
      .eq('user_id', user.id)
      .single();
    if (error) { setCreditsBalance(0); } else { setCreditsBalance(data?.credits_balance ?? 0); }
  };

  const handleGenerate = async () => {
    if (!user) {
      toast({ title: t.loginRequired, description: t.loginDescription, variant: "destructive" });
      navigate('/auth');
      return;
    }
    if (!prompt.trim()) {
      toast({ title: t.promptRequired, description: t.promptRequiredDesc, variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);
    setAiErrorCode(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-image', {
        body: { prompt: buildFinalPrompt(prompt.trim(), aspectRatio), referenceImage }
      });

      if (data?.error === 'insufficient_credits') {
        toast({ title: t.insufficientCredits, description: data.message || t.insufficientCreditsDesc, variant: "destructive" });
        setCreditsBalance(data.current_balance ?? 0);
        return;
      }
      if (data?.error === 'payment_required') {
        setAiErrorCode('payment_required');
        toast({ title: t.workspaceCreditsError, description: t.workspaceCreditsDesc, variant: "destructive" });
        return;
      }
      if (data?.error === 'rate_limited') {
        setAiErrorCode('rate_limited');
        toast({ title: t.rateLimitedTitle, description: t.rateLimitedDesc, variant: "destructive" });
        return;
      }
      if (data?.error) {
        const errorMsg = String(data.error);
        if (errorMsg.includes('Quota') || errorMsg.includes('403')) {
          setAiErrorCode('quota_exceeded');
          toast({ title: t.quotaTitle, description: t.quotaDesc, variant: "destructive" });
        } else if (errorMsg.includes('429')) {
          setAiErrorCode('rate_limited');
          toast({ title: t.rateLimitedTitle, description: t.rateLimitedDesc, variant: "destructive" });
        } else {
          toast({ title: t.error, description: errorMsg, variant: "destructive" });
        }
        return;
      }
      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setCreditsBalance(data.creditsRemaining ?? 0);
        setAiErrorCode(null);
        toast({ title: t.successTitle, description: t.successDesc(data.creditsRemaining ?? 0) });
      } else {
        toast({ title: t.error, description: t.noImageError, variant: "destructive" });
      }
    } catch (error: any) {
      const errorMsg = error?.message || JSON.stringify(error);
      if (errorMsg.includes('403') || errorMsg.toLowerCase().includes('quota')) {
        setAiErrorCode('quota_exceeded');
        toast({ title: t.quotaTitle, description: t.quotaDesc, variant: "destructive" });
      } else if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')) {
        setAiErrorCode('rate_limited');
        toast({ title: t.rateLimitedTitle, description: t.rateLimitedDesc, variant: "destructive" });
      } else {
        toast({ title: t.error, description: t.errorDesc, variant: "destructive" });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `ai-generated-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'hsl(var(--editor-text-bright))' }}>
          {language === 'en' ? 'AI Image Generator – Free Text to Image Online' : "Générateur d'Images IA – Texte vers Image Gratuit"}
        </h1>
        <p className="text-lg" style={{ color: 'hsl(var(--editor-text))' }}>
          {language === 'en' ? 'Generate high-quality images from a simple text prompt — fast, creative, no design skills required.' : 'Générez des images haute qualité à partir d\'un simple prompt texte — rapide, créatif, sans compétences en design.'}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-4">
          {/* Credits */}
          {user && creditsBalance !== null && (
            <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: creditsBalance > 0 ? 'hsl(var(--editor-accent))' : 'hsl(0 70% 60%)' }}>
                  {t.creditsAvailable(creditsBalance)}
                </span>
                <Button variant="link" size="sm" onClick={() => navigate('/buy-credits')} className="p-0 h-auto text-sm" style={{ color: 'hsl(var(--editor-accent))' }}>
                  {t.buyCredits}
                </Button>
              </div>
            </div>
          )}

          {/* Prompt Input */}
          <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(var(--editor-text-bright))' }}>
              <Sparkles className="w-4 h-4 inline mr-1" style={{ color: 'hsl(var(--editor-accent))' }} />
              {t.promptLabel}
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t.promptPlaceholder}
              rows={6}
              className="resize-none mb-3"
              disabled={isGenerating}
              style={{
                background: 'hsl(var(--editor-bg))',
                borderColor: 'hsl(var(--editor-border))',
                color: 'hsl(var(--editor-text-bright))'
              }}
            />

            {/* Reference image (optional) */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                {language === 'en' ? 'Reference image (optional)' : "Image de référence (optionnel)"}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleReferenceUpload}
                className="hidden"
              />
              {referenceImage ? (
                <div className="relative inline-block">
                  <img
                    src={referenceImage}
                    alt="Reference"
                    className="w-full h-32 object-cover rounded-lg"
                    style={{ border: '1px solid hsl(var(--editor-border))' }}
                  />
                  <button
                    type="button"
                    onClick={() => { setReferenceImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    disabled={isGenerating}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white disabled:opacity-40"
                    aria-label="Remove reference image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="w-full p-3 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors hover:opacity-80 disabled:opacity-40"
                  style={{
                    background: 'hsl(var(--editor-bg))',
                    color: 'hsl(var(--editor-text))',
                    border: '1px dashed hsl(var(--editor-border))',
                  }}
                >
                  <ImagePlus className="w-4 h-4" />
                  {language === 'en' ? 'Upload an image' : 'Uploader une image'}
                </button>
              )}
            </div>

            {/* Aspect ratio selector */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                {language === 'en' ? 'Aspect ratio' : "Ratio d'aspect"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ASPECT_RATIOS.map((r) => {
                  const active = aspectRatio === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setAspectRatio(r.value)}
                      disabled={isGenerating}
                      className="p-2 rounded-lg text-xs transition-all disabled:opacity-40"
                      style={{
                        background: active ? 'hsl(var(--editor-accent))' : 'hsl(var(--editor-bg))',
                        color: active ? '#fff' : 'hsl(var(--editor-text))',
                        border: `1px solid ${active ? 'hsl(var(--editor-accent))' : 'hsl(var(--editor-border))'}`,
                      }}
                    >
                      <div className="font-semibold">{r.label}</div>
                      <div className="opacity-70 text-[10px]">{r.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error warnings */}
            {aiErrorCode && (
              <div className="flex items-start gap-2 p-3 rounded-lg text-xs mb-3" style={{ background: 'hsl(0 70% 50% / 0.1)', color: 'hsl(0 70% 70%)' }}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{aiErrorCode === 'quota_exceeded' ? t.quotaDesc : aiErrorCode === 'rate_limited' ? t.rateLimitedDesc : t.workspaceCreditsDesc}</span>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || aiErrorCode === 'quota_exceeded'}
              className="w-full gap-2"
              style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}
            >
              {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.generating}</> : <><Wand2 className="w-4 h-4" /> {t.generate}</>}
            </Button>
          </div>

          {/* Suggestions */}
          <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--editor-text-bright))' }}>{t.suggestions}</h3>
            <div className="space-y-2">
              {t.examplePrompts.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(example)}
                  disabled={isGenerating}
                  className="w-full text-left p-2 rounded-lg text-xs transition-colors hover:opacity-80 disabled:opacity-40"
                  style={{
                    background: 'hsl(var(--editor-bg))',
                    color: 'hsl(var(--editor-text))',
                    border: '1px solid hsl(var(--editor-border))'
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Area */}
        <div className="md:col-span-2">
          <div className="rounded-xl p-6 min-h-[500px] flex items-center justify-center" style={{ background: 'hsl(var(--editor-sidebar))', border: '1px solid hsl(var(--editor-border))' }}>
            {generatedImage ? (
              <div className="w-full text-center">
                <img
                  src={generatedImage}
                  alt="AI Generated"
                  className="w-full max-w-lg mx-auto rounded-lg mb-4"
                  style={{ background: 'hsl(var(--editor-bg))' }}
                />
                <Button onClick={handleDownload} variant="outline" className="gap-2" style={{ color: '#000', borderColor: 'hsl(var(--editor-border))' }}>
                  <Download className="w-4 h-4" /> {t.download}
                </Button>
              </div>
            ) : isGenerating ? (
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: 'hsl(var(--editor-accent))' }} />
                <p style={{ color: 'hsl(var(--editor-text))' }}>{t.generating}</p>
              </div>
            ) : (
              <div className="text-center">
                <Wand2 className="w-16 h-16 mx-auto mb-4" style={{ color: 'hsl(var(--editor-text))' }} />
                <p style={{ color: 'hsl(var(--editor-text))' }}>
                  {language === 'en' ? 'Enter a prompt and click generate' : 'Entrez un prompt et cliquez sur générer'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEO Content Section (English-first, indexable) */}
      <section className="mt-16 max-w-4xl mx-auto space-y-12 text-foreground">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Generate images with AI from a simple text prompt
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            The VisuStock <strong>AI image generator</strong> turns your words into stunning,
            ready-to-use visuals in seconds. Just describe the scene you have in mind — a product
            shot, a cinematic landscape, a minimalist marketing visual — and our <strong>text to image</strong> AI
            will create a brand-new image, on demand. No design software, no manual editing,
            no expensive photoshoots.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Whether you need to <strong>generate images with AI</strong> for ads, social media,
            blog posts, video thumbnails or branding, this <strong>AI art generator</strong> gives
            you total creative control. Choose your aspect ratio, refine your prompt, optionally
            upload a reference image, and download a high-quality PNG you can use in your
            commercial and creative projects.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">How the AI image generator works</h2>
          <ol className="space-y-3 text-muted-foreground list-decimal list-inside">
            <li><strong>Write a prompt</strong> — describe the subject, style, lighting and mood.</li>
            <li><strong>Pick an aspect ratio</strong> — square (1:1), landscape (16:9), portrait (9:16), classic (4:3), vertical (3:4) or cinematic (21:9).</li>
            <li><strong>(Optional) Add a reference image</strong> to guide composition, style or color palette.</li>
            <li><strong>Click Generate</strong> — your AI image is ready to preview and download in seconds.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Why creators choose this AI image generator</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border">
              <Zap className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Fast & high-quality</h3>
              <p className="text-sm text-muted-foreground">Get crisp, high-resolution visuals in seconds — no waiting, no rendering queues.</p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <Palette className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Total creative control</h3>
              <p className="text-sm text-muted-foreground">Choose realistic, artistic, marketing, illustration or cinematic styles right from your prompt.</p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <Shield className="w-5 h-5 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Commercial-friendly</h3>
              <p className="text-sm text-muted-foreground">Use your AI-generated images for ads, content, websites, products and more.</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Key features</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li><strong>Text to image AI</strong> — describe anything, get a unique visual.</li>
            <li><strong>Image to image</strong> — upload a reference to guide style and composition.</li>
            <li><strong>6 aspect ratios</strong> — perfect for Instagram, TikTok, YouTube, websites and ads.</li>
            <li><strong>High-resolution PNG</strong> — clean output ready for web, social and print.</li>
            <li><strong>Style variety</strong> — realistic photos, 3D renders, illustrations, oil paintings, marketing visuals.</li>
            <li><strong>Beginner-friendly</strong> — no design background needed.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Use cases — what to create with AI</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Social media content</h3>
              <p className="text-sm text-muted-foreground">Stop scrolls with original AI visuals for Instagram, TikTok, X and LinkedIn.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Ads & marketing</h3>
              <p className="text-sm text-muted-foreground">Generate fresh creatives for Meta Ads, Google Ads and email campaigns in minutes.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">YouTube thumbnails</h3>
              <p className="text-sm text-muted-foreground">Create eye-catching 16:9 thumbnails that drive clicks and watch time.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Branding & websites</h3>
              <p className="text-sm text-muted-foreground">Design hero visuals, mood boards and product mockups that match your brand.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">Content creation</h3>
              <p className="text-sm text-muted-foreground">Illustrate blog posts, newsletters and presentations with custom AI artwork.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2">E-commerce concepts</h3>
              <p className="text-sm text-muted-foreground">Visualize products, packaging or lifestyle scenes before a real photoshoot.</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Tips to write better AI image prompts</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>Be specific: subject + setting + style + lighting + mood.</li>
            <li>Mention the camera or art style: "shot on 35mm", "cinematic", "isometric 3D", "watercolor".</li>
            <li>Add color cues: "warm sunset palette", "muted pastels", "high-contrast neon".</li>
            <li>Match your aspect ratio to the destination: 9:16 for stories, 16:9 for YouTube, 1:1 for Instagram.</li>
          </ul>
        </div>

        {/* CTA to marketplace */}
        <div className="rounded-2xl p-6 md:p-8 border border-border bg-gradient-to-br from-primary/10 to-accent/5">
          <h2 className="text-2xl font-bold mb-2">Take your AI creations even further with VisuStock</h2>
          <p className="text-muted-foreground mb-4">
            Combine your AI-generated images with premium <Link to="/marketplace?type=image" className="text-primary underline">stock images</Link>,
            cinematic <Link to="/marketplace?type=video" className="text-primary underline">stock videos</Link> and
            ready-to-use creative assets from independent creators worldwide. Perfect for ads,
            video editing, web design and content marketing.
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
            <Link to="/studio-ai/remove-background" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary" /> AI Background Remover
            </Link>
            <Link to="/studio-ai/image-converter" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" /> Image Converter
            </Link>
            <Link to="/studio-ai/image-upscale" className="p-4 rounded-lg border border-border hover:border-primary transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Image Upscaler
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
              <AccordionTrigger>What is an AI image generator?</AccordionTrigger>
              <AccordionContent>
                An AI image generator turns a text description (prompt) into a unique image using a generative AI model. You describe what you want and the model creates a brand-new visual in seconds.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>How do I generate images with AI?</AccordionTrigger>
              <AccordionContent>
                Type a prompt describing the scene, choose an aspect ratio (square, landscape, portrait, story or cinematic), then click Generate. Your AI image is ready to download in seconds.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Can I use the generated images commercially?</AccordionTrigger>
              <AccordionContent>
                Yes. Images created with the VisuStock AI image generator can be used for commercial and creative projects such as ads, social media, thumbnails and branding.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>What aspect ratios and formats are supported?</AccordionTrigger>
              <AccordionContent>
                You can generate images in 1:1, 16:9, 9:16, 4:3, 3:4 and 21:9. Output is delivered as a high-quality PNG suitable for web, social and print.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger>Do I need design skills to create images with AI?</AccordionTrigger>
              <AccordionContent>
                No. Anyone can create stunning visuals with a simple text prompt. The AI handles composition, lighting and style for you.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/*
          Suggested ALT texts for future screenshots:
          - "AI image generator interface — text prompt to image online"
          - "Cinematic 16:9 AI-generated landscape created from a text prompt"
          - "Square 1:1 AI marketing visual generated for social media"
          - "Portrait 9:16 AI image for Instagram and TikTok stories"
          - "AI art generator producing a stylized illustration from text"
        */}
      </section>
    </div>
  );
}
