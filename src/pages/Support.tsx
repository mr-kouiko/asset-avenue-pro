import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, HelpCircle, MessageCircle, Mail } from "lucide-react";

const Support = () => {
  const faqs = [
    {
      question: "Comment télécharger mes achats ?",
      answer: "Après votre achat, vous recevrez un email avec les liens de téléchargement. Vous pouvez aussi retrouver vos achats dans votre espace personnel."
    },
    {
      question: "Quelles sont les licences disponibles ?",
      answer: "Nous proposons différentes licences : Standard (usage personnel et commercial limité), Étendue (usage commercial élargi), et Exclusive (droits exclusifs)."
    },
    {
      question: "Comment devenir vendeur ?",
      answer: "Cliquez sur 'Devenir vendeur' dans l'en-tête, créez votre compte vendeur et soumettez vos créations pour validation."
    },
    {
      question: "Quel est le délai de validation ?",
      answer: "Les contenus sont généralement validés sous 48-72h ouvrées. Vous recevrez une notification par email."
    },
    {
      question: "Comment modifier mon profil ?",
      answer: "Rendez-vous dans votre tableau de bord, section 'Profil' pour modifier vos informations personnelles."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Centre d'aide</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Trouvez rapidement les réponses à vos questions ou contactez notre équipe support
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Rechercher dans l'aide..."
              className="pl-12 h-12 text-lg"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
              
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Questions fréquentes
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat en direct
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Envoyer un ticket
                </Button>
              </div>
            </Card>

            {/* Contact Form */}
            <Card className="p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Nous contacter</h2>
              
              <form className="space-y-4">
                <div>
                  <Label htmlFor="subject">Sujet</Label>
                  <Input id="subject" placeholder="Objet de votre demande" />
                </div>
                
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Décrivez votre problème..."
                    rows={4}
                  />
                </div>
                
                <Button className="w-full">
                  Envoyer
                </Button>
              </form>
            </Card>
          </div>

          {/* FAQ */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Questions fréquentes</h2>
            
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="p-6">
                  <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;