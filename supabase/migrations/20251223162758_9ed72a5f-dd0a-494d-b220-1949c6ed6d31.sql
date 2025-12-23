-- Step 1: Remove old admin and set new admin
-- First, check if info@visitenow.ma exists as a user
DO $$
DECLARE
  new_admin_user_id uuid;
BEGIN
  -- Get the user_id for info@visitenow.ma from profiles
  SELECT user_id INTO new_admin_user_id FROM public.profiles WHERE email = 'info@visitenow.ma' LIMIT 1;
  
  -- If user exists, update their role to admin
  IF new_admin_user_id IS NOT NULL THEN
    -- Update existing role to admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_admin_user_id, 'admin'::app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::app_role;
  END IF;
END $$;

-- Step 2: Remove admin role from old admin (kouiko@gmail.com user)
UPDATE public.user_roles 
SET role = 'client'::app_role 
WHERE user_id = 'a8273855-89a0-4e13-9f50-afea91a43851' 
AND role = 'admin'::app_role;

-- Step 3: Update the handle_new_user function to use new admin email
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
BEGIN
    -- Safely handle raw_user_meta_data
    user_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Extract values safely
    first_name_val := user_meta ->> 'first_name';
    last_name_val := user_meta ->> 'last_name';
    store_name_val := user_meta ->> 'store_name';
    country_val := user_meta ->> 'country';
    
    -- Log the user creation attempt
    RAISE NOTICE 'Creating user profile for user: %, email: %', NEW.id, NEW.email;
    
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
    
    -- SECURITY: Only info@visitenow.ma gets admin role
    -- All other users start as 'client' - must pay to become 'creator'
    IF NEW.email = 'info@visitenow.ma' THEN
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (NEW.id, 'admin'::app_role) 
        ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::app_role;
    ELSE
        -- ALL other users start as 'client' - must pay to become 'creator'
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (NEW.id, 'client'::app_role) 
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Successfully created user profile for user: %', NEW.id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$function$;