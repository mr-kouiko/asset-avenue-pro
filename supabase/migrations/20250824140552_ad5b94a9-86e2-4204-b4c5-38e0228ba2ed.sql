-- Add Stripe keys to platform settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_webhook_secret TEXT;

-- Insert default row if none exists
INSERT INTO public.platform_settings (id, commission_rate, stripe_application_fee_rate)
SELECT gen_random_uuid(), 0.15, 0.029
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- Create policy for updating Stripe keys
CREATE POLICY "Admins can manage Stripe keys" 
ON public.platform_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));