import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

const SellerRegistrationCancelled = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-16 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Paiement annulé</CardTitle>
            <CardDescription>
              Votre inscription en tant que vendeur n'a pas été finalisée.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Vous pouvez réessayer à tout moment en cliquant sur le bouton ci-dessous.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate("/become-seller")} className="w-full">
                Réessayer l'inscription
              </Button>
              <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                Retour à l'accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerRegistrationCancelled;
