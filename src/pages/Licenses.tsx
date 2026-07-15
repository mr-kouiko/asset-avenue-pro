import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";

const Licenses = () => {
  const { language } = useLanguage();

  // SEO Configuration
  useSEO({
    title: language === 'en' 
      ? "Licenses & Usage Rights - Understand Your Content Rights"
      : "Licences et Droits d'Usage - Comprenez Vos Droits sur les Contenus",
    description: language === 'en'
      ? "Understand the different license types available on VisuStock. Choose between Standard, Extended, and Exclusive licenses for your creative projects."
      : "Comprenez les différents types de licences disponibles sur VisuStock. Choisissez entre les licences Standard, Étendue et Exclusive pour vos projets créatifs.",
    type: 'website'
  });
  
  const content = {
    fr: {
      title: "Licences et droits d'usage",
      subtitle: "Comprendre les différents types de licences disponibles sur VisuStock pour utiliser les contenus en toute légalité",
      popular: "Plus populaire",
      licenses: [
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
      ],
      importantInfo: {
        title: "Informations importantes",
        attribution: {
          title: "Attribution",
          text: "L'attribution du créateur n'est pas obligatoire mais est appréciée pour toutes les licences."
        },
        restrictions: {
          title: "Restrictions générales",
          items: [
            "Ne pas utiliser pour du contenu illégal ou offensant",
            "Ne pas prétendre être l'auteur original",
            "Respecter les droits des personnes représentées"
          ]
        },
        validity: {
          title: "Validité",
          text: "Les licences sont valides à vie pour l'acheteur et ses ayants droit."
        }
      },
      needHelp: {
        title: "Besoin d'aide ?",
        whichLicense: {
          title: "Quelle licence choisir ?",
          text: "La licence Standard convient à la plupart des usages. Choisissez la licence Étendue pour les gros volumes ou la commercialisation."
        },
        notCovered: {
          title: "Usage non couvert ?",
          text: "Contactez-nous pour discuter d'une licence personnalisée adaptée à vos besoins spécifiques."
        },
        legal: {
          title: "Questions légales",
          text: "Notre équipe juridique est disponible pour répondre à vos questions sur les droits d'usage."
        }
      }
    },
    en: {
      title: "Licenses and Usage Rights",
      subtitle: "Understand the different types of licenses available on VisuStock to use content legally",
      popular: "Most Popular",
      licenses: [
        {
          name: "Standard License",
          price: "Included",
          description: "Perfect for personal and basic commercial projects",
          features: [
            { text: "Unlimited personal use", included: true },
            { text: "Commercial use (up to 500k views)", included: true },
            { text: "Social media", included: true },
            { text: "Websites and blogs", included: true },
            { text: "Printed materials (up to 500k prints)", included: true },
            { text: "Resell or redistribute", included: false },
            { text: "Exclusive usage", included: false },
            { text: "Unlimited merchandising", included: false }
          ],
          popular: false
        },
        {
          name: "Extended License",
          price: "+€10",
          description: "For large-scale commercial projects",
          features: [
            { text: "Everything in Standard License", included: true },
            { text: "Unlimited commercial use", included: true },
            { text: "Unlimited printed materials", included: true },
            { text: "Mobile apps and software", included: true },
            { text: "Merchandising (up to 10k items)", included: true },
            { text: "Templates and derivative products", included: true },
            { text: "Resell or redistribute", included: false },
            { text: "Exclusive usage", included: false }
          ],
          popular: true
        },
        {
          name: "Exclusive License",
          price: "Custom Quote",
          description: "Exclusive rights to the content",
          features: [
            { text: "All rights included", included: true },
            { text: "Worldwide exclusive usage", included: true },
            { text: "Content removed from marketplace", included: true },
            { text: "Modification and adaptation allowed", included: true },
            { text: "Resale and redistribution allowed", included: true },
            { text: "Priority support", included: true },
            { text: "Certificate of ownership", included: true },
            { text: "Originality guarantee", included: true }
          ],
          popular: false
        }
      ],
      importantInfo: {
        title: "Important Information",
        attribution: {
          title: "Attribution",
          text: "Creator attribution is not required but appreciated for all licenses."
        },
        restrictions: {
          title: "General Restrictions",
          items: [
            "Do not use for illegal or offensive content",
            "Do not claim to be the original author",
            "Respect the rights of persons depicted"
          ]
        },
        validity: {
          title: "Validity",
          text: "Licenses are valid for life for the buyer and their successors."
        }
      },
      needHelp: {
        title: "Need Help?",
        whichLicense: {
          title: "Which license to choose?",
          text: "The Standard License is suitable for most uses. Choose the Extended License for high volumes or commercialization."
        },
        notCovered: {
          title: "Usage not covered?",
          text: "Contact us to discuss a custom license tailored to your specific needs."
        },
        legal: {
          title: "Legal Questions",
          text: "Our legal team is available to answer your questions about usage rights."
        }
      }
    }
  };
  
  const t = content[language as 'en' | 'fr'] ?? content.en;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t.title}</h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* License Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {t.licenses.map((license) => (
            <Card key={license.name} className={`p-6 relative ${license.popular ? 'border-primary shadow-lg' : ''}`}>
              {license.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  {t.popular}
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
            <h2 className="text-xl font-semibold mb-4">{t.importantInfo.title}</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium mb-2">{t.importantInfo.attribution.title}</h3>
                <p className="text-muted-foreground">
                  {t.importantInfo.attribution.text}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">{t.importantInfo.restrictions.title}</h3>
                <ul className="text-muted-foreground space-y-1">
                  {t.importantInfo.restrictions.items.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">{t.importantInfo.validity.title}</h3>
                <p className="text-muted-foreground">
                  {t.importantInfo.validity.text}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t.needHelp.title}</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium mb-2">{t.needHelp.whichLicense.title}</h3>
                <p className="text-muted-foreground">
                  {t.needHelp.whichLicense.text}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">{t.needHelp.notCovered.title}</h3>
                <p className="text-muted-foreground">
                  {t.needHelp.notCovered.text}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">{t.needHelp.legal.title}</h3>
                <p className="text-muted-foreground">
                  {t.needHelp.legal.text}
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