-- Create Stripe Connect accounts table for sellers
CREATE TABLE public.stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('standard', 'express')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  requirements JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table for marketplace payments
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_account_id TEXT NOT NULL,
  submission_id UUID NOT NULL REFERENCES content_submissions(id),
  amount_total INTEGER NOT NULL, -- Total amount in cents
  amount_seller INTEGER NOT NULL, -- Amount to seller in cents (after commission)
  amount_commission INTEGER NOT NULL, -- Platform commission in cents
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  payment_method_types TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payouts table for tracking seller payouts
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payout_id TEXT UNIQUE,
  stripe_account_id TEXT NOT NULL,
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'canceled')),
  arrival_date TIMESTAMP WITH TIME ZONE,
  method TEXT, -- bank_account, card, instant
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create platform settings table for commission rates
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.15, -- 15% default commission
  stripe_application_fee_rate DECIMAL(5,4) NOT NULL DEFAULT 0.029, -- Stripe's fee
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default platform settings
INSERT INTO public.platform_settings (commission_rate, stripe_application_fee_rate) 
VALUES (0.15, 0.029);

-- Enable RLS on all tables
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_accounts
CREATE POLICY "Users can view their own Stripe account" 
ON public.stripe_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own Stripe account" 
ON public.stripe_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage Stripe accounts" 
ON public.stripe_accounts 
FOR ALL 
USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can view all Stripe accounts" 
ON public.stripe_accounts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for transactions
CREATE POLICY "Users can view their transactions" 
ON public.transactions 
FOR SELECT 
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Admins can view all transactions" 
ON public.transactions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage transactions" 
ON public.transactions 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- RLS Policies for payouts
CREATE POLICY "Sellers can view their payouts" 
ON public.payouts 
FOR SELECT 
USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all payouts" 
ON public.payouts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage payouts" 
ON public.payouts 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- RLS Policies for platform_settings
CREATE POLICY "Admins can view platform settings" 
ON public.platform_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update platform settings" 
ON public.platform_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_stripe_accounts_user_id ON public.stripe_accounts(user_id);
CREATE INDEX idx_stripe_accounts_stripe_account_id ON public.stripe_accounts(stripe_account_id);
CREATE INDEX idx_transactions_buyer_id ON public.transactions(buyer_id);
CREATE INDEX idx_transactions_seller_id ON public.transactions(seller_id);
CREATE INDEX idx_transactions_stripe_account_id ON public.transactions(stripe_account_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_payouts_seller_id ON public.payouts(seller_id);
CREATE INDEX idx_payouts_stripe_account_id ON public.payouts(stripe_account_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);

-- Create trigger to update updated_at column
CREATE TRIGGER update_stripe_accounts_updated_at
BEFORE UPDATE ON public.stripe_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at
BEFORE UPDATE ON public.payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();