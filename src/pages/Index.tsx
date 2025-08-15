import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { HeroSection } from "@/components/HeroSection";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import mockPhoto1 from "@/assets/mock-photo1.jpg";
import mockPhoto2 from "@/assets/mock-photo2.jpg";
import mockIllustration1 from "@/assets/mock-illustration1.jpg";

const Index = () => {
  // Mock data for featured content
  const featuredContent = [
    {
      id: "1",
      title: "Magnifique coucher de soleil sur les montagnes",
      author: "Alex Photographe",
      price: 15,
      type: "photo" as const,
      thumbnail: mockPhoto1,
      likes: 1234,
      downloads: 567,
    },
    {
      id: "2",
      title: "Architecture moderne urbaine",
      author: "Urban Studio",
      price: 12,
      type: "photo" as const,
      thumbnail: mockPhoto2,
      likes: 892,
      downloads: 234,
    },
    {
      id: "3",
      title: "Illustration abstraite colorée",
      author: "Creative Art",
      price: 8,
      type: "illustration" as const,
      thumbnail: mockIllustration1,
      likes: 456,
      downloads: 123,
    },
    {
      id: "4",
      title: "Paysage montagneux dramatique",
      author: "Nature Pro",
      price: 20,
      type: "photo" as const,
      thumbnail: mockPhoto1,
      likes: 2341,
      downloads: 891,
    },
    {
      id: "5",
      title: "Design graphique moderne",
      author: "Design Master",
      price: 0,
      type: "illustration" as const,
      thumbnail: mockIllustration1,
      likes: 667,
      downloads: 445,
    },
    {
      id: "6",
      title: "Architecture contemporaine",
      author: "City Vision",
      price: 18,
      type: "photo" as const,
      thumbnail: mockPhoto2,
      likes: 1123,
      downloads: 334,
    },
  ];

  const features = [
    {
      icon: Star,
      title: "Contenu de qualité",
      description: "Tous nos contenus sont vérifiés et approuvés par notre équipe d'experts",
    },
    {
      icon: Shield,
      title: "Licences claires",
      description: "Utilisez nos contenus en toute confiance avec nos licences transparentes",
    },
    {
      icon: Zap,
      title: "Téléchargement instantané",
      description: "Accédez immédiatement à vos achats après paiement",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      <HeroSection />

      {/* Featured Content Section */}
      <section className="py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Contenu à la une</h2>
              <p className="text-muted-foreground">
                Découvrez notre sélection de contenus populaires et tendances
              </p>
            </div>
            <Button variant="outline" className="hidden md:flex items-center">
              <Link to="/marketplace" className="flex items-center">
                Voir tout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredContent.map((content) => (
              <ContentCard key={content.id} {...content} />
            ))}
          </div>

          <div className="text-center mt-8 md:hidden">
            <Button variant="outline">
              <Link to="/marketplace">
                Voir tout le contenu
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-surface">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Explorez par catégories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Trouvez exactement ce que vous cherchez dans nos collections soigneusement organisées
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Photos", count: "2.1M", color: "bg-blue-500" },
              { name: "Vidéos", count: "430K", color: "bg-red-500" },
              { name: "Audio", count: "180K", color: "bg-green-500" },
              { name: "Illustrations", count: "950K", color: "bg-purple-500" },
            ].map((category) => (
              <div
                key={category.name}
                className="group cursor-pointer bg-card rounded-xl p-6 text-center hover:shadow-lg transition-all duration-300"
              >
                <div className={`w-12 h-12 ${category.color} rounded-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`} />
                <h3 className="font-semibold mb-1">{category.name}</h3>
                <p className="text-sm text-muted-foreground">{category.count} contenus</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Pourquoi choisir ArabsStock ?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Une plateforme conçue pour les créatifs, par des créatifs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à vendre vos créations ?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Rejoignez des milliers de créateurs qui gagnent de l'argent avec leurs talents
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="px-8">
              <Link to="/auth">Devenir vendeur</Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8 border-white text-white hover:bg-white hover:text-primary">
              En savoir plus
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="text-sm font-bold text-primary-foreground">AS</span>
                </div>
                <span className="text-xl font-bold">ArabsStock</span>
              </div>
              <p className="text-sm opacity-80">
                La marketplace de référence pour les contenus créatifs de qualité.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Catégories</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li>Photos</li>
                <li>Vidéos</li>
                <li>Illustrations</li>
                <li>Audio</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Compte</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li>Se connecter</li>
                <li>S'inscrire</li>
                <li>Espace vendeur</li>
                <li>Mon panier</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li>Centre d'aide</li>
                <li>Contact</li>
                <li>Licences</li>
                <li>Conditions</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm opacity-60">
            © 2024 ArabsStock. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;