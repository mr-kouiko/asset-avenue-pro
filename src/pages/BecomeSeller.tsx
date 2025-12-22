import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, CreditCard, Loader2, Store, Upload, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BecomeSeller = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const { isCreator, isAdmin } = useUserRole();
  const [isLoading, setIsLoading] = useState(false);

  const handleBecomeSeller = async () => {
    if (!user) {
      toast.error("You must be logged in to become a seller");
      navigate("/auth");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("seller-registration-payment");

      if (error) {
        throw new Error(error.message);
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    // Pass 'creator' role to indicate seller intent
    await signInWithGoogle('creator');
    setIsLoading(false);
  };

  // Already a seller
  if (isCreator || isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <Check className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <CardTitle>You're already a seller!</CardTitle>
              <CardDescription>
                Access your dashboard to manage your products.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate("/seller-dashboard")} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Become a Seller on VisuStock</h1>
            <p className="text-xl text-muted-foreground">
              Sell your photos, videos and creations to thousands of buyers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader className="text-center">
                <Upload className="h-12 w-12 mx-auto text-primary mb-2" />
                <CardTitle className="text-lg">Upload Your Creations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Share your photos, videos, illustrations and audio files
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Store className="h-12 w-12 mx-auto text-primary mb-2" />
                <CardTitle className="text-lg">Create Your Store</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Customize your profile and showcase your work
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Wallet className="h-12 w-12 mx-auto text-primary mb-2" />
                <CardTitle className="text-lg">Earn Money</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Receive payments for every sale of your creations
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CreditCard className="h-12 w-12 mx-auto text-primary mb-4" />
              <CardTitle>Registration Fee</CardTitle>
              <CardDescription>
                A one-time payment to access all seller features
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div>
                <span className="text-5xl font-bold">€15</span>
                <span className="text-muted-foreground ml-2">one-time payment</span>
              </div>
              
              <ul className="text-left space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Unlimited access to seller platform</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Unlimited file uploads</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Analytics dashboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Priority support</span>
                </li>
              </ul>

              {user ? (
                <Button 
                  onClick={handleBecomeSeller} 
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Become a Seller - €15
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Sign in to continue with seller registration
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Signing in..." : "Sign in with Google"}
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={() => navigate("/auth")}
                    className="w-full"
                  >
                    Sign in with Email
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BecomeSeller;