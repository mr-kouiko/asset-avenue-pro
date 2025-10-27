-- Créer le profil pour l'utilisateur existant (visitenow@icloud.com)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = '5caaff70-76d4-4e0b-89ba-09c4772bb5c5') THEN
    INSERT INTO public.profiles (user_id, email, display_name, created_at, updated_at)
    VALUES (
      '5caaff70-76d4-4e0b-89ba-09c4772bb5c5',
      'visitenow@icloud.com',
      'visitenow@icloud.com',
      now(),
      now()
    );
  END IF;
END $$;

-- Créer le rôle 'client' (acheteur) pour cet utilisateur
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = '5caaff70-76d4-4e0b-89ba-09c4772bb5c5') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      '5caaff70-76d4-4e0b-89ba-09c4772bb5c5',
      'client'::app_role
    );
  END IF;
END $$;

-- Recréer le trigger pour garantir qu'il fonctionne pour les futurs utilisateurs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();