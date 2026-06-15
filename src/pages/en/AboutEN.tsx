import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Users, Camera, Video, Music, Palette, Award, Heart, Zap, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";

const AboutEN = () => {
  useSEO({
    title: "About Us — Our Story & Mission",
    description: "Discover VisuStock's mission to empower creators with a fair marketplace for stock photos, videos, audio and AI-generated content.",
  });
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <main className="container py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Empowering Creativity, Enriching Your Story
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            VisuStock is a global digital marketplace where creators and storytellers unite. 
            We connect talented artists worldwide with those who bring their visions to life.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              <Globe className="w-4 h-4 mr-2" />
              Global Platform
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              <Users className="w-4 h-4 mr-2" />
              Diverse Community
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              <Award className="w-4 h-4 mr-2" />
              Quality Content
            </Badge>
          </div>
        </section>

        {/* Introduction */}
        <section className="mb-16">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold mb-6">Who We Are</h2>
              <p className="text-lg text-muted-foreground mb-6">
                VisuStock is a leading global marketplace for licensed digital media, including stunning photography, 
                captivating videos, immersive audio, and beautiful graphics. We believe in the power of diversity 
                and inclusivity, opening creative opportunities across all cultures and communities.
              </p>
              <p className="text-lg text-muted-foreground">
                Our platform bridges the gap between creative talent and those who need exceptional content, 
                fostering a thriving ecosystem where artistry meets opportunity.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Mission & Vision */}
        <section className="mb-16">
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-6 h-6 text-primary" />
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To support creators worldwide by enabling them to monetize their work and share their unique 
                  vision with a global audience. We provide the tools, platform, and community needed to turn 
                  creative passion into sustainable income.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-6 h-6 text-primary" />
                  Our Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To build a thriving, diverse creative ecosystem accessible to all. We envision a world where 
                  every creative voice can be heard, valued, and rewarded, regardless of background or location.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Creator Benefits */}
        <section className="mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl mb-4">Empowering Creators</CardTitle>
              <CardDescription className="text-lg">
                Join thousands of photographers, designers, musicians, filmmakers, and illustrators who are building their careers on VisuStock.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-2">Photography</h3>
                  <p className="text-sm text-muted-foreground">Share your visual stories with the world</p>
                </div>
                <div className="text-center">
                  <Video className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-2">Videography</h3>
                  <p className="text-sm text-muted-foreground">Showcase your cinematic vision</p>
                </div>
                <div className="text-center">
                  <Music className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-2">Audio</h3>
                  <p className="text-sm text-muted-foreground">Let your sounds inspire others</p>
                </div>
                <div className="text-center">
                  <Palette className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-2">Digital Art</h3>
                  <p className="text-sm text-muted-foreground">Transform imagination into digital reality</p>
                </div>
              </div>
              
              <div className="mt-8 grid md:grid-cols-3 gap-6">
                <div className="bg-surface p-6 rounded-lg">
                  <h4 className="font-semibold mb-2">Fair Revenue Share</h4>
                  <p className="text-sm text-muted-foreground">Competitive commission rates that value your creative work</p>
                </div>
                <div className="bg-surface p-6 rounded-lg">
                  <h4 className="font-semibold mb-2">Global Exposure</h4>
                  <p className="text-sm text-muted-foreground">Reach customers and collaborators worldwide</p>
                </div>
                <div className="bg-surface p-6 rounded-lg">
                  <h4 className="font-semibold mb-2">Community Growth</h4>
                  <p className="text-sm text-muted-foreground">Connect with fellow creators and build your network</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Who We Serve */}
        <section className="mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl mb-4">Who We Serve</CardTitle>
              <CardDescription className="text-lg">
                From individual creators to global brands, we provide trusted, high-quality content with easy licensing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <Users className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <h4 className="font-semibold mb-2">Individuals</h4>
                  <p className="text-sm text-muted-foreground">Personal projects and creative endeavors</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Zap className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <h4 className="font-semibold mb-2">Agencies</h4>
                  <p className="text-sm text-muted-foreground">Professional campaigns and client work</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Award className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <h4 className="font-semibold mb-2">Educators</h4>
                  <p className="text-sm text-muted-foreground">Educational content and materials</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Shield className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <h4 className="font-semibold mb-2">Brands</h4>
                  <p className="text-sm text-muted-foreground">Marketing and corporate communications</p>
                </div>
              </div>
              
              <div className="mt-8 bg-surface p-6 rounded-lg">
                <h4 className="font-semibold mb-4 text-center">Why Choose VisuStock?</h4>
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div>
                    <Shield className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <span className="text-sm font-medium">Trusted Quality</span>
                  </div>
                  <div>
                    <Zap className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <span className="text-sm font-medium">Easy Licensing</span>
                  </div>
                  <div>
                    <Globe className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <span className="text-sm font-medium">Global Reach</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Call to Action */}
        <section className="mb-16">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Join the VisuStock Community</h2>
              <p className="text-xl mb-8 opacity-90">
                Whether you're a creator looking to share your work or someone seeking the perfect content, 
                VisuStock is your gateway to unlimited creative possibilities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/en/packages-pricing">Explore Packages</Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
                  <Link to="/en/auth/seller">Become a Contributor</Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
                  <Link to="/en/packages-pricing">Learn About Pricing</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer Invite */}
        <section>
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-4">Stay Connected</h3>
              <p className="text-muted-foreground mb-6">
                Follow our journey and discover the latest from our creative community.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/en/blog">Blog</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/en/press">Press & Media</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/en/careers">Careers</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/en/contact">Contact Us</Link>
                </Button>
              </div>
              <div className="mt-8 pt-6 border-t text-sm text-muted-foreground">
                <p>&copy; 2026 VisuStock. Empowering creativity worldwide.</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default AboutEN;