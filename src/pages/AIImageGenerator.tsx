import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Wand2, Download, ChevronLeft, AlertTriangle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
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
        body: { prompt: prompt.trim() }
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
            {t.title}
          </h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'hsl(var(--editor-accent) / 0.2)', color: 'hsl(var(--editor-accent))' }}>
            AI
          </span>
        </div>
        <div className="flex items-center gap-2">
          {generatedImage && (
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
            {/* Credits info */}
            {user && creditsBalance !== null && (
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: creditsBalance > 0 ? 'hsl(var(--editor-accent))' : 'hsl(0 70% 60%)' }}>
                  {t.creditsAvailable(creditsBalance)}
                </span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => navigate('/buy-credits')}
                  className="text-xs p-0 h-auto"
                  style={{ color: 'hsl(var(--editor-accent))' }}
                >
                  {t.buyCredits}
                </Button>
              </div>
            )}

            {/* Prompt input */}
            <div className="space-y-2">
              <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(var(--editor-text))' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'hsl(var(--editor-accent))' }} />
                {t.promptLabel}
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.promptPlaceholder}
                rows={8}
                className="resize-none text-sm"
                disabled={isGenerating}
                style={{
                  background: 'hsl(var(--editor-bg))',
                  borderColor: 'hsl(var(--editor-border))',
                  color: 'hsl(var(--editor-text-bright))',
                }}
              />
            </div>

            {/* Error warnings */}
            {aiErrorCode && (
              <div className="flex items-start gap-2 p-2 rounded-lg text-xs" style={{ background: 'hsl(0 70% 50% / 0.1)', color: 'hsl(0 70% 70%)' }}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{aiErrorCode === 'quota_exceeded' ? t.quotaDesc : aiErrorCode === 'rate_limited' ? t.rateLimitedDesc : t.workspaceCreditsDesc}</span>
              </div>
            )}

            {/* Generate button */}
            <Button
              className="w-full h-10 rounded-lg font-medium text-sm gap-2"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || aiErrorCode === 'quota_exceeded'}
              style={{
                background: 'hsl(var(--editor-accent))',
                color: '#fff',
                opacity: (isGenerating || !prompt.trim()) ? 0.5 : 1,
              }}
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t.generating}</>
              ) : (
                <><Wand2 className="w-4 h-4" /> {t.generate}</>
              )}
            </Button>

            {/* Divider */}
            <div className="h-px" style={{ background: 'hsl(var(--editor-border))' }} />

            {/* Prompt suggestions */}
            <div className="space-y-2">
              <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'hsl(var(--editor-text-bright))' }}>
                {t.suggestions}
              </span>
              <div className="space-y-1.5">
                {t.examplePrompts.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(example)}
                    disabled={isGenerating}
                    className="w-full text-left p-2.5 rounded-lg text-xs transition-colors hover:opacity-80 disabled:opacity-40 line-clamp-2"
                    style={{
                      background: 'hsl(var(--editor-bg))',
                      color: 'hsl(var(--editor-text))',
                      border: '1px solid hsl(var(--editor-border))',
                    }}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main workspace */}
        <main className="flex-1 flex items-center justify-center p-8 overflow-auto" style={{ background: 'hsl(var(--editor-bg))' }}>
          <div className="w-full max-w-[800px]">
            {generatedImage ? (
              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: 'hsl(var(--editor-accent))', color: '#fff' }}>
                    Generated
                  </span>
                  <img
                    src={generatedImage}
                    alt="AI Generated"
                    className="w-full rounded-lg object-contain"
                    style={{ maxHeight: '550px', background: 'hsl(var(--editor-panel))' }}
                  />
                </div>
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    style={{ color: 'hsl(var(--editor-text))', border: '1px solid hsl(var(--editor-border))' }}
                  >
                    <Download className="mr-2 h-4 w-4" /> {t.download}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center h-[400px] rounded-xl"
                style={{ border: '1px dashed hsl(var(--editor-border))', background: 'hsl(var(--editor-panel))' }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-16 h-16 mb-4 animate-spin" style={{ color: 'hsl(var(--editor-accent))' }} />
                    <p className="text-sm" style={{ color: 'hsl(var(--editor-text))' }}>{t.generating}</p>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-16 h-16 mb-4" style={{ color: 'hsl(var(--editor-text))' }} />
                    <p className="text-sm" style={{ color: 'hsl(var(--editor-text))' }}>
                      {language === 'en' ? 'Enter a prompt and click generate' : 'Entrez un prompt et cliquez sur générer'}
                    </p>
                    <p className="text-[10px] mt-2 opacity-40" style={{ color: 'hsl(var(--editor-text))' }}>
                      Powered by Google Gemini
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
