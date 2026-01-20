import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface DirectPurchaseItem {
  submission_id: string;
  title: string;
  author: string;
  /**
   * Base product price.
   * - 0 => explicitly free (bypass PayPal)
   * - null/undefined => license-based pricing
   */
  price: number | null | undefined;
  license_id?: string;
  type: string;
  thumbnail?: string;
}

const licensePrices = {
  standard: 15,
  extended: 45,
  exclusive: 299,
} as const;

type LicenseId = keyof typeof licensePrices;

const getLicensePrice = (selectedLicense: string) => {
  return licensePrices[selectedLicense as LicenseId] ?? licensePrices.standard;
};

export const useDirectPurchase = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [userCredits, setUserCredits] = useState<number>(0);

  // Fetch user credits
  const fetchUserCredits = useCallback(async () => {
    if (!user) {
      setUserCredits(0);
      return 0;
    }

    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('credits_balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching credits:', error);
        return 0;
      }

      const balance = data?.credits_balance || 0;
      setUserCredits(balance);
      return balance;
    } catch (error) {
      console.error('Error in fetchUserCredits:', error);
      return 0;
    }
  }, [user]);

  useEffect(() => {
    fetchUserCredits();
  }, [fetchUserCredits]);

  // Pay with credits for direct purchase
  const payWithCredits = async (
    item: DirectPurchaseItem,
    selectedLicense: string = 'standard'
  ) => {
    if (!user) {
      toast.info('Please log in to purchase this product');
      const currentPath = window.location.pathname;
      window.location.href = `/${language}/auth?redirect=${encodeURIComponent(currentPath)}`;
      return null;
    }

    const totalPrice = getItemTotal(item, selectedLicense);
    
    if (userCredits < totalPrice) {
      toast.error(`Insufficient credits. You need ${totalPrice} but only have ${userCredits}`);
      return null;
    }

    try {
      setLoading(true);
      console.log('[DIRECT-PURCHASE] Paying with credits for item:', item.title);
      console.log('[DIRECT-PURCHASE] Credits needed:', totalPrice);

      const cart_items = [{
        submission_id: item.submission_id,
        price: totalPrice,
        license_id: selectedLicense
      }];

      const { data, error } = await supabase.functions.invoke('pay-with-credits', {
        body: { cart_items }
      });

      if (error) {
        console.error('[DIRECT-PURCHASE] Error paying with credits:', error);
        toast.error('Error processing credit payment');
        return null;
      }

      if (data?.success) {
        setUserCredits(data.new_balance || 0);
        toast.success(`Purchased with ${data.credits_used} credits!`);
        return { ...data, redirect: '/buyer-dashboard' };
      }

      if (data?.error === 'Insufficient credits') {
        toast.error(`Insufficient credits. Need ${data.required}, have ${data.available}`);
        return null;
      }

      toast.error(data?.error || 'Payment failed');
      return null;

    } catch (error) {
      console.error('[DIRECT-PURCHASE] Error:', error);
      toast.error('Error processing credit payment');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createDirectPayment = async (
    item: DirectPurchaseItem,
    selectedLicense: string = 'standard'
  ) => {
    if (!user) {
      toast.info('Please log in to purchase this product');
      // Redirect to auth with return URL
      const currentPath = window.location.pathname;
      window.location.href = `/${language}/auth?redirect=${encodeURIComponent(currentPath)}`;
      return null;
    }

    try {
      setLoading(true);
      console.log('Creating direct payment for item:', item);
      console.log('Selected license:', selectedLicense);

      // ✅ Free items bypass PayPal entirely
      if (item.price === 0) {
        console.log('[DIRECT-PURCHASE] Free item (price=0) — processing free order without PayPal');

        const cart_items = [
          {
            submission_id: item.submission_id,
            // Free item: do not pass license_id (downloads.license_id is UUID; "standard" breaks inserts)
          },
        ];

        const { data, error } = await supabase.functions.invoke('process-free-order', {
          body: { cart_items },
        });

        if (error) {
          console.error('[DIRECT-PURCHASE] Error processing free order:', error);
          toast.error('Error processing free download');
          return null;
        }

        if (data?.success) {
          toast.success('Free content added to your downloads!');
          return { ...data, redirect: '/buyer-dashboard' };
        }

        return data;
      }

      // Paid / license-priced items → PayPal
      const licensePrice = getLicensePrice(selectedLicense);
      const basePrice = item.price ?? 0;
      const totalPrice = basePrice > 0 ? basePrice + licensePrice : licensePrice;

      console.log('[DIRECT-PURCHASE] Price calculation:', { basePrice, licensePrice, totalPrice });

      const cart_items = [
        {
          submission_id: item.submission_id,
          price: totalPrice,
          license_id: selectedLicense,
        },
      ];

      const { data, error } = await supabase.functions.invoke('create-paypal-order', {
        body: {
          cart_items,
          order_type: 'marketplace',
          success_url: `${window.location.origin}/payment-success`,
          cancel_url: `${window.location.origin}/product/${item.submission_id}?payment=cancelled`,
        },
      });

      if (error) {
        console.error('[DIRECT-PURCHASE] Error creating PayPal order:', error);
        toast.error('Error creating PayPal payment');
        return null;
      }

      console.log('[DIRECT-PURCHASE] PayPal order created:', data);

      if (data?.approval_url) {
        toast.success('Redirecting to PayPal...');
        window.location.href = data.approval_url;
      }

      return data;
    } catch (error) {
      console.error('[DIRECT-PURCHASE] Error in createDirectPayment:', error);
      toast.error('Payment error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const validatePurchaseItem = (item: DirectPurchaseItem) => {
    if (!user) {
      return { valid: false, error: 'You must be logged in' };
    }

    if (!item.submission_id) {
      return { valid: false, error: 'Missing product ID' };
    }

    // Allow null/undefined prices (license-based pricing)
    if (
      item.price !== null &&
      item.price !== undefined &&
      (typeof item.price !== 'number' || item.price < 0)
    ) {
      return { valid: false, error: 'Invalid price' };
    }

    return { valid: true };
  };

  const getItemTotal = (item: DirectPurchaseItem, selectedLicense: string = 'standard') => {
    if (item.price === 0) return 0;

    const licensePrice = getLicensePrice(selectedLicense);
    const basePrice = item.price ?? 0;
    return basePrice > 0 ? basePrice + licensePrice : licensePrice;
  };

  // Check if user can pay with credits for a specific item
  const canPayWithCreditsForItem = (item: DirectPurchaseItem, selectedLicense: string = 'standard') => {
    const total = getItemTotal(item, selectedLicense);
    return userCredits >= total && total > 0;
  };

  return {
    loading,
    userCredits,
    createDirectPayment,
    payWithCredits,
    canPayWithCreditsForItem,
    validatePurchaseItem,
    getItemTotal,
    fetchUserCredits,
  };
};
