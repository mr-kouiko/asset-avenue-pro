-- Fix critical security vulnerability: Remove public access to platform_settings table
-- This prevents hackers from stealing Stripe API keys and webhook secrets

-- Drop the overly permissive policy that allows public read access
DROP POLICY IF EXISTS "Edge functions read access" ON public.platform_settings;

-- Create a secure policy that only allows service role access for edge functions
-- Edge functions should use the service role key to access sensitive platform settings
CREATE POLICY "Service role only access for edge functions" 
ON public.platform_settings 
FOR SELECT 
USING (current_setting('role') = 'service_role');

-- Ensure admin access is still maintained (policy should already exist)
-- This allows admins to configure platform settings through the UI
CREATE POLICY "Admins can manage platform settings" 
ON public.platform_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));