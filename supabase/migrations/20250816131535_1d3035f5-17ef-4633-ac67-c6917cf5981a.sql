-- Vérifier et créer le trigger manquant pour les nouveaux utilisateurs
-- D'abord, supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recréer la fonction handle_new_user avec une logique améliorée
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    user_meta jsonb;
    first_name_val text;
    last_name_val text;
    role_val text;
    store_name_val text;
    country_val text;
BEGIN
    -- Safely handle raw_user_meta_data
    user_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Extract values safely
    first_name_val := user_meta ->> 'first_name';
    last_name_val := user_meta ->> 'last_name';
    role_val := user_meta ->> 'role';
    store_name_val := user_meta ->> 'store_name';
    country_val := user_meta ->> 'country';
    
    -- Insert into profiles table
    INSERT INTO public.profiles (
        user_id, 
        display_name, 
        store_name, 
        country,
        email
    )
    VALUES (
        NEW.id, 
        CASE 
            WHEN first_name_val IS NOT NULL AND last_name_val IS NOT NULL 
            THEN first_name_val || ' ' || last_name_val
            ELSE NEW.email
        END,
        store_name_val,
        country_val,
        NEW.email
    );
    
    -- Assign role based on metadata or default to creator for dashboard users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
        NEW.id,
        CASE 
            WHEN role_val = 'creator' THEN 'creator'::app_role
            WHEN role_val = 'admin' THEN 'admin'::app_role
            WHEN role_val = 'client' THEN 'client'::app_role
            -- Default to creator for users accessing the dashboard
            ELSE 'creator'::app_role
        END
    );
    
    RETURN NEW;
END;
$$;

-- Créer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Maintenant, corriger les utilisateurs existants qui n'ont pas de profils/rôles
-- D'abord, créer des profils pour les utilisateurs existants
INSERT INTO public.profiles (user_id, display_name, email)
SELECT 
    id as user_id,
    email as display_name,
    email
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.profiles);

-- Ensuite, assigner le rôle 'creator' aux utilisateurs existants qui n'ont pas de rôle
INSERT INTO public.user_roles (user_id, role)
SELECT 
    id as user_id,
    'creator'::app_role as role
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_roles);