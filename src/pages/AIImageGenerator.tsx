import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, Image as ImageIcon, Wand2, Zap, Palette, Download, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSEO } from '@/hooks/useSEO';
import aiHeroImage from '@/assets/ai-generator-hero.jpg';

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
      heroTitle: "Créez des images IA avec VisuStock",
      heroStep1Title: "Décrivez votre vision",
      heroStep1Desc: "Commencez par écrire un prompt détaillé décrivant l'image souhaitée.",
      heroStep2Title: "Expérimentez",
      heroStep2Desc: "Modifiez le texte et essayez différents styles jusqu'à obtenir l'image désirée.",
      heroStep3Title: "Téléchargez & Utilisez",
      heroStep3Desc: "Une fois satisfait, téléchargez votre image IA pour vos projets.",
      generateWithAI: "Générer avec l'IA",
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
      freeEditsAvailable: (count: number) => `${count}/5 éditions gratuites`,
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
      heroTitle: "Create AI images with VisuStock",
      heroStep1Title: "Set your idea",
      heroStep1Desc: "Begin by typing a detailed prompt outlining your desired image.",
      heroStep2Title: "Try more",
      heroStep2Desc: "Edit the text to suit your vision and try different styles until you achieve the desired image.",
      heroStep3Title: "Download and License",
      heroStep3Desc: "When satisfied with your AI-generated image, download it for use in your projects.",
      generateWithAI: "Generate using AI",
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
      freeEditsAvailable: (count: number) => `${count}/5 Free edits`,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Header Section */}
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20">
          {/* Animated background effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
          
          <div className="relative p-8 md:p-12">
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider border border-blue-500/30">
                <Sparkles className="w-3 h-3" />
                New
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              {language === 'en' ? (
              <>
                  Unleash your imagination and create with{' '}
                  <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    VisuStock's image generator!
                  </span>
                </>
              ) : (
              <>
                  Libérez votre imagination et créez avec{' '}
                  <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    le générateur d'images VisuStock !
                  </span>
                </>
              )}
            </h1>
            <p className="text-lg text-slate-300 max-w-3xl">
              {language === 'en' 
                ? "Select additional features that will help you generate better images."
                : "Sélectionnez des fonctionnalités supplémentaires qui vous aideront à générer de meilleures images."}
            </p>
          </div>
        </div>

        {/* Main Generator Section */}
        <div className="relative mb-12 rounded-3xl bg-gradient-to-br from-slate-900/80 via-blue-950/20 to-slate-900/80 border border-blue-500/20 backdrop-blur-xl overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-500/20 to-transparent rounded-tr-full" />
          
          <div className="relative p-6 md:p-8">
            {/* Credits and status bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">{t.promptLabel}</span>
              </div>
              <div className="flex items-center gap-4">
                {user && creditsBalance !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className={creditsBalance > 0 ? "text-blue-400" : "text-red-400"}>
                      {t.freeEditsAvailable(creditsBalance)}
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigate('/buy-credits')}
                      className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                    >
                      {t.buyCredits}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Prompt input area */}
            <div className="relative mb-6">
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.promptPlaceholder}
                className="min-h-[120px] resize-none text-base bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 rounded-2xl focus:border-blue-500/50 focus:ring-blue-500/20"
                disabled={isGenerating}
              />
            </div>

            {/* Generate Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || aiErrorCode === 'quota_exceeded'}
                className="h-14 px-8 text-base font-bold rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t.generating}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    {t.generate}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alerts */}
        {aiErrorCode === 'quota_exceeded' && (
          <div className="max-w-3xl mx-auto mb-8">
            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
              <AlertTitle>{t.quotaError.title}</AlertTitle>
              <AlertDescription>
                {t.quotaError.description}{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-medium text-red-300">
                  Google AI Studio
                </a>.
              </AlertDescription>
            </Alert>
          </div>
        )}
        {aiErrorCode === 'rate_limited' && (
          <div className="max-w-3xl mx-auto mb-8">
            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
              <AlertTitle>{t.rateLimitError.title}</AlertTitle>
              <AlertDescription>
                {t.rateLimitError.description}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Generated Image Preview */}
        {generatedImage && (
          <div className="mb-12 rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-900/60 border border-blue-500/20 p-6 md:p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-400" />
              {t.imagePreview}
            </h3>
            <div className="relative rounded-2xl overflow-hidden bg-slate-800/50">
              <img
                src={generatedImage}
                alt={t.title}
                className="w-full h-auto max-h-[600px] object-contain"
              />
            </div>
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                className="h-12 px-6 rounded-xl border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = generatedImage;
                  link.download = `ai-generated-${Date.now()}.png`;
                  link.click();
                }}
              >
                <Download className="w-5 h-5 mr-2" />
                {t.download}
              </Button>
            </div>
          </div>
        )}

        {/* Example Prompts Section */}
        <div className="mb-12 rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-900/60 border border-indigo-500/20 p-6 md:p-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            {t.suggestions}
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {t.examplePrompts.map((example, index) => (
              <button
                key={index}
                onClick={() => setPrompt(example)}
                disabled={isGenerating}
                className="group text-left p-4 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/30 hover:border-blue-500/50 transition-all duration-300 text-sm text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="line-clamp-2">{example}</span>
                <ArrowRight className="w-4 h-4 mt-2 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        {/* Hero Image & Steps Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Left - Steps */}
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              {t.heroTitle}
            </h2>
            
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">{t.heroStep1Title}</h4>
                  <p className="text-sm text-slate-400">{t.heroStep1Desc}</p>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 hover:border-indigo-500/40 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">{t.heroStep2Title}</h4>
                  <p className="text-sm text-slate-400">{t.heroStep2Desc}</p>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="flex gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">{t.heroStep3Title}</h4>
                  <p className="text-sm text-slate-400">{t.heroStep3Desc}</p>
                </div>
              </div>
            </div>
            
            <Button
              onClick={() => document.getElementById('prompt')?.focus()}
              className="mt-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {t.generateWithAI}
            </Button>
          </div>
          
          {/* Right - Hero Image */}
          <div className="relative">
            {/* Floating decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-2xl opacity-20 blur-sm animate-pulse" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl opacity-20 blur-sm animate-pulse delay-500" />
            
            <div className="relative rounded-3xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-purple-500/10">
              <img
                src={aiHeroImage}
                alt="AI Image Generator"
                className="w-full h-auto object-cover"
              />
              {/* Floating badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
              {/* Decorative corner accent */}
              <div className="absolute -top-2 -right-2 w-12 h-12">
                <svg viewBox="0 0 100 100" className="w-full h-full text-blue-400">
                  <path d="M0 100 L100 100 L100 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 border border-blue-500/20 p-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3 group">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-white">{t.creditsUnique}</h4>
              <p className="text-sm text-slate-400">
                {language === 'en' ? 'Pay only for what you use' : 'Payez uniquement ce que vous utilisez'}
              </p>
            </div>
            <div className="space-y-3 group">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Palette className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-white">{t.unlimited}</h4>
              <p className="text-sm text-slate-400">
                {language === 'en' ? 'Endless creative options' : 'Options créatives infinies'}
              </p>
            </div>
            <div className="space-y-3 group">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-white">{t.quality}</h4>
              <p className="text-sm text-slate-400">
                {language === 'en' ? 'High-resolution outputs' : 'Sorties haute résolution'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
