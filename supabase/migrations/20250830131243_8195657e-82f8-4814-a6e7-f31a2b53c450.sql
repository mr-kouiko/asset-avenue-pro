-- Additional security hardening for profiles table
-- Ensure RLS is enforced even for service role operations when possible

-- Force RLS for profiles table even for superusers (except when explicitly bypassed)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Create an explicit policy to DENY all anonymous access
CREATE POLICY "profiles_deny_anonymous" ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Verify no public grants exist on profiles table
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM public;

-- Grant only necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Ensure the profiles table is properly secured
-- Log this additional security hardening
INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    target_table,
    details
) VALUES (
    'security_hardening_profiles_force_rls',
    auth.uid(),
    'profiles',
    jsonb_build_object(
        'action', 'force_rls_and_revoke_public',
        'timestamp', now(),
        'security_level', 'MAXIMUM'
    )
);