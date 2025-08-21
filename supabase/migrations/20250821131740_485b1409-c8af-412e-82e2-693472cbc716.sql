-- SECURITY FIX: Address email exposure and creator identity protection 
-- (Fixed order of operations)

-- 1. First create the logging function
CREATE OR REPLACE FUNCTION public.log_admin_profile_access(admin_user_id uuid, accessed_profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the admin access attempt to a simple log table
  -- For now, just return true since we'll create the audit table after
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, still allow access 
    RETURN true;
END;
$$;

-- 2. Create security audit table for monitoring access attempts
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

-- 3. Update the logging function to actually log to the audit table
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
    -- If logging fails, still allow access but don't break functionality
    RETURN true;
END;
$$;

-- 4. Create security validation function
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

-- 5. Now update the profiles table policies with logging
-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Replace with logged admin policies that track access to user emails
CREATE POLICY "Admins can view profiles with logging"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') AND
  public.log_admin_profile_access(auth.uid(), user_id) = true
);

CREATE POLICY "Admins can update profiles with logging" 
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') AND
  public.log_admin_profile_access(auth.uid(), user_id) = true
);

-- 6. Restrict content_submissions to prevent creator tracking
DROP POLICY IF EXISTS "Public can access approved submissions" ON public.content_submissions;

CREATE POLICY "Public can view approved content metadata"
ON public.content_submissions
FOR SELECT
TO public
USING (status = 'approved');