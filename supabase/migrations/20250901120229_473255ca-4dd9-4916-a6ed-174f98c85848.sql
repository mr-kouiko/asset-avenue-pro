-- Final cleanup of SECURITY DEFINER functions
-- Only convert functions that don't actually need elevated privileges

-- Check if get_creator_profiles_public still exists and convert it
DROP FUNCTION IF EXISTS public.get_creator_profiles_public(uuid[]);

-- Recreate it as SECURITY INVOKER since it only accesses public creator profiles
CREATE OR REPLACE FUNCTION public.get_creator_profiles_public(creator_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, store_name text, avatar_url text, creator_hash text)
LANGUAGE sql
STABLE SECURITY INVOKER  -- Changed from DEFINER to INVOKER
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

-- Note: The remaining SECURITY DEFINER functions are legitimate:
-- - admin_* functions: Need elevated privileges for admin operations
-- - log_* functions: Need elevated privileges for audit logging  
-- - has_role, user_can_access_profile: Need elevated privileges for security checks
-- - handle_new_user, update_updated_at_column: Need elevated privileges for system operations

-- These functions have proper authentication checks and are necessary for the application security model