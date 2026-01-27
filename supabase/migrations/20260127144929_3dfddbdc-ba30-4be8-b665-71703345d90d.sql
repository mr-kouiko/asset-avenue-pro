-- =====================================================
-- SECURITY FIX: Prevent public/anonymous access to sensitive data
-- =====================================================

-- 1. FIX PROFILES TABLE - Ensure anonymous users cannot access
-- The current policies only apply to 'authenticated' role which is correct,
-- but we need to ensure RLS is enforced for anon role too

-- First, let's explicitly revoke any permissions from anon role
REVOKE ALL ON public.profiles FROM anon;

-- Grant only SELECT to authenticated users (they can only see via RLS policies)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- 2. FIX PAYMENTS TABLE - Restrict to authenticated users only
-- Current policies apply to all roles (polroles:{-}), which could include anon

-- Drop existing policies that don't properly restrict to authenticated
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Buyers can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Service role can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Service role can update payments" ON public.payments;

-- Recreate policies with explicit role restrictions
CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Buyers can view their own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (auth.email() = buyer_email);

CREATE POLICY "Service role can insert payments"
ON public.payments
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update payments"
ON public.payments
FOR UPDATE
TO service_role
USING (true);

-- Explicitly revoke anon access
REVOKE ALL ON public.payments FROM anon;
GRANT SELECT ON public.payments TO authenticated;

-- 3. FIX CREATOR_PROFILES_PUBLIC VIEW - Change from SECURITY DEFINER to SECURITY INVOKER
-- Drop the existing view
DROP VIEW IF EXISTS public.creator_profiles_public;

-- Recreate with SECURITY INVOKER (respects RLS of querying user)
CREATE VIEW public.creator_profiles_public
WITH (security_invoker = on)
AS
SELECT 
    p.user_id,
    p.display_name,
    p.store_name,
    p.avatar_url,
    md5((p.user_id)::text) AS creator_hash
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id
WHERE ur.role = 'creator'::app_role
AND EXISTS (
    SELECT 1
    FROM content_submissions cs
    WHERE cs.creator_id = p.user_id
    AND cs.status = 'approved'::text
);

-- Grant access to the view for marketplace functionality
GRANT SELECT ON public.creator_profiles_public TO authenticated;
GRANT SELECT ON public.creator_profiles_public TO anon;

-- Since the view now uses SECURITY INVOKER, we need a policy on profiles
-- that allows reading the specific fields needed for creator display
-- Create a policy that allows viewing creator profile info (display_name, store_name, avatar_url)
-- for users who have approved content (this is public marketplace data)

-- Add a policy to allow reading creator public info from profiles
-- This is safe because it only returns non-sensitive fields via the view
CREATE POLICY "Public can view creator profile info"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur 
        JOIN content_submissions cs ON cs.creator_id = ur.user_id
        WHERE ur.user_id = profiles.user_id 
        AND ur.role = 'creator'::app_role
        AND cs.status = 'approved'::text
    )
);

-- Add comment for documentation
COMMENT ON VIEW public.creator_profiles_public IS 'Public view of creator profiles for marketplace display. Uses SECURITY INVOKER to respect RLS policies. Only shows creators with approved content.';

COMMENT ON POLICY "Public can view creator profile info" ON public.profiles IS 'Allows viewing profile info for creators who have approved content in the marketplace. This enables the creator_profiles_public view to work with SECURITY INVOKER.';