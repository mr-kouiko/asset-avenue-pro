-- Créer les comptes de test sécurisés

-- 1. Corriger d'abord le trigger d'inscription pour les nouveaux utilisateurs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Nouvelle fonction handle_new_user corrigée
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
DECLARE
    user_meta jsonb;
    first_name_val text;
    last_name_val text;
    store_name_val text;
    country_val text;
    role_val text;
    default_role app_role;
BEGIN
    -- Safely handle raw_user_meta_data
    user_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Extract values safely
    first_name_val := user_meta ->> 'first_name';
    last_name_val := user_meta ->> 'last_name';
    store_name_val := user_meta ->> 'store_name';
    country_val := user_meta ->> 'country';
    role_val := user_meta ->> 'role';
    
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
    )
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        store_name = EXCLUDED.store_name,
        country = EXCLUDED.country,
        email = EXCLUDED.email;
    
    -- Determine default role based on email and metadata
    IF NEW.email = 'kouiko@gmail.com' THEN
        -- kouiko@gmail.com garde son rôle admin existant, n'ajouter que s'il n'existe pas
        IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'admin'::app_role) THEN
            INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role);
        END IF;
    ELSIF NEW.email = 'seller@example.com' THEN
        default_role := 'creator'::app_role;
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, default_role) ON CONFLICT DO NOTHING;
    ELSIF NEW.email = 'buyer@example.com' THEN
        default_role := 'client'::app_role;
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, default_role) ON CONFLICT DO NOTHING;
    ELSIF role_val = 'creator' OR store_name_val IS NOT NULL THEN
        default_role := 'creator'::app_role;
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, default_role) ON CONFLICT DO NOTHING;
    ELSIF role_val = 'admin' THEN
        default_role := 'admin'::app_role;
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, default_role) ON CONFLICT DO NOTHING;
    ELSE
        -- Par défaut, nouveau rôle client/buyer pour tous les nouveaux utilisateurs
        default_role := 'client'::app_role;
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, default_role) ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Créer les utilisateurs de test (si ils n'existent pas)
-- Note: Supabase ne permet pas d'insérer directement dans auth.users
-- Ces comptes doivent être créés via l'inscription normale ou l'interface admin

-- Créer les données pour les comptes de test s'ils sont inscrits
DO $$
DECLARE 
    seller_user_id uuid;
    buyer_user_id uuid;
BEGIN
    -- Vérifier si seller@example.com existe et créer son profil
    SELECT id INTO seller_user_id FROM auth.users WHERE email = 'seller@example.com' LIMIT 1;
    IF seller_user_id IS NOT NULL THEN
        -- Créer/mettre à jour le profil
        INSERT INTO public.profiles (user_id, display_name, store_name, country, email)
        VALUES (seller_user_id, 'Test Seller', 'Test Creator Store', 'France', 'seller@example.com')
        ON CONFLICT (user_id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            store_name = EXCLUDED.store_name,
            country = EXCLUDED.country;
        
        -- Assigner le rôle creator
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (seller_user_id, 'creator'::app_role) 
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    -- Vérifier si buyer@example.com existe et créer son profil  
    SELECT id INTO buyer_user_id FROM auth.users WHERE email = 'buyer@example.com' LIMIT 1;
    IF buyer_user_id IS NOT NULL THEN
        -- Créer/mettre à jour le profil
        INSERT INTO public.profiles (user_id, display_name, store_name, country, email)
        VALUES (buyer_user_id, 'Test Buyer', NULL, 'France', 'buyer@example.com')
        ON CONFLICT (user_id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            country = EXCLUDED.country;
        
        -- Assigner le rôle client/buyer
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (buyer_user_id, 'client'::app_role) 
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;