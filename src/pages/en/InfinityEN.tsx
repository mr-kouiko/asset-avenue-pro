import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Crown, Infinity as InfinityIcon, Download, Shield, DollarSign, Users, Camera, Image, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { usePayPalSubscription } from "@/hooks/usePayPalSubscription";
import { useAuth } from "@/hooks/useAuth";

const InfinityEN = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { createSubscription } = usePayPalSubscription();
  const { user } = useAuth();

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
      <Header />
      
      {/* Hero Section with Pricing Card */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative container py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="space-y-8">
              <Badge className="bg-white/10 text-white border-white/20 px-4 py-2">
                <Crown className="w-4 h-4 mr-2" />
                New
              </Badge>
              
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                Unleash your unlimited creativity with VisuStock Infinity
              </h1>
              
              <p className="text-xl text-slate-300 max-w-lg">
                Authentic creative content with an unlimited plan for individuals and freelancers
              </p>

              {/* Content type badges */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/30 px-4 py-2">
                  <Camera className="w-4 h-4 mr-2" />
                  Photos
                </Badge>
                <Badge variant="outline" className="bg-purple-500/20 text-purple-200 border-purple-400/30 px-4 py-2">
                  <Image className="w-4 h-4 mr-2" />
                  Vectors
                </Badge>
              </div>
            </div>

            {/* Right pricing card */}
            <div className="lg:justify-self-end w-full max-w-md">
              <Card className="bg-white shadow-2xl border-0">
                <CardContent className="p-8">
                  <Badge className="bg-red-500 text-white mb-4">
                    New
                  </Badge>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="text-lg font-medium text-foreground mb-2">
                        A plan with unlimited downloads.
                      </p>
                      
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-400 line-through">
                          ${isYearly ? 99 : 109}
                        </span>
                        <span className="text-4xl font-bold text-primary">
                          ${displayPrice}
                        </span>
                        <span className="text-muted-foreground">/monthly</span>
                      </div>
                    </div>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center space-x-3 py-4">
                      <span className={!isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}>
                        monthly
                      </span>
                      <Switch
                        checked={isYearly}
                        onCheckedChange={setIsYearly}
                      />
                      <span className={isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}>
                        annual
                      </span>
                      {isYearly && (
                        <Badge className="bg-green-100 text-green-800 ml-2">
                          Save 11%
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Unlimited downloads</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Access to photos and vectors (Infinity)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Unlimited standard usage license</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Suitable for individual creators and freelancers</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-3"
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

                    <p className="text-xs text-muted-foreground text-center">
                      Auto-renewal, you can cancel anytime
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