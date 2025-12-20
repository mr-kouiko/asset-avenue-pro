-- Fix: Remove automatic creator role assignment during signup
-- All new users should be 'client' by default
-- Creator role should ONLY be granted after payment via verify-seller-payment

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
    
    -- SECURITY FIX: All new users are 'client' by default
    -- Creator role is ONLY granted after paying the 15€ fee via verify-seller-payment
    -- Exception: Admin email gets admin role
    IF NEW.email = 'kouiko@gmail.com' THEN
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (NEW.id, 'admin'::app_role) 
        ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::app_role;
    ELSE
        -- ALL other users start as 'client' - must pay to become 'creator'
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (NEW.id, 'client'::app_role) 
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Successfully created user profile for user: % with client role', NEW.id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;