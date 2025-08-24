import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface StripeAccount {
  id: string;
  user_id: string;
  stripe_account_id: string;
  account_type: 'standard' | 'express';
  onboarding_completed: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements?: any;
  created_at: string;
  updated_at: string;
}

interface AccountStatus {
  has_account: boolean;
  account_id?: string;
  onboarding_completed: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements?: any;
  country?: string;
  business_type?: string;
  stats?: {
    total_earnings: number;
    total_transactions: number;
    recent_payouts: any[];
  };
}

export const useStripeConnect = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<StripeAccount | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);

  useEffect(() => {
    if (user) {
      fetchAccountStatus();
    }
  }, [user]);

  const fetchAccountStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('Fetching Stripe account status...');

      const { data, error } = await supabase.functions.invoke('get-account-status', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      if (error) {
        console.error('Error fetching account status:', error);
        toast.error('Erreur lors de la récupération du statut du compte');
        return;
      }

      console.log('Account status:', data);
      setAccountStatus(data);

      // Also fetch local account data if exists
      if (data.has_account) {
        const { data: localAccount } = await supabase
          .from('stripe_accounts')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (localAccount) {
          setAccount(localAccount as StripeAccount);
        }
      }

    } catch (error) {
      console.error('Error in fetchAccountStatus:', error);
      toast.error('Erreur lors de la récupération du statut');
    } finally {
      setLoading(false);
    }
  };

  const createConnectAccount = async (
    type: 'standard' | 'express' = 'express',
    options?: {
      country?: string;
      email?: string;
      refresh_url?: string;
      return_url?: string;
    }
  ) => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return null;
    }

    try {
      setLoading(true);
      console.log('Creating Stripe Connect account...');

      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: {
          type,
          country: options?.country || 'FR',
          email: options?.email || user.email,
          refresh_url: options?.refresh_url || `${window.location.origin}/dashboard`,
          return_url: options?.return_url || `${window.location.origin}/dashboard`
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      if (error) {
        console.error('Error creating Connect account:', error);
        toast.error('Erreur lors de la création du compte Stripe');
        return null;
      }

      console.log('Connect account created:', data);

      if (data.onboarding_url) {
        // Open Stripe onboarding in new tab
        window.open(data.onboarding_url, '_blank');
        toast.success('Redirection vers Stripe pour finaliser votre compte...');
      } else if (data.onboarding_completed) {
        toast.success('Compte Stripe déjà configuré');
        await fetchAccountStatus(); // Refresh status
      }

      return data;

    } catch (error) {
      console.error('Error in createConnectAccount:', error);
      toast.error('Erreur lors de la création du compte');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const refreshAccountStatus = async () => {
    await fetchAccountStatus();
  };

  const isAccountReady = () => {
    return accountStatus?.onboarding_completed && 
           accountStatus?.charges_enabled && 
           accountStatus?.payouts_enabled;
  };

  const canReceivePayments = () => {
    return accountStatus?.charges_enabled === true;
  };

  const canReceivePayouts = () => {
    return accountStatus?.payouts_enabled === true;
  };

  return {
    loading,
    account,
    accountStatus,
    createConnectAccount,
    refreshAccountStatus,
    isAccountReady,
    canReceivePayments,
    canReceivePayouts,
    fetchAccountStatus
  };
};