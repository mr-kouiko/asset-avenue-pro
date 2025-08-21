-- Créer une fonction sécurisée pour récupérer les infos publiques des créateurs
-- Cette fonction expose seulement les informations nécessaires sans les adresses e-mail
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
GRANT EXECUTE ON FUNCTION public.get_creator_public_info TO anon, authenticated;

-- Vérifier que les politiques actuelles de la table profiles sont bien restrictives
-- (elles le sont déjà, mais on peut ajouter des commentaires pour clarifier)

-- Les politiques actuelles sont sécurisées :
-- 1. Seuls les utilisateurs peuvent voir leur propre profil
-- 2. Seuls les admins peuvent voir tous les profils
-- 3. Aucune politique ne permet l'accès public aux adresses e-mail

-- La fonction get_creator_public_info() permet un accès contrôlé aux informations 
-- publiques des créateurs sans exposer les adresses e-mail