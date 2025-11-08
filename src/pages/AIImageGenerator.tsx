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

const examplePrompts = [
  "Un coucher de soleil vibrant sur une ville futuriste avec des gratte-ciels illuminés",
  "Un portrait artistique d'un chat astronaute explorant une planète colorée",
  "Une forêt enchantée avec des arbres lumineux et des créatures fantastiques",
  "Un paysage de montagne enneigé sous une aurore boréale spectaculaire",
  "Une scène urbaine moderne avec des néons et une ambiance cyberpunk"
];

export default function AIImageGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [remainingGenerations, setRemainingGenerations] = useState<number | null>(null);
  const [aiErrorCode, setAiErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRemainingGenerations();
    }
  }, [user]);

  const fetchRemainingGenerations = async () => {
    if (!user) return;
    
    const { count } = await supabase
      .from('ai_image_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    setRemainingGenerations(5 - (count || 0));
  };

  const handleGenerate = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour générer des images IA.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "Prompt requis",
        description: "Veuillez entrer une description pour générer une image.",
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
      if (data?.error === 'limit_reached') {
        toast({
          title: "Limite atteinte",
          description: data.message || "Vous avez utilisé vos 5 générations gratuites.",
          variant: "destructive"
        });
        return;
      }
      if (data?.error === 'quota_exceeded') {
        setAiErrorCode('quota_exceeded');
        toast({
          title: "Quota dépassé",
          description: "Le quota quotidien Google API (1500 images/jour) a été atteint. Réessayez demain.",
          variant: "destructive"
        });
        return;
      }
      if (data?.error === 'rate_limited') {
        setAiErrorCode('rate_limited');
        toast({
          title: "Trop de requêtes",
          description: "Veuillez réessayer dans quelques minutes.",
          variant: "destructive"
        });
        return;
      }
      if (data?.error === 'payment_required') {
        setAiErrorCode('payment_required');
        toast({
          title: "Crédits épuisés",
          description: "Crédits Lovable AI insuffisants. Ajoutez des crédits dans Workspace → Usage.",
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
            title: "Quota dépassé",
            description: "Le quota quotidien Google API a été atteint. Réessayez demain.",
            variant: "destructive"
          });
        } else if (errorMsg.includes('Limite de taux') || errorMsg.includes('429')) {
          setAiErrorCode('rate_limited');
          toast({
            title: "Trop de requêtes",
            description: "Veuillez réessayer dans quelques minutes.",
            variant: "destructive"
          });
        } else if (errorMsg.includes('402') || errorMsg.toLowerCase().includes('payment')) {
          setAiErrorCode('payment_required');
          toast({
            title: "Crédits épuisés",
            description: "Crédits Lovable AI insuffisants. Ajoutez des crédits dans Workspace → Usage.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erreur",
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
        setRemainingGenerations(data.remainingGenerations ?? 0);
        setAiErrorCode(null);
        
        toast({
          title: "Image générée avec succès !",
          description: `Il vous reste ${data.remainingGenerations ?? 0} génération${(data.remainingGenerations ?? 0) > 1 ? 's' : ''} gratuite${(data.remainingGenerations ?? 0) > 1 ? 's' : ''}.`
        });
      } else {
        toast({
          title: "Erreur",
          description: "Aucune image générée dans la réponse.",
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
          title: "Quota dépassé",
          description: "Le quota quotidien Google API a été atteint. Réessayez demain.",
          variant: "destructive"
        });
      } else if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')) {
        setAiErrorCode('rate_limited');
        toast({
          title: "Limite de requêtes",
          description: "Trop de requêtes. Veuillez réessayer dans quelques minutes.",
          variant: "destructive"
        });
      } else if (errorMsg.includes('402') || errorMsg.toLowerCase().includes('payment')) {
        setAiErrorCode('payment_required');
        toast({
          title: "Crédits épuisés",
          description: "Crédits Lovable AI insuffisants. Ajoutez des crédits dans Workspace → Usage.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de générer l'image. Veuillez réessayer.",
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
            <span className="text-sm font-medium">Propulsé par l'IA</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Générateur d'images IA
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transformez vos idées en visuels époustouflants instantanément.
          </p>
          {aiErrorCode === 'quota_exceeded' && (
            <div className="max-w-2xl mx-auto">
              <Alert variant="destructive">
                <AlertTitle>Quota Google API dépassé</AlertTitle>
                <AlertDescription>
                  Le quota quotidien de 1500 images/jour a été atteint. Réessayez demain ou augmentez votre quota sur{' '}
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
                <AlertTitle>Trop de requêtes</AlertTitle>
                <AlertDescription>
                  Veuillez attendre quelques minutes avant de réessayer.
                </AlertDescription>
              </Alert>
            </div>
          )}
          {aiErrorCode === 'payment_required' && (
            <div className="max-w-2xl mx-auto">
              <Alert variant="destructive">
                <AlertTitle>Crédits épuisés</AlertTitle>
                <AlertDescription>
                  Les crédits Lovable AI de l’atelier sont épuisés. Ajoutez des crédits dans Workspace → Usage et réessayez.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          {user && remainingGenerations !== null && (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent/50 border border-border">
              <ImageIcon className="w-5 h-5 text-primary" />
              <span className="font-medium">
                {remainingGenerations > 0 
                  ? `${remainingGenerations} génération${remainingGenerations > 1 ? 's' : ''} gratuite${remainingGenerations > 1 ? 's' : ''} restante${remainingGenerations > 1 ? 's' : ''}`
                  : "Vous avez utilisé vos 5 générations gratuites"}
              </span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Left Side - Input */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
              <label htmlFor="prompt" className="block text-sm font-medium mb-3">
                Décrivez l'image que vous souhaitez créer
              </label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Par exemple : Un paysage de montagne majestueux au coucher du soleil..."
                className="min-h-[150px] resize-none text-base"
                disabled={isGenerating}
              />
              
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || aiErrorCode === 'quota_exceeded' || aiErrorCode === 'payment_required'}
                className="w-full mt-6 h-12 text-base font-semibold rounded-xl"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Générer l'image
                  </>
                )}
              </Button>
            </div>

            {/* Example Prompts */}
            <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Suggestions de prompts
              </h3>
              <div className="space-y-2">
                {examplePrompts.map((example, index) => (
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
                  alt="Image générée par IA"
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
                  Télécharger l'image
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4 text-muted-foreground">
                <div className="w-24 h-24 mx-auto rounded-full bg-accent/30 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                </div>
                <p className="text-lg font-medium">Votre image apparaîtra ici</p>
                <p className="text-sm">Entrez un prompt et cliquez sur "Générer l'image"</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-8 border border-primary/20">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">5</div>
              <div className="text-sm text-muted-foreground">Générations gratuites</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">∞</div>
              <div className="text-sm text-muted-foreground">Possibilités créatives</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">✨</div>
              <div className="text-sm text-muted-foreground">Qualité professionnelle</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
