-- Fix security issue: Make admin_profiles_safe view more secure
-- Since RLS cannot be applied to views, we need to use security barriers and proper access controls

-- First, drop the existing view and recreate it with security barrier
DROP VIEW IF EXISTS public.admin_profiles_safe;

-- Create a secure view with SECURITY BARRIER to prevent query optimization attacks
CREATE VIEW public.admin_profiles_safe 
WITH (security_barrier = true) AS
SELECT 
    p.user_id,
    p.id,
    p.display_name,
    p.avatar_url,
    p.store_name,
    p.country,
    p.subscription_tier,
    p.subscribed,
    p.subscription_end,
    p.created_at,
    p.updated_at,
    -- Enhanced email masking for extra security
    CASE 
      WHEN has_role(auth.uid(), 'admin'::app_role) THEN
        (substring(p.email, 1, 2) || '***@' || split_part(p.email, '@', 2))
      ELSE
        'RESTRICTED'
    END AS email_masked,
    ur.role
FROM profiles p
LEFT JOIN user_roles ur ON (ur.user_id = p.user_id)
WHERE has_role(auth.uid(), 'admin'::app_role) = true;

-- Add comment explaining the security measures
COMMENT ON VIEW public.admin_profiles_safe IS 'SECURITY-HARDENED: Administrative view of user profiles with masked emails. Features security barrier to prevent optimization attacks. Access restricted to admin users via has_role() function.';

-- Create a security definer function for even more secure access
CREATE OR REPLACE FUNCTION public.get_admin_profiles_safe()
RETURNS TABLE(
    user_id uuid,
    id uuid,
    display_name text,
    avatar_url text,
    store_name text,
    country text,
    subscription_tier text,
    subscribed boolean,
    subscription_end timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email_masked text,
    role app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Double-check admin permission
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required to access profile data';
    END IF;
    
    -- Log the access for audit trail
    INSERT INTO public.security_audit_log (
        event_type,
        user_id,
        target_table,
        details
    ) VALUES (
        'admin_profiles_safe_access',
        auth.uid(),
        'admin_profiles_safe',
        jsonb_build_object(
            'access_method', 'secure_function',
            'timestamp', now(),
            'ip_address', coalesce(current_setting('request.header.x-forwarded-for', true), 'unknown')
        )
    );
    
    -- Return the safe profile data
    RETURN QUERY
    SELECT * FROM public.admin_profiles_safe;
END;
$$;

-- Grant execute permission only to authenticated users (will be further restricted by the function itself)
GRANT EXECUTE ON FUNCTION public.get_admin_profiles_safe() TO authenticated;

-- Revoke direct SELECT access to the view for extra security
-- Only allow access through the security definer function
REVOKE ALL ON public.admin_profiles_safe FROM PUBLIC;
REVOKE ALL ON public.admin_profiles_safe FROM authenticated;
REVOKE ALL ON public.admin_profiles_safe FROM anon;

-- Only allow the security definer function to access the view
GRANT SELECT ON public.admin_profiles_safe TO postgres;

-- Log this critical security fix
INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    target_table,
    details
) VALUES (
    'critical_security_fix_applied',
    NULL,
    'admin_profiles_safe',
    jsonb_build_object(
        'action', 'view_security_hardening',
        'measures_applied', array[
            'security_barrier_enabled',
            'access_via_security_definer_function',
            'direct_view_access_revoked',
            'enhanced_audit_logging'
        ],
        'security_level', 'CRITICAL',
        'description', 'Applied comprehensive security hardening to admin_profiles_safe view',
        'timestamp', now()
    )
);