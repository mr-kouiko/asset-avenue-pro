import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

const Licenses = () => {
  const licenses = [
    {
      name: "Licence Standard",
      price: "Incluse",
      description: "Parfaite pour les projets personnels et commerciaux de base",
      features: [
        { text: "Usage personnel illimité", included: true },
        { text: "Usage commercial (jusqu'à 500k vues)", included: true },
        { text: "Réseaux sociaux", included: true },
        { text: "Sites web et blogs", included: true },
        { text: "Supports imprimés (jusqu'à 500k tirages)", included: true },
        { text: "Revendre ou redistribuer", included: false },
        { text: "Usage exclusif", included: false },
        { text: "Marchandising illimité", included: false }
      ],
      popular: false
    },
    {
      name: "Licence Étendue",
      price: "+10€",
      description: "Pour les projets commerciaux à grande échelle",
      features: [
        { text: "Tout de la licence Standard", included: true },
        { text: "Usage commercial illimité", included: true },
        { text: "Supports imprimés illimités", included: true },
        { text: "Applications mobiles et logiciels", included: true },
        { text: "Marchandising (jusqu'à 10k articles)", included: true },
        { text: "Templates et produits dérivés", included: true },
        { text: "Revendre ou redistribuer", included: false },
        { text: "Usage exclusif", included: false }
      ],
      popular: true
    },
    {
      name: "Licence Exclusive",
      price: "Sur devis",
      description: "Droits exclusifs sur le contenu",
      features: [
        { text: "Tous les droits inclus", included: true },
        { text: "Usage exclusif mondial", included: true },
        { text: "Retrait du contenu de la marketplace", included: true },
        { text: "Modification et adaptation autorisées", included: true },
        { text: "Revente et redistribution autorisées", included: true },
        { text: "Support prioritaire", included: true },
        { text: "Certificat de propriété", included: true },
        { text: "Garantie d'originalité", included: true }
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Licences et droits d'usage</h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Comprendre les différents types de licences disponibles sur VisuStock pour utiliser les contenus en toute légalité
          </p>
        </div>

        {/* License Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {licenses.map((license) => (
            <Card key={license.name} className={`p-6 relative ${license.popular ? 'border-primary shadow-lg' : ''}`}>
              {license.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Plus populaire
                </Badge>
              )}
              
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold mb-2">{license.name}</h2>
                <div className="text-3xl font-bold text-primary mb-2">{license.price}</div>
                <p className="text-muted-foreground text-sm">{license.description}</p>
              </div>

              <div className="space-y-3">
                {license.features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    {feature.included ? (
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${feature.included ? '' : 'text-muted-foreground'}`}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Additional Information */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Informations importantes</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium mb-2">Attribution</h3>
                <p className="text-muted-foreground">
                  L'attribution du créateur n'est pas obligatoire mais est appréciée pour toutes les licences.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Restrictions générales</h3>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Ne pas utiliser pour du contenu illégal ou offensant</li>
                  <li>• Ne pas prétendre être l'auteur original</li>
                  <li>• Respecter les droits des personnes représentées</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Validité</h3>
                <p className="text-muted-foreground">
                  Les licences sont valides à vie pour l'acheteur et ses ayants droit.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Besoin d'aide ?</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium mb-2">Quelle licence choisir ?</h3>
                <p className="text-muted-foreground">
                  La licence Standard convient à la plupart des usages. Choisissez la licence Étendue pour les gros volumes ou la commercialisation.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Usage non couvert ?</h3>
                <p className="text-muted-foreground">
                  Contactez-nous pour discuter d'une licence personnalisée adaptée à vos besoins spécifiques.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Questions légales</h3>
                <p className="text-muted-foreground">
                  Notre équipe juridique est disponible pour répondre à vos questions sur les droits d'usage.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Licenses;