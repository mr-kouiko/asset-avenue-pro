import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Crown, Infinity as InfinityIcon, Download, Shield, DollarSign, Users, Camera, Image, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePayPalSubscription } from "@/hooks/usePayPalSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";

const InfinityEN = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { createSubscription } = usePayPalSubscription();
  const { user } = useAuth();

  useSEO({
    title: "VisuStock Infinity – Unlimited Stock Downloads Subscription",
    description: "Get unlimited access to premium stock photos, vectors and audio with the VisuStock Infinity subscription. One flat rate, unlimited downloads.",
    type: "website",
  });

  const handleSubscribeInfinity = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to subscribe to Infinity",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    toast({
      title: "Redirecting to PayPal...",
      description: "Unlimited access to the entire VisuStock library"
    });

    try {
      await createSubscription('infinity', isYearly);
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Subscription Error",
        description: "Failed to create subscription. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const monthlyPrice = 89;
  const yearlyPrice = 79; // Monthly equivalent with yearly discount
  const displayPrice = isYearly ? yearlyPrice : monthlyPrice;

  const features = [
    {
      icon: DollarSign,
      title: "A price that suits you",
      description: "A flexible plan at an affordable price for all your projects — save your time and money."
    },
    {
      icon: Crown,
      title: "A massive library",
      description: "High-quality authentic photos and vectors that match your creative work."
    },
    {
      icon: InfinityIcon,
      title: "Unlimited downloads",
      description: "Nothing holds you back — download without limits, with fair daily usage applied."
    },
    {
      icon: Users,
      title: "Designed for creators",
      description: "A targeted plan with diverse content, ideal for individual creators and small projects."
    }
  ];

  const contentSamples = [
    { icon: Camera, label: "Photos", count: "5M+" },
    { icon: Image, label: "Vectors", count: "2M+" }
  ];

  return (
    <div className="min-h-screen bg-background">
      
      {/* Hero Section with Pricing Card - Mobile optimized with controlled height */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative container py-6 sm:py-10 lg:py-20 px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-12 items-start lg:items-center">
            {/* Left content - Compact on mobile */}
            <div className="space-y-3 sm:space-y-4 lg:space-y-6 text-center lg:text-left">
              <Badge className="bg-white/10 text-white border-white/20 px-2.5 py-1 sm:px-4 sm:py-2 text-xs">
                <Crown className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                New
              </Badge>
              
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl xl:text-6xl font-bold leading-tight">
                Unleash your unlimited creativity with VisuStock Infinity
              </h1>
              
              <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Authentic creative content with an unlimited plan for individuals and freelancers
              </p>

              {/* Content type badges - hidden on mobile */}
              <div className="hidden md:flex flex-wrap gap-2 lg:gap-3 justify-center lg:justify-start">
                <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/30 px-3 py-1.5 text-xs lg:text-sm">
                  <Camera className="w-3 h-3 lg:w-4 lg:h-4 mr-1.5" />
                  Photos
                </Badge>
                <Badge variant="outline" className="bg-purple-500/20 text-purple-200 border-purple-400/30 px-3 py-1.5 text-xs lg:text-sm">
                  <Image className="w-3 h-3 lg:w-4 lg:h-4 mr-1.5" />
                  Vectors
                </Badge>
              </div>
            </div>

            {/* Right pricing card - Compact on mobile */}
            <div className="lg:justify-self-end w-full max-w-sm sm:max-w-md mx-auto lg:mx-0">
              <Card className="bg-white shadow-2xl border-0">
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <Badge className="bg-red-500 text-white mb-3 text-xs">
                    New
                  </Badge>
                  
                  <div className="space-y-3 sm:space-y-4 lg:space-y-5">
                    <div>
                      <p className="text-sm sm:text-base font-medium text-foreground mb-1.5">
                        A plan with unlimited downloads.
                      </p>
                      
                      <div className="flex items-baseline gap-1.5 sm:gap-2">
                        <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-400 line-through">
                          ${isYearly ? 99 : 109}
                        </span>
                        <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">
                          ${displayPrice}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">/monthly</span>
                      </div>
                    </div>

                    {/* Billing Toggle - Compact */}
                    <div className="flex items-center justify-center space-x-2 py-2 sm:py-3">
                      <span className={`text-xs sm:text-sm ${!isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        monthly
                      </span>
                      <Switch
                        checked={isYearly}
                        onCheckedChange={setIsYearly}
                        className="scale-90 sm:scale-100"
                      />
                      <span className={`text-xs sm:text-sm ${isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        annual
                      </span>
                      {isYearly && (
                        <Badge className="bg-green-100 text-green-800 ml-1 text-xs px-1.5 py-0.5">
                          Save 11%
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        <span>Unlimited downloads</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        <span>Access to photos and vectors</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        <span>Standard usage license</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        <span>For creators and freelancers</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm sm:text-base py-2.5 sm:py-3"
                      onClick={handleSubscribeInfinity}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Subscribe now"
                      )}
                    </Button>

                    <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                      Auto-renewal, cancel anytime
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Icon className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-teal-600 text-white">
        <div className="container text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl font-bold">
              Ready to unlock your unlimited creativity?
            </h2>
            <p className="text-xl opacity-90">
              Join thousands of creators who trust VisuStock Infinity for their creative projects.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button 
                size="lg"
                className="bg-white text-green-600 hover:bg-gray-100 font-bold text-lg px-8 py-4"
                onClick={handleSubscribeInfinity}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                ) : (
                  <Crown className="w-6 h-6 mr-2" />
                )}
                {isProcessing ? "Processing..." : "Start now"}
              </Button>
              <p className="text-sm opacity-75">
                Free trial • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InfinityEN;