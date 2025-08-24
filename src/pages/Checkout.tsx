import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMarketplacePayment } from '@/hooks/useMarketplacePayment';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { CreditCard, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StripeTestModeAlert, StripeTestCards } from '@/components/StripeTestModeAlert';

const Checkout = () => {
  const { user } = useAuth();
  const { items, getTotalPrice } = useCart();
  const { createPayment, loading } = useMarketplacePayment();
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    await createPayment();
    setProcessing(false);
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
          <h1 className="text-3xl font-bold">Checkout</h1>
        </div>

        <div className="space-y-6">
          {/* Test Mode Alert */}
          <StripeTestModeAlert />

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Résumé de la commande</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">par {item.author}</p>
                  </div>
                  <p className="font-semibold">{item.price}€</p>
                </div>
              ))}
              
              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{getTotalPrice()}€</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Paiement sécurisé avec Stripe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Vous allez être redirigé vers Stripe pour finaliser votre paiement de manière sécurisée.
                Stripe accepte les cartes de crédit, Apple Pay, Google Pay et autres méthodes de paiement.
              </p>

              {/* Test Cards Info */}
              <StripeTestCards />
              
              <Button 
                onClick={handlePayment}
                disabled={processing || loading}
                size="lg"
                className="w-full mt-6"
              >
                {processing || loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirection vers Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payer avec Stripe ({getTotalPrice()}€)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;