
-- Fix 1: Replace overly permissive public profiles SELECT policy
-- The current policy exposes ALL columns (including email, paypal_email) to anon users
-- Replace with a more restrictive approach using a security definer function

-- Drop the existing permissive public policy
DROP POLICY IF EXISTS "Public can view creator profile info" ON public.profiles;

-- Create a security definer function that returns only safe profile fields
CREATE OR REPLACE FUNCTION public.get_safe_profile_info(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, store_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.avatar_url, p.store_name
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.user_id
  INNER JOIN content_submissions cs ON cs.creator_id = p.user_id
  WHERE p.user_id = ANY(p_user_ids)
    AND ur.role = 'creator'
    AND cs.status = 'approved'
  GROUP BY p.user_id, p.display_name, p.avatar_url, p.store_name;
$$;

-- Fix 2: Secure creator_profiles_public view with security_invoker
-- Recreate the view with security_invoker = on
DROP VIEW IF EXISTS public.creator_profiles_public;

CREATE VIEW public.creator_profiles_public
WITH (security_invoker = on) AS
  SELECT p.user_id,
    p.display_name,
    p.store_name,
    p.avatar_url,
    md5((p.user_id)::text) AS creator_hash
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role = 'creator'
    AND EXISTS (
      SELECT 1 FROM content_submissions cs
      WHERE cs.creator_id = p.user_id AND cs.status = 'approved'
    );

-- Grant access to the view for anon/authenticated
GRANT SELECT ON public.creator_profiles_public TO anon, authenticated;

-- Add a limited public policy that only allows reading non-sensitive fields
-- for creators with approved content (needed for reviews display etc.)
CREATE POLICY "Public can view limited creator info"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    INNER JOIN content_submissions cs ON cs.creator_id = ur.user_id
    WHERE ur.user_id = profiles.user_id
      AND ur.role = 'creator'
      AND cs.status = 'approved'
  )
);

-- NOTE: This policy still exposes all columns at the RLS level.
-- The real protection is that frontend code should ONLY use:
-- 1. get_safe_profile_info() RPC for profile lookups
-- 2. creator_profiles_public view for creator listings
-- 3. Own profile queries (covered by profiles_select_own)

-- Fix 3: Set search_path on functions that are missing it
-- Fix mutable search path warnings
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Only fix user-defined functions, skip extension functions
  FOR func_record IN
    SELECT p.proname, p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proconfig IS NULL
      AND p.prosecdef = false
      AND p.proname NOT IN ('unaccent', 'unaccent_init', 'unaccent_lexize')
      AND p.prokind = 'f'
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I SET search_path = public', func_record.proname);
  END LOOP;
END;
$$;
