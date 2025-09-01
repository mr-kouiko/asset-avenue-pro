-- Fix remaining SECURITY DEFINER functions that don't need elevated privileges

-- 1. Convert get_creator_public_info to SECURITY INVOKER and use the new view
DROP FUNCTION IF EXISTS public.get_creator_public_info(uuid[]);

CREATE OR REPLACE FUNCTION public.get_creator_public_info(creator_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, store_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY INVOKER  -- Changed from DEFINER to INVOKER
SET search_path = 'public'
AS $function$
    SELECT 
        cpp.user_id,
        cpp.display_name,
        cpp.store_name,
        cpp.avatar_url
    FROM creator_profiles_public cpp
    WHERE cpp.user_id = ANY(creator_ids);
$function$;

-- 2. Convert get_product_detail to SECURITY INVOKER 
-- This function accesses only approved public content, so it doesn't need SECURITY DEFINER
DROP FUNCTION IF EXISTS public.get_product_detail(uuid);

CREATE OR REPLACE FUNCTION public.get_product_detail(product_id uuid)
RETURNS TABLE(id uuid, title text, description text, price numeric, tags text[], created_at timestamp with time zone, category_id uuid, creator_display_name text, creator_store_name text, category_name text)
LANGUAGE sql
STABLE SECURITY INVOKER  -- Changed from DEFINER to INVOKER  
SET search_path = 'public'
AS $function$
    SELECT 
        cs.id,
        cs.title,
        cs.description,
        cs.price,
        cs.tags,
        cs.created_at,
        cs.category_id,
        COALESCE(p.display_name, 'Créateur anonyme') as creator_display_name,
        COALESCE(p.store_name, '') as creator_store_name,
        COALESCE(c.name, '') as category_name
    FROM content_submissions cs
    LEFT JOIN profiles p ON p.user_id = cs.creator_id  
    LEFT JOIN categories c ON c.id = cs.category_id
    WHERE cs.id = product_id 
    AND cs.status = 'approved';
$function$;