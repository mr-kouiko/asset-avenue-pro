-- Fix critical security vulnerability: Remove insecure views and replace with secure functions

-- Drop the insecure views that expose user data publicly
DROP VIEW IF EXISTS public.admin_profiles_safe CASCADE;
DROP VIEW IF EXISTS public.public_creator_profiles CASCADE;

-- Create a secure function to get creator profiles (authenticated users only)
CREATE OR REPLACE FUNCTION public.get_public_creator_profiles(creator_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  display_name text,
  store_name text,
  avatar_url text,
  creator_hash text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only authenticated users can access this function
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN NULL::uuid
    ELSE p.user_id
  END as user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN NULL::text
    ELSE p.display_name
  END as display_name,
  CASE 
    WHEN auth.uid() IS NULL THEN NULL::text
    ELSE p.store_name
  END as store_name,
  CASE 
    WHEN auth.uid() IS NULL THEN NULL::text
    ELSE p.avatar_url
  END as avatar_url,
  CASE 
    WHEN auth.uid() IS NULL THEN NULL::text
    ELSE encode(extensions.digest(p.user_id::text, 'sha256'), 'hex')
  END as creator_hash
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.user_id
  WHERE p.user_id = ANY(creator_ids)
  AND ur.role = 'creator'::app_role
  AND EXISTS (
    SELECT 1 
    FROM content_submissions cs 
    WHERE cs.creator_id = p.user_id 
    AND cs.status = 'approved'
  )
  AND auth.uid() IS NOT NULL; -- Require authentication
$$;

-- Log the security fix
SELECT log_security_event(
  'critical_security_vulnerability_fixed',
  jsonb_build_object(
    'action', 'removed_insecure_views',
    'views_removed', ARRAY['admin_profiles_safe', 'public_creator_profiles'],
    'replacement', 'secure_functions_with_authentication',
    'severity', 'CRITICAL',
    'impact', 'prevented_unauthorized_access_to_user_data'
  )
);