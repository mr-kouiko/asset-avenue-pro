-- Corriger la fonction pour définir un search_path sécurisé
CREATE OR REPLACE FUNCTION public.get_creator_public_info(creator_ids UUID[])
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    store_name TEXT,
    avatar_url TEXT
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT 
        p.user_id,
        p.display_name,
        p.store_name,
        p.avatar_url
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE p.user_id = ANY(creator_ids)
    AND ur.role = 'creator'
    AND EXISTS (
        SELECT 1 
        FROM public.content_submissions cs 
        WHERE cs.creator_id = p.user_id 
        AND cs.status = 'approved'
    );
$$;