-- Ensure kouiko@gmail.com is admin by default
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'kouiko@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Update handle_new_user function to assign proper default roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
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
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Determine default role based on email and metadata
    IF NEW.email = 'kouiko@gmail.com' THEN
        default_role := 'admin'::app_role;
    ELSIF role_val = 'creator' OR store_name_val IS NOT NULL THEN
        default_role := 'creator'::app_role;
    ELSIF role_val = 'admin' THEN
        default_role := 'admin'::app_role;
    ELSIF role_val = 'client' THEN
        default_role := 'client'::app_role;
    ELSE
        default_role := 'client'::app_role; -- Default to buyer/client role
    END IF;
    
    -- Assign role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, default_role)
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$;