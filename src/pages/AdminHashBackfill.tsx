import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

export default function AdminHashBackfill() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    processed: number;
    errors: number;
    skipped: number;
    hasMore: boolean;
  } | null>(null);

  const runBackfill = async () => {
    setIsProcessing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('backfill-file-hashes', {
        method: 'POST',
      });

      if (error) throw error;

      if (data.success) {
        setResult(data.stats);
        toast.success(data.message);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error running backfill:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Calcul rétroactif des hash de fichiers
          </CardTitle>
          <CardDescription>
            Cette fonction calcule les hash SHA-256 de tous les fichiers existants qui n'en ont pas encore.
            Cela permet d'activer la détection de doublons pour l'ensemble de la marketplace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important :</strong> Le traitement peut prendre plusieurs minutes selon le nombre de fichiers.
              Il traite par lots de 100 fichiers. Si vous avez plus de 100 fichiers, relancez le processus plusieurs fois.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Button 
              onClick={runBackfill} 
              disabled={isProcessing}
              size="lg"
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Lancer le calcul des hash
                </>
              )}
            </Button>

            {result && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Résultats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-green-600">{result.processed}</div>
                      <div className="text-sm text-muted-foreground">Traités</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-yellow-600">{result.skipped}</div>
                      <div className="text-sm text-muted-foreground">Ignorés</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-red-600">{result.errors}</div>
                      <div className="text-sm text-muted-foreground">Erreurs</div>
                    </div>
                  </div>

                  {result.hasMore && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Il reste encore des fichiers à traiter. Relancez le processus pour continuer.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Fonctionnement :</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Télécharge chaque fichier depuis Supabase Storage</li>
              <li>Calcule son hash SHA-256</li>
              <li>Met à jour la base de données avec le hash</li>
              <li>Traite 100 fichiers maximum par exécution</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
