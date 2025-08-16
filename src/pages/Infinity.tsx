import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Search, DollarSign, Database, Download, Users, Camera, FileImage } from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Infinity = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const monthlyPrice = 39;
  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.833); // 16.7% discount
  const displayPrice = isYearly ? Math.round(yearlyPrice / 12) : monthlyPrice;
  const originalPrice = 50;

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Connexion requise",
        description: "Vous devez être connecté pour vous abonner."
      });
      return;
    }

    try {
      toast({
        title: "Redirection vers le paiement...",
        description: "Vous allez être redirigé vers la page de paiement sécurisée."
      });

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: isYearly ? 'yearly-plan' : 'monthly-plan',
          successUrl: `${window.location.origin}/dashboard?subscription=success`,
          cancelUrl: `${window.location.origin}/infinity?subscription=cancelled`
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Erreur lors de la création de la session de paiement:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer la session de paiement."
      });
    }
  };

  const features = [
    {
      icon: DollarSign,
      title: "Un Prix Qui Vous Convient",
      description: "Un plan flexible à un prix abordable pour tous vos projets — économisez votre temps et votre argent."
    },
    {
      icon: Database,
      title: "Une Bibliothèque Massive",
      description: "Des photos authentiques et des fichiers vectoriels qui conviennent à votre travail créatif et à vos idées."
    },
    {
      icon: Download,
      title: "Téléchargements Illimités",
      description: "Rien ne vous retient — téléchargez sans limites, avec une utilisation quotidienne équitable appliquée."
    },
    {
      icon: Users,
      title: "Conçu pour les Créateurs",
      description: "Un plan ciblé avec du contenu diversifié, idéal pour les créateurs individuels et les petits projets."
    }
  ];

  const benefits = [
    "Téléchargements illimités",
    "Accès aux photos et vecteurs (Infinity)",
    "Licence d'utilisation standard illimitée",
    "Adapté aux créateurs individuels et freelances"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  Débloquez une Créativité Illimitée avec{" "}
                  <span className="text-primary-glow">StockMarket Infinity</span>
                </h1>
                <p className="text-xl text-slate-300 max-w-2xl">
                  Contenu authentique et professionnel avec un plan illimité pour les créateurs individuels et freelances
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="px-4 py-2">
                  <Camera className="w-4 h-4 mr-2" />
                  Photos
                </Badge>
                <Badge variant="secondary" className="px-4 py-2">
                  <FileImage className="w-4 h-4 mr-2" />
                  Vecteurs
                </Badge>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-lg">
                <Input
                  type="text"
                  placeholder="Rechercher du contenu Infinity"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/60"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                <Button 
                  className="absolute right-2 top-2 h-10 bg-primary hover:bg-primary/90"
                  onClick={() => {
                    if (searchQuery.trim()) {
                      window.location.href = `/marketplace?search=${encodeURIComponent(searchQuery)}`;
                    }
                  }}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Rechercher
                </Button>
              </div>
            </div>

            {/* Pricing Card */}
            <div className="lg:col-span-1">
              <Card className="bg-white shadow-2xl">
                <CardContent className="p-8">
                  <div className="text-center space-y-6">
                    <Badge className="bg-destructive text-destructive-foreground px-3 py-1">
                      Nouveau
                    </Badge>
                    
                    <div>
                      <p className="text-slate-600 mb-2">Un plan avec téléchargements illimités.</p>
                      <div className="flex items-center justify-center space-x-3">
                        <span className="text-slate-400 line-through text-2xl">${originalPrice}</span>
                        <span className="text-4xl font-bold text-slate-900">${displayPrice}</span>
                        <span className="text-slate-600">/{isYearly ? 'mois' : 'mensuel'}</span>
                      </div>
                    </div>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center space-x-4 p-4 bg-slate-50 rounded-lg">
                      <span className={!isYearly ? "font-semibold" : "text-slate-600"}>mensuel</span>
                      <Switch
                        checked={isYearly}
                        onCheckedChange={setIsYearly}
                      />
                      <span className={isYearly ? "font-semibold" : "text-slate-600"}>annuel</span>
                      {isYearly && (
                        <Badge variant="secondary" className="text-primary">
                          Économisez 16.7%
                        </Badge>
                      )}
                    </div>

                    {/* Benefits */}
                    <div className="space-y-3 text-left">
                      {benefits.map((benefit, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-slate-700">{benefit}</span>
                        </div>
                      ))}
                    </div>

                    <Button 
                      className="w-full h-12 text-lg bg-primary hover:bg-primary/90"
                      onClick={handleSubscribe}
                    >
                      S'abonner Maintenant
                    </Button>

                    <p className="text-sm text-slate-500">
                      Se renouvelle automatiquement, vous pouvez annuler à tout moment
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-surface">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Content Showcase */}
      <section className="py-20">
        <div className="container">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-bold text-foreground">
              Accès illimité à notre bibliothèque
            </h2>
            <p className="text-xl text-muted-foreground">
              Explorez la bibliothèque StockMarket Infinity
            </p>
          </div>

          <div className="flex justify-center space-x-4 mb-8">
            <Button variant="default" className="px-6">
              Tous les contenus
            </Button>
            <Button variant="outline" className="px-6">
              Photos
            </Button>
            <Button variant="outline" className="px-6">
              Vecteurs
            </Button>
          </div>

          {/* Sample content grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div key={item} className="aspect-square bg-slate-200 rounded-lg flex items-center justify-center">
                <span className="text-slate-500">Contenu {item}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button variant="outline" size="lg">
              Voir Tout
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="container text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold">
            Prêt à débloquer votre créativité ?
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Rejoignez des milliers de créateurs qui font confiance à StockMarket Infinity pour leurs projets.
          </p>
          <Button 
            size="lg"
            className="text-lg px-8 bg-primary hover:bg-primary/90"
            onClick={handleSubscribe}
          >
            Commencer Maintenant
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Infinity;