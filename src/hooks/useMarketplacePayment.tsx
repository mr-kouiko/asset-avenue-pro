import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCart } from './useCart';
import { toast } from 'sonner';

interface CartItem {
  submission_id: string;
  price: number;
  license_id?: string;
}

export const useMarketplacePayment = () => {
  const { user } = useAuth();
  const { items: cartItems, clearCart } = useCart();
  const [loading, setLoading] = useState(false);

  const createPayment = async (
    successUrl?: string,
    cancelUrl?: string
  ) => {
    if (!user) {
      toast.error('Vous devez être connecté pour effectuer un achat');
      return null;
    }

    if (cartItems.length === 0) {
      toast.error('Votre panier est vide');
      return null;
    }

    try {
      setLoading(true);
      console.log('Creating marketplace payment for', cartItems.length, 'items');

      // Convert cart items to the expected format
      const cart_items: CartItem[] = cartItems.map(item => ({
        submission_id: item.id,
        price: item.price,
        license_id: item.licenseId
      }));

      const { data, error } = await supabase.functions.invoke('create-marketplace-payment', {
        body: {
          cart_items,
          success_url: successUrl || `${window.location.origin}/payment-success`,
          cancel_url: cancelUrl || `${window.location.origin}/cart`
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      if (error) {
        console.error('Error creating payment:', error);
        toast.error('Erreur lors de la création du paiement');
        return null;
      }

      console.log('Payment created:', data);

      if (data.checkout_url) {
        // Redirect to Stripe Checkout
        window.open(data.checkout_url, '_blank');
        toast.success('Redirection vers le paiement...');
        
        // Clear cart after successful checkout creation
        setTimeout(() => {
          clearCart();
          toast.success('Commande confirmée ! Redirection vers le paiement...');
        }, 1000);
      }

      return data;

    } catch (error) {
      console.error('Error in createPayment:', error);
      toast.error('Erreur lors du paiement');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const validateCart = () => {
    if (!user) {
      return { valid: false, error: 'Vous devez être connecté' };
    }

    if (cartItems.length === 0) {
      return { valid: false, error: 'Votre panier est vide' };
    }

    // Check for items with invalid prices
    const invalidItems = cartItems.filter(item => 
      typeof item.price !== 'number' || item.price <= 0
    );

    if (invalidItems.length > 0) {
      return { valid: false, error: 'Certains articles ont des prix invalides' };
    }

    // Check for missing required fields
    const incompleteItems = cartItems.filter(item => 
      !item.id || !item.title || !item.author
    );

    if (incompleteItems.length > 0) {
      return { valid: false, error: 'Certains articles sont incomplets' };
    }

    return { valid: true };
  };

  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => total + (item.price || 0), 0);
  };

  const getCommissionAmount = (commissionRate: number = 0.15) => {
    return getTotalAmount() * commissionRate;
  };

  const getSellerAmount = (commissionRate: number = 0.15) => {
    return getTotalAmount() - getCommissionAmount(commissionRate);
  };

  return {
    loading,
    createPayment,
    validateCart,
    getTotalAmount,
    getCommissionAmount,
    getSellerAmount
  };
};