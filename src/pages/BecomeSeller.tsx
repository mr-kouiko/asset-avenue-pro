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
  const { user } = useAuth();
  const { isCreator, isAdmin } = useUserRole();
  const [isLoading, setIsLoading] = useState(false);

  const handleBecomeSeller = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour devenir vendeur");
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
      toast.error("Une erreur est survenue. Veuillez réessayer.");
      setIsLoading(false);
    }
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
              <CardTitle>Vous êtes déjà vendeur!</CardTitle>
              <CardDescription>
                Accédez à votre tableau de bord pour gérer vos produits.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate("/seller-dashboard")} className="w-full">
                Accéder au tableau de bord
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
            <h1 className="text-4xl font-bold mb-4">Devenez Vendeur sur VisuStock</h1>
            <p className="text-xl text-muted-foreground">
              Vendez vos photos, vidéos et créations à des milliers d'acheteurs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader className="text-center">
                <Upload className="h-12 w-12 mx-auto text-primary mb-2" />
                <CardTitle className="text-lg">Uploadez vos créations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Partagez vos photos, vidéos, illustrations et fichiers audio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Store className="h-12 w-12 mx-auto text-primary mb-2" />
                <CardTitle className="text-lg">Créez votre boutique</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Personnalisez votre profil et mettez en valeur votre travail
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Wallet className="h-12 w-12 mx-auto text-primary mb-2" />
                <CardTitle className="text-lg">Gagnez de l'argent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Recevez des paiements pour chaque vente de vos créations
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CreditCard className="h-12 w-12 mx-auto text-primary mb-4" />
              <CardTitle>Frais d'inscription</CardTitle>
              <CardDescription>
                Un paiement unique pour accéder à toutes les fonctionnalités vendeur
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div>
                <span className="text-5xl font-bold">15€</span>
                <span className="text-muted-foreground ml-2">paiement unique</span>
              </div>
              
              <ul className="text-left space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Accès illimité à la plateforme vendeur</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Upload de fichiers illimité</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Tableau de bord analytique</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Support prioritaire</span>
                </li>
              </ul>

              <Button 
                onClick={handleBecomeSeller} 
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirection...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Devenir vendeur - 15€
                  </>
                )}
              </Button>

              {!user && (
                <p className="text-sm text-muted-foreground">
                  Vous devez être connecté pour vous inscrire.{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/auth")}>
                    Se connecter
                  </Button>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BecomeSeller;
