import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
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

  // SEO Configuration
  useSEO({
    title: language === 'en' 
      ? "AI Image Generator - Create Stunning Visuals"
      : "Générateur d'Images IA - Créez des Visuels Époustouflants",
    description: language === 'en'
      ? "Transform your ideas into stunning visuals instantly with our AI-powered image generator. Create professional-quality images using Google Gemini technology."
      : "Transformez vos idées en visuels époustouflants instantanément avec notre générateur d'images IA. Créez des images de qualité professionnelle avec la technologie Google Gemini.",
    type: 'website'
  });
  
  const content = {
    fr: {
      poweredBy: "Propulsé par Google Gemini",
      title: "Générateur d'images IA",
      subtitle: "Transformez vos idées en visuels époustouflants instantanément.",
      quotaError: {
        title: "Quota Google API dépassé",
        description: "Le quota quotidien a été atteint. Réessayez demain ou augmentez votre quota sur"
      },
      rateLimitError: {
        title: "Trop de requêtes",
        description: "Veuillez attendre quelques minutes avant de réessayer."
      },
      creditsAvailable: (count: number) => `${count} crédit${count > 1 ? 's' : ''} disponible${count > 1 ? 's' : ''}`,
      noCredits: "Aucun crédit disponible",
      buyCredits: "Acheter des crédits",
      promptLabel: "Décrivez l'image que vous souhaitez créer",
      promptPlaceholder: "Par exemple : Un paysage de montagne majestueux au coucher du soleil...",
      generating: "Génération en cours...",
      generate: "Générer l'image",
      suggestions: "Suggestions de prompts",
      imagePreview: "Votre image apparaîtra ici",
      enterPrompt: "Entrez un prompt et cliquez sur \"Générer l'image\"",
      download: "Télécharger l'image",
      creditsUnique: "Crédits à l'unité",
      unlimited: "Possibilités créatives",
      quality: "Qualité professionnelle",
      loginRequired: "Connexion requise",
      loginDescription: "Veuillez vous connecter pour générer des images IA.",
      promptRequired: "Prompt requis",
      promptRequiredDesc: "Veuillez entrer une description pour générer une image.",
      insufficientCredits: "Crédits insuffisants",
      insufficientCreditsDesc: "Veuillez acheter des crédits pour continuer à générer des images.",
      workspaceCreditsError: "Crédits workspace insuffisants",
      workspaceCreditsDesc: "Le compte Lovable AI nécessite plus de crédits. Contactez l'administrateur.",
      rateLimitedTitle: "Limite de requêtes atteinte",
      rateLimitedDesc: "Veuillez réessayer dans quelques minutes.",
      quotaTitle: "Quota dépassé",
      quotaDesc: "Le quota quotidien Google API a été atteint. Réessayez demain.",
      tooManyRequests: "Trop de requêtes",
      tooManyRequestsDesc: "Trop de requêtes. Veuillez réessayer dans quelques minutes.",
      error: "Erreur",
      errorDesc: "Impossible de générer l'image. Veuillez réessayer.",
      successTitle: "Image générée avec succès !",
      successDesc: (count: number) => `Il vous reste ${count} crédit${count > 1 ? 's' : ''}.`,
      noImageError: "Aucune image générée dans la réponse.",
      examplePrompts: [
        "Un coucher de soleil vibrant sur une ville futuriste avec des gratte-ciels illuminés",
        "Un portrait artistique d'un chat astronaute explorant une planète colorée",
        "Une forêt enchantée avec des arbres lumineux et des créatures fantastiques",
        "Un paysage de montagne enneigé sous une aurore boréale spectaculaire",
        "Une scène urbaine moderne avec des néons et une ambiance cyberpunk"
      ]
    },
    en: {
      poweredBy: "Powered by Google Gemini",
      title: "AI Image Generator",
      subtitle: "Transform your ideas into stunning visuals instantly.",
      quotaError: {
        title: "Google API Quota Exceeded",
        description: "The daily quota has been reached. Try again tomorrow or increase your quota on"
      },
      rateLimitError: {
        title: "Too Many Requests",
        description: "Please wait a few minutes before trying again."
      },
      creditsAvailable: (count: number) => `${count} credit${count > 1 ? 's' : ''} available`,
      noCredits: "No credits available",
      buyCredits: "Buy Credits",
      promptLabel: "Describe the image you want to create",
      promptPlaceholder: "For example: A majestic mountain landscape at sunset...",
      generating: "Generating...",
      generate: "Generate Image",
      suggestions: "Prompt Suggestions",
      imagePreview: "Your image will appear here",
      enterPrompt: "Enter a prompt and click \"Generate Image\"",
      download: "Download Image",
      creditsUnique: "Pay-as-you-go Credits",
      unlimited: "Creative Possibilities",
      quality: "Professional Quality",
      loginRequired: "Login Required",
      loginDescription: "Please log in to generate AI images.",
      promptRequired: "Prompt Required",
      promptRequiredDesc: "Please enter a description to generate an image.",
      insufficientCredits: "Insufficient Credits",
      insufficientCreditsDesc: "Please purchase credits to continue generating images.",
      workspaceCreditsError: "Insufficient Workspace Credits",
      workspaceCreditsDesc: "The Lovable AI account needs more credits. Contact the administrator.",
      rateLimitedTitle: "Rate Limit Reached",
      rateLimitedDesc: "Please try again in a few minutes.",
      quotaTitle: "Quota Exceeded",
      quotaDesc: "The daily Google API quota has been reached. Try again tomorrow.",
      tooManyRequests: "Too Many Requests",
      tooManyRequestsDesc: "Too many requests. Please try again in a few minutes.",
      error: "Error",
      errorDesc: "Unable to generate image. Please try again.",
      successTitle: "Image generated successfully!",
      successDesc: (count: number) => `You have ${count} credit${count > 1 ? 's' : ''} remaining.`,
      noImageError: "No image generated in the response.",
      examplePrompts: [
        "A vibrant sunset over a futuristic city with illuminated skyscrapers",
        "An artistic portrait of an astronaut cat exploring a colorful planet",
        "An enchanted forest with glowing trees and fantastic creatures",
        "A snowy mountain landscape under a spectacular aurora borealis",
        "A modern urban scene with neon lights and a cyberpunk atmosphere"
      ]
    }
  };
  
  const t = content[language];

  useEffect(() => {
    if (user) {
      fetchCreditsBalance();
    }
  }, [user]);

  const fetchCreditsBalance = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_credits')
      .select('credits_balance')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching credits:', error);
      setCreditsBalance(0);
    } else {
      setCreditsBalance(data?.credits_balance ?? 0);
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      toast({
        title: t.loginRequired,
        description: t.loginDescription,
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: t.promptRequired,
        description: t.promptRequiredDesc,
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);
    setAiErrorCode(null);
    
    try {
      console.log('Invoking generate-ai-image function with prompt:', prompt.trim());
      const { data, error } = await supabase.functions.invoke('generate-ai-image', {
        body: { prompt: prompt.trim() }
      });

      console.log('Function response:', { data, error });

      // Handle specific errors from function
      if (data?.error === 'insufficient_credits') {
        toast({
          title: t.insufficientCredits,
          description: data.message || t.insufficientCreditsDesc,
          variant: "destructive"
        });
        setCreditsBalance(data.current_balance ?? 0);
        return;
      }
      if (data?.error === 'payment_required') {
        setAiErrorCode('payment_required');
        toast({
          title: t.workspaceCreditsError,
          description: t.workspaceCreditsDesc,
          variant: "destructive"
        });
        return;
      }
      if (data?.error === 'rate_limited') {
        setAiErrorCode('rate_limited');
        toast({
          title: t.rateLimitedTitle,
          description: t.rateLimitedDesc,
          variant: "destructive"
        });
        return;
      }

      // Handle other errors from function response (string-based)
      if (data?.error) {
        const errorMsg = String(data.error);
        if (errorMsg.includes('Quota') || errorMsg.includes('403')) {
          setAiErrorCode('quota_exceeded');
          toast({
            title: t.quotaTitle,
            description: t.quotaDesc,
            variant: "destructive"
          });
        } else if (errorMsg.includes('Limite de taux') || errorMsg.includes('429')) {
          setAiErrorCode('rate_limited');
          toast({
            title: t.tooManyRequests,
            description: t.tooManyRequestsDesc,
            variant: "destructive"
          });
        } else {
          toast({
            title: t.error,
            description: errorMsg,
            variant: "destructive"
          });
        }
        return;
      }

      // Handle error thrown by invoke
      if (error) {
        throw error;
      }

      // Success case
      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setCreditsBalance(data.creditsRemaining ?? 0);
        setAiErrorCode(null);
        
        toast({
          title: t.successTitle,
          description: t.successDesc(data.creditsRemaining ?? 0)
        });
      } else {
        toast({
          title: t.error,
          description: t.noImageError,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      
      // Parse error message for specific cases
      const errorMsg = error?.message || JSON.stringify(error);
      if (errorMsg.includes('403') || errorMsg.toLowerCase().includes('quota')) {
        setAiErrorCode('quota_exceeded');
        toast({
          title: t.quotaTitle,
          description: t.quotaDesc,
          variant: "destructive"
        });
      } else if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')) {
        setAiErrorCode('rate_limited');
        toast({
          title: t.tooManyRequests,
          description: t.tooManyRequestsDesc,
          variant: "destructive"
        });
      } else {
        toast({
          title: t.error,
          description: t.errorDesc,
          variant: "destructive"
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">{t.poweredBy}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.subtitle}
          </p>
          {aiErrorCode === 'quota_exceeded' && (
            <div className="max-w-2xl mx-auto">
              <Alert variant="destructive">
                <AlertTitle>{t.quotaError.title}</AlertTitle>
                <AlertDescription>
                  {t.quotaError.description}{' '}
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    Google AI Studio
                  </a>.
                </AlertDescription>
              </Alert>
            </div>
          )}
          {aiErrorCode === 'rate_limited' && (
            <div className="max-w-2xl mx-auto">
              <Alert variant="destructive">
                <AlertTitle>{t.rateLimitError.title}</AlertTitle>
                <AlertDescription>
                  {t.rateLimitError.description}
                </AlertDescription>
              </Alert>
            </div>
          )}
          {user && creditsBalance !== null && (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent/50 border border-border">
              <ImageIcon className="w-5 h-5 text-primary" />
              <span className="font-medium">
                {creditsBalance > 0 ? t.creditsAvailable(creditsBalance) : t.noCredits}
              </span>
              {creditsBalance === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/buy-credits')}
                  className="ml-2"
                >
                  {t.buyCredits}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Left Side - Input */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
              <label htmlFor="prompt" className="block text-sm font-medium mb-3">
                {t.promptLabel}
              </label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.promptPlaceholder}
                className="min-h-[150px] resize-none text-base"
                disabled={isGenerating}
              />
              
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || aiErrorCode === 'quota_exceeded'}
                className="w-full mt-6 h-12 text-base font-semibold rounded-xl"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t.generating}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    {t.generate}
                  </>
                )}
              </Button>
            </div>

            {/* Example Prompts */}
            <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {t.suggestions}
              </h3>
              <div className="space-y-2">
                {t.examplePrompts.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(example)}
                    disabled={isGenerating}
                    className="w-full text-left p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors text-sm border border-border/50 hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Preview */}
          <div className="bg-card rounded-2xl p-8 shadow-lg border border-border min-h-[500px] flex items-center justify-center">
            {generatedImage ? (
              <div className="w-full space-y-4">
                <img
                  src={generatedImage}
                  alt={t.title}
                  className="w-full h-auto rounded-xl shadow-xl"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = generatedImage;
                    link.download = `ai-generated-${Date.now()}.png`;
                    link.click();
                  }}
                >
                  {t.download}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4 text-muted-foreground">
                <div className="w-24 h-24 mx-auto rounded-full bg-accent/30 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                </div>
                <p className="text-lg font-medium">{t.imagePreview}</p>
                <p className="text-sm">{t.enterPrompt}</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-8 border border-primary/20">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">💳</div>
              <div className="text-sm text-muted-foreground">{t.creditsUnique}</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">∞</div>
              <div className="text-sm text-muted-foreground">{t.unlimited}</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">✨</div>
              <div className="text-sm text-muted-foreground">{t.quality}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}