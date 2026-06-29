import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, HelpCircle, MessageCircle, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Support = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { submitTicket, submitting } = useSupportTickets();
  
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useSEO({
    title: language === 'en' 
      ? "Support Center - Get Help with VisuStock"
      : "Centre d'Aide - Obtenez de l'Aide avec VisuStock",
    description: language === 'en'
      ? "Get help with VisuStock: browse FAQs, send a support ticket, or contact our team for questions about licensing, selling, downloads, and account issues."
      : "Obtenez de l'aide sur VisuStock : parcourez la FAQ, envoyez un ticket ou contactez notre équipe pour toute question sur les licences, la vente, les téléchargements et votre compte.",
    type: 'website'
  });
  
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
        { question: "Comment télécharger mes achats ?", answer: "Après votre achat, vous recevrez un email avec les liens de téléchargement." },
        { question: "Quelles sont les licences disponibles ?", answer: "Nous proposons différentes licences : Standard, Étendue, et Exclusive." },
        { question: "Comment devenir vendeur ?", answer: "Cliquez sur 'Devenir vendeur' dans l'en-tête." },
        { question: "Quel est le délai de validation ?", answer: "Les contenus sont généralement validés sous 48-72h ouvrées." },
        { question: "Comment modifier mon profil ?", answer: "Rendez-vous dans votre tableau de bord, section 'Profil'." }
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
        { question: "How do I download my purchases?", answer: "After your purchase, you will receive an email with download links." },
        { question: "What licenses are available?", answer: "We offer Standard, Extended, and Exclusive licenses." },
        { question: "How do I become a seller?", answer: "Click on 'Become a Seller' in the header." },
        { question: "What is the validation time?", answer: "Content is usually validated within 48-72 business hours." },
        { question: "How do I edit my profile?", answer: "Go to your dashboard, 'Profile' section." }
      ]
    }
  };
  
  const t = content[language as 'en' | 'fr'] ?? content.en;

  const filteredFaqs = t.faqs.filter(faq => 
    searchQuery === '' ||
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !subject || !message) {
      toast.error(language === 'en' ? 'Please fill in all fields' : 'Veuillez remplir tous les champs');
      return;
    }
    const success = await submitTicket({ email, subject, message });
    if (success) {
      setSubject('');
      setMessage('');
      if (!user) setEmail('');
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": t.faqs.map((f) => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": { "@type": "Answer", "text": f.answer },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="container py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t.title}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t.subtitle}</p>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t.searchPlaceholder} className="pl-12 h-12 text-lg" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t.quickActions}</h2>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start"><HelpCircle className="h-4 w-4 mr-2" />{t.faq}</Button>
                <Button variant="outline" className="w-full justify-start"><MessageCircle className="h-4 w-4 mr-2" />{t.liveChat}</Button>
                <Button variant="outline" className="w-full justify-start"><Mail className="h-4 w-4 mr-2" />{t.sendTicket}</Button>
              </div>
            </Card>

            <Card className="p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">{t.contactUs}</h2>
              <form className="space-y-4" onSubmit={handleSubmitTicket}>
                {!user && (
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
                  </div>
                )}
                <div>
                  <Label htmlFor="subject">{t.subject}</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t.subjectPlaceholder} required />
                </div>
                <div>
                  <Label htmlFor="message">{t.message}</Label>
                  <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t.messagePlaceholder} rows={4} required />
                </div>
                <Button className="w-full" type="submit" disabled={submitting}>{submitting ? '...' : t.send}</Button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">{t.faq}</h2>
            <div className="space-y-3">
              {filteredFaqs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{language === 'en' ? 'No matching questions found' : 'Aucune question correspondante trouvée'}</p>
              ) : (
                filteredFaqs.map((faq, index) => (
                  <Card key={index} className="overflow-hidden cursor-pointer transition-colors hover:bg-muted/30" onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}>
                    <div className="p-4 flex items-center justify-between">
                      <h3 className="font-semibold">{faq.question}</h3>
                      {expandedFaq === index ? <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />}
                    </div>
                    {expandedFaq === index && <div className="px-4 pb-4 pt-0"><p className="text-muted-foreground">{faq.answer}</p></div>}
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
