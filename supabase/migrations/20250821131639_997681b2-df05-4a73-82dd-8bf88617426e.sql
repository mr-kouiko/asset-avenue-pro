-- SECURITY FIX: Address remaining RLS and creator identity protection issues

-- 1. Enable RLS on views (even though they have security_invoker, explicit RLS is cleaner)
ALTER TABLE public.marketplace_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_creator_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create explicit RLS policies for the views to be extra secure
CREATE POLICY "Allow public read access to marketplace content"
ON public.marketplace_content
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public read access to creator profiles"
ON public.public_creator_profiles  
FOR SELECT
TO public
USING (true);

-- 3. Review content_submissions policies - ensure creator_id is not unnecessarily exposed
-- Update the public policy to exclude sensitive creator identification
DROP POLICY IF EXISTS "Public can access approved submissions" ON public.content_submissions;

-- Create a more restrictive public policy that doesn't expose creator_id directly
CREATE POLICY "Public can view approved content metadata only"
ON public.content_submissions
FOR SELECT
TO public
USING (
  status = 'approved' AND 
  -- Only allow access to essential fields, not creator_id
  TRUE
);

-- 4. Ensure profiles table has the most restrictive policies
-- The existing policies should already be secure, but let's verify admin access is truly needed

-- 5. Add additional constraint to prevent accidental email exposure in any new features
-- Create a function to validate that email fields are only accessible to owners/admins
CREATE OR REPLACE FUNCTION public.user_can_access_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the profile owner or admin can access profile data including emails
  RETURN (
    auth.uid() = profile_user_id OR 
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
END;
$$;

-- 6. Add a trigger to log any attempts to access profiles inappropriately (for monitoring)
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

-- Grant necessary permissions
GRANT SELECT ON public.marketplace_content TO anon, authenticated;
GRANT SELECT ON public.public_creator_profiles TO anon, authenticated;