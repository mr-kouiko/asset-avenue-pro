import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Crown, Infinity as InfinityIcon, Download, Shield, DollarSign, Users, Camera, Video, Image, Music } from "lucide-react";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";

const Infinity = () => {
  const [isYearly, setIsYearly] = useState(false);
  const { toast } = useToast();

  const handleSubscribeInfinity = () => {
    toast({
      title: "Redirection vers l'abonnement Infinity...",
      description: "Accès illimité à toute la bibliothèque VisuStock"
    });
    // Redirect to Infinity subscription payment
    window.open('https://buy.stripe.com/infinity', '_blank');
  };

  const monthlyPrice = 89;
  const yearlyPrice = 79; // Monthly equivalent with yearly discount
  const displayPrice = isYearly ? yearlyPrice : monthlyPrice;

  const features = [
    {
      icon: DollarSign,
      title: "Un prix qui vous convient",
      description: "Un forfait flexible à un prix abordable pour tous vos projets — économisez votre temps et votre argent."
    },
    {
      icon: Crown,
      title: "Une bibliothèque massive",
      description: "Photos, vidéos, vecteurs et audios authentiques de haute qualité qui correspondent à votre travail créatif."
    },
    {
      icon: InfinityIcon,
      title: "Téléchargements illimités",
      description: "Rien ne vous retient — téléchargez sans limites, avec une utilisation quotidienne équitable appliquée."
    },
    {
      icon: Users,
      title: "Conçu pour les créateurs",
      description: "Un forfait ciblé avec du contenu diversifié, idéal pour les créateurs individuels et les petits projets."
    }
  ];

  const contentSamples = [
    { icon: Camera, label: "Photos", count: "5M+" },
    { icon: Video, label: "Vidéos", count: "800K+" },
    { icon: Image, label: "Vecteurs", count: "2M+" },
    { icon: Music, label: "Audio", count: "300K+" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section with Pricing Card */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative container py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="space-y-8">
              <Badge className="bg-white/10 text-white border-white/20 px-4 py-2">
                <Crown className="w-4 h-4 mr-2" />
                Nouveau
              </Badge>
              
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                Libérez votre créativité illimitée avec VisuStock Infinity
              </h1>
              
              <p className="text-xl text-slate-300 max-w-lg">
                Contenu créatif authentique avec un plan illimité pour les individus et les freelancers
              </p>

              {/* Content type badges */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/30 px-4 py-2">
                  <Camera className="w-4 h-4 mr-2" />
                  Photos
                </Badge>
                <Badge variant="outline" className="bg-purple-500/20 text-purple-200 border-purple-400/30 px-4 py-2">
                  <Image className="w-4 h-4 mr-2" />
                  Vecteurs
                </Badge>
                <Badge variant="outline" className="bg-green-500/20 text-green-200 border-green-400/30 px-4 py-2">
                  <Video className="w-4 h-4 mr-2" />
                  Vidéos
                </Badge>
                <Badge variant="outline" className="bg-orange-500/20 text-orange-200 border-orange-400/30 px-4 py-2">
                  <Music className="w-4 h-4 mr-2" />
                  Audio
                </Badge>
              </div>
            </div>

            {/* Right pricing card */}
            <div className="lg:justify-self-end w-full max-w-md">
              <Card className="bg-white shadow-2xl border-0">
                <CardContent className="p-8">
                  <Badge className="bg-red-500 text-white mb-4">
                    Nouveau
                  </Badge>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="text-lg font-medium text-foreground mb-2">
                        Un plan avec téléchargements illimités.
                      </p>
                      
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-400 line-through">
                          ${isYearly ? 99 : 109}
                        </span>
                        <span className="text-4xl font-bold text-primary">
                          ${displayPrice}
                        </span>
                        <span className="text-muted-foreground">/mensuel</span>
                      </div>
                    </div>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center space-x-3 py-4">
                      <span className={!isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}>
                        mensuel
                      </span>
                      <Switch
                        checked={isYearly}
                        onCheckedChange={setIsYearly}
                      />
                      <span className={isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}>
                        annuel
                      </span>
                      {isYearly && (
                        <Badge className="bg-green-100 text-green-800 ml-2">
                          Économisez 11%
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Téléchargements illimités</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>accès aux photos et vecteurs (Infinity)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Licence d'utilisation standard illimitée</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Convient aux créateurs individuels et freelancers.</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-3"
                      onClick={handleSubscribeInfinity}
                    >
                      S'abonner maintenant
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      Renouvellement automatique, vous pouvez annuler à tout moment
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Icon className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Content Library Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="space-y-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Accès illimité à une bibliothèque créative
              </h2>
              <h3 className="text-xl text-muted-foreground mb-8">
                Explorez la bibliothèque VisuStock Infinity
              </h3>
              
              <div className="flex justify-center gap-4 mb-8">
                <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
                  Tous les éléments
                </Button>
                <Button variant="outline">
                  <Camera className="w-4 h-4 mr-2" />
                  Photos
                </Button>
                <Button variant="outline">
                  <Image className="w-4 h-4 mr-2" />
                  Vecteurs
                </Button>
                <Button variant="outline">
                  <Video className="w-4 h-4 mr-2" />
                  Vidéos
                </Button>
              </div>
            </div>

            {/* Content stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {contentSamples.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="space-y-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{item.count}</div>
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sample grid placeholder */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-teal-600 text-white">
        <div className="container text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl font-bold">
              Prêt à débloquer votre créativité illimitée ?
            </h2>
            <p className="text-xl opacity-90">
              Rejoignez des milliers de créateurs qui font confiance à VisuStock Infinity pour leurs projets créatifs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button 
                size="lg"
                className="bg-white text-green-600 hover:bg-gray-100 font-bold text-lg px-8 py-4"
                onClick={handleSubscribeInfinity}
              >
                <Crown className="w-6 h-6 mr-2" />
                Commencer maintenant
              </Button>
              <p className="text-sm opacity-75">
                Essai gratuit • Annulation à tout moment
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Infinity;