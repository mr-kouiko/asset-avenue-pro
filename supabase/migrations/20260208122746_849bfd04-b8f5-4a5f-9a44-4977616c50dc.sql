-- First drop the existing function that has a different signature
DROP FUNCTION IF EXISTS public.get_creator_public_info(uuid[]);

-- Create the SECURITY DEFINER function that safely exposes creator public info
CREATE OR REPLACE FUNCTION public.get_creator_public_info(creator_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  store_name text,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF creator_ids IS NULL THEN
    RETURN QUERY
    SELECT DISTINCT
      p.user_id,
      p.store_name,
      p.display_name,
      p.avatar_url
    FROM profiles p
    WHERE EXISTS (
      SELECT 1 FROM content_submissions cs
      WHERE cs.creator_id = p.user_id
      AND cs.status = 'approved'
    );
  ELSE
    RETURN QUERY
    SELECT DISTINCT
      p.user_id,
      p.store_name,
      p.display_name,
      p.avatar_url
    FROM profiles p
    WHERE p.user_id = ANY(creator_ids)
    AND EXISTS (
      SELECT 1 FROM content_submissions cs
      WHERE cs.creator_id = p.user_id
      AND cs.status = 'approved'
    );
  END IF;
END;
$$;

-- Grant execute permissions to both anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_creator_public_info(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_creator_public_info(uuid[]) TO authenticated;

-- Drop and recreate get_creator_profiles_public with SECURITY DEFINER
DROP FUNCTION IF EXISTS public.get_creator_profiles_public();

CREATE OR REPLACE FUNCTION public.get_creator_profiles_public()
RETURNS TABLE (
  user_id uuid,
  store_name text,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.user_id,
    p.store_name,
    p.display_name,
    p.avatar_url
  FROM profiles p
  WHERE EXISTS (
    SELECT 1 FROM content_submissions cs
    WHERE cs.creator_id = p.user_id
    AND cs.status = 'approved'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_creator_profiles_public() TO anon;
GRANT EXECUTE ON FUNCTION public.get_creator_profiles_public() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.get_creator_public_info(uuid[]) IS 'Returns public creator information for creators with approved content. Safe for anonymous access.';
COMMENT ON FUNCTION public.get_creator_profiles_public() IS 'Returns all public creator profiles with approved content. Safe for anonymous access.';