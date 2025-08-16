import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Checkout = () => {
  const { items, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        
        <div className="container py-16 text-center">
          <Lock className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold mb-4">Connexion requise</h1>
          <p className="text-muted-foreground mb-8">
            Vous devez être connecté pour finaliser votre achat
          </p>
          <Button size="lg" asChild>
            <Link to="/auth">Se connecter</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Mock payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearCart();
      toast.success('Paiement effectué avec succès !');
      navigate('/dashboard?tab=purchases');
    } catch (error) {
      toast.error('Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = getTotalPrice();
  const taxAmount = totalPrice * 0.2;
  const finalTotal = totalPrice + taxAmount;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Finaliser votre commande</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Payment Form */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold flex items-center mb-4">
                <CreditCard className="h-5 w-5 mr-2" />
                Informations de paiement
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input id="firstName" placeholder="Votre prénom" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nom</Label>
                    <Input id="lastName" placeholder="Votre nom" />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={user.email} disabled />
                </div>
                
                <div>
                  <Label htmlFor="cardNumber">Numéro de carte</Label>
                  <Input id="cardNumber" placeholder="1234 1234 1234 1234" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Expiration</Label>
                    <Input id="expiry" placeholder="MM/AA" />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input id="cvv" placeholder="123" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Résumé de la commande</h2>
              
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <img 
                      src={item.thumbnail} 
                      alt={item.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">par {item.author}</p>
                    </div>
                    <span className="font-semibold">
                      {item.price === 0 ? 'Gratuit' : `${item.price}€`}
                    </span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span>{totalPrice.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA (20%)</span>
                  <span>{taxAmount.toFixed(2)}€</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{finalTotal.toFixed(2)}€</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full mt-6" 
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? 'Traitement...' : `Payer ${finalTotal.toFixed(2)}€`}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center mt-4">
                Vos informations sont sécurisées et chiffrées
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;