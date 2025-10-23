-- Fix: make product detail RPC public-safe by switching to creator_profiles_public
-- Keep the exact same return signature to avoid breaking clients

create or replace function public.get_product_detail(product_id uuid)
returns table (
  id uuid,
  title text,
  description text,
  price numeric,
  tags text[],
  created_at timestamptz,
  category_id uuid,
  creator_display_name text,
  creator_store_name text,
  category_name text
)
language sql
stable
set search_path = public
as $$
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
$$;

-- Ensure anonymous and authenticated roles can execute
grant execute on function public.get_product_detail(uuid) to anon, authenticated;
