import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useMarketplacePayment } from '@/hooks/useMarketplacePayment';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, Shield, AlertTriangle, CheckCircle, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const Checkout = () => {
  const { user } = useAuth();
  const { items, getTotalPrice } = useCart();
  const { createPayment, loading, validateCart } = useMarketplacePayment();
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handlePayment = async () => {
    setPaymentError(null);
    setProcessing(true);
    
    try {
      // Validate cart before proceeding
      const validation = validateCart();
      if (!validation.valid) {
        setPaymentError(validation.error || 'Erreur de validation du panier');
        toast.error(validation.error || 'Erreur de validation du panier');
        return;
      }

      const result = await createPayment();
      if (!result) {
        setPaymentError('Échec de la création du paiement. Veuillez réessayer.');
        toast.error('Échec de la création du paiement');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inattendue est survenue';
      setPaymentError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Connexion requise</h1>
          <p className="text-muted-foreground mb-8">
            Vous devez être connecté pour effectuer un achat
          </p>
          <Button asChild>
            <Link to="/auth">Se connecter</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Panier vide</h1>
          <Button asChild>
            <Link to="/marketplace">Explorer la marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/cart">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au panier
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Paiement sécurisé</h1>
        </div>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Résumé de la commande</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center space-x-4">
                    {item.thumbnail && (
                      <img 
                        src={item.thumbnail} 
                        alt={item.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">par {item.author}</p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {item.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">{item.price}€</p>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sous-total</span>
                  <span>{getTotalPrice()}€</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>TVA incluse</span>
                  <span>Incluse</span>
                </div>
                <div className="flex justify-between font-bold text-xl border-t pt-2">
                  <span>Total</span>
                  <span className="text-primary">{getTotalPrice()}€</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Error */}
          {paymentError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erreur de paiement :</strong> {paymentError}
              </AlertDescription>
            </Alert>
          )}

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Paiement sécurisé avec PayPal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center py-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-6 w-6 text-[#003087]" />
                  <span className="text-lg font-semibold text-[#003087]">PayPal</span>
                </div>
              </div>

              <p className="text-muted-foreground text-center">
                Vous allez être redirigé vers PayPal pour finaliser votre paiement de manière sécurisée.
                Payez avec votre compte PayPal ou par carte bancaire.
              </p>
              
              <Button 
                onClick={handlePayment}
                disabled={processing || loading}
                size="lg"
                className="w-full relative bg-[#0070ba] hover:bg-[#003087]"
              >
                {processing || loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirection vers PayPal...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Payer {getTotalPrice()}€ avec PayPal
                  </>
                )}
              </Button>
              
              <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3" />
                <span>Paiement sécurisé • Protection acheteur PayPal</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
