import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
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
  const { t } = useLanguage();
  const { user } = useAuth();
  const { submitTicket, submitting } = useSupportTickets();

  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useSEO({
    title: t('sp.seo.title'),
    description: t('sp.seo.desc'),
    type: 'website'
  });

  const faqs = useMemo(() => [
    { question: t('sp.faq1.q'), answer: t('sp.faq1.a') },
    { question: t('sp.faq2.q'), answer: t('sp.faq2.a') },
    { question: t('sp.faq3.q'), answer: t('sp.faq3.a') },
    { question: t('sp.faq4.q'), answer: t('sp.faq4.a') },
    { question: t('sp.faq5.q'), answer: t('sp.faq5.a') },
  ], [t]);

  const filteredFaqs = faqs.filter(faq =>
    searchQuery === '' ||
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !subject || !message) {
      toast.error(t('sp.fillAll'));
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
    "mainEntity": faqs.map((f) => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": { "@type": "Answer", "text": f.answer },
    })),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <Navigation />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="container py-8 flex-1">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('sp.title')}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t('sp.subtitle')}</p>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t('sp.searchPlaceholder')} className="pl-12 h-12 text-lg" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('sp.quickActions')}</h2>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start"><HelpCircle className="h-4 w-4 mr-2" />{t('sp.faq')}</Button>
                <Button variant="outline" className="w-full justify-start"><MessageCircle className="h-4 w-4 mr-2" />{t('sp.liveChat')}</Button>
                <Button variant="outline" className="w-full justify-start"><Mail className="h-4 w-4 mr-2" />{t('sp.sendTicket')}</Button>
              </div>
            </Card>

            <Card className="p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">{t('sp.contactUs')}</h2>
              <form className="space-y-4" onSubmit={handleSubmitTicket}>
                {!user && (
                  <div>
                    <Label htmlFor="email">{t('sp.email')}</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
                  </div>
                )}
                <div>
                  <Label htmlFor="subject">{t('sp.subject')}</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('sp.subjectPlaceholder')} required />
                </div>
                <div>
                  <Label htmlFor="message">{t('sp.message')}</Label>
                  <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('sp.messagePlaceholder')} rows={4} required />
                </div>
                <Button className="w-full" type="submit" disabled={submitting}>{submitting ? t('sp.sending') : t('sp.send')}</Button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">{t('sp.faq')}</h2>
            <div className="space-y-3">
              {filteredFaqs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t('sp.noResults')}</p>
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
      <Footer />
    </div>
  );
};

export default Support;
