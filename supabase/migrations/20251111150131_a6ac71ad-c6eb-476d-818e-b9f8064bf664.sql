-- Update get_product_detail to run with SECURITY DEFINER so approved products are readable under RLS
CREATE OR REPLACE FUNCTION public.get_product_detail(product_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  price numeric,
  tags text[],
  created_at timestamp with time zone,
  category_id uuid,
  creator_display_name text,
  creator_store_name text,
  category_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT 
        cs.id,
        cs.title,
        cs.description,
        cs.price,
        cs.tags,
        cs.created_at,
        cs.category_id,
        COALESCE(cpp.display_name, 'Créateur anonyme') as creator_display_name,
        COALESCE(cpp.store_name, '') as creator_store_name,
        COALESCE(c.name, '') as category_name
    FROM content_submissions cs
    LEFT JOIN creator_profiles_public cpp ON cpp.user_id = cs.creator_id  
    LEFT JOIN categories c ON c.id = cs.category_id
    WHERE cs.id = product_id 
    AND cs.status = 'approved';
$function$;