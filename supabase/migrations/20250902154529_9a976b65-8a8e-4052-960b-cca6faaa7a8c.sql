-- Fix profiles table permissions for marketplace access
-- Remove the conflicting policy that denies anonymous access
DROP POLICY IF EXISTS "profiles_deny_anonymous" ON public.profiles;

-- Ensure the policy for public access to creator profiles works correctly
DROP POLICY IF EXISTS "Public can view creator profiles for approved content" ON public.profiles;

CREATE POLICY "Public can view creator profiles for approved content" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM content_submissions cs
    WHERE cs.creator_id = profiles.user_id 
    AND cs.status = 'approved'
  )
);