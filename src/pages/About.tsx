import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Camera, 
  Video, 
  Music, 
  Palette, 
  Users, 
  Globe, 
  TrendingUp,
  Heart,
  Shield,
  Award
} from "lucide-react";

const About = () => {
  const { language } = useLanguage();

  const content = {
    fr: {
      hero: {
        title: "Donner du pouvoir à la créativité,",
        titleHighlight: "Enrichir votre histoire",
        subtitle: "VisuStock est une plateforme mondiale où la créativité ne connaît pas de frontières. Connectez-vous avec des créateurs diversifiés du monde entier et découvrez le média parfait pour votre vision.",
        badges: {
          globalCommunity: "Communauté mondiale",
          diverseCreators: "Créateurs diversifiés", 
          inclusivePlatform: "Plateforme inclusive"
        }
      },
      introduction: {
        title: "Votre passerelle vers le contenu créatif mondial",
        description: "VisuStock est une marketplace mondiale leader pour les médias numériques sous licence, proposant des images, vidéos, audio et graphiques de créateurs du monde entier. Nous célébrons la diversité et l'inclusivité, offrant des opportunités aux professionnels créatifs de toutes cultures pour partager leurs perspectives uniques et monétiser leur talent. Notre plateforme fait le lien entre les créateurs visionnaires et ceux qui recherchent du contenu authentique et de haute qualité pour leurs projets."
      },
      mission: {
        title: "Notre Mission",
        description: "Soutenir les créateurs du monde entier en leur permettant de monétiser leur travail et de partager leur vision avec un public mondial. Nous fournissons les outils, la plateforme et la communauté nécessaires aux professionnels créatifs pour prospérer tout en livrant un contenu exceptionnel aux entreprises, éducateurs et particuliers recherchant une narration visuelle authentique."
      },
      vision: {
        title: "Notre Vision", 
        description: "Construire un écosystème créatif prospère et diversifié accessible à tous. Nous envisageons un monde où chaque créateur, indépendamment de son origine ou de sa localisation, a l'opportunité de présenter son travail, de se connecter avec des audiences mondiales et de construire des carrières créatives durables grâce à notre marketplace inclusive et innovante."
      },
      creators: {
        title: "Donner du pouvoir à tous les types de créateurs",
        subtitle: "Que vous soyez photographe, designer, musicien, cinéaste ou illustrateur, VisuStock fournit la plateforme pour présenter votre travail et construire une carrière créative durable.",
        types: {
          photographers: {
            title: "Photographes",
            description: "Partagez votre perspective unique et gagnez à chaque téléchargement avec un partage de revenus compétitif."
          },
          filmmakers: {
            title: "Cinéastes", 
            description: "Monétisez votre contenu vidéo et atteignez des audiences mondiales recherchant des séquences de haute qualité."
          },
          musicians: {
            title: "Musiciens",
            description: "Licenciez vos compositions et bandes sonores aux créateurs du monde entier recherchant l'audio parfait."
          },
          designers: {
            title: "Designers",
            description: "Présentez vos illustrations et graphiques, construisant une exposition et une reconnaissance communautaire."
          }
        },
        benefits: {
          fairRevenue: "Partage de revenus équitable",
          globalExposure: "Exposition mondiale", 
          communityGrowth: "Croissance communautaire"
        }
      },
      whoWeServe: {
        title: "Reconnu par les créateurs et entreprises du monde entier",
        subtitle: "Des entrepreneurs individuels aux agences mondiales, des éducateurs aux marques établies, VisuStock sert des clients diversifiés qui valorisent la qualité, l'authenticité et les licences transparentes. Notre engagement envers la confiance, la curation de contenu exceptionnelle et les licences simples fait de nous le choix préféré des professionnels recherchant des ressources créatives fiables.",
        features: {
          quality: {
            title: "Qualité assurée",
            description: "Chaque contenu est soigneusement sélectionné pour répondre aux standards professionnels."
          },
          community: {
            title: "Communauté mondiale", 
            description: "Accédez à des perspectives diverses de créateurs de tous les continents et cultures."
          },
          licensing: {
            title: "Licences faciles",
            description: "Conditions de licence claires et simples qui protègent à la fois créateurs et utilisateurs."
          }
        }
      },
      cta: {
        title: "Prêt à rejoindre la communauté VisuStock ?",
        subtitle: "Que vous cherchiez à découvrir du contenu extraordinaire ou à partager votre travail créatif avec le monde, VisuStock est votre plateforme pour le succès créatif.",
        buttons: {
          packages: "Explorez nos forfaits",
          contributor: "Devenez contributeur", 
          learnMore: "En savoir plus"
        }
      },
      footer: {
        links: {
          blog: "Blog",
          press: "Presse et médias",
          careers: "Carrières", 
          contact: "Nous contacter"
        },
        copyright: "© 2024 VisuStock. Donner du pouvoir à la créativité dans le monde entier. Tous droits réservés."
      }
    },
    en: {
      hero: {
        title: "Empowering Creativity,",
        titleHighlight: "Enriching Your Story",
        subtitle: "VisuStock is a global platform where creativity knows no boundaries. Connect with diverse creators worldwide and discover the perfect media for your vision.",
        badges: {
          globalCommunity: "Global Community",
          diverseCreators: "Diverse Creators",
          inclusivePlatform: "Inclusive Platform"
        }
      },
      introduction: {
        title: "Your Gateway to Global Creative Content",
        description: "VisuStock is a leading global marketplace for licensed digital media, featuring images, videos, audio, and graphics from creators around the world. We celebrate diversity and inclusivity, providing opportunities for creative professionals across all cultures to share their unique perspectives and monetize their talent. Our platform bridges the gap between visionary creators and those seeking authentic, high-quality content for their projects."
      },
      mission: {
        title: "Our Mission",
        description: "To support creators worldwide by enabling them to monetize their work and share their vision with a global audience. We provide the tools, platform, and community needed for creative professionals to thrive while delivering exceptional content to businesses, educators, and individuals seeking authentic visual storytelling."
      },
      vision: {
        title: "Our Vision",
        description: "To build a thriving, diverse creative ecosystem accessible to all. We envision a world where every creator, regardless of background or location, has the opportunity to showcase their work, connect with global audiences, and build sustainable creative careers through our inclusive and innovative marketplace."
      },
      creators: {
        title: "Empowering Every Type of Creator",
        subtitle: "Whether you're a photographer, designer, musician, filmmaker, or illustrator, VisuStock provides the platform to showcase your work and build a sustainable creative career.",
        types: {
          photographers: {
            title: "Photographers",
            description: "Share your unique perspective and earn from every download with competitive revenue sharing."
          },
          filmmakers: {
            title: "Filmmakers",
            description: "Monetize your video content and reach global audiences seeking high-quality footage."
          },
          musicians: {
            title: "Musicians",
            description: "License your compositions and soundtracks to creators worldwide seeking the perfect audio."
          },
          designers: {
            title: "Designers",
            description: "Showcase your illustrations and graphics, building exposure and community recognition."
          }
        },
        benefits: {
          fairRevenue: "Fair Revenue Share",
          globalExposure: "Global Exposure",
          communityGrowth: "Community Growth"
        }
      },
      whoWeServe: {
        title: "Trusted by Creators and Businesses Worldwide",
        subtitle: "From individual entrepreneurs to global agencies, educators to established brands, VisuStock serves diverse clients who value quality, authenticity, and seamless licensing. Our commitment to trust, exceptional content curation, and straightforward licensing makes us the preferred choice for professionals seeking reliable creative resources.",
        features: {
          quality: {
            title: "Quality Assured",
            description: "Every piece of content is carefully curated to meet professional standards."
          },
          community: {
            title: "Global Community",
            description: "Access diverse perspectives from creators across all continents and cultures."
          },
          licensing: {
            title: "Easy Licensing",
            description: "Clear, straightforward licensing terms that protect both creators and users."
          }
        }
      },
      cta: {
        title: "Ready to Join the VisuStock Community?",
        subtitle: "Whether you're looking to discover amazing content or share your creative work with the world, VisuStock is your platform for creative success.",
        buttons: {
          packages: "Explore Our Packages",
          contributor: "Become a Contributor",
          learnMore: "Learn More"
        }
      },
      footer: {
        links: {
          blog: "Blog",
          press: "Press & Media",
          careers: "Careers",
          contact: "Contact Us"
        },
        copyright: "© 2024 VisuStock. Empowering creativity worldwide. All rights reserved."
      }
    }
  };

  const t = content[language];
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden min-h-[80vh] flex items-center">
        {/* Video Background */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onError={(e) => {
            console.error('Video failed to load:', e);
            e.currentTarget.style.display = 'none';
          }}
          onLoadedData={() => console.log('Video loaded successfully')}
          onCanPlayThrough={() => console.log('Video can play through')}
        >
          <source src="https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/public/video%20HERO/VHP_5-27.webm" type="video/webm" />
          Your browser does not support the video tag.
        </video>
        
        {/* Fallback Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-gradient-to-br from-primary/20 via-primary-glow/10 to-background"
          style={{ backgroundImage: 'url(/visustock-logo-watermark.png)' }}
        ></div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* Content */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 drop-shadow-lg">
              {t.hero.title}{" "}
              <span className="text-primary drop-shadow-lg">{t.hero.titleHighlight}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto drop-shadow-md">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Badge variant="secondary" className="px-4 py-2 text-base bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30">
                <Globe className="w-4 h-4 mr-2" />
                {t.hero.badges.globalCommunity}
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-base bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30">
                <Users className="w-4 h-4 mr-2" />
                {t.hero.badges.diverseCreators}
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-base bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30">
                <Heart className="w-4 h-4 mr-2" />
                {t.hero.badges.inclusivePlatform}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 bg-surface">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
              {t.introduction.title}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t.introduction.description}
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <TrendingUp className="w-8 h-8 text-primary mr-4" />
                  <h3 className="text-2xl font-bold text-foreground">{t.mission.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t.mission.description}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <Globe className="w-8 h-8 text-primary mr-4" />
                  <h3 className="text-2xl font-bold text-foreground">{t.vision.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t.vision.description}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Creator Benefits */}
      <section className="py-16 bg-surface">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {t.creators.title}
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {t.creators.subtitle}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">{t.creators.types.photographers.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {t.creators.types.photographers.description}
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">{t.creators.types.filmmakers.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {t.creators.types.filmmakers.description}
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Music className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">{t.creators.types.musicians.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {t.creators.types.musicians.description}
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Palette className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">{t.creators.types.designers.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {t.creators.types.designers.description}
                </p>
              </div>
            </div>

            <div className="text-center mt-12">
              <div className="flex flex-wrap justify-center gap-6 mb-8">
                <div className="flex items-center">
                  <Award className="w-6 h-6 text-primary mr-2" />
                  <span className="text-foreground font-medium">{t.creators.benefits.fairRevenue}</span>
                </div>
                <div className="flex items-center">
                  <TrendingUp className="w-6 h-6 text-primary mr-2" />
                  <span className="text-foreground font-medium">{t.creators.benefits.globalExposure}</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-6 h-6 text-primary mr-2" />
                  <span className="text-foreground font-medium">{t.creators.benefits.communityGrowth}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Serve */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
              {t.whoWeServe.title}
            </h2>
            <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
              {t.whoWeServe.subtitle}
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Shield className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">{t.whoWeServe.features.quality.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t.whoWeServe.features.quality.description}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Users className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">{t.whoWeServe.features.community.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t.whoWeServe.features.community.description}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Award className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">{t.whoWeServe.features.licensing.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t.whoWeServe.features.licensing.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-primary-glow/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {t.cta.title}
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              {t.cta.subtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-3">
                <Link to={`/${language}/packages-pricing`}>{t.cta.buttons.packages}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3">
                <Link to={`/${language}/auth/seller`}>{t.cta.buttons.contributor}</Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="text-lg px-8 py-3">
                <Link to={`/${language}/contact`}>{t.cta.buttons.learnMore}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Invite */}
      <footer className="py-12 bg-surface border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex flex-wrap justify-center gap-6 mb-6">
              <Link to={`/${language}/support`} className="text-muted-foreground hover:text-primary transition-colors">
                {t.footer.links.blog}
              </Link>
              <Link to={`/${language}/contact`} className="text-muted-foreground hover:text-primary transition-colors">
                {t.footer.links.press}
              </Link>
              <Link to={`/${language}/contact`} className="text-muted-foreground hover:text-primary transition-colors">
                {t.footer.links.careers}
              </Link>
              <Link to={`/${language}/contact`} className="text-muted-foreground hover:text-primary transition-colors">
                {t.footer.links.contact}
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.footer.copyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;