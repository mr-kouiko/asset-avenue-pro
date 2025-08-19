import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, CreditCard, Zap, Star } from "lucide-react";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";

const PackagesPricing = () => {
  const [isYearly, setIsYearly] = useState(false);
  const { toast } = useToast();

  const handleBuyCredits = (credits: number, price: number) => {
    toast({
      title: "Redirection vers le paiement...",
      description: `Achat de ${credits} crédits pour $${price}`
    });
    // Redirect to payment for credits
    window.open('https://buy.stripe.com/credits', '_blank');
  };

  const handleSubscribe = (credits: number, monthlyPrice: number) => {
    const yearlyPrice = Math.round(monthlyPrice * 12 * 0.84); // 16% discount
    const price = isYearly ? Math.round(yearlyPrice / 12) : monthlyPrice;
    
    toast({
      title: "Redirection vers le paiement...",
      description: `Abonnement ${credits} crédits pour $${price}/${isYearly ? 'mois (facturation annuelle)' : 'mois'}`
    });
    // Redirect to subscription payment
    window.open('https://buy.stripe.com/subscription', '_blank');
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
              Packages & Pricing
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Choisissez le forfait parfait pour alimenter vos besoins créatifs. Accédez à une bibliothèque illimitée d'images, vidéos, vecteurs et audios.
            </p>
          </div>
        </div>
      </section>

      {/* Credit Packages Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold text-foreground">
              Credit Packages
            </h2>
            <p className="text-lg text-muted-foreground">
              Achat unique avec validité de téléchargement d'un an
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {creditPackages.map((pkg, index) => (
              <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8">
                  <div className="text-center space-y-6">
                    <div>
                      <div className="text-3xl font-bold text-foreground">${pkg.price}</div>
                      <div className="text-lg text-muted-foreground">{pkg.credits} crédits</div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>{pkg.photos} photos ou</p>
                      <p>{pkg.videos} vidéos ou</p>
                      <p>{pkg.vectors} vecteurs ou</p>
                      <p>{pkg.audios} audios ou</p>
                      <p>{pkg.aiImages} images AI</p>
                    </div>

                    <Button 
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={() => handleBuyCredits(pkg.credits, pkg.price)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Buy Now
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      Ce forfait permet de télécharger une combinaison de fichiers avec licence standard.
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
              Subscription Packages
            </h2>
            <p className="text-lg text-muted-foreground">
              Abonnement renouvelable pour une meilleure valeur avec validité de téléchargement d'un mois
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mt-8">
              <span className={!isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}>
                Mensuel
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
              />
              <span className={isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}>
                Annuel
              </span>
              {isYearly && (
                <Badge className="bg-primary text-primary-foreground">
                  Économisez 16%
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
                    pkg.popular ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1">
                      <Star className="w-3 h-3 mr-1" />
                      Best Value
                    </Badge>
                  )}
                  
                  <CardContent className="p-8">
                    <div className="text-center space-y-6">
                      <div>
                        <div className="text-3xl font-bold text-foreground">${displayPrice}</div>
                        <div className="text-lg text-muted-foreground">
                          {pkg.credits} crédits/{isYearly ? 'mois' : 'mensuel'}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>{pkg.photos} photos ou</p>
                        <p>{pkg.videos} vidéos ou</p>
                        <p>{pkg.vectors} vecteurs ou</p>
                        <p>{pkg.audios} audios ou</p>
                        <p>{pkg.aiImages} images AI</p>
                      </div>

                      <Button 
                        className={`w-full ${
                          pkg.popular 
                            ? 'bg-primary hover:bg-primary/90' 
                            : 'bg-secondary hover:bg-secondary/80'
                        }`}
                        onClick={() => handleSubscribe(pkg.credits, pkg.monthlyPrice)}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Subscribe Now
                      </Button>

                      <p className="text-xs text-muted-foreground">
                        Renouvelé automatiquement, le renouvellement peut être annulé à tout moment
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
              Pourquoi choisir VisuStock ?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Licence Standard Incluse
              </h3>
              <p className="text-muted-foreground">
                Tous les téléchargements incluent notre licence standard pour un usage commercial
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Contenu Premium
              </h3>
              <p className="text-muted-foreground">
                Accès à des millions d'images, vecteurs, vidéos et audios de haute qualité
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Téléchargement Instantané
              </h3>
              <p className="text-muted-foreground">
                Téléchargez immédiatement tous vos fichiers en haute résolution
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PackagesPricing;