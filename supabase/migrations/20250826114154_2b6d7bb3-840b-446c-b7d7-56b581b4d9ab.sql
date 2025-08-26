-- Fix security issue: Add RLS policies to admin_profiles_safe table
-- This table contains administrative profile data and should only be accessible to admin users

-- Enable Row Level Security on admin_profiles_safe table
ALTER TABLE public.admin_profiles_safe ENABLE ROW LEVEL SECURITY;

-- Create policy to allow only admin users to view administrative profile data
CREATE POLICY "Admin users can view safe profile data"
ON public.admin_profiles_safe
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add comment explaining the security policy
COMMENT ON TABLE public.admin_profiles_safe IS 'Administrative view of user profiles with masked emails. Access restricted to admin users only via RLS policies.';

-- Log this security fix in the audit system
INSERT INTO public.security_audit_log (
  event_type,
  user_id,
  target_table,
  details
) VALUES (
  'security_policy_added',
  NULL, -- System-level change
  'admin_profiles_safe',
  jsonb_build_object(
    'action', 'rls_policy_creation',
    'policy_name', 'Admin users can view safe profile data',
    'security_level', 'CRITICAL',
    'description', 'Added RLS policy to restrict admin profile data access to admin users only',
    'timestamp', now()
  )
);