import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MapPin, Clock, Code } from "lucide-react";

import { useSEO } from "@/hooks/useSEO";
import { useLanguage } from "@/contexts/LanguageContext";

const ContactEN = () => {
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", subject: "", message: "" });

  const schemaVal = z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    subject: z.string().min(1),
    message: z.string().trim().min(1).max(5000),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schemaVal.safeParse(form);
    if (!parsed.success) {
      toast.error(t('ct.form.invalid') || "Please complete all fields correctly.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const subjectLabels: Record<string, string> = {
        support: "Technical Support",
        billing: "Billing",
        partnership: "Partnership",
        legal: "Legal",
        other: "Other",
      };
      const subjectLabel = subjectLabels[form.subject] || form.subject;
      const { error } = await supabase.functions.invoke('submit-support-ticket', {
        body: {
          email: form.email,
          subject: `${subjectLabel} - ${form.firstName} ${form.lastName}`,
          message: form.message,
          userId: user?.id,
        },
      });
      if (error) throw error;
      toast.success(t('ct.form.success') || "Message sent! We'll get back to you soon.");
      setForm({ firstName: "", lastName: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      console.error('Contact form error:', err);
      toast.error(t('ct.form.error') || "Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useSEO({
    title: t('ct.title'),
    description: t('ct.subtitle'),
  });

  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": "https://visustock.com/contact#localbusiness",
      "name": "VisuStock",
      "url": "https://visustock.com/contact",
      "image": "https://visustock.com/favicon.png",
      "email": "contact@visustock.com",
      "priceRange": "$$",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "27 Place de la Madeleine",
        "addressLocality": "Paris",
        "postalCode": "75008",
        "addressCountry": "FR"
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "09:00",
          "closes": "18:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "Saturday",
          "opens": "10:00",
          "closes": "16:00"
        }
      ],
      "contactPoint": [{
        "@type": "ContactPoint",
        "email": "contact@visustock.com",
        "contactType": "customer support",
        "availableLanguage": ["English", "French"]
      }]
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-page", "contact-localbusiness");
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <div className="container py-8 flex-1">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('ct.title')}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('ct.subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-6">{t('ct.form.title')}</h2>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">{t('ct.form.firstName')}</Label>
                  <Input id="firstName" placeholder={t('ct.form.firstNamePh')} required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="lastName">{t('ct.form.lastName')}</Label>
                  <Input id="lastName" placeholder={t('ct.form.lastNamePh')} required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} maxLength={100} />
                </div>
              </div>

              <div>
                <Label htmlFor="email">{t('ct.form.email')}</Label>
                <Input id="email" type="email" placeholder="your@email.com" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
              </div>

              <div>
                <Label htmlFor="subject">{t('ct.form.subject')}</Label>
                <Select required value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('ct.form.subjectPh')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support">{t('ct.form.subject.support')}</SelectItem>
                    <SelectItem value="billing">{t('ct.form.subject.billing')}</SelectItem>
                    <SelectItem value="partnership">{t('ct.form.subject.partnership')}</SelectItem>
                    <SelectItem value="legal">{t('ct.form.subject.legal')}</SelectItem>
                    <SelectItem value="other">{t('ct.form.subject.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="message">{t('ct.form.message')}</Label>
                <Textarea
                  id="message"
                  placeholder={t('ct.form.messagePh')}
                  rows={6}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  maxLength={5000}
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "..." : t('ct.form.send')}
              </Button>
            </form>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">{t('ct.info.title')}</h3>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium">{t('ct.info.email')}</p>
                    <p className="text-muted-foreground">contact@visustock.com</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium">{t('ct.info.address')}</p>
                    <p className="text-muted-foreground">
                      27 Place de la Madeleine<br />
                      75008 Paris, France
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium">{t('ct.info.hours')}</p>
                    <p className="text-muted-foreground">
                      {t('ct.info.hoursMonFri')}<br />
                      {t('ct.info.hoursSat')}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start space-x-3">
                <Code className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">{t('ct.dev.title')}</h3>
                  <p className="text-muted-foreground mb-2">
                    {t('ct.dev.desc')}
                  </p>
                  <p className="text-muted-foreground"><strong>{t('ct.dev.emailLabel')}</strong> contact@visustock.com</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">{t('ct.legal.title')}</h3>
              <p className="text-muted-foreground mb-2">
                {t('ct.legal.desc')}
              </p>
              <p className="text-muted-foreground"><strong>{t('ct.dev.emailLabel')}</strong> contact@visustock.com</p>
            </Card>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ContactEN;
