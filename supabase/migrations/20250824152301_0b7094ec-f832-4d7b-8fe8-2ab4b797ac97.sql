-- Final security fix for platform_settings table

-- Add admin-only access policy for platform_settings
-- This prevents public access to sensitive Stripe secrets
CREATE POLICY "Admins only access to platform settings"
ON public.platform_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));