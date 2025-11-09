import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, HelpCircle, MessageCircle, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Support = () => {
  const { language } = useLanguage();
  
  const content = {
    fr: {
      title: "Centre d'aide",
      subtitle: "Trouvez rapidement les réponses à vos questions ou contactez notre équipe support",
      searchPlaceholder: "Rechercher dans l'aide...",
      quickActions: "Actions rapides",
      faq: "Questions fréquentes",
      liveChat: "Chat en direct",
      sendTicket: "Envoyer un ticket",
      contactUs: "Nous contacter",
      subject: "Sujet",
      subjectPlaceholder: "Objet de votre demande",
      message: "Message",
      messagePlaceholder: "Décrivez votre problème...",
      send: "Envoyer",
      faqs: [
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
      ]
    },
    en: {
      title: "Help Center",
      subtitle: "Quickly find answers to your questions or contact our support team",
      searchPlaceholder: "Search for help...",
      quickActions: "Quick Actions",
      faq: "Frequently Asked Questions",
      liveChat: "Live Chat",
      sendTicket: "Send Ticket",
      contactUs: "Contact Us",
      subject: "Subject",
      subjectPlaceholder: "Subject of your request",
      message: "Message",
      messagePlaceholder: "Describe your issue...",
      send: "Send",
      faqs: [
        {
          question: "How do I download my purchases?",
          answer: "After your purchase, you will receive an email with download links. You can also find your purchases in your personal space."
        },
        {
          question: "What licenses are available?",
          answer: "We offer different licenses: Standard (personal and limited commercial use), Extended (expanded commercial use), and Exclusive (exclusive rights)."
        },
        {
          question: "How do I become a seller?",
          answer: "Click on 'Become a Seller' in the header, create your seller account and submit your creations for validation."
        },
        {
          question: "What is the validation time?",
          answer: "Content is usually validated within 48-72 business hours. You will receive an email notification."
        },
        {
          question: "How do I edit my profile?",
          answer: "Go to your dashboard, 'Profile' section to edit your personal information."
        }
      ]
    }
  };
  
  const t = content[language];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t.title}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder={t.searchPlaceholder}
              className="pl-12 h-12 text-lg"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t.quickActions}</h2>
              
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  {t.faq}
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {t.liveChat}
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  {t.sendTicket}
                </Button>
              </div>
            </Card>

            {/* Contact Form */}
            <Card className="p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">{t.contactUs}</h2>
              
              <form className="space-y-4">
                <div>
                  <Label htmlFor="subject">{t.subject}</Label>
                  <Input id="subject" placeholder={t.subjectPlaceholder} />
                </div>
                
                <div>
                  <Label htmlFor="message">{t.message}</Label>
                  <Textarea 
                    id="message" 
                    placeholder={t.messagePlaceholder}
                    rows={4}
                  />
                </div>
                
                <Button className="w-full">
                  {t.send}
                </Button>
              </form>
            </Card>
          </div>

          {/* FAQ */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">{t.faq}</h2>
            
            <div className="space-y-4">
              {t.faqs.map((faq, index) => (
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