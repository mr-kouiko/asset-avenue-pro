import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Image as ImageIcon,
  Video,
  Shapes,
  Music,
  Sparkles,
  Users,
  ShieldCheck,
  FileCheck,
  Headset,
  Check,
} from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalizedPath } from "@/hooks/useLocalizedPath";
import heroImg from "@/assets/business-hero.jpg";

const OFFERING_KEYS = ["photos", "videos", "vectors", "audio", "ai"] as const;
const OFFERING_ICONS: Record<(typeof OFFERING_KEYS)[number], any> = {
  photos: ImageIcon,
  videos: Video,
  vectors: Shapes,
  audio: Music,
  ai: Sparkles,
};

const BENEFIT_KEYS = ["b1", "b2", "b3", "b4"] as const;
const BENEFIT_ICONS: Record<(typeof BENEFIT_KEYS)[number], any> = {
  b1: Users,
  b2: ShieldCheck,
  b3: FileCheck,
  b4: Headset,
};

const scrollToForm = () => {
  const el = document.getElementById("contact-form");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

export default function Business() {
  const { t } = useLanguage();
  const lp = useLocalizedPath();

  useSEO({
    title: "Business Plans — Enterprise Solutions for Companies",
    description:
      "Custom business packages for companies and organizations. Premium photos, videos, vectors, and audio for professional and commercial use.",
    type: "website",
  });

  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    company: "",
    email: "",
    phone: "",
    companySize: "",
    message: "",
  });

  const update = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.company || !form.email || !form.message) {
      toast({
        title: t("biz.form.missing"),
        description: t("biz.form.missingDesc"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const subject = `[Business Inquiry] ${form.company}`;
      const message = [
        `Name: ${form.fullName}`,
        `Company: ${form.company}`,
        `Email: ${form.email}`,
        `Phone: ${form.phone || "—"}`,
        `Company size: ${form.companySize || "—"}`,
        "",
        "Requirements:",
        form.message,
      ].join("\n");

      const { error } = await supabase.functions.invoke("submit-support-ticket", {
        body: { email: form.email, subject, message },
      });
      if (error) throw error;

      toast({
        title: t("biz.form.sent"),
        description: t("biz.form.sentDesc"),
      });
      setForm({
        fullName: "",
        company: "",
        email: "",
        phone: "",
        companySize: "",
        message: "",
      });
    } catch (err: any) {
      toast({
        title: t("biz.form.sendFail"),
        description: err?.message ?? t("biz.form.sendFailDesc"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b">
          <div className="container grid gap-10 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {t("biz.badge")}
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                {t("biz.hero.title")}
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                {t("biz.hero.desc")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={scrollToForm}>
                  {t("biz.hero.cta1")}
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to={lp("/marketplace")}>{t("biz.hero.cta2")}</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-primary/10 blur-2xl" />
              <img
                src={heroImg}
                alt="Enterprise creative asset library visualization"
                width={1024}
                height={1024}
                className="w-full rounded-2xl border shadow-xl"
              />
            </div>
          </div>
        </section>

        {/* WHAT WE OFFER */}
        <section className="border-b py-16 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {t("biz.offer.title")}
              </h2>
              <p className="mt-4 text-muted-foreground">{t("biz.offer.subtitle")}</p>
            </div>

            <Tabs defaultValue="photos" className="mt-10">
              <TabsList className="mx-auto flex h-auto w-full max-w-3xl flex-wrap justify-center gap-2 bg-muted p-2">
                {OFFERING_KEYS.map((k) => {
                  const Icon = OFFERING_ICONS[k];
                  return (
                    <TabsTrigger key={k} value={k} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {t(`biz.offer.${k}`)}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {OFFERING_KEYS.map((k) => {
                const Icon = OFFERING_ICONS[k];
                return (
                  <TabsContent key={k} value={k} className="mt-8">
                    <Card>
                      <CardContent className="grid gap-8 p-8 md:grid-cols-[auto_1fr] md:items-start">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="h-8 w-8" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-semibold">{t(`biz.offer.${k}`)}</h3>
                          <p className="mt-2 text-muted-foreground">
                            {t(`biz.offer.${k}.spec`)}
                          </p>
                          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                                <span>{t(`biz.offer.${k}.i${i}`)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </section>

        {/* WHY CHOOSE */}
        <section className="border-b py-16 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {t("biz.why.title")}
              </h2>
              <p className="mt-4 text-muted-foreground">{t("biz.why.subtitle")}</p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFIT_KEYS.map((k) => {
                const Icon = BENEFIT_ICONS[k];
                return (
                  <Card key={k} className="h-full">
                    <CardContent className="p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 font-semibold">{t(`biz.why.${k}.title`)}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t(`biz.why.${k}.desc`)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* TRUSTED BY (placeholder) */}
        <section className="border-b py-12">
          <div className="container">
            <p className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {t("biz.trusted")}
            </p>
            <div className="mt-6 grid grid-cols-2 items-center gap-6 opacity-60 sm:grid-cols-3 md:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-12 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground"
                >
                  Logo
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT FORM */}
        <section id="contact-form" className="py-16 md:py-24">
          <div className="container max-w-3xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {t("biz.contact.title")}
              </h2>
              <p className="mt-4 text-muted-foreground">{t("biz.contact.subtitle")}</p>
            </div>

            <Card className="mt-10">
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="grid gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="fullName">{t("biz.form.fullName")}</Label>
                      <Input
                        id="fullName"
                        value={form.fullName}
                        onChange={(e) => update("fullName", e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="company">{t("biz.form.company")}</Label>
                      <Input
                        id="company"
                        value={form.company}
                        onChange={(e) => update("company", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="email">{t("biz.form.email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">{t("biz.form.phone")}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="companySize">{t("biz.form.companySize")}</Label>
                    <Select
                      value={form.companySize}
                      onValueChange={(v) => update("companySize", v)}
                    >
                      <SelectTrigger id="companySize">
                        <SelectValue placeholder={t("biz.form.sizePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1–10</SelectItem>
                        <SelectItem value="11-50">11–50</SelectItem>
                        <SelectItem value="51-200">51–200</SelectItem>
                        <SelectItem value="200+">200+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="message">{t("biz.form.message")}</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" size="lg" disabled={submitting}>
                    {submitting ? t("biz.form.sending") : t("biz.form.submit")}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    {t("biz.form.legal")}{" "}
                    <Link to={lp("/terms")} className="underline hover:text-foreground">
                      {t("biz.form.terms")}
                    </Link>
                    ,{" "}
                    <Link
                      to={lp("/privacy-policy")}
                      className="underline hover:text-foreground"
                    >
                      {t("biz.form.privacy")}
                    </Link>
                    ,{" "}
                    <Link
                      to={lp("/license-agreement")}
                      className="underline hover:text-foreground"
                    >
                      {t("biz.form.license")}
                    </Link>
                    .
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
