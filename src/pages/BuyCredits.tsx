import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Check, Zap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const CREDIT_PACKS = {
  fr: [
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
  ],
  en: [
    {
      id: 'starter',
      name: 'Starter Pack',
      credits: 10,
      price: 1.99,
      pricePerCredit: 0.199,
      popular: false,
      icon: Sparkles,
      features: ['10 image generations', 'Standard quality', 'Email support']
    },
    {
      id: 'pro',
      name: 'Pro Pack',
      credits: 50,
      price: 7.99,
      pricePerCredit: 0.160,
      popular: true,
      icon: Zap,
      features: ['50 image generations', 'Professional quality', 'Priority support', 'Save 20%']
    },
    {
      id: 'premium',
      name: 'Premium Pack',
      credits: 100,
      price: 12.99,
      pricePerCredit: 0.130,
      popular: false,
      icon: Sparkles,
      features: ['100 image generations', 'Maximum quality', 'Dedicated support', 'Save 35%']
    },
    {
      id: 'ultimate',
      name: 'Ultimate Pack',
      credits: 500,
      price: 49.99,
      pricePerCredit: 0.100,
      popular: false,
      icon: Sparkles,
      features: ['500 image generations', 'Premium quality', 'VIP 24/7 support', 'Best deal - 50% savings']
    }
  ]
};

export default function BuyCredits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  
  const content = {
    fr: {
      title: "Acheter des crédits IA",
      subtitle: "Générez des images époustouflantes avec notre IA. Choisissez le pack qui vous convient.",
      currentBalance: "Solde actuel",
      credit: "crédit",
      credits: "crédits",
      mostPopular: "Plus populaire",
      processing: "Traitement...",
      buyNow: "Acheter maintenant",
      loginRequired: "Connexion requise",
      loginDesc: "Veuillez vous connecter pour acheter des crédits.",
      paymentCanceled: "Paiement annulé",
      paymentCanceledDesc: "Votre paiement a été annulé. Aucun montant n'a été débité.",
      paymentRedirect: "Redirection vers le paiement",
      paymentRedirectDesc: "Une nouvelle fenêtre s'est ouverte pour finaliser votre achat.",
      error: "Erreur",
      errorDesc: "Impossible de créer la session de paiement.",
      whyBuy: "Pourquoi acheter des crédits ?",
      qualityTitle: "🎨 Qualité professionnelle",
      qualityDesc: "Générez des images de haute qualité avec notre IA basée sur Lovable AI Gateway (Google Gemini).",
      speedTitle: "⚡ Génération rapide",
      speedDesc: "Créez vos images en quelques secondes seulement, sans attente.",
      pricingTitle: "💰 Tarification transparente",
      pricingDesc: "Pas d'abonnement. Payez uniquement pour les crédits que vous utilisez. Plus vous achetez, plus vous économisez.",
      securityTitle: "🔒 Paiement sécurisé",
      securityDesc: "Tous les paiements sont traités de manière sécurisée par Stripe, leader mondial des paiements en ligne."
    },
    en: {
      title: "Buy AI Credits",
      subtitle: "Generate stunning images with our AI. Choose the pack that suits you.",
      currentBalance: "Current balance",
      credit: "credit",
      credits: "credits",
      mostPopular: "Most Popular",
      processing: "Processing...",
      buyNow: "Buy Now",
      loginRequired: "Login Required",
      loginDesc: "Please log in to purchase credits.",
      paymentCanceled: "Payment Canceled",
      paymentCanceledDesc: "Your payment was canceled. No amount was charged.",
      paymentRedirect: "Redirecting to payment",
      paymentRedirectDesc: "A new window has opened to complete your purchase.",
      error: "Error",
      errorDesc: "Unable to create payment session.",
      whyBuy: "Why buy credits?",
      qualityTitle: "🎨 Professional Quality",
      qualityDesc: "Generate high-quality images with our AI based on Lovable AI Gateway (Google Gemini).",
      speedTitle: "⚡ Fast Generation",
      speedDesc: "Create your images in just seconds, without waiting.",
      pricingTitle: "💰 Transparent Pricing",
      pricingDesc: "No subscription. Pay only for the credits you use. The more you buy, the more you save.",
      securityTitle: "🔒 Secure Payment",
      securityDesc: "All payments are processed securely by Stripe, the global leader in online payments."
    }
  };
  
  const t = content[language];
  const creditPacks = CREDIT_PACKS[language];

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
        title: t.paymentCanceled,
        description: t.paymentCanceledDesc,
        variant: "destructive"
      });
    }
  }, [searchParams, toast, t]);

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
        title: t.loginRequired,
        description: t.loginDesc,
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
          title: t.paymentRedirect,
          description: t.paymentRedirectDesc
        });
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: t.error,
        description: error.message || t.errorDesc,
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
            {t.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t.subtitle}
          </p>
          
          {creditsBalance !== null && (
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold text-lg">
                {t.currentBalance} : {creditsBalance} {creditsBalance > 1 ? t.credits : t.credit}
              </span>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {creditPacks.map((pack) => (
            <Card 
              key={pack.id}
              className={`relative ${pack.popular ? 'border-primary shadow-lg scale-105' : 'border-border'}`}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                    {t.mostPopular}
                  </span>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <pack.icon className="w-8 h-8 text-primary" />
                  <div className="text-right">
                    <div className="text-3xl font-bold">{pack.price}€</div>
                    <div className="text-xs text-muted-foreground">
                      {pack.pricePerCredit.toFixed(3)}€/{t.credit}
                    </div>
                  </div>
                </div>
                <CardTitle className="text-xl">{pack.name}</CardTitle>
                <CardDescription className="text-lg font-semibold text-foreground">
                  {pack.credits} {t.credits}
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
                      {t.processing}
                    </>
                  ) : (
                    t.buyNow
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
              <CardTitle className="text-2xl">{t.whyBuy}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{t.qualityTitle}</h3>
                  <p className="text-sm">
                    {t.qualityDesc}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{t.speedTitle}</h3>
                  <p className="text-sm">
                    {t.speedDesc}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{t.pricingTitle}</h3>
                  <p className="text-sm">
                    {t.pricingDesc}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{t.securityTitle}</h3>
                  <p className="text-sm">
                    {t.securityDesc}
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
