-- Fix the get_marketplace_content function to properly access profiles
CREATE OR REPLACE FUNCTION public.get_marketplace_content()
 RETURNS TABLE(id uuid, title text, description text, price numeric, tags text[], created_at timestamp with time zone, category_id uuid, content_type text, creator_display_name text, creator_store_name text, creator_hash text, category_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
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
        CASE
            WHEN EXISTS (SELECT 1 FROM content_files cf 
                        WHERE cf.submission_id = cs.id 
                        AND cf.is_original = true 
                        AND cf.file_type LIKE 'video%') THEN 'video'::text
            WHEN EXISTS (SELECT 1 FROM content_files cf 
                        WHERE cf.submission_id = cs.id 
                        AND cf.is_original = true 
                        AND cf.file_type LIKE 'audio%') THEN 'audio'::text
            WHEN EXISTS (SELECT 1 FROM content_files cf 
                        WHERE cf.submission_id = cs.id 
                        AND cf.is_original = true 
                        AND (cf.file_type = 'document' OR cf.file_format = 'application/pdf')) THEN 'document'::text
            WHEN EXISTS (SELECT 1 FROM content_files cf 
                        WHERE cf.submission_id = cs.id 
                        AND cf.is_original = true 
                        AND (cf.file_type LIKE '%vector%' OR cf.file_format = 'svg')) THEN 'illustration'::text
            ELSE 'photo'::text
        END AS content_type,
        COALESCE(p.display_name, 'Créateur anonyme') AS creator_display_name,
        COALESCE(p.store_name, '') AS creator_store_name,
        md5(cs.creator_id::text) AS creator_hash,
        COALESCE(c.name, '') AS category_name
    FROM content_submissions cs
    LEFT JOIN profiles p ON p.user_id = cs.creator_id
    LEFT JOIN categories c ON c.id = cs.category_id
    WHERE cs.status = 'approved' 
    AND EXISTS (SELECT 1 FROM content_files cf WHERE cf.submission_id = cs.id);
$function$;