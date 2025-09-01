-- Fix security definer view issue by replacing SECURITY DEFINER function with proper RLS approach

-- First, drop the problematic SECURITY DEFINER function
DROP FUNCTION IF EXISTS public.get_public_creator_profiles(uuid[]);

-- Create a view that shows public creator profiles (this will respect RLS policies)
CREATE OR REPLACE VIEW public.creator_profiles_public AS
SELECT 
  p.user_id,
  p.display_name,
  p.store_name,
  p.avatar_url,
  encode(extensions.digest(p.user_id::text, 'sha256'), 'hex') as creator_hash
FROM profiles p
INNER JOIN user_roles ur ON ur.user_id = p.user_id
WHERE ur.role = 'creator'::app_role
AND EXISTS (
  SELECT 1 
  FROM content_submissions cs 
  WHERE cs.creator_id = p.user_id 
  AND cs.status = 'approved'
);

-- Enable RLS on the new view (it will inherit from underlying tables)
-- No specific policies needed as it will use the policies from profiles table

-- Create a SECURITY INVOKER function (not DEFINER) to get specific creator profiles
CREATE OR REPLACE FUNCTION public.get_creator_profiles_public(creator_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, store_name text, avatar_url text, creator_hash text)
LANGUAGE sql
STABLE SECURITY INVOKER -- Changed from DEFINER to INVOKER
SET search_path = 'public'
AS $function$
  SELECT 
    cpp.user_id,
    cpp.display_name,
    cpp.store_name,
    cpp.avatar_url,
    cpp.creator_hash
  FROM creator_profiles_public cpp
  WHERE cpp.user_id = ANY(creator_ids);
$function$;

-- Add RLS policy to allow authenticated users to see creator profiles
-- (This may already exist, but we ensure it's there)
DO $$
BEGIN
  -- Check if policy exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Allow authenticated users to view creator profiles'
  ) THEN
    CREATE POLICY "Allow authenticated users to view creator profiles" 
    ON public.profiles 
    FOR SELECT 
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = profiles.user_id 
        AND ur.role = 'creator'::app_role
      )
      AND EXISTS (
        SELECT 1 FROM content_submissions cs 
        WHERE cs.creator_id = profiles.user_id 
        AND cs.status = 'approved'
      )
    );
  END IF;
END $$;