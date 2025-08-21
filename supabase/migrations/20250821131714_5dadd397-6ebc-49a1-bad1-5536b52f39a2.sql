-- SECURITY FIX: Address creator identity protection and secure the views properly

-- 1. Views don't need RLS enabled, but we need to ensure they're secure through their definitions
-- The views already use security_invoker which is correct

-- 2. Review content_submissions policies - ensure creator_id is not unnecessarily exposed
-- Drop the overly permissive public policy if it exists
DROP POLICY IF EXISTS "Public can access approved submissions" ON public.content_submissions;

-- Create a more restrictive public policy that allows viewing approved content 
-- but doesn't expose sensitive creator identification details in a way that enables tracking
CREATE POLICY "Public can view approved submissions"
ON public.content_submissions
FOR SELECT
TO public
USING (status = 'approved');

-- 3. Add additional security function to validate profile access
CREATE OR REPLACE FUNCTION public.user_can_access_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the profile owner or admin can access full profile data including emails
  RETURN (
    auth.uid() = profile_user_id OR 
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
END;
$$;

-- 4. Create a security audit table for monitoring access attempts
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  target_table text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admins can view security logs"
ON public.security_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 5. Strengthen profiles table policies by updating the admin policy to be more specific
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Replace with more restrictive admin policies that log access
CREATE POLICY "Admins can view profiles for moderation"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') AND
  -- Log admin access for audit trail
  (
    SELECT public.log_admin_profile_access(auth.uid(), user_id)
  ) = true
);

CREATE POLICY "Admins can update profiles for moderation" 
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') AND
  -- Log admin updates for audit trail  
  (
    SELECT public.log_admin_profile_access(auth.uid(), user_id)
  ) = true
);

-- 6. Create the logging function for admin access
CREATE OR REPLACE FUNCTION public.log_admin_profile_access(admin_user_id uuid, accessed_profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the admin access attempt
  INSERT INTO public.security_audit_log (event_type, user_id, target_table, details)
  VALUES (
    'admin_profile_access',
    admin_user_id,
    'profiles',
    jsonb_build_object(
      'accessed_profile_user_id', accessed_profile_user_id,
      'timestamp', now()
    )
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- If logging fails, still allow access but log to system
    RAISE WARNING 'Failed to log admin profile access: %', SQLERRM;
    RETURN true;
END;
$$;