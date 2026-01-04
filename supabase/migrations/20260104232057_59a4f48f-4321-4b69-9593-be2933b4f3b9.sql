-- Update default commission rate to 20%
ALTER TABLE public.platform_settings 
ALTER COLUMN commission_rate SET DEFAULT 0.20;

-- Update existing platform_settings record to 20% commission
UPDATE public.platform_settings 
SET commission_rate = 0.20, updated_at = now();