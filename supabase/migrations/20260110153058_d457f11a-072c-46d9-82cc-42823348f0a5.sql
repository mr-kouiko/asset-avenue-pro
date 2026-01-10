-- Add PayPal email field to profiles table for seller payouts
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS paypal_email text;

-- Add a comment for documentation
COMMENT ON COLUMN public.profiles.paypal_email IS 'PayPal email address for receiving payouts';

-- Create index for potential lookups
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_email ON public.profiles(paypal_email) WHERE paypal_email IS NOT NULL;