-- CRITICAL SECURITY FIX: Ensure RLS is properly enforced on profiles table
-- This addresses the email harvesting vulnerability

-- First, verify RLS is enabled (it should be already)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them more securely
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- Create secure RLS policies that ONLY allow users to access their own profiles
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_delete_own" ON public.profiles
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Create separate admin access policy for secure administrative functions
CREATE POLICY "profiles_admin_access" ON public.profiles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure no anonymous access to profiles table whatsoever
-- (This is implicitly blocked by only having 'authenticated' policies, but let's be explicit)

-- Log this security fix in our audit trail
INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    target_table,
    details
) VALUES (
    'security_fix_profiles_rls',
    auth.uid(),
    'profiles',
    jsonb_build_object(
        'issue', 'email_harvesting_vulnerability',
        'fix', 'enhanced_rls_policies',
        'timestamp', now(),
        'severity', 'CRITICAL'
    )
);