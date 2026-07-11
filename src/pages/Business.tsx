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
import heroImg from "@/assets/business-hero.jpg";

const OFFERINGS = [
  {
    key: "photos",
    label: "Photos",
    icon: ImageIcon,
    spec: "High-resolution JPGs up to 300 DPI, print-ready and cleared for commercial use.",
    items: [
      "Advertising imagery",
      "Cutout / isolated people",
      "Design & background assets",
      "Landmark & city photography",
      "Event & editorial photography",
    ],
  },
  {
    key: "videos",
    label: "Videos",
    icon: Video,
    spec: "MP4 up to 8K, up to 120fps, delivered in H.264/H.265 with source-quality masters.",
    items: [
      "Cinematic B-roll",
      "Corporate & lifestyle footage",
      "Aerial & drone shots",
      "Motion graphics & transitions",
      "Loopable backgrounds",
    ],
  },
  {
    key: "vectors",
    label: "Vectors",
    icon: Shapes,
    spec: "Vector EPS and SVG files, fully editable and scalable without quality loss.",
    items: [
      "Icons & UI kits",
      "Illustrations & characters",
      "Logos & brand marks",
      "Infographics & charts",
      "Patterns & backgrounds",
    ],
  },
  {
    key: "audio",
    label: "Audio",
    icon: Music,
    spec: "High-quality MP3 and WAV audio, mastered for broadcast, ads, and digital use.",
    items: [
      "Royalty-free music tracks",
      "Sound effects library",
      "Cinematic scores",
      "Ambient loops",
      "Voiceover & jingles",
    ],
  },
  {
    key: "ai",
    label: "AI-Generated",
    icon: Sparkles,
    spec: "Generate custom images, graphics, and videos with built-in AI tools — commercial rights included.",
    items: [
      "Text-to-image generation",
      "Text-to-video generation",
      "Image-to-video motion",
      "AI upscaling & face enhancement",
      "Background removal & reframing",
    ],
  },
];

const BENEFITS = [
  {
    icon: Users,
    title: "Volume-matched plans",
    desc: "Higher download volumes scaled to your company size and content velocity.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-seat accounts",
    desc: "Individual accounts per employee with centralized usage tracking and reporting.",
  },
  {
    icon: FileCheck,
    title: "Extended commercial license",
    desc: "Enhanced legal coverage for advertising, resale, and large-audience distribution.",
  },
  {
    icon: Headset,
    title: "Dedicated support",
    desc: "Named account manager with licensing and legal assistance whenever you need it.",
  },
];

const scrollToForm = () => {
  const el = document.getElementById("contact-form");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

export default function Business() {
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
        title: "Missing information",
        description: "Please fill in all required fields.",
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
        title: "Request sent",
        description: "Our team will get back to you within one business day.",
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
        title: "Could not send request",
        description: err?.message ?? "Please try again in a moment.",
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
                Business & Enterprise
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                Power Your Business With Premium Creative Content
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Tailored licensing solutions for companies, agencies, and
                government entities that need high-volume or custom access to
                photos, videos, vectors, audio, and AI-generated assets.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={scrollToForm}>
                  Request a Business Package
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/marketplace">Explore the library</Link>
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
                Everything Your Team Needs, In One Place
              </h2>
              <p className="mt-4 text-muted-foreground">
                A full creative library covering advertising, marketing, and
                production needs across every format.
              </p>
            </div>

            <Tabs defaultValue="photos" className="mt-10">
              <TabsList className="mx-auto flex h-auto w-full max-w-3xl flex-wrap justify-center gap-2 bg-muted p-2">
                {OFFERINGS.map((o) => {
                  const Icon = o.icon;
                  return (
                    <TabsTrigger
                      key={o.key}
                      value={o.key}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {o.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {OFFERINGS.map((o) => {
                const Icon = o.icon;
                return (
                  <TabsContent key={o.key} value={o.key} className="mt-8">
                    <Card>
                      <CardContent className="grid gap-8 p-8 md:grid-cols-[auto_1fr] md:items-start">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="h-8 w-8" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-semibold">{o.label}</h3>
                          <p className="mt-2 text-muted-foreground">{o.spec}</p>
                          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                            {o.items.map((item) => (
                              <li
                                key={item}
                                className="flex items-start gap-2 text-sm"
                              >
                                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                                <span>{item}</span>
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
                Built for Teams, Not Just Individuals
              </h2>
              <p className="mt-4 text-muted-foreground">
                Every business plan is engineered for the scale, governance,
                and legal safety enterprise workflows demand.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((b) => {
                const Icon = b.icon;
                return (
                  <Card key={b.title} className="h-full">
                    <CardContent className="p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 font-semibold">{b.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {b.desc}
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
              Trusted by teams at
            </p>
            <div className="mt-6 grid grid-cols-2 items-center gap-6 opacity-60 sm:grid-cols-3 md:grid-cols-5">
              {/* TODO: populate with real client logos */}
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
                Get a Custom Business Package
              </h2>
              <p className="mt-4 text-muted-foreground">
                Tell us about your needs and our team will get back to you with
                a tailored plan.
              </p>
            </div>

            <Card className="mt-10">
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="grid gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="fullName">Full name *</Label>
                      <Input
                        id="fullName"
                        value={form.fullName}
                        onChange={(e) => update("fullName", e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="company">Company name *</Label>
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
                      <Label htmlFor="email">Work email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="companySize">Company size</Label>
                    <Select
                      value={form.companySize}
                      onValueChange={(v) => update("companySize", v)}
                    >
                      <SelectTrigger id="companySize">
                        <SelectValue placeholder="Select company size" />
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
                    <Label htmlFor="message">Message / requirements *</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" size="lg" disabled={submitting}>
                    {submitting ? "Sending…" : "Send Request"}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    By submitting this form you agree to our{" "}
                    <Link to="/terms" className="underline hover:text-foreground">
                      Terms of Service
                    </Link>
                    ,{" "}
                    <Link
                      to="/privacy-policy"
                      className="underline hover:text-foreground"
                    >
                      Privacy Policy
                    </Link>
                    , and{" "}
                    <Link
                      to="/license-agreement"
                      className="underline hover:text-foreground"
                    >
                      License Agreement
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
