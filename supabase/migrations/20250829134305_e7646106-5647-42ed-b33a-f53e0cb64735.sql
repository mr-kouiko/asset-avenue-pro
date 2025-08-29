-- Ensure handle_new_user trigger is working properly and includes proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    
    -- Log the user creation attempt
    RAISE NOTICE 'Creating user profile for user: %, email: %, role: %', NEW.id, NEW.email, role_val;
    
    -- Insert into profiles table with better error handling
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
            ELSE COALESCE(first_name_val, NEW.email)
        END,
        store_name_val,
        country_val,
        NEW.email
    )
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        store_name = EXCLUDED.store_name,
        country = EXCLUDED.country,
        email = EXCLUDED.email,
        updated_at = now();
    
    -- Determine role and insert with proper handling
    IF NEW.email = 'kouiko@gmail.com' THEN
        -- Admin user
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (NEW.id, 'admin'::app_role) 
        ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::app_role;
    ELSIF role_val = 'creator' OR store_name_val IS NOT NULL THEN
        -- Creator/seller
        default_role := 'creator'::app_role;
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (NEW.id, default_role) 
        ON CONFLICT (user_id) DO UPDATE SET role = default_role;
    ELSIF role_val = 'admin' THEN
        -- Admin role
        default_role := 'admin'::app_role;
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (NEW.id, default_role) 
        ON CONFLICT (user_id) DO UPDATE SET role = default_role;
    ELSE
        -- Default to client for buyers
        default_role := 'client'::app_role;
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (NEW.id, default_role) 
        ON CONFLICT (user_id) DO UPDATE SET role = default_role;
    END IF;
    
    RAISE NOTICE 'Successfully created user profile and role for user: %', NEW.id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't block user creation
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$function$;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();