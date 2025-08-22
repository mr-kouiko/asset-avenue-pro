import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
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
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary-glow/5 to-background"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6">
              Empowering Creativity,{" "}
              <span className="text-primary">Enriching Your Story</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              VisuStock is a global platform where creativity knows no boundaries. 
              Connect with diverse creators worldwide and discover the perfect media for your vision.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Badge variant="secondary" className="px-4 py-2 text-base">
                <Globe className="w-4 h-4 mr-2" />
                Global Community
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-base">
                <Users className="w-4 h-4 mr-2" />
                Diverse Creators
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-base">
                <Heart className="w-4 h-4 mr-2" />
                Inclusive Platform
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
              Your Gateway to Global Creative Content
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              VisuStock is a leading global marketplace for licensed digital media, featuring images, videos, 
              audio, and graphics from creators around the world. We celebrate diversity and inclusivity, 
              providing opportunities for creative professionals across all cultures to share their unique 
              perspectives and monetize their talent. Our platform bridges the gap between visionary creators 
              and those seeking authentic, high-quality content for their projects.
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
                  <h3 className="text-2xl font-bold text-foreground">Our Mission</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  To support creators worldwide by enabling them to monetize their work and share their 
                  vision with a global audience. We provide the tools, platform, and community needed 
                  for creative professionals to thrive while delivering exceptional content to businesses, 
                  educators, and individuals seeking authentic visual storytelling.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <Globe className="w-8 h-8 text-primary mr-4" />
                  <h3 className="text-2xl font-bold text-foreground">Our Vision</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  To build a thriving, diverse creative ecosystem accessible to all. We envision a world 
                  where every creator, regardless of background or location, has the opportunity to showcase 
                  their work, connect with global audiences, and build sustainable creative careers through 
                  our inclusive and innovative marketplace.
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
                Empowering Every Type of Creator
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Whether you're a photographer, designer, musician, filmmaker, or illustrator, 
                VisuStock provides the platform to showcase your work and build a sustainable creative career.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">Photographers</h4>
                <p className="text-sm text-muted-foreground">
                  Share your unique perspective and earn from every download with competitive revenue sharing.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">Filmmakers</h4>
                <p className="text-sm text-muted-foreground">
                  Monetize your video content and reach global audiences seeking high-quality footage.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Music className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">Musicians</h4>
                <p className="text-sm text-muted-foreground">
                  License your compositions and soundtracks to creators worldwide seeking the perfect audio.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Palette className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">Designers</h4>
                <p className="text-sm text-muted-foreground">
                  Showcase your illustrations and graphics, building exposure and community recognition.
                </p>
              </div>
            </div>

            <div className="text-center mt-12">
              <div className="flex flex-wrap justify-center gap-6 mb-8">
                <div className="flex items-center">
                  <Award className="w-6 h-6 text-primary mr-2" />
                  <span className="text-foreground font-medium">Fair Revenue Share</span>
                </div>
                <div className="flex items-center">
                  <TrendingUp className="w-6 h-6 text-primary mr-2" />
                  <span className="text-foreground font-medium">Global Exposure</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-6 h-6 text-primary mr-2" />
                  <span className="text-foreground font-medium">Community Growth</span>
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
              Trusted by Creators and Businesses Worldwide
            </h2>
            <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
              From individual entrepreneurs to global agencies, educators to established brands, 
              VisuStock serves diverse clients who value quality, authenticity, and seamless licensing. 
              Our commitment to trust, exceptional content curation, and straightforward licensing 
              makes us the preferred choice for professionals seeking reliable creative resources.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Shield className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">Quality Assured</h4>
                  <p className="text-sm text-muted-foreground">
                    Every piece of content is carefully curated to meet professional standards.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Users className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">Global Community</h4>
                  <p className="text-sm text-muted-foreground">
                    Access diverse perspectives from creators across all continents and cultures.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Award className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">Easy Licensing</h4>
                  <p className="text-sm text-muted-foreground">
                    Clear, straightforward licensing terms that protect both creators and users.
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
              Ready to Join the VisuStock Community?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Whether you're looking to discover amazing content or share your creative work with the world, 
              VisuStock is your platform for creative success.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-3">
                <Link to="/packages-pricing">Explore Our Packages</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3">
                <Link to="/auth/seller">Become a Contributor</Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="text-lg px-8 py-3">
                <Link to="/contact">Learn More</Link>
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
              <Link to="/support" className="text-muted-foreground hover:text-primary transition-colors">
                Blog
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                Press & Media
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                Careers
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                Contact Us
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 VisuStock. Empowering creativity worldwide. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;