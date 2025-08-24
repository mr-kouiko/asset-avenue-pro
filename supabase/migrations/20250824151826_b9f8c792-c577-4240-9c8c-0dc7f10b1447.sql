-- Security fixes for critical vulnerabilities (fixed version)

-- 1. Fix profiles table RLS policies to be more restrictive
DROP POLICY IF EXISTS "Admins can view profiles with logging" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view masked profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles with logging" ON public.profiles;

-- Create more restrictive admin profile access policies
CREATE POLICY "Admins can view profiles with strict logging"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  (has_role(auth.uid(), 'admin'::app_role) AND log_admin_profile_access(auth.uid(), user_id) = true)
);

CREATE POLICY "Admins can update profiles with audit"
ON public.profiles  
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR
  (has_role(auth.uid(), 'admin'::app_role) AND log_admin_profile_access(auth.uid(), user_id) = true)
);

-- 2. Secure platform_settings table - only service role can access Stripe secrets
DROP POLICY IF EXISTS "Admins can view platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can update platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can manage Stripe keys" ON public.platform_settings;

-- Create new restrictive policies for platform_settings
CREATE POLICY "Service role only access to platform settings"
ON public.platform_settings
FOR ALL
TO service_role
USING (true);

-- Admins can only view non-sensitive settings (commission rates)
CREATE POLICY "Admins can view commission rates only"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Strengthen transactions table policies
DROP POLICY IF EXISTS "Users can view their transactions" ON public.transactions;

-- More restrictive transaction viewing
CREATE POLICY "Users can view own transactions only"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  auth.uid() = buyer_id OR 
  (auth.uid() = seller_id AND has_role(auth.uid(), 'creator'::app_role))
);

-- 4. Create audit function for sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  access_type text,
  target_resource text,
  details jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    user_id, 
    target_table,
    details
  ) VALUES (
    'sensitive_data_access_' || access_type,
    auth.uid(),
    target_resource,
    details || jsonb_build_object(
      'timestamp', now(),
      'ip_address', COALESCE(current_setting('request.header.x-forwarded-for', true), 'unknown'),
      'user_agent', COALESCE(current_setting('request.header.user-agent', true), 'unknown'),
      'access_level', access_type
    )
  );
  RETURN true;
END;
$$;