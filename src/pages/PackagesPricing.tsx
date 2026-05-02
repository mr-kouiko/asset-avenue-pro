import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, CreditCard, Zap, Star, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { usePayPalSubscription, SUBSCRIPTION_PLANS } from "@/hooks/usePayPalSubscription";
import { useMarketplacePayment } from "@/hooks/useMarketplacePayment";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
const PackagesPricing = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingCredits, setLoadingCredits] = useState<number | null>(null);
  const { toast } = useToast();
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    subscribed, 
    subscription, 
    loading: subscriptionLoading, 
    createSubscription 
  } = usePayPalSubscription();
  const { createCreditPackPayment, loading: paymentLoading } = useMarketplacePayment();

  // SEO Configuration
  useSEO({
    title: language === 'en' 
      ? "Packages & Pricing - Flexible Creative Content Plans"
      : "Forfaits & Tarifs - Plans de Contenu Créatif Flexibles",
    description: language === 'en'
      ? "Explore our flexible pricing plans for creative content. Choose from credit packages or subscriptions to access unlimited images, videos, vectors, and audio for your projects."
      : "Découvrez nos plans tarifaires flexibles pour le contenu créatif. Choisissez parmi des packages de crédits ou des abonnements pour accéder à des images, vidéos, vecteurs et audios illimités pour vos projets.",
    type: 'website'
  });

  const content = {
    fr: {
      hero: {
        title: "Packages & Pricing",
        subtitle: "Choisissez le forfait parfait pour alimenter vos besoins créatifs. Accédez à une bibliothèque illimitée d'images, vidéos, vecteurs et audios."
      },
      credits: {
        title: "Credit Packages",
        subtitle: "Achat unique avec validité de téléchargement d'un an",
        credits: "crédits",
        buyNow: "Buy Now",
        disclaimer: "Ce forfait permet de télécharger une combinaison de fichiers avec licence standard.",
        toast: {
          title: "Redirection vers le paiement...",
          description: (credits: number, price: number) => `Achat de ${credits} crédits pour $${price}`
        }
      },
      subscription: {
        title: "Subscription Packages", 
        subtitle: "Abonnement renouvelable pour une meilleure valeur avec validité de téléchargement d'un mois",
        monthly: "Mensuel",
        yearly: "Annuel",
        savePercent: "Économisez 16%",
        bestValue: "Best Value",
        credits: "crédits",
        month: "mois",
        monthly_: "mensuel",
        subscribeNow: "Subscribe Now",
        disclaimer: "Renouvelé automatiquement, le renouvellement peut être annulé à tout moment",
        toast: {
          title: "Redirection vers le paiement...",
          description: (credits: number, price: number, isYearly: boolean) => 
            `Abonnement ${credits} crédits pour $${price}/${isYearly ? 'mois (facturation annuelle)' : 'mois'}`
        }
      },
      features: {
        title: "Pourquoi choisir VisuStock ?",
        license: {
          title: "Licence Standard Incluse",
          description: "Tous les téléchargements incluent notre licence standard pour un usage commercial"
        },
        premium: {
          title: "Contenu Premium", 
          description: "Accès à des millions d'images, vecteurs, vidéos et audios de haute qualité"
        },
        instant: {
          title: "Téléchargement Instantané",
          description: "Téléchargez immédiatement tous vos fichiers en haute résolution"
        }
      },
      contentTypes: {
        photos: "photos",
        videos: "vidéos", 
        vectors: "vecteurs",
        audios: "audios",
        aiImages: "images AI",
        or: "ou"
      }
    },
    en: {
      hero: {
        title: "Packages & Pricing",
        subtitle: "Choose the perfect package to fuel your creative needs. Access an unlimited library of images, videos, vectors, and audio."
      },
      credits: {
        title: "Credit Packages",
        subtitle: "One-time purchase with one year download validity",
        credits: "credits",
        buyNow: "Buy Now",
        disclaimer: "This package allows downloading a combination of files with standard license.",
        toast: {
          title: "Redirecting to payment...",
          description: (credits: number, price: number) => `Purchase ${credits} credits for $${price}`
        }
      },
      subscription: {
        title: "Subscription Packages",
        subtitle: "Renewable subscription for better value with one month download validity", 
        monthly: "Monthly",
        yearly: "Yearly",
        savePercent: "Save 16%",
        bestValue: "Best Value",
        credits: "credits",
        month: "month",
        monthly_: "monthly",
        subscribeNow: "Subscribe Now",
        disclaimer: "Auto-renewed, renewal can be cancelled anytime",
        toast: {
          title: "Redirecting to payment...",
          description: (credits: number, price: number, isYearly: boolean) =>
            `Subscribe ${credits} credits for $${price}/${isYearly ? 'month (annual billing)' : 'month'}`
        }
      },
      features: {
        title: "Why Choose VisuStock?",
        license: {
          title: "Standard License Included",
          description: "All downloads include our standard license for commercial use"
        },
        premium: {
          title: "Premium Content",
          description: "Access millions of high-quality images, vectors, videos, and audio"
        },
        instant: {
          title: "Instant Download",
          description: "Download all your files immediately in high resolution"
        }
      },
      contentTypes: {
        photos: "photos",
        videos: "videos",
        vectors: "vectors", 
        audios: "audio",
        aiImages: "AI images",
        or: "or"
      }
    }
  };

  const t = content[language as 'en' | 'fr'] ?? content.en;

  const handleBuyCredits = async (credits: number, price: number, packIndex: number) => {
    if (!user) {
      toast({
        title: language === 'en' ? 'Login Required' : 'Connexion Requise',
        description: language === 'en' ? 'Please log in to purchase credits' : 'Veuillez vous connecter pour acheter des crédits',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setLoadingCredits(packIndex);
    
    toast({
      title: t.credits.toast.title,
      description: t.credits.toast.description(credits, price)
    });
    
    // Use PayPal for credit pack purchase with proper parameters
    await createCreditPackPayment({
      packId: `credits_${credits}`,
      credits,
      price
    });
    
    setLoadingCredits(null);
  };

  const handleSubscribe = async (planType: string, credits: number, monthlyPrice: number) => {
    if (!user) {
      toast({
        title: language === 'en' ? 'Login Required' : 'Connexion Requise',
        description: language === 'en' ? 'Please log in to subscribe' : 'Veuillez vous connecter pour vous abonner',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    const yearlyPrice = Math.round(monthlyPrice * 12 * 0.84); // 16% discount
    const price = isYearly ? Math.round(yearlyPrice / 12) : monthlyPrice;
    
    toast({
      title: t.subscription.toast.title,
      description: t.subscription.toast.description(credits, price, isYearly)
    });

    setLoadingPlan(planType);
    await createSubscription(planType, isYearly);
    setLoadingPlan(null);
  };

  const isCurrentPlan = (planType: string) => {
    return subscribed && subscription?.plan_type === planType;
  };

  const creditPackages = [
    { credits: 10, price: 79, photos: 5, videos: 0, vectors: 5, audios: 0, aiImages: 5 },
    { credits: 20, price: 149, photos: 10, videos: 1, vectors: 10, audios: 1, aiImages: 10 },
    { credits: 80, price: 299, photos: 40, videos: 3, vectors: 40, audios: 3, aiImages: 40 },
    { credits: 160, price: 549, photos: 80, videos: 6, vectors: 80, audios: 6, aiImages: 80 },
    { credits: 300, price: 999, photos: 150, videos: 12, vectors: 150, audios: 12, aiImages: 150 },
    { credits: 1000, price: 2999, photos: 500, videos: 40, vectors: 500, audios: 40, aiImages: 500 }
  ];

  const subscriptionPackages = [
    { 
      planType: 'monthly_30',
      credits: 30, 
      monthlyPrice: 206, 
      photos: 15, 
      videos: 1, 
      vectors: 15, 
      audios: 1, 
      aiImages: 15,
      popular: true
    },
    { 
      planType: 'monthly_60',
      credits: 60, 
      monthlyPrice: 379, 
      photos: 30, 
      videos: 3, 
      vectors: 30, 
      audios: 3, 
      aiImages: 30,
      popular: false
    },
    { 
      planType: 'monthly_100',
      credits: 100, 
      monthlyPrice: 599, 
      photos: 50, 
      videos: 5, 
      vectors: 50, 
      audios: 5, 
      aiImages: 50,
      popular: false
    },
    { 
      planType: 'monthly_200',
      credits: 200, 
      monthlyPrice: 1099, 
      photos: 100, 
      videos: 10, 
      vectors: 100, 
      audios: 10, 
      aiImages: 100,
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container py-16 lg:py-24">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              {t.hero.title}
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              {t.hero.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Credit Packages Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold text-foreground">
              {t.credits.title}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t.credits.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {creditPackages.map((pkg, index) => (
              <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8">
                  <div className="text-center space-y-6">
                    <div>
                      <div className="text-3xl font-bold text-foreground">${pkg.price}</div>
                      <div className="text-lg text-muted-foreground">{pkg.credits} {t.credits.credits}</div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>{pkg.photos} {t.contentTypes.photos} {t.contentTypes.or}</p>
                      <p>{pkg.videos} {t.contentTypes.videos} {t.contentTypes.or}</p>
                      <p>{pkg.vectors} {t.contentTypes.vectors} {t.contentTypes.or}</p>
                      <p>{pkg.audios} {t.contentTypes.audios} {t.contentTypes.or}</p>
                      <p>{pkg.aiImages} {t.contentTypes.aiImages}</p>
                    </div>

                    <Button 
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={() => handleBuyCredits(pkg.credits, pkg.price, index)}
                      disabled={loadingCredits === index || paymentLoading}
                    >
                      {loadingCredits === index ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      {t.credits.buyNow}
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      {t.credits.disclaimer}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription Packages Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold text-foreground">
              {t.subscription.title}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t.subscription.subtitle}
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mt-8">
              <span className={!isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}>
                {t.subscription.monthly}
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
              />
              <span className={isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}>
                {t.subscription.yearly}
              </span>
              {isYearly && (
                <Badge className="bg-primary text-primary-foreground">
                  {t.subscription.savePercent}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {subscriptionPackages.map((pkg, index) => {
              const yearlyPrice = Math.round(pkg.monthlyPrice * 12 * 0.84);
              const displayPrice = isYearly ? Math.round(yearlyPrice / 12) : pkg.monthlyPrice;
              
              return (
                <Card 
                  key={index} 
                  className={`bg-white shadow-lg hover:shadow-xl transition-shadow relative ${
                    isCurrentPlan(pkg.planType) 
                      ? 'ring-2 ring-green-500' 
                      : pkg.popular 
                        ? 'ring-2 ring-primary' 
                        : ''
                  }`}
                >
                  {isCurrentPlan(pkg.planType) ? (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-1">
                      <Check className="w-3 h-3 mr-1" />
                      {language === 'en' ? 'Your Plan' : 'Votre Plan'}
                    </Badge>
                  ) : pkg.popular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1">
                      <Star className="w-3 h-3 mr-1" />
                      {t.subscription.bestValue}
                    </Badge>
                  )}
                  
                  <CardContent className="p-8">
                    <div className="text-center space-y-6">
                      <div>
                        <div className="text-3xl font-bold text-foreground">${displayPrice}</div>
                        <div className="text-lg text-muted-foreground">
                          {pkg.credits} {t.subscription.credits}/{isYearly ? t.subscription.month : t.subscription.monthly_}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>{pkg.photos} {t.contentTypes.photos} {t.contentTypes.or}</p>
                        <p>{pkg.videos} {t.contentTypes.videos} {t.contentTypes.or}</p>
                        <p>{pkg.vectors} {t.contentTypes.vectors} {t.contentTypes.or}</p>
                        <p>{pkg.audios} {t.contentTypes.audios} {t.contentTypes.or}</p>
                        <p>{pkg.aiImages} {t.contentTypes.aiImages}</p>
                      </div>

                      <Button 
                        className={`w-full ${
                          isCurrentPlan(pkg.planType)
                            ? 'bg-green-600 hover:bg-green-700'
                            : pkg.popular 
                              ? 'bg-primary hover:bg-primary/90' 
                              : 'bg-secondary hover:bg-secondary/80'
                        }`}
                        onClick={() => handleSubscribe(pkg.planType, pkg.credits, pkg.monthlyPrice)}
                        disabled={loadingPlan === pkg.planType || isCurrentPlan(pkg.planType)}
                      >
                        {loadingPlan === pkg.planType ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4 mr-2" />
                        )}
                        {isCurrentPlan(pkg.planType) 
                          ? (language === 'en' ? 'Your Current Plan' : 'Votre Plan Actuel')
                          : t.subscription.subscribeNow}
                      </Button>

                      <p className="text-xs text-muted-foreground">
                        {t.subscription.disclaimer}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold text-foreground">
              {t.features.title}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                {t.features.license.title}
              </h3>
              <p className="text-muted-foreground">
                {t.features.license.description}
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                {t.features.premium.title}
              </h3>
              <p className="text-muted-foreground">
                {t.features.premium.description}
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                {t.features.instant.title}
              </h3>
              <p className="text-muted-foreground">
                {t.features.instant.description}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PackagesPricing;