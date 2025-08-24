-- Fix platform_settings policies (corrected)

-- Drop all existing policies for platform_settings
DROP POLICY IF EXISTS "Service role only access to platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Service role read access for operations" ON public.platform_settings;
DROP POLICY IF EXISTS "Service role update for edge functions" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can view commission rates only" ON public.platform_settings;

-- Create minimal, secure policies for platform_settings
-- Service role can read for edge function operations only
CREATE POLICY "Edge functions read access"
ON public.platform_settings
FOR SELECT
TO service_role
USING (true);

-- Service role cannot modify settings (only read for operations)
-- Admins cannot directly access Stripe secrets through API
-- Settings can only be modified through admin panel with proper controls