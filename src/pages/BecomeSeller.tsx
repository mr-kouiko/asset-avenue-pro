import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, CreditCard, Loader2, Store, Upload, Wallet, Crown, Gift } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSellerCount } from "@/hooks/useSellerCount";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FoundingMemberBanner } from "@/components/seller/FoundingMemberBanner";

const BecomeSeller = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const { isCreator, isAdmin } = useUserRole();
  const { spotsRemaining, limit, isFreeRegistration, isLoading: countLoading, refetch } = useSellerCount();
  const [isLoading, setIsLoading] = useState(false);

  const handleBecomeSeller = async () => {
    if (!user) {
      toast.error("You must be logged in to become a seller");
      navigate("/auth");
      return;
    }

    setIsLoading(true);

    try {
      // Check if free registration is available
      if (isFreeRegistration) {
        // Use free registration flow
        const { data, error } = await supabase.functions.invoke("register-free-seller");

        if (error) {
          throw new Error(error.message);
        }

        if (data.success) {
          toast.success("🎉 " + data.message);
          // Refresh user role
          window.location.href = "/seller-dashboard";
        } else if (data.requiresPayment) {
          // Promotion ended, need to pay
          await handlePaidRegistration();
        } else {
          throw new Error(data.error || "Registration failed");
        }
      } else {
        // Paid registration flow
        await handlePaidRegistration();
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred. Please try again.");
      // Refetch in case the count changed
      refetch();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaidRegistration = async () => {
    const origin = window.location.origin;
    const { data, error } = await supabase.functions.invoke("create-paypal-order", {
      body: {
        order_type: "seller_registration",
        success_url: `${origin}/seller-registration-success`,
        cancel_url: `${origin}/seller-registration-cancelled`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data?.approval_url) {
      window.location.href = data.approval_url;
    } else {
      throw new Error("No PayPal approval URL received");
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signInWithGoogle('creator');
    setIsLoading(false);
  };

  // Already a seller
  if (isCreator || isAdmin) {
    return (
      <div className="min-h-screen bg-background">
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
      <div className="container py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Become a Seller on VisuStock</h1>
            <p className="text-xl text-muted-foreground">
              Sell your photos, videos and creations to thousands of buyers
            </p>
          </div>

          {/* Founding Member Banner */}
          <FoundingMemberBanner 
            spotsRemaining={spotsRemaining ?? 0} 
            totalSpots={limit ?? 100}
            isLoading={countLoading}
          />

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

          {/* Registration Card */}
          <Card className={`max-w-md mx-auto ${isFreeRegistration ? 'border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10' : ''}`}>
            <CardHeader className="text-center">
              {isFreeRegistration ? (
                <>
                  <div className="relative">
                    <Crown className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                    <Gift className="h-6 w-6 absolute -top-1 -right-1 text-amber-500 animate-bounce" style={{ left: '58%' }} />
                  </div>
                  <CardTitle className="text-2xl">
                    <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                      Founding Creator
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Join the first 100 creators for free!
                  </CardDescription>
                </>
              ) : (
                <>
                  <CreditCard className="h-12 w-12 mx-auto text-primary mb-4" />
                  <CardTitle>Registration Fee</CardTitle>
                  <CardDescription>
                    A one-time payment to access all seller features
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="text-center space-y-6">
              {/* Price display */}
              <div>
                {isFreeRegistration ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl text-muted-foreground line-through">$15</span>
                    <span className="text-5xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                      FREE
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="text-5xl font-bold">$15</span>
                    <span className="text-muted-foreground ml-2">one-time payment</span>
                  </>
                )}
              </div>
              
              <ul className="text-left space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Unlimited access to seller platform</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Unlimited file uploads</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Analytics dashboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Priority support</span>
                </li>
                {isFreeRegistration && (
                  <li className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      Founding Creator badge
                    </span>
                  </li>
                )}
              </ul>

              {user ? (
                <Button 
                  onClick={handleBecomeSeller} 
                  disabled={isLoading || countLoading}
                  className={`w-full ${isFreeRegistration ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white' : ''}`}
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isFreeRegistration ? "Registering..." : "Redirecting..."}
                    </>
                  ) : isFreeRegistration ? (
                    <>
                      <Crown className="mr-2 h-4 w-4" />
                      Become a Founding Creator - Free!
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Become a Seller - $15
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
