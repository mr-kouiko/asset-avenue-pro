import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);

  const createDirectPayment = async (
    item: DirectPurchaseItem,
    selectedLicense: string = 'standard'
  ) => {
    if (!user) {
      toast.info('Veuillez vous connecter pour acheter ce produit');
      // Redirect to auth with return URL
      const currentPath = window.location.pathname;
      window.location.href = `/${language}/auth?redirect=${encodeURIComponent(currentPath)}`;
      return null;
    }

    try {
      setLoading(true);
      console.log('Creating direct payment for item:', item);
      console.log('Selected license:', selectedLicense);

      // License price mapping
      const licensePrices = {
        'standard': 15,
        'extended': 45,
        'exclusive': 299
      };

      const licensePrice = licensePrices[selectedLicense as keyof typeof licensePrices] || 15;
      
      // Handle null/undefined prices - use license price as base
      const basePrice = item.price ?? 0;
      const totalPrice = basePrice > 0 ? basePrice + licensePrice : licensePrice;
      
      console.log('Price calculation:', { basePrice, licensePrice, totalPrice });

      // Convert to expected format for marketplace payment
      const cart_items = [{
        submission_id: item.submission_id,
        price: totalPrice,
        license_id: selectedLicense
      }];

      const { data, error } = await supabase.functions.invoke('create-paypal-order', {
        body: {
          cart_items,
          order_type: 'marketplace',
          success_url: `${window.location.origin}/payment-success`,
          cancel_url: `${window.location.origin}/product/${item.submission_id}?payment=cancelled`
        }
      });

      if (error) {
        console.error('Error creating PayPal order:', error);
        toast.error('Erreur lors de la création du paiement PayPal');
        return null;
      }

      console.log('PayPal order created:', data);

      if (data.approval_url) {
        // Redirect to PayPal Checkout
        toast.success('Redirection vers PayPal...');
        window.location.href = data.approval_url;
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

    // Allow null/undefined prices (will use license-based pricing)
    if (item.price !== null && item.price !== undefined && 
        (typeof item.price !== 'number' || item.price < 0)) {
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
    const basePrice = item.price ?? 0;
    return basePrice > 0 ? basePrice + licensePrice : licensePrice;
  };

  return {
    loading,
    createDirectPayment,
    validatePurchaseItem,
    getItemTotal
  };
};