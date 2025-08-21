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

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { name: "Photos", count: "2.1M", color: "bg-blue-500", category: "photo" },
              { name: "Vidéos", count: "430K", color: "bg-red-500", category: "video" },
              { name: "Audio", count: "180K", color: "bg-green-500", category: "audio" },
              { name: "Illustrations", count: "950K", color: "bg-purple-500", category: "illustration" },
            ].map((category) => (
              <Link
                key={category.name}
                to={`/marketplace?category=${category.category}`}
                className="group cursor-pointer bg-card rounded-xl p-6 text-center hover:shadow-lg transition-all duration-300"
              >
                <div className={`w-12 h-12 ${category.color} rounded-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`} />
                <h3 className="font-semibold mb-1">{category.name}</h3>
                <p className="text-sm text-muted-foreground">{category.count} contenus</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Pourquoi choisir VisuStock ?</h2>
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
              <Link to="/auth/seller">Devenir vendeur</Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8 border-white text-white hover:bg-white hover:text-primary">
              <Link to="/auth">S'inscrire gratuitement</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 text-gray-800 py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div>
              <h4 className="font-semibold mb-4 text-gray-900">Products</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/marketplace" className="text-gray-600 hover:text-gray-900 transition-colors">Stock Photos</Link></li>
                <li><Link to="/marketplace?category=video" className="text-gray-600 hover:text-gray-900 transition-colors">Stock Videos</Link></li>
                <li><Link to="/marketplace?category=illustration" className="text-gray-600 hover:text-gray-900 transition-colors">Illustrations</Link></li>
                <li><Link to="/marketplace?category=audio" className="text-gray-600 hover:text-gray-900 transition-colors">Audio Tracks</Link></li>
                <li><Link to="/api" className="text-gray-600 hover:text-gray-900 transition-colors">API Access</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-gray-900">Resources</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/support" className="text-gray-600 hover:text-gray-900 transition-colors">Help Center</Link></li>
                <li><Link to="/tutorials" className="text-gray-600 hover:text-gray-900 transition-colors">Tutorials</Link></li>
                <li><Link to="/blog" className="text-gray-600 hover:text-gray-900 transition-colors">Blog</Link></li>
                <li><Link to="/community" className="text-gray-600 hover:text-gray-900 transition-colors">Community</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/about" className="text-gray-600 hover:text-gray-900 transition-colors">About VisuStock</Link></li>
                <li><Link to="/infinity" className="text-gray-600 hover:text-gray-900 transition-colors">Infinity</Link></li>
                <li><Link to="/packages-pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Packages & Pricing</Link></li>
                <li><Link to="/enterprise" className="text-gray-600 hover:text-gray-900 transition-colors">Enterprise</Link></li>
                <li><Link to="/press" className="text-gray-600 hover:text-gray-900 transition-colors">Press Kit</Link></li>
                <li><Link to="/partnerships" className="text-gray-600 hover:text-gray-900 transition-colors">Partnerships</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/terms" className="text-gray-600 hover:text-gray-900 transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy-policy" className="text-gray-600 hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/cookie-policy" className="text-gray-600 hover:text-gray-900 transition-colors">Cookie Policy</Link></li>
                <li><Link to="/license-agreement" className="text-gray-600 hover:text-gray-900 transition-colors">License Agreement</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact Us</Link></li>
                <li><Link to="/support" className="text-gray-600 hover:text-gray-900 transition-colors">Customer Support</Link></li>
                <li><Link to="/sales" className="text-gray-600 hover:text-gray-900 transition-colors">Sales Inquiries</Link></li>
                <li><Link to="/feedback" className="text-gray-600 hover:text-gray-900 transition-colors">Feedback</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-300 mt-12 pt-8 text-center text-sm text-gray-600">
            © 2024 VisuStock. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;