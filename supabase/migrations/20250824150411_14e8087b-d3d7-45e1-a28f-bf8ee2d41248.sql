-- 1. Create admin and test accounts with proper setup
-- First ensure kouiko@gmail.com is admin
UPDATE public.user_roles 
SET role = 'admin'::app_role 
WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'kouiko@gmail.com'
);

-- If kouiko@gmail.com doesn't exist in roles, insert it
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
WHERE p.email = 'kouiko@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id
);

-- 2. Create test seller account
INSERT INTO public.profiles (
  user_id, 
  email, 
  display_name, 
  store_name, 
  country
) VALUES (
  gen_random_uuid(),
  'seller@example.com',
  'Test Seller',
  'Test Store',
  'fr'
) ON CONFLICT (email) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  store_name = EXCLUDED.store_name;

-- Add creator role for test seller
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'creator'::app_role
FROM public.profiles p
WHERE p.email = 'seller@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Create test buyer account  
INSERT INTO public.profiles (
  user_id,
  email,
  display_name,
  country
) VALUES (
  gen_random_uuid(),
  'buyer@example.com', 
  'Test Buyer',
  'fr'
) ON CONFLICT (email) DO UPDATE SET
  display_name = EXCLUDED.display_name;

-- Add client role for test buyer
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'client'::app_role
FROM public.profiles p
WHERE p.email = 'buyer@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Update the user creation trigger to properly handle role assignment
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
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        store_name = EXCLUDED.store_name,
        country = EXCLUDED.country,
        email = EXCLUDED.email;
    
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
        default_role := 'client'::app_role; -- Default to client/buyer role
    END IF;
    
    -- Assign role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, default_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
END;
$$;