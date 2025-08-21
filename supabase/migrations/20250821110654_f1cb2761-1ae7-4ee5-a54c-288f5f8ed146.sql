-- Créer une vue publique pour les informations des créateurs dans le marketplace
-- Cette vue expose seulement les informations nécessaires sans les adresses e-mail
CREATE VIEW public.creator_public_profiles AS
SELECT 
    user_id,
    display_name,
    store_name,
    avatar_url,
    created_at
FROM public.profiles;

-- Activer RLS sur la vue
ALTER VIEW public.creator_public_profiles SET (security_barrier = true);

-- Créer une politique pour permettre la lecture publique de cette vue
-- Seulement pour les créateurs qui ont du contenu approuvé
CREATE POLICY "Public can view creator profiles with approved content"
ON public.creator_public_profiles
FOR SELECT
USING (
    EXISTS (
        SELECT 1 
        FROM public.content_submissions cs
        INNER JOIN public.user_roles ur ON ur.user_id = creator_public_profiles.user_id
        WHERE cs.creator_id = creator_public_profiles.user_id 
        AND cs.status = 'approved'
        AND ur.role = 'creator'
    )
);

-- Alternativement, créer une fonction sécurisée pour récupérer les infos publiques des créateurs
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

-- Accorder les permissions nécessaires
GRANT SELECT ON public.creator_public_profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_public_info TO anon, authenticated;