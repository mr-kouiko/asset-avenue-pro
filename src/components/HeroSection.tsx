import { Search, Play, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroImage from "@/assets/hero-image.jpg";

export const HeroSection = () => {
  return (
    <section className="relative bg-gradient-to-r from-primary/5 via-primary-glow/5 to-primary/5 py-20">
      <div className="container">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left Content */}
          <div className="flex-1 space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                Découvrez des millions de{" "}
                <span className="text-primary">contenus créatifs</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Photos, vidéos, illustrations, sons et bien plus. Trouvez le contenu parfait 
                pour vos projets créatifs et professionnels.
              </p>
            </div>

            {/* Search Bar */}
            <div className="flex gap-3 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button size="lg" className="px-8">
                Rechercher
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-6">
              <div>
                <div className="text-2xl font-bold">4.8M+</div>
                <div className="text-sm text-muted-foreground">Photos</div>
              </div>
              <div>
                <div className="text-2xl font-bold">650K+</div>
                <div className="text-sm text-muted-foreground">Vidéos</div>
              </div>
              <div>
                <div className="text-2xl font-bold">300K+</div>
                <div className="text-sm text-muted-foreground">Illustrations</div>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <img
                src={heroImage}
                alt="Hero"
                className="w-full rounded-2xl shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
              
              {/* Floating Cards */}
              <div className="absolute -top-4 -right-4 bg-white rounded-lg shadow-lg p-3 animate-bounce">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-lg shadow-lg p-3 flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">4K Video</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};