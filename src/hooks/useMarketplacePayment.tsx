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

interface CreditPackPurchase {
  packId: string;
  credits: number;
  price: number;
}

export const useMarketplacePayment = () => {
  const { user } = useAuth();
  const { items: cartItems, clearCart } = useCart();
  const [loading, setLoading] = useState(false);

  // Check if all items in cart are free (price = 0)
  const isCartFree = () => {
    return cartItems.every(item => !item.price || item.price === 0);
  };

  // Get the actual total considering free items
  const getActualTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price || 0), 0);
  };

  // Process free order without PayPal
  const processFreeOrder = async () => {
    if (!user) {
      toast.error('You must be logged in to get free content');
      return null;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return null;
    }

    try {
      setLoading(true);
      console.log('Processing free order for', cartItems.length, 'items');

      const cart_items = cartItems.map(item => ({
        submission_id: item.submissionId || item.id,
        // Free item: do not pass license_id (downloads.license_id is UUID; "standard" breaks inserts)
      }));

      const { data, error } = await supabase.functions.invoke('process-free-order', {
        body: { cart_items }
      });

      if (error) {
        console.error('Error processing free order:', error);
        toast.error('Error processing free download');
        return null;
      }

      console.log('Free order processed:', data);

      if (data.success) {
        clearCart();
        toast.success('Free content added to your downloads!');
        return { success: true, redirect: '/buyer-dashboard' };
      }

      return data;

    } catch (error) {
      console.error('Error in processFreeOrder:', error);
      toast.error('Error processing free download');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (
    successUrl?: string,
    cancelUrl?: string
  ) => {
    if (!user) {
      toast.error('You must be logged in to make a purchase');
      return null;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return null;
    }

    // Check if cart is free - bypass PayPal
    if (isCartFree()) {
      console.log('Cart total is $0 - processing as free order');
      return processFreeOrder();
    }

    try {
      setLoading(true);
      console.log('Creating PayPal payment for', cartItems.length, 'items');
      console.log('Cart items with prices:', cartItems.map(i => ({ id: i.id, price: i.price, license: i.licenseId })));

      // Convert cart items to the expected format with proper price handling
      const cart_items: CartItem[] = cartItems.map(item => {
        // Use the actual price - don't override free items
        let finalPrice = item.price || 0;
        
        // Only apply license-based pricing for paid items with no price set
        if (finalPrice === 0) {
          // Keep it free - don't apply license pricing for intentionally free items
          finalPrice = 0;
        }

        console.log(`Item ${item.title}: original price ${item.price}, final price ${finalPrice}, license ${item.licenseId}`);

        return {
          submission_id: item.submissionId || item.id,
          price: finalPrice,
          license_id: item.licenseId || 'standard'
        };
      });

      const { data, error } = await supabase.functions.invoke('create-paypal-order', {
        body: {
          cart_items,
          order_type: 'marketplace',
          success_url: successUrl || `${window.location.origin}/payment-success`,
          cancel_url: cancelUrl || `${window.location.origin}/cart`
        }
      });

      if (error) {
        console.error('Error creating PayPal order:', error);
        toast.error('Erreur lors de la création du paiement');
        return null;
      }

      console.log('PayPal order created:', data);

      if (data.approval_url) {
        // Clear cart before redirect
        clearCart();
        toast.success('Redirection vers PayPal...');
        
        // Redirect to PayPal Checkout
        window.location.href = data.approval_url;
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

  const createCreditPackPayment = async (
    pack: CreditPackPurchase,
    successUrl?: string,
    cancelUrl?: string
  ) => {
    if (!user) {
      toast.error('Vous devez être connecté pour acheter des crédits');
      return null;
    }

    try {
      setLoading(true);
      console.log('Creating PayPal credit pack payment:', pack);

      const { data, error } = await supabase.functions.invoke('create-paypal-order', {
        body: {
          order_type: 'credits',
          pack: pack.packId,
          credits: pack.credits,
          amount: pack.price,
          success_url: successUrl || `${window.location.origin}/payment-success?type=credits`,
          cancel_url: cancelUrl || `${window.location.origin}/packages-pricing`
        }
      });

      if (error) {
        console.error('Error creating PayPal credit order:', error);
        toast.error('Erreur lors de la création du paiement');
        return null;
      }

      console.log('PayPal credit order created:', data);

      if (data.approval_url) {
        toast.success('Redirection vers PayPal...');
        window.location.href = data.approval_url;
      }

      return data;

    } catch (error) {
      console.error('Error in createCreditPackPayment:', error);
      toast.error('Erreur lors du paiement');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const capturePayment = async (orderId: string) => {
    try {
      setLoading(true);
      console.log('Capturing PayPal order:', orderId);

      const { data, error } = await supabase.functions.invoke('capture-paypal-order', {
        body: { order_id: orderId }
      });

      if (error) {
        console.error('Error capturing PayPal order:', error);
        toast.error('Erreur lors de la finalisation du paiement');
        return null;
      }

      console.log('PayPal order captured:', data);
      return data;

    } catch (error) {
      console.error('Error in capturePayment:', error);
      toast.error('Erreur lors de la finalisation du paiement');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const validateCart = () => {
    if (!user) {
      return { valid: false, error: 'You must be logged in' };
    }

    if (cartItems.length === 0) {
      return { valid: false, error: 'Your cart is empty' };
    }

    // Check for items with problematic prices
    const invalidItems = cartItems.filter(item => 
      (item.price !== null && item.price !== undefined && typeof item.price !== 'number') ||
      (typeof item.price === 'number' && item.price < 0)
    );

    if (invalidItems.length > 0) {
      console.error('Invalid items found:', invalidItems);
      return { valid: false, error: 'Some items have invalid prices' };
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

  const getCommissionAmount = (commissionRate: number = 0.20) => {
    return getTotalAmount() * commissionRate;
  };

  const getSellerAmount = (commissionRate: number = 0.20) => {
    return getTotalAmount() - getCommissionAmount(commissionRate);
  };

  return {
    loading,
    createPayment,
    createCreditPackPayment,
    capturePayment,
    processFreeOrder,
    validateCart,
    getTotalAmount,
    getActualTotal,
    isCartFree,
    getCommissionAmount,
    getSellerAmount
  };
};
