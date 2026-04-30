import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Wand2, Download, AlertTriangle, ImagePlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSEO } from '@/hooks/useSEO';

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

  // Append the requested aspect ratio if the user hasn't already specified one
  const buildFinalPrompt = (raw: string, ratio: string) => {
    const hasRatio = /\b\d{1,2}\s*[:x]\s*\d{1,2}\b|aspect ratio|ratio d'aspect|format/i.test(raw);
    if (hasRatio) return raw;
    const suffix = language === 'en'
      ? ` — aspect ratio ${ratio}, framed strictly in ${ratio} format.`
      : ` — ratio d'aspect ${ratio}, cadré strictement au format ${ratio}.`;
    return raw.trim() + suffix;
  };

  useSEO({
    title: language === 'en'
      ? "AI Image Generator - Create Stunning Visuals"
      : "Générateur d'Images IA - Créez des Visuels Époustouflants",
    description: language === 'en'
      ? "Transform your ideas into stunning visuals instantly with our AI-powered image generator."
      : "Transformez vos idées en visuels époustouflants instantanément avec notre générateur d'images IA.",
    type: 'website'
  });

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
        body: { prompt: buildFinalPrompt(prompt.trim(), aspectRatio) }
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
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'hsl(var(--editor-text-bright))' }}>{t.title}</h1>
        <p className="text-lg" style={{ color: 'hsl(var(--editor-text))' }}>
          {language === 'en' ? 'Transform your ideas into stunning visuals' : 'Transformez vos idées en visuels époustouflants'}
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
    </div>
  );
}
