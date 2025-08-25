-- SECURITY FIX: Remove sensitive Stripe credentials from database storage
-- This prevents plain text storage of API keys and moves them to secure Supabase secrets

-- Remove sensitive columns that store API keys in plain text
ALTER TABLE public.platform_settings 
DROP COLUMN IF EXISTS stripe_secret_key,
DROP COLUMN IF EXISTS stripe_publishable_key,
DROP COLUMN IF EXISTS stripe_webhook_secret;

-- Add comment explaining the security change
COMMENT ON TABLE public.platform_settings IS 'Platform configuration settings. Sensitive API keys are stored securely in Supabase secrets, not in this table.';