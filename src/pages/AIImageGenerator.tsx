import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
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
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-image', {
        body: { prompt }
      });

      if (error) {
        if (data?.error === 'limit_reached') {
          toast({
            title: "Limite atteinte",
            description: data.message,
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      setGeneratedImage(data.imageUrl);
      setRemainingGenerations(data.remainingGenerations);
      
      toast({
        title: "Image générée avec succès !",
        description: `Il vous reste ${data.remainingGenerations} générations gratuites.`
      });
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer l'image. Veuillez réessayer.",
        variant: "destructive"
      });
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
                disabled={isGenerating || !prompt.trim()}
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
