-- Fix remaining functions that may not have proper search_path settings

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update handle_new_user function  
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
    )
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Update log_vendor_registration function
CREATE OR REPLACE FUNCTION public.log_vendor_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only log if this is a creator/vendor registration
    IF (NEW.raw_user_meta_data ->> 'role') = 'creator' THEN
        -- Insert a log entry that can be processed later
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
                WHEN (NEW.raw_user_meta_data ->> 'first_name') IS NOT NULL AND (NEW.raw_user_meta_data ->> 'last_name') IS NOT NULL 
                THEN (NEW.raw_user_meta_data ->> 'first_name') || ' ' || (NEW.raw_user_meta_data ->> 'last_name')
                ELSE NEW.email
            END,
            NEW.raw_user_meta_data ->> 'store_name',
            NEW.raw_user_meta_data ->> 'country',
            NEW.email
        )
        ON CONFLICT (user_id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            store_name = EXCLUDED.store_name,
            country = EXCLUDED.country,
            email = EXCLUDED.email;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update log_role_change function
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit (user_id, new_role, changed_by)
    VALUES (NEW.user_id, NEW.role, COALESCE(auth.uid(), NEW.user_id));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.role_audit (user_id, old_role, new_role, changed_by)
    VALUES (NEW.user_id, OLD.role, NEW.role, COALESCE(auth.uid(), NEW.user_id));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;