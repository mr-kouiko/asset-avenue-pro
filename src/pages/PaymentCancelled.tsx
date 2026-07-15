import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';

const PaymentCancelled = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader className="pb-6">
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 bg-orange-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-12 w-12 text-orange-600" />
                </div>
              </div>
              <CardTitle className="text-3xl text-orange-600 mb-2">
                Paiement annulé
              </CardTitle>
              <p className="text-muted-foreground text-lg">
                Votre paiement a été annulé. Aucun montant n'a été débité.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h3 className="font-semibold text-orange-800 mb-2">
                  Que s'est-il passé ?
                </h3>
                <p className="text-orange-700 text-sm">
                  Vous avez annulé le processus de paiement ou il y a eu un problème technique.
                  Vous pouvez réessayer à tout moment.
                </p>
              </div>

              <div className="space-y-4">
                <Button size="lg" className="w-full" onClick={() => window.history.back()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer le paiement
                </Button>
                
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link to="/marketplace">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour à la marketplace
                    </Link>
                  </Button>
                  
                  <Button variant="outline" className="flex-1" asChild>
                    <Link to="/support">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Aide
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground border-t pt-4">
                <p>
                  Problème de paiement ? 
                  <Link to="/support" className="text-primary hover:underline ml-1">
                    Contactez notre équipe support
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelled;