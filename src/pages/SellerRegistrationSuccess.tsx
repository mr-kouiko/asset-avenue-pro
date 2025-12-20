import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

const SellerRegistrationSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get("session_id");
      
      if (!sessionId) {
        setStatus("error");
        setErrorMessage("No session ID found");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-seller-payment", {
          body: { session_id: sessionId },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.success) {
          setStatus("success");
          toast.success("Félicitations! Vous êtes maintenant vendeur.");
        } else {
          throw new Error(data.error || "Verification failed");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "An error occurred");
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-16 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            {status === "loading" && (
              <>
                <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary mb-4" />
                <CardTitle>Vérification du paiement...</CardTitle>
                <CardDescription>
                  Veuillez patienter pendant que nous confirmons votre inscription.
                </CardDescription>
              </>
            )}
            {status === "success" && (
              <>
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <CardTitle>Bienvenue, Vendeur!</CardTitle>
                <CardDescription>
                  Votre compte vendeur a été activé avec succès.
                </CardDescription>
              </>
            )}
            {status === "error" && (
              <>
                <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
                <CardTitle>Erreur de vérification</CardTitle>
                <CardDescription>
                  {errorMessage || "Une erreur est survenue lors de la vérification."}
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="text-center">
            {status === "success" && (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Vous pouvez maintenant commencer à vendre vos créations sur VisuStock.
                </p>
                <Button onClick={() => navigate("/seller-dashboard")} className="w-full">
                  Accéder à mon tableau de bord
                </Button>
              </div>
            )}
            {status === "error" && (
              <div className="space-y-4">
                <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                  Retour à l'accueil
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerRegistrationSuccess;
