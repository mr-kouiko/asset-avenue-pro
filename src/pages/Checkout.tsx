import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useMarketplacePayment } from '@/hooks/useMarketplacePayment';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, Shield, AlertTriangle, CheckCircle, Wallet, Gift, Download, Coins, CreditCard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Checkout = () => {
  const { user } = useAuth();
  const { items, getTotalPrice } = useCart();
  const { 
    createPayment, 
    loading, 
    validateCart, 
    isCartFree, 
    processFreeOrder,
    userCredits,
    canPayWithCredits,
    payWithCredits,
    creditsLoading,
    fetchUserCredits
  } = useMarketplacePayment();
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const navigate = useNavigate();

  const isFree = isCartFree();
  const totalPrice = getTotalPrice();
  const hasEnoughCredits = canPayWithCredits();

  // Refresh credits when component mounts
  useEffect(() => {
    if (user) {
      fetchUserCredits();
    }
  }, [user, fetchUserCredits]);

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

      // Handle free orders differently
      if (isFree) {
        const result = await processFreeOrder();
        if (result?.success) {
          navigate('/buyer-dashboard');
        } else if (!result) {
          setPaymentError('Failed to process free order. Please try again.');
        }
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

  const handleCreditPayment = async () => {
    setPaymentError(null);
    setProcessing(true);
    
    try {
      const validation = validateCart();
      if (!validation.valid) {
        setPaymentError(validation.error || 'Cart validation error');
        toast.error(validation.error || 'Cart validation error');
        return;
      }

      const result = await payWithCredits();
      if (result?.success) {
        navigate('/buyer-dashboard');
      } else if (!result) {
        setPaymentError('Failed to process credit payment. Please try again.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setPaymentError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
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
          {/* Credit Balance Banner */}
          {!isFree && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Coins className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Your Credit Balance</div>
                      <div className="text-sm text-muted-foreground">
                        {creditsLoading ? 'Loading...' : `${userCredits} credits available`}
                      </div>
                    </div>
                  </div>
                  {!hasEnoughCredits && totalPrice > 0 && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/packages-pricing">
                        Buy Credits
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
                    {!isFree && <p className="text-xs text-muted-foreground">= {item.price} credits</p>}
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
                {!isFree && (
                  <div className="flex justify-between text-sm text-primary font-medium">
                    <span>Or pay with credits</span>
                    <span>{totalPrice} credits</span>
                  </div>
                )}
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

          {/* Payment Options - Conditional based on free, credits, or paid */}
          {isFree ? (
            // Free Content Section
            <Card className="border-green-500/50 bg-green-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Gift className="h-5 w-5" />
                  Free Download
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-center py-4 bg-green-500/10 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Download className="h-6 w-6 text-green-600" />
                    <span className="text-lg font-semibold text-green-600">No Payment Required</span>
                  </div>
                </div>

                <p className="text-muted-foreground text-center">
                  This content is free! Click the button below to add it to your downloads immediately.
                </p>
                
                <Button 
                  onClick={handlePayment}
                  disabled={processing || loading}
                  size="lg"
                  className="w-full relative bg-green-600 hover:bg-green-700"
                >
                  {processing || loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Get Free Download
                    </>
                  )}
                </Button>
                
                <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Instant access • Added to your downloads</span>
                </div>
              </CardContent>
            </Card>
          ) : hasEnoughCredits ? (
            // Pay with Credits Section (Primary when user has enough credits)
            <div className="space-y-4">
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Coins className="h-5 w-5" />
                    Pay with Credits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-center py-4 bg-primary/10 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">{totalPrice}</div>
                        <div className="text-sm text-muted-foreground">credits</div>
                      </div>
                      <div className="text-muted-foreground">→</div>
                      <div className="text-center">
                        <div className="text-lg font-medium text-muted-foreground">{userCredits - totalPrice}</div>
                        <div className="text-xs text-muted-foreground">remaining</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-center">
                    Use your credits for instant purchase. No external payment required!
                  </p>
                  
                  <Button 
                    onClick={handleCreditPayment}
                    disabled={processing || loading}
                    size="lg"
                    className="w-full relative"
                  >
                    {processing || loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Coins className="h-4 w-4 mr-2" />
                        Pay {totalPrice} Credits
                      </>
                    )}
                  </Button>
                  
                  <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    <span>Instant purchase • No redirect needed</span>
                  </div>
                </CardContent>
              </Card>

              {/* Alternative: PayPal */}
              <Card className="border-muted">
                <CardHeader className="py-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    Or pay with PayPal
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    onClick={handlePayment}
                    disabled={processing || loading}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Pay {totalPrice}€ with PayPal
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            // PayPal Section (Primary when user doesn't have enough credits)
            <div className="space-y-4">
              {/* Credit Suggestion */}
              {userCredits > 0 && (
                <Alert>
                  <Coins className="h-4 w-4" />
                  <AlertDescription>
                    You have <strong>{userCredits} credits</strong> but need <strong>{totalPrice}</strong> for this purchase.{' '}
                    <Link to="/packages-pricing" className="text-primary underline">
                      Buy more credits
                    </Link> to pay instantly without PayPal!
                  </AlertDescription>
                </Alert>
              )}

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
                        Payer {totalPrice}€ avec PayPal
                      </>
                    )}
                  </Button>
                  
                  <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3" />
                    <span>Paiement sécurisé • Protection acheteur PayPal</span>
                  </div>
                </CardContent>
              </Card>

              {/* Alternative: Buy Credits */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Want to pay with credits instead?</div>
                      <div className="text-sm text-muted-foreground">
                        Buy a credit package for instant purchases
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/packages-pricing">
                        <Coins className="h-4 w-4 mr-2" />
                        Buy Credits
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;
