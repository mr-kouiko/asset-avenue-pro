import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Infinity as InfinityIcon, Download, Shield, Sparkles, CheckCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";

const Infinity = () => {
  const { toast } = useToast();

  const handleSubscribeInfinity = () => {
    toast({
      title: "Redirection vers l'abonnement Infinity...",
      description: "Accès illimité à toute la bibliothèque VisuStock"
    });
    // Redirect to Infinity subscription payment
    window.open('https://buy.stripe.com/infinity', '_blank');
  };

  const features = [
    {
      icon: InfinityIcon,
      title: "Téléchargements illimités",
      description: "Accédez à toute notre bibliothèque sans limite de téléchargements"
    },
    {
      icon: Crown,
      title: "Contenu premium exclusif",
      description: "Accès à des collections premium et du contenu exclusif"
    },
    {
      icon: Shield,
      title: "Licence étendue incluse",
      description: "Utilisez tous les fichiers pour des projets commerciaux sans restriction"
    },
    {
      icon: Sparkles,
      title: "Images IA premium",
      description: "Accès illimité aux dernières créations d'intelligence artificielle"
    },
    {
      icon: Download,
      title: "Téléchargements haute résolution",
      description: "Tous les fichiers disponibles en qualité maximale"
    },
    {
      icon: CheckCircle,
      title: "Support prioritaire",
      description: "Assistance dédiée et support client prioritaire"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container py-20 lg:py-32">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <Badge className="bg-white/10 text-white border-white/20 px-6 py-2 text-lg">
              <Crown className="w-5 h-5 mr-2" />
              Offre spéciale limitée
            </Badge>
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
              VisuStock
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                {" "}Infinity
              </span>
            </h1>
            <p className="text-xl lg:text-2xl text-purple-100 max-w-3xl mx-auto">
              L'abonnement ultime pour les créatifs ambitieux. Téléchargements illimités, contenu premium exclusif, et bien plus encore.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
              <div className="text-center">
                <div className="text-4xl lg:text-6xl font-bold text-yellow-400">$99</div>
                <div className="text-purple-200">par mois</div>
              </div>
              <Button 
                size="lg"
                className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-bold text-lg px-8 py-4"
                onClick={handleSubscribeInfinity}
              >
                <InfinityIcon className="w-6 h-6 mr-2" />
                Commencer maintenant
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold text-foreground">
              Tout ce dont vous avez besoin, et plus encore
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              VisuStock Infinity vous donne accès à l'ensemble de notre écosystème créatif premium
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 hover:scale-105">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-bold">5M+</div>
              <div className="text-purple-100">Photos premium</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold">800K+</div>
              <div className="text-purple-100">Vidéos 4K</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold">2M+</div>
              <div className="text-purple-100">Vecteurs exclusifs</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold">∞</div>
              <div className="text-purple-100">Téléchargements</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="container text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl font-bold text-foreground">
              Prêt à libérer votre créativité ?
            </h2>
            <p className="text-xl text-muted-foreground">
              Rejoignez des milliers de créatifs qui ont choisi VisuStock Infinity pour donner vie à leurs projets les plus ambitieux.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-lg px-8 py-4"
                onClick={handleSubscribeInfinity}
              >
                <Crown className="w-6 h-6 mr-2" />
                Commencer mon essai gratuit
              </Button>
              <p className="text-sm text-muted-foreground">
                Annulation possible à tout moment
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Infinity;