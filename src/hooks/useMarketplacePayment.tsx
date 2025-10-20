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
      console.log('Cart items with prices:', cartItems.map(i => ({ id: i.id, price: i.price, license: i.licenseId })));

      // Convert cart items to the expected format with proper price handling
      const cart_items: CartItem[] = cartItems.map(item => {
        // Ensure we have a valid price (minimum based on license)
        let finalPrice = item.price || 0;
        
        // If price is 0 or null, apply license-based pricing
        if (!finalPrice || finalPrice === 0) {
          const licensePrices: Record<string, number> = {
            'standard': 15,
            'extended': 45,
            'exclusive': 299
          };
          finalPrice = licensePrices[item.licenseId || 'standard'] || 15;
        }

        console.log(`Item ${item.title}: original price ${item.price}, final price ${finalPrice}, license ${item.licenseId}`);

        return {
          submission_id: item.submissionId || item.id,
          price: finalPrice,
          license_id: item.licenseId || 'standard'
        };
      });

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
        // Clear cart before redirect
        clearCart();
        toast.success('Redirection vers le paiement...');
        
        // Redirect to Stripe Checkout in same window
        window.location.href = data.checkout_url;
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

    // Check for items with problematic prices
    // Note: null/undefined prices will be replaced with license-based pricing
    const invalidItems = cartItems.filter(item => 
      (item.price !== null && item.price !== undefined && typeof item.price !== 'number') ||
      (typeof item.price === 'number' && item.price < 0)
    );

    if (invalidItems.length > 0) {
      console.error('Invalid items found:', invalidItems);
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