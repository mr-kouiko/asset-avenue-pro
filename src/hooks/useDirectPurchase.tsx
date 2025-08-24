import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface DirectPurchaseItem {
  submission_id: string;
  title: string;
  author: string;
  price: number;
  license_id?: string;
  type: string;
  thumbnail?: string;
}

export const useDirectPurchase = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createDirectPayment = async (
    item: DirectPurchaseItem,
    selectedLicense: string = 'standard'
  ) => {
    if (!user) {
      toast.error('Vous devez être connecté pour effectuer un achat');
      return null;
    }

    try {
      setLoading(true);
      console.log('Creating direct payment for item:', item);

      // License price mapping
      const licensePrices = {
        'standard': 15,
        'extended': 45,
        'exclusive': 299
      };

      const licensePrice = licensePrices[selectedLicense as keyof typeof licensePrices] || 15;
      const totalPrice = Math.max(item.price, 0) + licensePrice;

      // Convert to expected format for marketplace payment
      const cart_items = [{
        submission_id: item.submission_id,
        price: totalPrice,
        license_id: selectedLicense
      }];

      const { data, error } = await supabase.functions.invoke('create-marketplace-payment', {
        body: {
          cart_items,
          success_url: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/product/${item.submission_id}?payment=cancelled`
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      if (error) {
        console.error('Error creating direct payment:', error);
        toast.error('Erreur lors de la création du paiement');
        return null;
      }

      console.log('Direct payment created:', data);

      if (data.checkout_url) {
        // Redirect to Stripe Checkout in same tab for immediate purchase flow
        window.location.href = data.checkout_url;
        toast.success('Redirection vers le paiement...');
      }

      return data;

    } catch (error) {
      console.error('Error in createDirectPayment:', error);
      toast.error('Erreur lors du paiement');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const validatePurchaseItem = (item: DirectPurchaseItem) => {
    if (!user) {
      return { valid: false, error: 'Vous devez être connecté' };
    }

    if (!item.submission_id) {
      return { valid: false, error: 'ID de produit manquant' };
    }

    if (typeof item.price !== 'number' || item.price < 0) {
      return { valid: false, error: 'Prix invalide' };
    }

    return { valid: true };
  };

  const getItemTotal = (item: DirectPurchaseItem, selectedLicense: string = 'standard') => {
    const licensePrices = {
      'standard': 15,
      'extended': 45,
      'exclusive': 299
    };

    const licensePrice = licensePrices[selectedLicense as keyof typeof licensePrices] || 15;
    return Math.max(item.price, 0) + licensePrice;
  };

  return {
    loading,
    createDirectPayment,
    validatePurchaseItem,
    getItemTotal
  };
};