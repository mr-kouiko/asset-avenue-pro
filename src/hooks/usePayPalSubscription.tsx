import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface SubscriptionPlan {
  plan_type: string;
  credits_per_month: number;
  current_period_end: string;
  next_billing_date: string;
  is_yearly: boolean;
  status: string;
}

interface SubscriptionState {
  subscribed: boolean;
  subscription: SubscriptionPlan | null;
  loading: boolean;
}

export const SUBSCRIPTION_PLANS = {
  infinity: { 
    credits: -1, 
    monthlyPrice: 89, 
    yearlyPrice: 79, 
    yearlyTotal: 948,
    name: 'Infinity Unlimited' 
  },
};

export function usePayPalSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    subscription: null,
    loading: true,
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({ subscribed: false, subscription: null, loading: false });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-paypal-subscription', {
        body: { action: 'check' },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      setState({
        subscribed: data.subscribed,
        subscription: data.subscription || null,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
    
    // Auto-refresh every minute
    const interval = setInterval(checkSubscription, 60000);
    
    // Refresh on window focus
    const handleFocus = () => checkSubscription();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkSubscription]);

  // Create subscription using Orders API (hybrid approach)
  const createSubscription = async (planType: string, isYearly: boolean = false) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to subscribe',
        variant: 'destructive',
      });
      return null;
    }

    if (planType !== 'infinity') {
      toast({
        title: 'Invalid plan',
        description: 'Only Infinity subscription is available',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setState(prev => ({ ...prev, loading: true }));

      // Use Orders API instead of Subscriptions API
      const { data, error } = await supabase.functions.invoke('create-paypal-order', {
        body: {
          order_type: 'infinity',
          is_yearly: isYearly,
          success_url: `${window.location.origin}/subscription-success`,
          cancel_url: `${window.location.origin}/packages-pricing?cancelled=true`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.approval_url) {
        // Redirect to PayPal for approval
        window.location.href = data.approval_url;
        return data;
      }

      throw new Error('No approval URL returned');
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: 'Subscription Error',
        description: error instanceof Error ? error.message : 'Failed to create subscription',
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, loading: false }));
      return null;
    }
  };

  // Activate subscription after PayPal payment (called from success page)
  const activateSubscription = async (orderId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      // Capture the PayPal order - this activates the internal subscription
      const { data, error } = await supabase.functions.invoke('capture-paypal-order', {
        body: { order_id: orderId },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error('Failed to capture payment');
      }

      // Refresh subscription state
      await checkSubscription();

      toast({
        title: 'Subscription Activated!',
        description: 'Welcome to VisuStock Infinity! Enjoy unlimited access.',
      });

      return data;
    } catch (error) {
      console.error('Error activating subscription:', error);
      toast({
        title: 'Activation Error',
        description: error instanceof Error ? error.message : 'Failed to activate subscription',
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, loading: false }));
      return null;
    }
  };

  const cancelSubscription = async (subscriptionId?: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const { data, error } = await supabase.functions.invoke('manage-paypal-subscription', {
        body: {
          action: 'cancel',
          subscription_id: subscriptionId,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Refresh subscription state
      await checkSubscription();

      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription has been cancelled. You will retain access until the end of your billing period.',
      });

      return data;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Cancellation Error',
        description: error instanceof Error ? error.message : 'Failed to cancel subscription',
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, loading: false }));
      return null;
    }
  };

  return {
    ...state,
    createSubscription,
    activateSubscription,
    cancelSubscription,
    refreshSubscription: checkSubscription,
  };
}
