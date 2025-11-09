import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Check, Zap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const CREDIT_PACKS = [
  {
    id: 'starter',
    name: 'Pack Starter',
    credits: 10,
    price: 1.99,
    pricePerCredit: 0.199,
    popular: false,
    icon: Sparkles,
    features: ['10 générations d\'images', 'Qualité standard', 'Support par email']
  },
  {
    id: 'pro',
    name: 'Pack Pro',
    credits: 50,
    price: 7.99,
    pricePerCredit: 0.160,
    popular: true,
    icon: Zap,
    features: ['50 générations d\'images', 'Qualité professionnelle', 'Support prioritaire', 'Économisez 20%']
  },
  {
    id: 'premium',
    name: 'Pack Premium',
    credits: 100,
    price: 12.99,
    pricePerCredit: 0.130,
    popular: false,
    icon: Sparkles,
    features: ['100 générations d\'images', 'Qualité maximale', 'Support dédié', 'Économisez 35%']
  },
  {
    id: 'ultimate',
    name: 'Pack Ultimate',
    credits: 500,
    price: 49.99,
    pricePerCredit: 0.100,
    popular: false,
    icon: Sparkles,
    features: ['500 générations d\'images', 'Qualité premium', 'Support VIP 24/7', 'Meilleure offre - 50% d\'économie']
  }
];

export default function BuyCredits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCreditsBalance();
    } else {
      navigate('/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      toast({
        title: "Paiement annulé",
        description: "Votre paiement a été annulé. Aucun montant n'a été débité.",
        variant: "destructive"
      });
    }
  }, [searchParams, toast]);

  const fetchCreditsBalance = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_credits')
      .select('credits_balance')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching credits:', error);
    }
    setCreditsBalance(data?.credits_balance ?? 0);
  };

  const handlePurchase = async (packId: string) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour acheter des crédits.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    setIsLoading(packId);

    try {
      console.log('Initiating payment for pack:', packId);
      const { data, error } = await supabase.functions.invoke('create-credits-payment', {
        body: { pack: packId }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open Stripe Checkout in new tab
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirection vers le paiement",
          description: "Une nouvelle fenêtre s'est ouverte pour finaliser votre achat."
        });
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la session de paiement.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Acheter des crédits IA
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Générez des images époustouflantes avec notre IA. Choisissez le pack qui vous convient.
          </p>
          
          {creditsBalance !== null && (
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold text-lg">
                Solde actuel : {creditsBalance} crédit{creditsBalance > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {CREDIT_PACKS.map((pack) => (
            <Card 
              key={pack.id}
              className={`relative ${pack.popular ? 'border-primary shadow-lg scale-105' : 'border-border'}`}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                    Plus populaire
                  </span>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <pack.icon className="w-8 h-8 text-primary" />
                  <div className="text-right">
                    <div className="text-3xl font-bold">{pack.price}€</div>
                    <div className="text-xs text-muted-foreground">
                      {pack.pricePerCredit.toFixed(3)}€/crédit
                    </div>
                  </div>
                </div>
                <CardTitle className="text-xl">{pack.name}</CardTitle>
                <CardDescription className="text-lg font-semibold text-foreground">
                  {pack.credits} crédits
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-2">
                  {pack.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button
                  className="w-full"
                  variant={pack.popular ? "default" : "outline"}
                  onClick={() => handlePurchase(pack.id)}
                  disabled={isLoading !== null}
                >
                  {isLoading === pack.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    'Acheter maintenant'
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Pourquoi acheter des crédits ?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">🎨 Qualité professionnelle</h3>
                  <p className="text-sm">
                    Générez des images de haute qualité avec notre IA basée sur Lovable AI Gateway (Google Gemini).
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">⚡ Génération rapide</h3>
                  <p className="text-sm">
                    Créez vos images en quelques secondes seulement, sans attente.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">💰 Tarification transparente</h3>
                  <p className="text-sm">
                    Pas d'abonnement. Payez uniquement pour les crédits que vous utilisez. Plus vous achetez, plus vous économisez.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">🔒 Paiement sécurisé</h3>
                  <p className="text-sm">
                    Tous les paiements sont traités de manière sécurisée par Stripe, leader mondial des paiements en ligne.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
